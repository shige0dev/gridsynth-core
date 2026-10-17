// src/dsp/processors/ar.js
import { getSR } from './common.js';

export class ArProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.val = 0.0;
        this.attackParam = 0.38; // normalized 0..1 (default ~0.05s)
        this.releaseParam = 0.57; // normalized 0..1 (default ~0.2s)
        this.level = 1.0;

        this.port.onmessage = (e) => {
            if (e.data.type === 'SET_PARAMS') {
                if (e.data.attackNormalized !== undefined) {
                    this.attackParam = Math.max(0.0, Math.min(1.0, e.data.attackNormalized));
                } else if (e.data.attack !== undefined) {
                    // map [0.005, 2.0] to [0, 1] using log
                    const sec = Math.max(0.005, Math.min(2.0, e.data.attack));
                    this.attackParam = Math.log(sec / 0.005) / Math.log(400.0);
                }

                if (e.data.releaseNormalized !== undefined) {
                    this.releaseParam = Math.max(0.0, Math.min(1.0, e.data.releaseNormalized));
                } else if (e.data.release !== undefined) {
                    // map [0.005, 3.0] to [0, 1] using log
                    const sec = Math.max(0.005, Math.min(3.0, e.data.release));
                    this.releaseParam = Math.log(sec / 0.005) / Math.log(600.0);
                }

                if (e.data.level !== undefined) {
                    this.level = Math.max(0.0, Math.min(1.0, e.data.level));
                }
            } else if (e.data.type === 'RESET') {
                this.val = 0.0;
            }
        };
    }

    process(ins, outs) {
        const gateIn = ins[0]?.[0];
        const cvAIn = ins[1]?.[0];
        const cvRIn = ins[2]?.[0];
        const out = outs[0]?.[0];

        if (!out) return true;

        const sr = getSR();
        const len = (out || gateIn || []).length || 128;

        for (let i = 0; i < len; i++) {
            const isGateHi = (gateIn ? gateIn[i] : 0.0) > 0.3;

            const cvA = cvAIn ? cvAIn[i] : 0.0;
            const cvR = cvRIn ? cvRIn[i] : 0.0;

            const normA = Math.max(0.0, Math.min(1.0, this.attackParam + cvA));
            const normR = Math.max(0.0, Math.min(1.0, this.releaseParam + cvR));

            // Exponential mapping:
            // Attack: 0.005s (5ms) to 2.0s (2000ms)
            const tA = 0.005 * Math.pow(400.0, normA);
            // Release: 0.005s (5ms) to 3.0s (3000ms)
            const tR = 0.005 * Math.pow(600.0, normR);

            // Capacitor RC step coefficients: alpha = 1 - exp(-4.6 / (time * sr))
            const alphaA = 1.0 - Math.exp(-4.6 / Math.max(1, tA * sr));
            const alphaR = 1.0 - Math.exp(-4.6 / Math.max(1, tR * sr));

            if (isGateHi) {
                // RC Charging towards 1.0V (asymptotic curve)
                this.val += alphaA * (1.0 - this.val);
                if (this.val > 0.9995) this.val = 1.0;
            } else {
                // RC Discharging towards 0.0V (exponential decay)
                this.val += alphaR * (0.0 - this.val);
                if (this.val < 0.0005) this.val = 0.0;
            }

            out[i] = this.val * this.level;
        }

        return true;
    }
}

registerProcessor('ar-processor', ArProcessor);
