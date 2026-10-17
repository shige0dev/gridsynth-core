// src/dsp/processors/rf.js
import { getSR } from './common.js';

export class RfProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.timeParam = 0.5; // 0.0 ~ 1.0 (0.5 = 200ms)
        this.peakParam = 0.5; // 0.01 ~ 0.99
        this.level = 1.0;

        this.running = false;
        this.sampleIndex = 0;
        this.totalSamples = 9600; // 0.2s * 48000
        this.riseSamples = 4800;
        this.fallSamples = 4800;

        this.lastTrigHi = false;
        this.trigOutSamples = 0;
        this.lastReportedStage = -1;

        this.port.onmessage = (e) => {
            if (e.data.type === 'SET_PARAMS') {
                if (e.data.time !== undefined) {
                    // time can be passed as seconds (0.02 ~ 2.0) or normalized (0 ~ 1)
                    if (e.data.timeNormalized !== undefined) {
                        this.timeParam = Math.max(0.0, Math.min(1.0, e.data.timeNormalized));
                    } else if (e.data.time !== undefined) {
                        // convert seconds [0.02, 2.0] to normalized [0, 1] using log100
                        const sec = Math.max(0.02, Math.min(2.0, e.data.time));
                        this.timeParam = Math.log10(sec / 0.02) / 2.0;
                    }
                }
                if (e.data.peak !== undefined) {
                    this.peakParam = Math.max(0.01, Math.min(0.99, e.data.peak));
                }
                if (e.data.level !== undefined) {
                    this.level = Math.max(0.0, Math.min(1.0, e.data.level));
                }
            } else if (e.data.type === 'TRIGGER' || e.data.type === 'TRIG') {
                this.startCycle(getSR());
            } else if (e.data.type === 'RESET') {
                this.running = false;
                this.sampleIndex = 0;
                this.trigOutSamples = 0;
                this.lastTrigHi = false;
            }
        };
    }

    startCycle(sr) {
        this.calcDurations(0.0, 0.0, sr);
        this.running = true;
        this.sampleIndex = 0;
    }

    calcDurations(cvTime, cvPeak, sr) {
        const normTime = Math.max(0.0, Math.min(1.0, this.timeParam + cvTime));
        // Exponential curve: 0.0 -> 0.02s (20ms), 0.5 -> 0.2s (200ms), 1.0 -> 2.0s (2000ms)
        const totalSec = 0.02 * Math.pow(100.0, normTime);
        this.totalSamples = Math.max(2, Math.round(totalSec * sr));

        const peak = Math.max(0.01, Math.min(0.99, this.peakParam + cvPeak));
        this.riseSamples = Math.max(1, Math.round(this.totalSamples * peak));
        this.fallSamples = Math.max(1, this.totalSamples - this.riseSamples);
    }

    process(ins, outs) {
        const trigIn = ins[0]?.[0];
        const cvTimeIn = ins[1]?.[0];
        const cvPeakIn = ins[2]?.[0];

        const outCv = outs[0]?.[0];
        const outTrig = outs[1]?.[0];

        if (!outCv && !outTrig) return true;

        const sr = getSR();
        const pulseLen = Math.max(1, Math.round(sr * 0.002)); // 2ms trigger pulse
        const len = (outCv || outTrig || []).length || 128;

        for (let i = 0; i < len; i++) {
            // Trigger input edge detection
            const trigVal = trigIn ? trigIn[i] : 0.0;
            const isTrigHi = trigVal > 0.3;
            if (isTrigHi && !this.lastTrigHi) {
                const cvT = cvTimeIn ? cvTimeIn[i] : 0.0;
                const cvP = cvPeakIn ? cvPeakIn[i] : 0.0;
                this.calcDurations(cvT, cvP, sr);
                this.running = true;
                this.sampleIndex = 0;
            }
            this.lastTrigHi = isTrigHi;

            let cvVal = 0.0;
            if (this.running) {
                if (this.sampleIndex < this.riseSamples) {
                    cvVal = this.sampleIndex / this.riseSamples;
                } else if (this.sampleIndex < this.totalSamples) {
                    const fallProgress = (this.sampleIndex - this.riseSamples) / this.fallSamples;
                    cvVal = 1.0 - fallProgress;
                } else {
                    // Cycle finished!
                    cvVal = 0.0;
                    this.running = false;
                    // Fire end trigger
                    this.trigOutSamples = pulseLen;
                }
                this.sampleIndex++;
            }

            if (outCv) {
                outCv[i] = cvVal * this.level;
            }

            if (outTrig) {
                if (this.trigOutSamples > 0) {
                    outTrig[i] = 1.0;
                    this.trigOutSamples--;
                } else {
                    outTrig[i] = 0.0;
                }
            }
        }

        const curStage = !this.running ? -1 : (this.sampleIndex < this.riseSamples ? 0 : 1);
        if (curStage !== this.lastReportedStage) {
            this.lastReportedStage = curStage;
            this.port.postMessage({ type: 'STAGE', stage: curStage });
        }

        return true;
    }
}

registerProcessor('rf-processor', RfProcessor);
