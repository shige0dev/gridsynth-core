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
        this.loop = true;

        this.pointer = 0.0;
        this.isPlaying = false;
        this.lastGateHi = false;

        this.lastReportedPos = 0.0;
        this.lastReportedPlaying = false;

        this.port.onmessage = (e) => {
            const data = e.data;
            if (!data) return;

            if (data.type === 'SET_BUFFER') {
                if (data.buffer && data.buffer.length > 0) {
                    this.buffer = new Float32Array(data.buffer);
                    this.bufferLength = this.buffer.length;
                    this.bufferSampleRate = data.sampleRate || 48000;
                    // Reset pointer to current effectiveStart
                    this.pointer = Math.max(0, Math.min(this.bufferLength - 1, this.start * this.bufferLength));
                }
            } else if (data.type === 'SET_PARAMS') {
                if (data.start !== undefined) this.start = Math.max(0.0, Math.min(1.0, data.start));
                if (data.end !== undefined) this.end = Math.max(0.0, Math.min(1.0, data.end));
                if (data.speed !== undefined) this.speed = Math.max(0.05, Math.min(8.0, data.speed));
                if (data.loop !== undefined) this.loop = Boolean(data.loop);
            } else if (data.type === 'TRIGGER' || data.type === 'PLAY') {
                this.triggerPlay();
            } else if (data.type === 'STOP') {
                this.isPlaying = false;
                this.reportState();
            } else if (data.type === 'RESET') {
                this.isPlaying = false;
                this.pointer = Math.max(0, Math.min(this.bufferLength - 1, this.start * this.bufferLength));
                this.lastGateHi = false;
                this.reportState();
            }
        };
    }

    triggerPlay(cvStart = 0.0) {
        if (!this.buffer || this.bufferLength === 0) return;
        const effStart = Math.max(0.0, Math.min(1.0, this.start + cvStart)) * this.bufferLength;
        this.pointer = Math.max(0, Math.min(this.bufferLength - 1, effStart));
        this.isPlaying = true;
    }

    reportState() {
        const normPos = this.bufferLength > 0 ? (this.pointer / this.bufferLength) : 0.0;
        this.port.postMessage({
            type: 'STATE',
            pos: normPos,
            isPlaying: this.isPlaying
        });
    }

    process(inputs, outputs) {
        const out = outputs[0] ? outputs[0][0] : null;
        const len = out ? out.length : 128;
        const sr = sampleRate || 48000;

        if (!out) return true;

        if (!this.buffer || this.bufferLength === 0) {
            for (let i = 0; i < len; i++) out[i] = 0.0;
            return true;
        }

        const gateIn = inputs[0] ? inputs[0][0] : null;
        const startCvIn = inputs[1] ? inputs[1][0] : null;
        const endCvIn = inputs[2] ? inputs[2][0] : null;
        const speedCvIn = inputs[3] ? inputs[3][0] : null;

        const buf = this.buffer;
        const bufLen = this.bufferLength;
        const rateRatio = this.bufferSampleRate / sr;

        for (let i = 0; i < len; i++) {
            // Rising edge trigger detection on gate_in
            const gateVal = gateIn ? gateIn[i] : 0.0;
            const isGateHi = gateVal > 0.3;
            if (isGateHi && !this.lastGateHi) {
                const cvS = startCvIn ? startCvIn[i] : 0.0;
                this.triggerPlay(cvS);
            }
            this.lastGateHi = isGateHi;

            if (!this.isPlaying) {
                out[i] = 0.0;
                continue;
            }

            // Current CV modulation inputs
            const cvS = startCvIn ? startCvIn[i] : 0.0;
            const cvE = endCvIn ? endCvIn[i] : 0.0;

            const effStartNorm = Math.max(0.0, Math.min(1.0, this.start + cvS));
            const effEndNorm = Math.max(0.0, Math.min(1.0, this.end + cvE));

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
            if (direction > 0) {
                if (this.pointer >= effEnd) {
                    if (this.loop) {
                        this.pointer = effStart;
                    } else {
                        this.pointer = effEnd;
                        this.isPlaying = false;
                    }
                }
            } else {
                if (this.pointer <= effEnd) {
                    if (this.loop) {
                        this.pointer = effStart;
                    } else {
                        this.pointer = effEnd;
                        this.isPlaying = false;
                    }
                }
            }
        }

        // Periodic state reporting for UI playhead animation (~60Hz)
        this.reportState();

        return true;
    }
}

registerProcessor('tape-processor', TapeProcessor);

