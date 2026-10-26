import { getSR } from './common.js';

export class PassProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.count = options?.processorOptions?.count ?? 8;
        this.currentCount = 0;
        this.isOpen = false;
        this.lastInHi = false;
        this.lastTrigHi = false;
        this.lastResetHi = false;
        this.eosLeft = 0;

        this.port.onmessage = e => {
            if (e.data.type === 'SET_COUNT') {
                const c = Math.max(1, Math.min(64, Math.round(e.data.count || 8)));
                this.count = c;
            } else if (e.data.type === 'FIRE' || e.data.type === 'TRIG') {
                this.isOpen = true;
                this.currentCount = this.count;
                this.eosLeft = 0;
                this.port.postMessage({ type: 'STATE', count: this.currentCount, isOpen: true });
            } else if (e.data.type === 'RESET') {
                this.isOpen = false;
                this.currentCount = 0;
                this.eosLeft = 0;
                this.port.postMessage({ type: 'STATE', count: 0, isOpen: false });
            }
        };
    }

    process(ins, outs) {
        const inSig = ins[0]?.[0];
        const inTrig = ins[1]?.[0];
        const inReset = ins[2]?.[0];

        const outSig = outs[0]?.[0];
        const outGate = outs[1]?.[0];
        const outEos = outs[2]?.[0];

        const len = 128;
        const sr = getSR();
        const eosPulseSamples = Math.max(1, Math.round(0.005 * sr)); // 5ms pulse for EOS

        for (let i = 0; i < len; i++) {
            const rVal = inReset ? inReset[i] : 0.0;
            const tVal = inTrig ? inTrig[i] : 0.0;
            const sVal = inSig ? inSig[i] : 0.0;

            // 1. Reset input (force close)
            const isResetHi = rVal > 0.3;
            if (isResetHi && !this.lastResetHi) {
                this.isOpen = false;
                this.currentCount = 0;
                this.eosLeft = 0;
                this.port.postMessage({ type: 'STATE', count: 0, isOpen: false });
            }
            this.lastResetHi = isResetHi;

            // 2. Trig input (open gate & load count)
            const isTrigHi = tVal > 0.3;
            if (isTrigHi && !this.lastTrigHi) {
                this.isOpen = true;
                this.currentCount = this.count;
                this.eosLeft = 0;
                this.port.postMessage({ type: 'STATE', count: this.currentCount, isOpen: true });
            }
            this.lastTrigHi = isTrigHi;

            // 3. Count down on incoming clock rising edge
            const isInHi = sVal > 0.3;
            if (isInHi && !this.lastInHi) {
                if (this.isOpen && this.currentCount > 0) {
                    this.currentCount--;
                    if (this.currentCount === 0) {
                        this.isOpen = false;
                        this.eosLeft = eosPulseSamples;
                        this.port.postMessage({ type: 'STATE', count: 0, isOpen: false });
                    } else {
                        this.port.postMessage({ type: 'STATE', count: this.currentCount, isOpen: true });
                    }
                }
            }
            this.lastInHi = isInHi;

            // 4. Outputs
            // Pass-through signal: inSig when open
            if (outSig) {
                outSig[i] = (this.isOpen && isInHi) ? 1.0 : 0.0;
            }
            // Gate output: holds 1.0 while gate is open
            if (outGate) {
                outGate[i] = this.isOpen ? 1.0 : 0.0;
            }
            // EOS output: 1-shot pulse when countdown completes
            if (outEos) {
                if (this.eosLeft > 0) {
                    outEos[i] = 1.0;
                    this.eosLeft--;
                } else {
                    outEos[i] = 0.0;
                }
            }
        }

        return true;
    }
}

registerProcessor('pass-processor', PassProcessor);
