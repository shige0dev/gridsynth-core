import { getSR } from './common.js';

export class SeqProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.step = -1;
        this.lastHi = false;
        this.cv = 0;
        this.gate = 0;
        this.gap = 0;

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
            } else if (e.data.type === 'RESET') {
                this.step = -1;
                this.lastHi = false;
                this.gap = 0;
                this.gate = 0;
                this.port.postMessage({ type: 'STEP', step: -1 });
            }
        };
    }

    process(ins, outs) {
        const gIn = ins[0]?.[0];
        const cvOut = outs[0]?.[0], gOut = outs[1]?.[0];
        const len = (cvOut || gOut || gIn || []).length || 128;
        const minGap = Math.max(1, Math.round(0.002 * getSR()));
        const numSteps = (this.steps && this.steps.length > 0) ? this.steps.length : 8;

        for (let i = 0; i < len; i++) {
            const isHi = (gIn ? gIn[i] : 0) > 0.3;
            if (isHi && !this.lastHi) {
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
                        this.port.postMessage({ type: 'STEP', step: this.step });
                    }
                }
            }
            this.lastHi = isHi;

            const cur = (this.step >= 0 && this.step < numSteps) ? this.steps[this.step] : null;
            const isGateOn = typeof cur === 'number' ? true : (cur && cur.gate !== false);
            const isActOn = typeof cur === 'number' ? true : (cur && cur.active !== false);
            const shouldGate = cur != null && isActOn && isGateOn && isHi;
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
