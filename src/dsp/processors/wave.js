// src/dsp/processors/wave.js
import { WaveGrainShifter } from '../wave-grain-shifter.js?v=287';

export class WaveProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = null;
        this.bufferLength = 0;
        this.bufferSampleRate = 48000;

        this.start = 0.0;
        this.end = 1.0;
        this.speed = 1.0;
        this.pitchMode = false;
        this.semiMode = false;
        this.loop = false;
        this.retrigger = true;
        this.startPatched = false;
        this.endPatched = false;
        this.snapMode = false;
        this.chops = [];

        this.pointer = 0.0;
        this.shifter = new WaveGrainShifter(0.068);
        this.isPlaying = false;
        this.lastGateHi = false;
        this.firstPass = true;
        this.isManualPlay = false;

        this.lastEffStart = 0.0;
        this.lastEffEnd = 1.0;
        this.lastRawStart = 0.0;
        this.lastRawEnd = 1.0;
        this.lastReportedStart = -1.0;
        this.lastReportedEnd = -1.0;
        this.lastReportedRawStart = -1.0;
        this.lastReportedRawEnd = -1.0;
        this.lastReportedPos = 0.0;
        this.lastReportedPlaying = false;
        this.reportCounter = 0;
        this.lastCvS = 0.0;
        this.lastCvE = 0.0;

        this.port.onmessage = (e) => {
            const data = e.data;
            if (!data) return;

            if (data.type === 'SET_BUFFER') {
                if (data.buffer && data.buffer.length > 0) {
                    this.buffer = new Float32Array(data.buffer);
                    this.bufferLength = this.buffer.length;
                    this.bufferSampleRate = data.sampleRate || 48000;
                    const eff = this.getEffectiveStartEnd(this.lastCvS, this.lastCvE);
                    this.pointer = Math.max(0, Math.min(this.bufferLength - 1, eff.effStart * (this.bufferLength - 1)));
                    this.shifter.reset(this.pointer);
                }
            } else if (data.type === 'SET_PARAMS') {
                if (data.start !== undefined) this.start = Math.max(0.0, Math.min(1.0, data.start));
                if (data.end !== undefined) this.end = Math.max(0.0, Math.min(1.0, data.end));
                if (data.speed !== undefined) this.speed = Math.max(0.05, Math.min(8.0, data.speed));
                if (data.pitchMode !== undefined) this.pitchMode = Boolean(data.pitchMode);
                if (data.semiMode !== undefined) this.semiMode = Boolean(data.semiMode);
                if (data.loop !== undefined) this.loop = Boolean(data.loop);
                if (data.retrigger !== undefined) this.retrigger = Boolean(data.retrigger);
                if (data.startPatched !== undefined) this.startPatched = Boolean(data.startPatched);
                if (data.endPatched !== undefined) this.endPatched = Boolean(data.endPatched);
                if (data.snapMode !== undefined) this.snapMode = Boolean(data.snapMode);
                if (Array.isArray(data.chops)) this.chops = data.chops.map(x => Math.max(0.0, Math.min(1.0, x)));
                const eff = this.getEffectiveStartEnd(this.lastCvS, this.lastCvE);
                this.lastEffStart = eff.effStart;
                this.lastEffEnd = eff.effEnd;
                this.reportState();
            } else if (data.type === 'PLAY') {
                this.isManualPlay = true;
                this.triggerPlay(this.lastCvS, this.lastCvE);
                this.reportState();
            } else if (data.type === 'TRIGGER') {
                this.isManualPlay = false;
                this.triggerPlay(this.lastCvS, this.lastCvE);
                this.reportState();
            } else if (data.type === 'STOP') {
                this.isPlaying = false;
                this.firstPass = false;
                this.isManualPlay = false;
                this.reportState();
            } else if (data.type === 'RESET') {
                this.isPlaying = false;
                this.firstPass = false;
                this.isManualPlay = false;
                const eff = this.getEffectiveStartEnd(this.lastCvS, this.lastCvE);
                this.pointer = Math.max(0, Math.min(this.bufferLength - 1, eff.effStart * (this.bufferLength - 1)));
                this.shifter.reset(this.pointer);
                this.lastGateHi = false;
                this.reportState();
            }
        };
    }

    getEffectiveStartEnd(cvS = 0.0, cvE = 0.0) {
        const baseStart = this.startPatched ? 0.0 : this.start;
        const baseEnd = this.endPatched ? 0.0 : this.end;
        const rawS = Math.max(0.0, Math.min(1.0, baseStart + cvS));
        const rawE = Math.max(0.0, Math.min(1.0, baseEnd + cvE));

        this.lastRawStart = rawS;
        this.lastRawEnd = rawE;

        let s = rawS;
        let e = rawE;

        if (this.snapMode && Array.isArray(this.chops) && this.chops.length > 0) {
            const pts = [0.0, ...this.chops, 1.0].sort((a, b) => a - b);
            const N = pts.length - 1;

            const getIndex = (val) => {
                // Ledger uniform quantization across N segments for equal probability
                const clamped = Math.max(0.0, Math.min(0.999999, val + 1e-7));
                return Math.min(N - 1, Math.max(0, Math.floor(clamped * N)));
            };

            const isDiff = Math.abs(rawS - rawE) > 0.001;

            if (!isDiff) {
                // When START CV and END CV are equal, proceed in forward direction for this slice
                const idxS = getIndex(rawS);
                s = pts[idxS];
                e = pts[idxS + 1];
            } else if (rawS < rawE) {
                // Forward direction: from start of idxS to end of idxE
                const idxS = getIndex(rawS);
                const idxE = getIndex(Math.max(rawS, rawE - 0.0001));
                s = pts[idxS];
                e = pts[idxE + 1];
            } else {
                // Reverse direction: start at end of idxS, travel down to start of idxE
                const idxS = getIndex(Math.max(rawE, rawS - 0.0001));
                const idxE = getIndex(rawE);
                s = pts[idxS + 1];
                e = pts[idxE];
            }
        }

        const effStart = Math.max(0.0, Math.min(1.0, s));
        const effEnd = Math.max(0.0, Math.min(1.0, e));

        return {
            effStart,
            effEnd,
            rawStart: rawS,
            rawEnd: rawE,
            // Keep start/end as aliases for compatibility
            start: effStart,
            end: effEnd
        };
    }

    triggerPlay(cvStart = 0.0, cvEnd = 0.0) {
        if (!this.buffer || this.bufferLength === 0) {
            this.isPlaying = false;
            return;
        }
        const eff = this.getEffectiveStartEnd(cvStart, cvEnd);
        this.pointer = Math.max(0, Math.min(this.bufferLength - 1, eff.effStart * (this.bufferLength - 1)));
        this.shifter.reset(this.pointer);
        this.isPlaying = true;
        this.firstPass = true;
    }

    reportState() {
        const normPos = this.bufferLength > 0 ? (this.pointer / this.bufferLength) : 0.0;
        this.lastReportedPlaying = this.isPlaying;
        this.lastReportedPos = normPos;
        this.lastReportedStart = this.lastEffStart;
        this.lastReportedEnd = this.lastEffEnd;
        this.lastReportedRawStart = this.lastRawStart;
        this.lastReportedRawEnd = this.lastRawEnd;
        this.port.postMessage({
            type: 'STATE',
            pos: normPos,
            isPlaying: this.isPlaying,
            effStart: this.lastEffStart,
            effEnd: this.lastEffEnd,
            rawStart: this.lastRawStart,
            rawEnd: this.lastRawEnd,
            startPatched: this.startPatched,
            endPatched: this.endPatched,
            snapMode: this.snapMode
        });
    }

    process(inputs, outputs) {
        const out = outputs[0] ? outputs[0][0] : null;
        const len = out ? out.length : 128;
        const sr = sampleRate || 48000;

        if (!out) return true;

        const gateIn = inputs[0] ? inputs[0][0] : null;
        const startCvIn = inputs[1] ? inputs[1][0] : null;
        const endCvIn = inputs[2] ? inputs[2][0] : null;
        const speedCvIn = inputs[3] ? inputs[3][0] : null;

        // Current CV modulation inputs for Start / End
        const cvS0 = startCvIn ? startCvIn[0] : 0.0;
        const cvE0 = endCvIn ? endCvIn[0] : 0.0;
        this.lastCvS = cvS0;
        this.lastCvE = cvE0;
        const effInit = this.getEffectiveStartEnd(cvS0, cvE0);
        this.lastEffStart = effInit.start;
        this.lastEffEnd = effInit.end;

        if (!this.buffer || this.bufferLength === 0) {
            for (let i = 0; i < len; i++) out[i] = 0.0;
            if (this.isPlaying) {
                this.isPlaying = false;
            }
            this.reportCounter = (this.reportCounter || 0) + 1;
            const effChanged = Math.abs((this.lastReportedStart ?? -1) - this.lastEffStart) > 0.002 ||
                               Math.abs((this.lastReportedEnd ?? -1) - this.lastEffEnd) > 0.002 ||
                               Math.abs((this.lastReportedRawStart ?? -1) - this.lastRawStart) > 0.002 ||
                               Math.abs((this.lastReportedRawEnd ?? -1) - this.lastRawEnd) > 0.002;
            if (this.reportCounter >= 6 || effChanged) {
                this.reportCounter = 0;
                this.reportState();
            }
            return true;
        }

        const buf = this.buffer;
        const bufLen = this.bufferLength;
        const rateRatio = this.bufferSampleRate / sr;

        for (let i = 0; i < len; i++) {
            // Rising edge trigger detection on gate_in
            const gateVal = gateIn ? gateIn[i] : 0.0;
            const isGateHi = gateVal > 0.3;
            if (isGateHi && !this.lastGateHi) {
                if (!this.isPlaying || this.retrigger) {
                    const cvS = startCvIn ? startCvIn[i] : 0.0;
                    const cvE = endCvIn ? endCvIn[i] : 0.0;
                    this.triggerPlay(cvS, cvE);
                }
            }
            this.lastGateHi = isGateHi;

            if (!this.isPlaying) {
                out[i] = 0.0;
                continue;
            }

            // Current CV modulation inputs (calculated through ledger / snap logic)
            const cvS = startCvIn ? startCvIn[i] : 0.0;
            const cvE = endCvIn ? endCvIn[i] : 0.0;
            const eff = this.getEffectiveStartEnd(cvS, cvE);

            const effStartNorm = eff.start;
            const effEndNorm = eff.end;

            const effStart = effStartNorm * (bufLen - 1);
            const effEnd = effEndNorm * (bufLen - 1);

            // Direction: purely determined by start <= end (+1.0 forward) vs start > end (-1.0 reverse)
            const direction = (effStart <= effEnd) ? 1.0 : -1.0;

            // Speed/Pitch CV: -2.0V ~ +2.0V (CV=2 => 2^2 = 4x, CV=0 => 1x, CV=-2 => 2^-2 = 0.25x)
            let rate = this.speed;
            if (speedCvIn) {
                const clampedCv = Math.max(-2.0, Math.min(2.0, speedCvIn[i]));
                const effCv = this.semiMode ? (Math.round(clampedCv * 12.0) / 12.0) : clampedCv;
                const cvMultiplier = Math.pow(2.0, effCv);
                rate = this.speed * cvMultiplier;
            }

            if (this.pitchMode) {
                // Fixed-time pitch shift: playhead advances at 1.0x while grains shift pitch by `rate`
                out[i] = this.shifter.processSample(buf, bufLen, this.pointer, rate, direction, rateRatio, effStart, effEnd, sr);
                this.pointer += direction * rateRatio;
            } else {
                // Varispeed playback: linear interpolation and pointer scaled by `rate`
                out[i] = this.shifter.readLerp(buf, bufLen, this.pointer);
                this.pointer += direction * rate * rateRatio;
            }

            // Boundary check and loop
            const reachedEnd = (direction > 0) ? (this.pointer >= effEnd) : (this.pointer <= effEnd);
            if (reachedEnd) {
                if (this.loop) {
                    this.pointer = effStart;
                    this.firstPass = false;
                } else {
                    this.pointer = effEnd;
                    this.isPlaying = false;
                    this.firstPass = false;
                }
            }
        }

        // Periodic state reporting for UI playhead animation (~60Hz) or immediate on state change / CV change
        this.reportCounter = (this.reportCounter || 0) + 1;
        const effChanged = Math.abs((this.lastReportedStart ?? -1) - this.lastEffStart) > 0.002 ||
                           Math.abs((this.lastReportedEnd ?? -1) - this.lastEffEnd) > 0.002 ||
                           Math.abs((this.lastReportedRawStart ?? -1) - this.lastRawStart) > 0.002 ||
                           Math.abs((this.lastReportedRawEnd ?? -1) - this.lastRawEnd) > 0.002;
        if (this.reportCounter >= 6 || this.lastReportedPlaying !== this.isPlaying || effChanged) {
            this.reportCounter = 0;
            this.reportState();
        }

        return true;
    }
}

registerProcessor('wave-processor', WaveProcessor);
