import { getSR } from './common.js';

export class SeqProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.step = -1;
        this.lastHi = false;
        this.lastKeyHi = false;
        this.cv = 0;
        this.gate = 0;
        this.gap = 0;

        this.keyGatePatched = false;
        this.keyMode = 'loop';
        this.active = true;

        const initSteps = options?.processorOptions?.steps;
        this.steps = (Array.isArray(initSteps) && initSteps.length > 0)
            ? initSteps
            : Array.from({ length: 8 }, (_, i) => ({ cv: i === 0 ? 0 : 0.25, active: true, cvActive: true, gate: true }));

        this.port.onmessage = e => {
            const msg = e.data;
            if (msg.type === 'SET_STEPS') {
                if (Array.isArray(msg.steps) && msg.steps.length > 0) {
                    this.steps = msg.steps;
                }
            } else if (msg.type === 'SET_PATCH') {
                if (msg.keyGatePatched !== undefined) {
                    const nextKey = Boolean(msg.keyGatePatched);
                    if (nextKey !== this.keyGatePatched) {
                        this.keyGatePatched = nextKey;
                        this.lastKeyHi = false;
                        this.resetState(!this.keyGatePatched);
                    }
                }
            } else if (msg.type === 'SET_CONFIG') {
                if (msg.keyMode !== undefined) {
                    this.keyMode = msg.keyMode === 'oneshot' ? 'oneshot' : 'loop';
                }
            } else if (msg.type === 'RESET') {
                if (msg.keyMode !== undefined) {
                    this.keyMode = msg.keyMode === 'oneshot' ? 'oneshot' : 'loop';
                }
                this.lastKeyHi = false;
                this.resetState(!this.keyGatePatched);
            }
        };
    }

    resetState(active) {
        this.active = active;
        this.step = -1;
        this.lastHi = false;
        this.gap = 0;
        this.gate = 0;
        this.port.postMessage({ type: 'STEP', step: -1, active: this.active });
    }

    findNextActiveStep(numSteps) {
        let nextStep = this.step;
        let wrapped = false;
        for (let a = 0; a < numSteps; a++) {
            nextStep = (nextStep + 1) % numSteps;
            if (this.step >= 0 && nextStep <= this.step) {
                wrapped = true;
            }
            const st = this.steps[nextStep];
            if (st && (typeof st === 'object' ? st.active !== false : true)) {
                return { found: true, nextStep, wrapped };
            }
        }
        return { found: false, nextStep: -1, wrapped: false };
    }

    applyStep(stepIdx, minGap) {
        this.step = stepIdx;
        const cur = this.steps[stepIdx];
        if (cur != null) {
            if (typeof cur === 'number') {
                this.cv = cur;
            } else if (cur.cvActive !== false) {
                this.cv = cur.cv ?? 0;
            }
            this.gap = minGap;
            this.port.postMessage({ type: 'STEP', step: this.step, active: true });
        }
    }

    process(ins, outs) {
        const gIn = ins[0]?.[0];
        const inKey = ins[1]?.[0];
        const cvOut = outs[0]?.[0], gOut = outs[1]?.[0];
        const len = (cvOut || gOut || gIn || inKey || []).length || 128;
        const minGap = Math.max(1, Math.round(0.002 * getSR()));
        const numSteps = (this.steps && this.steps.length > 0) ? this.steps.length : 8;

        for (let i = 0; i < len; i++) {
            const clkV = gIn ? gIn[i] : 0.0;
            const keyV = inKey ? inKey[i] : 0.0;
            const isHi = clkV > 0.3;
            const isKeyHi = keyV >= 0.4;

            // 1. RUN / KEYGATE_IN control (when patched)
            if (this.keyGatePatched) {
                if (!isKeyHi) {
                    if (this.lastKeyHi || this.active || this.step !== -1) {
                        this.active = false;
                        this.step = -1;
                        this.gate = 0.0;
                        this.port.postMessage({ type: 'STEP', step: -1, active: false });
                    }
                    this.lastKeyHi = false;
                } else if (!this.lastKeyHi) {
                    this.lastKeyHi = true;
                    this.active = true;
                    this.step = -1;
                    if (isHi) {
                        const { found, nextStep } = this.findNextActiveStep(numSteps);
                        if (found) this.applyStep(nextStep, minGap);
                        this.lastHi = true;
                    }
                }
            }

            // 2. Clock falling edge
            if (!isHi) {
                this.lastHi = false;
            }

            // 3. Clock rising edge
            if (isHi && !this.lastHi) {
                this.lastHi = true;
                if (this.active) {
                    const { found, nextStep, wrapped } = this.findNextActiveStep(numSteps);
                    if (this.keyGatePatched && this.keyMode === 'oneshot' && wrapped) {
                        this.active = false;
                        this.step = -1;
                        this.gate = 0.0;
                        this.port.postMessage({ type: 'STEP', step: -1, active: false });
                    } else if (found) {
                        this.applyStep(nextStep, minGap);
                    }
                }
            }

            // 4. Output gate and cv
            const cur = (this.active && this.step >= 0 && this.step < numSteps) ? this.steps[this.step] : null;
            const isGateOn = typeof cur === 'number' ? true : (cur && cur.gate !== false);
            const isActOn = typeof cur === 'number' ? true : (cur && cur.active !== false);
            const shouldGate = this.active && cur != null && isActOn && isGateOn && isHi;

            if (this.gap > 0) {
                this.gap--;
                this.gate = 0;
            } else {
                this.gate = shouldGate ? 1.0 : 0.0;
            }

            if (cvOut) cvOut[i] = this.cv;
            if (gOut) gOut[i] = this.gate;
        }
        return true;
    }
}

registerProcessor('seq-processor', SeqProcessor);
