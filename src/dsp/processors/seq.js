import { getSR, isRisingSpike } from './common.js';

export class SeqProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.step = -1;
        this.lastHi = false;
        this.lastResetVal = 0.0;
        this.cv = 0;
        this.gate = 0;
        this.eos = false;
        this.gap = 0;

        this.resetPatched = false;
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
                const rawPatched = msg.resetPatched ?? msg.keyGatePatched;
                if (rawPatched !== undefined) {
                    const nextReset = Boolean(rawPatched);
                    if (nextReset !== this.resetPatched) {
                        this.resetPatched = nextReset;
                        this.lastResetVal = 0.0;
                        if (this.resetPatched) {
                            // RESET_IN結線時: リセット待ち状態へ移行
                            this.resetState(false);
                        } else {
                            // RESET_IN未結線時: 常時スタンバイ（active = true）へ復帰
                            this.active = true;
                            this.port.postMessage({ type: 'STEP', step: this.step, active: true });
                        }
                    }
                }
            } else if (msg.type === 'RESET') {
                this.lastResetVal = 0.0;
                this.resetState(!this.resetPatched);
            }
        };
    }

    resetState(active) {
        this.active = active;
        this.step = -1;
        this.eos = false;
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
        const inReset = ins[1]?.[0];
        const cvOut = outs[0]?.[0], gOut = outs[1]?.[0], eosOut = outs[2]?.[0];
        const len = (cvOut || gOut || eosOut || gIn || inReset || []).length || 128;
        const minGap = Math.max(1, Math.round(0.002 * getSR()));
        const numSteps = (this.steps && this.steps.length > 0) ? this.steps.length : 8;

        for (let i = 0; i < len; i++) {
            const clkV = gIn ? gIn[i] : 0.0;
            const rstV = inReset ? inReset[i] : 0.0;
            const isHi = clkV > 0.3;

            // 1. RESET_IN (PIN6) control (differentiated rising spike):
            // - Unpatched: always active (loop playback on clock).
            // - Patched: waits in standby until rising spike (supports stacked signals e.g. 1V->2V), resets to step 0 and starts.
            if (!this.resetPatched) {
                this.active = true;
                this.lastResetVal = 0.0;
            } else {
                if (isRisingSpike(rstV, this.lastResetVal, 0.4)) {
                    this.active = true;
                    this.step = -1;
                    this.eos = false;
                    if (isHi) {
                        const { found, nextStep } = this.findNextActiveStep(numSteps);
                        if (found) this.applyStep(nextStep, minGap);
                        this.lastHi = true;
                    }
                }
                this.lastResetVal = rstV;
            }

            // 2. Clock falling edge
            if (!isHi) {
                this.lastHi = false;
                this.eos = false;
            }

            // 3. Clock rising edge
            if (isHi && !this.lastHi) {
                this.lastHi = true;
                this.eos = false;
                if (this.active) {
                    const { found, nextStep, wrapped } = this.findNextActiveStep(numSteps);
                    if (wrapped) {
                        this.eos = true;
                    }
                    if (this.resetPatched && wrapped && rstV < 0.4) {
                        this.active = false;
                        this.step = -1;
                        this.gate = 0.0;
                        this.port.postMessage({ type: 'STEP', step: -1, active: false });
                    } else if (found) {
                        this.applyStep(nextStep, minGap);
                    }
                }
            }

            // 4. Output gate, cv, and eos
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
            if (eosOut) eosOut[i] = (this.eos && isHi) ? 1.0 : 0.0;
        }
        return true;
    }
}

registerProcessor('seq-processor', SeqProcessor);
