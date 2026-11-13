import { getSR } from './common.js';

export class SeqProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.step = -1;
        this.lastHi = false;
        this.cv = 0;
        this.gate = 0;
        this.gap = 0;
        this.trigOut = false;

        this.transOutPatched = false;
        this.transInPatched = false;
        this.initOn = true;
        this.active = true;

        if (options?.processorOptions?.steps && Array.isArray(options.processorOptions.steps) && options.processorOptions.steps.length > 0) {
            this.steps = options.processorOptions.steps;
        } else {
            this.steps = Array.from({ length: 8 }, (_, i) => ({
                cv: i === 0 ? 0 : 0.25,
                active: true,
                cvActive: true,
                gate: true
            }));
        }
        this.port.onmessage = e => {
            if (e.data.type === 'SET_STEPS') {
                if (Array.isArray(e.data.steps) && e.data.steps.length > 0) {
                    this.steps = e.data.steps;
                }
            } else if (e.data.type === 'SET_PATCH') {
                if (e.data.transOutPatched !== undefined) {
                    this.transOutPatched = Boolean(e.data.transOutPatched);
                }
                if (e.data.transInPatched !== undefined) {
                    this.transInPatched = Boolean(e.data.transInPatched);
                }
            } else if (e.data.type === 'SET_INIT') {
                if (e.data.initOn !== undefined) {
                    this.initOn = Boolean(e.data.initOn);
                }
            } else if (e.data.type === 'RESET') {
                const isInit = e.data.initOn !== undefined ? Boolean(e.data.initOn) : (this.initOn !== false);
                this.active = (!this.transInPatched) ? true : isInit;
                this.step = -1;
                this.lastHi = false;
                this.gap = 0;
                this.gate = 0;
                this.trigOut = false;
                this.port.postMessage({ type: 'STEP', step: -1, active: this.active });
            }
        };
    }

    process(ins, outs) {
        const gIn = ins[0]?.[0];
        const inTrig = ins[1]?.[0];
        const cvOut = outs[0]?.[0], gOut = outs[1]?.[0], transOut = outs[2]?.[0];
        const len = (cvOut || gOut || transOut || gIn || inTrig || []).length || 128;
        const minGap = Math.max(1, Math.round(0.002 * getSR()));
        const numSteps = (this.steps && this.steps.length > 0) ? this.steps.length : 8;

        for (let i = 0; i < len; i++) {
            const clkV = gIn ? gIn[i] : 0.0;
            const trigV = inTrig ? inTrig[i] : 0.0;
            const isHi = clkV > 0.3;
            const isTrigHi = trigV >= 0.5;

            // 1. TRANS_IN trigger reception:
            // When inactive: wake up and step to first active step immediately on this beat.
            // When active: trigger locked while running (no retrigger).
            if (isTrigHi && !this.active) {
                this.active = true;
                if (isHi) {
                    this.step = -1;
                    let found = false;
                    for (let a = 0; a < numSteps; a++) {
                        this.step = (this.step + 1) % numSteps;
                        const st = this.steps[this.step];
                        if (st && (typeof st === 'object' ? st.active !== false : true)) {
                            found = true;
                            break;
                        }
                    }
                    if (found) {
                        const cur = this.steps[this.step];
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
                    this.lastHi = true;
                } else {
                    this.step = -1;
                    this.lastHi = false;
                    this.port.postMessage({ type: 'STEP', step: -1, active: true });
                }
                this.trigOut = false;
            }

            // 2. Clock falling edge: clear trigOut and allow next clock rising edge
            if (!isHi) {
                this.lastHi = false;
                this.trigOut = false;
            }

            // 3. Clock rising edge: advance step or transition
            if (isHi && !this.lastHi) {
                this.lastHi = true;
                if (this.active) {
                    let nextStep = this.step;
                    let found = false;
                    let wrapped = false;
                    for (let a = 0; a < numSteps; a++) {
                        nextStep = (nextStep + 1) % numSteps;
                        if (this.step >= 0 && nextStep <= this.step) {
                            wrapped = true;
                        }
                        const st = this.steps[nextStep];
                        if (st && (typeof st === 'object' ? st.active !== false : true)) {
                            found = true;
                            break;
                        }
                    }

                    if (wrapped && this.transOutPatched) {
                        // Sequence finished: transition out to next module
                        this.active = false;
                        this.step = -1;
                        this.gate = 0.0;
                        this.trigOut = true;
                        this.port.postMessage({ type: 'STEP', step: -1, active: false });
                    } else if (found) {
                        this.step = nextStep;
                        const cur = this.steps[this.step];
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
            if (transOut) transOut[i] = (this.trigOut && isHi) ? 1.0 : 0.0;
        }
        return true;
    }
}

registerProcessor('seq-processor', SeqProcessor);
