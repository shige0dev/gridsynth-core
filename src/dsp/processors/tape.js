// src/dsp/processors/tape.js

export class TapeProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = null;
        this.bufferLength = 0;
        this.bufferSampleRate = 48000;

        this.start = 0.0;
        this.end = 1.0;
        this.speed = 1.0;
        this.loop = false;
        this.retrigger = true;
        this.startPatched = false;
        this.endPatched = false;
        this.snapMode = false;
        this.chops = [];

        this.pointer = 0.0;
        this.isPlaying = false;
        this.lastGateHi = false;
        this.firstPass = true;
        this.isManualPlay = false;

        this.lastEffStart = 0.0;
        this.lastEffEnd = 1.0;
        this.lastReportedStart = -1.0;
        this.lastReportedEnd = -1.0;
        this.lastReportedPos = 0.0;
        this.lastReportedPlaying = false;
        this.reportCounter = 0;

        this.port.onmessage = (e) => {
            const data = e.data;
            if (!data) return;

            if (data.type === 'SET_BUFFER') {
                if (data.buffer && data.buffer.length > 0) {
                    this.buffer = new Float32Array(data.buffer);
                    this.bufferLength = this.buffer.length;
                    this.bufferSampleRate = data.sampleRate || 48000;
                    const eff = this.getEffectiveStartEnd(0.0, 0.0);
                    this.pointer = Math.max(0, Math.min(this.bufferLength - 1, eff.start * this.bufferLength));
                }
            } else if (data.type === 'SET_PARAMS') {
                if (data.start !== undefined) this.start = Math.max(0.0, Math.min(1.0, data.start));
                if (data.end !== undefined) this.end = Math.max(0.0, Math.min(1.0, data.end));
                if (data.speed !== undefined) this.speed = Math.max(0.05, Math.min(8.0, data.speed));
                if (data.loop !== undefined) this.loop = Boolean(data.loop);
                if (data.retrigger !== undefined) this.retrigger = Boolean(data.retrigger);
                if (data.startPatched !== undefined) this.startPatched = Boolean(data.startPatched);
                if (data.endPatched !== undefined) this.endPatched = Boolean(data.endPatched);
                if (data.snapMode !== undefined) this.snapMode = Boolean(data.snapMode);
                if (Array.isArray(data.chops)) this.chops = data.chops.map(x => Math.max(0.0, Math.min(1.0, x)));
            } else if (data.type === 'PLAY') {
                this.isManualPlay = true;
                this.triggerPlay();
                this.reportState();
            } else if (data.type === 'TRIGGER') {
                this.isManualPlay = false;
                this.triggerPlay();
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
                const eff = this.getEffectiveStartEnd(0.0, 0.0);
                this.pointer = Math.max(0, Math.min(this.bufferLength - 1, eff.start * this.bufferLength));
                this.lastGateHi = false;
                this.reportState();
            }
        };
    }

    getEffectiveStartEnd(cvS = 0.0, cvE = 0.0) {
        let baseStart = this.startPatched ? 0.0 : this.start;
        let baseEnd = this.endPatched ? 0.0 : this.end;
        let s = baseStart + cvS;
        let e = baseEnd + cvE;

        if (this.snapMode && Array.isArray(this.chops) && this.chops.length > 0) {
            const pts = [0.0, ...this.chops, 1.0].sort((a, b) => a - b);
            const N = pts.length - 1;
            if (this.startPatched) {
                // Scale-ledger uniform quantize: 0V~1V is divided into N equal segments
                const frac = Math.max(0.0, Math.min(0.999999, cvS));
                const idx = Math.min(N - 1, Math.max(0, Math.floor(frac * N)));
                s = pts[idx];
                if (!this.endPatched) {
                    e = pts[idx + 1];
                }
            } else {
                // Internal slider: snap to nearest slice start
                let idx = 0;
                for (let i = 0; i < N; i++) {
                    if (s >= pts[i] && (i === N - 1 || s < pts[i + 1])) {
                        idx = i;
                        break;
                    }
                }
                s = pts[idx];
                if (!this.endPatched) {
                    e = pts[idx + 1];
                }
            }
        }
        return {
            start: Math.max(0.0, Math.min(1.0, s)),
            end: Math.max(0.0, Math.min(1.0, e))
        };
    }

    triggerPlay(cvStart = 0.0) {
        if (!this.buffer || this.bufferLength === 0) {
            this.isPlaying = false;
            return;
        }
        const eff = this.getEffectiveStartEnd(cvStart, 0.0);
        this.pointer = Math.max(0, Math.min(this.bufferLength - 1, eff.start * this.bufferLength));
        this.isPlaying = true;
        this.firstPass = true;
    }

    reportState() {
        const normPos = this.bufferLength > 0 ? (this.pointer / this.bufferLength) : 0.0;
        this.lastReportedPlaying = this.isPlaying;
        this.lastReportedPos = normPos;
        this.lastReportedStart = this.lastEffStart;
        this.lastReportedEnd = this.lastEffEnd;
        this.port.postMessage({
            type: 'STATE',
            pos: normPos,
            isPlaying: this.isPlaying,
            effStart: this.lastEffStart,
            effEnd: this.lastEffEnd
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
                               Math.abs((this.lastReportedEnd ?? -1) - this.lastEffEnd) > 0.002;
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
                    this.triggerPlay(cvS);
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

            // Speed CV: -2.0V ~ +2.0V (CV=2 => 2^2 = 4x, CV=0 => 1x, CV=-2 => 2^-2 = 0.25x)
            let rate = this.speed;
            if (speedCvIn) {
                const clampedCv = Math.max(-2.0, Math.min(2.0, speedCvIn[i]));
                const cvMultiplier = Math.pow(2.0, clampedCv);
                rate = this.speed * cvMultiplier;
            }
            const step = direction * rate * rateRatio;

            // Read sample using linear interpolation (lerp)
            const p = Math.max(0, Math.min(bufLen - 1, this.pointer));
            const idx = Math.floor(p);
            const frac = p - idx;
            const s0 = buf[idx];
            const s1 = (idx + 1 < bufLen) ? buf[idx + 1] : s0;
            out[i] = s0 * (1.0 - frac) + s1 * frac;

            // Advance pointer
            this.pointer += step;

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
                           Math.abs((this.lastReportedEnd ?? -1) - this.lastEffEnd) > 0.002;
        if (this.reportCounter >= 6 || this.lastReportedPlaying !== this.isPlaying || effChanged) {
            this.reportCounter = 0;
            this.reportState();
        }

        return true;
    }
}

registerProcessor('tape-processor', TapeProcessor);
try {
    registerProcessor('wave-processor', TapeProcessor);
} catch (_) {}

