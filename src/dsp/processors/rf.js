// src/dsp/processors/rf.js
import { getSR } from './common.js';

export class RfProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.timeSec = 0.2; // 0.0 ~ 2.0s (0 = 0ms passthrough)
        this.isTimeCvPatched = false;
        this.isPeakCvPatched = false;
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
        this.sampleCounter = 0;
        this.latchedTotalSamples = this.totalSamples;
        this.gateQueue = [];
        this.gateOutState = 0.0;
        this.manualTrigger = false;

        this.port.onmessage = (e) => {
            if (e.data.type === 'SET_PARAMS') {
                if (e.data.time !== undefined) {
                    this.timeSec = Math.max(0.0, Math.min(2.0, e.data.time));
                }
                if (e.data.isTimeCvPatched !== undefined) {
                    this.isTimeCvPatched = !!e.data.isTimeCvPatched;
                }
                if (e.data.isPeakCvPatched !== undefined) {
                    this.isPeakCvPatched = !!e.data.isPeakCvPatched;
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
                this.sampleCounter = 0;
                this.gateQueue = [];
                this.gateOutState = 0.0;
                this.manualTrigger = false;
            }
        };
    }

    startCycle(sr) {
        this.calcDurations(0.0, 0.0, sr);
        if (this.totalSamples <= 0) {
            this.running = false;
            this.sampleIndex = 0;
            this.trigOutSamples = Math.max(1, Math.round(sr * 0.002));
            this.manualTrigger = false;
        } else {
            this.running = true;
            this.sampleIndex = 0;
            this.manualTrigger = true;
        }
    }

    calcDurations(cvTime, cvPeak, sr) {
        const totalSec = this.isTimeCvPatched
            ? (cvTime <= 0 ? 0.0 : 2.0 * Math.pow(Math.min(1.0, cvTime), 2.5))
            : this.timeSec;
        if (totalSec <= 0.0) {
            this.totalSamples = 0;
            this.riseSamples = 0;
            this.fallSamples = 0;
            return;
        }
        this.totalSamples = Math.max(2, Math.round(totalSec * sr));

        const peak = Math.max(0.01, Math.min(0.99, this.isPeakCvPatched ? cvPeak : this.peakParam));
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
            const trigVal = Math.min(1.0, trigIn ? trigIn[i] : 0.0);
            const isTrigHi = trigVal > 0.3;
            if (isTrigHi && !this.lastTrigHi) {
                const cvT = cvTimeIn ? cvTimeIn[i] : 0.0;
                const cvP = cvPeakIn ? cvPeakIn[i] : 0.0;
                this.calcDurations(cvT, cvP, sr);
                this.latchedTotalSamples = this.totalSamples;
                this.running = this.totalSamples > 0;
                this.sampleIndex = 0;
                this.manualTrigger = false;
                let target = this.sampleCounter + this.latchedTotalSamples;
                if (this.gateQueue.length > 0) {
                    const lastTarget = this.gateQueue[this.gateQueue.length - 1].targetSample;
                    if (target <= lastTarget) target = lastTarget + 1;
                }
                this.gateQueue.push({ targetSample: target, val: 1.0 });
            } else if (!isTrigHi && this.lastTrigHi) {
                let target = this.sampleCounter + this.latchedTotalSamples;
                if (this.gateQueue.length > 0) {
                    const lastTarget = this.gateQueue[this.gateQueue.length - 1].targetSample;
                    if (target <= lastTarget) target = lastTarget + 1;
                }
                this.gateQueue.push({ targetSample: target, val: 0.0 });
            }
            this.lastTrigHi = isTrigHi;

            while (this.gateQueue.length > 0 && this.gateQueue[0].targetSample <= this.sampleCounter) {
                this.gateOutState = this.gateQueue.shift().val;
            }

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
                    // Fire end trigger for manual triggers (trig_in uses gateQueue passthrough)
                    if (this.manualTrigger) {
                        this.trigOutSamples = pulseLen;
                        this.manualTrigger = false;
                    }
                }
                this.sampleIndex++;
            }

            if (outCv) {
                outCv[i] = Math.min(1.0, cvVal * this.level);
            }

            if (outTrig) {
                if (this.trigOutSamples > 0) {
                    outTrig[i] = 1.0;
                    this.trigOutSamples--;
                } else {
                    outTrig[i] = Math.min(1.0, this.gateOutState);
                }
            }

            this.sampleCounter++;
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
