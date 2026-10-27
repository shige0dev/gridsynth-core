import { getSR } from './common.js';

export class CountProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.count = options?.processorOptions?.count ?? 8;
        this.currentCount = 0;
        this.isOpen = false;
        this.lastInHi = false;
        this.lastTransHi = false;
        this.transLeft = 0;

        this.port.onmessage = e => {
            if (e.data.type === 'SET_COUNT') {
                const c = Math.max(1, Math.min(64, Math.round(e.data.count || 8)));
                this.count = c;
            } else if (e.data.type === 'FIRE' || e.data.type === 'TRIG') {
                this.isOpen = true;
                this.currentCount = this.count;
                this.transLeft = 0;
                this.port.postMessage({ type: 'STATE', count: this.currentCount, isOpen: true });
            } else if (e.data.type === 'RESET') {
                this.isOpen = false;
                this.currentCount = 0;
                this.transLeft = 0;
                this.port.postMessage({ type: 'STATE', count: 0, isOpen: false });
            }
        };
    }

    process(ins, outs) {
        const inGate = ins[0]?.[0];
        const inTrans = ins[1]?.[0];

        const outGate = outs[0]?.[0];
        const outTrans = outs[1]?.[0];

        const len = 128;
        const sr = getSR();
        const pulseSamples = Math.max(1, Math.round(0.005 * sr)); // 5ms pulse for trans_out

        for (let i = 0; i < len; i++) {
            const tVal = inTrans ? inTrans[i] : 0.0;
            const gVal = inGate ? inGate[i] : 0.0;

            // 1. TRANS_IN (open gate & load count)
            const isTransHi = tVal > 0.3;
            if (isTransHi && !this.lastTransHi) {
                this.isOpen = true;
                this.currentCount = this.count;
                this.transLeft = 0;
                this.port.postMessage({ type: 'STATE', count: this.currentCount, isOpen: true });
            }
            this.lastTransHi = isTransHi;

            // 2. Count down on incoming clock rising edge
            const isGateHi = gVal > 0.3;
            if (isGateHi && !this.lastInHi) {
                if (this.isOpen && this.currentCount > 0) {
                    this.currentCount--;
                    if (this.currentCount === 0) {
                        this.isOpen = false;
                        this.transLeft = pulseSamples;
                        this.port.postMessage({ type: 'STATE', count: 0, isOpen: false });
                    } else {
                        this.port.postMessage({ type: 'STATE', count: this.currentCount, isOpen: true });
                    }
                }
            }
            this.lastInHi = isGateHi;

            // 3. Outputs
            // GATE_OUT: passed through clock pulses while open
            if (outGate) {
                outGate[i] = (this.isOpen && isGateHi) ? 1.0 : 0.0;
            }
            // TRANS_OUT: 1-shot transition pulse when countdown completes
            if (outTrans) {
                if (this.transLeft > 0) {
                    outTrans[i] = 1.0;
                    this.transLeft--;
                } else {
                    outTrans[i] = 0.0;
                }
            }
        }

        return true;
    }
}

registerProcessor('count-processor', CountProcessor);
