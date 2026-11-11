// Level Processor (Audio to Multi-Band CV Follower)
// 1 Input (Audio) -> 4 Outputs (Band 1..4 CV: 0.0V to 1.0V)

class LevelProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.sampleRate = 48000;
        this.bandsCount = 4;

        // Default frequency centers (Hz) and Q
        this.bands = [
            { freq: 100,  q: 1.0, sens: 1.8, env: 0.0, filter: null, type: 'lowpass' },
            { freq: 400,  q: 1.2, sens: 2.0, env: 0.0, filter: null, type: 'bandpass' },
            { freq: 2400, q: 1.2, sens: 2.2, env: 0.0, filter: null, type: 'bandpass' },
            { freq: 8000, q: 1.0, sens: 2.5, env: 0.0, filter: null, type: 'highpass' }
        ];

        this.attackCoeff = 0.05;   // ~5ms attack
        this.releaseCoeff = 0.003; // ~70ms decay/release

        this.updateCoeffs();

        this.msgCounter = 0;
        this.latestLevels = [0, 0, 0, 0];

        this.port.onmessage = (e) => {
            if (e.data.type === 'SET_PARAMS') {
                const p = e.data;
                if (p.bandsCount !== undefined) this.bandsCount = Math.max(1, Math.min(4, p.bandsCount));
                if (p.bands) {
                    p.bands.forEach((b, i) => {
                        if (this.bands[i]) {
                            if (b.freq !== undefined) this.bands[i].freq = b.freq;
                            if (b.q !== undefined) this.bands[i].q = b.q;
                            if (b.sens !== undefined) this.bands[i].sens = b.sens;
                            if (b.type !== undefined) this.bands[i].type = b.type;
                        }
                    });
                }
                if (p.attack !== undefined) this.attackCoeff = Math.max(0.001, Math.min(1.0, p.attack));
                if (p.release !== undefined) this.releaseCoeff = Math.max(0.0005, Math.min(0.5, p.release));
                this.updateCoeffs();
            }
        };
    }

    updateCoeffs() {
        const sr = (typeof sampleRate !== 'undefined') ? sampleRate : 48000;
        this.sampleRate = sr;

        for (let i = 0; i < 4; i++) {
            const b = this.bands[i];
            const f = Math.max(20, Math.min(sr * 0.48, b.freq));
            const q = Math.max(0.2, Math.min(20, b.q));
            const w0 = 2 * Math.PI * f / sr;
            const cosw0 = Math.cos(w0);
            const sinw0 = Math.sin(w0);
            const alpha = sinw0 / (2 * q);

            let b0 = 0, b1 = 0, b2 = 0, a0 = 1, a1 = 0, a2 = 0;

            if (b.type === 'lowpass') {
                b0 = (1 - cosw0) / 2;
                b1 = 1 - cosw0;
                b2 = (1 - cosw0) / 2;
                a0 = 1 + alpha;
                a1 = -2 * cosw0;
                a2 = 1 - alpha;
            } else if (b.type === 'highpass') {
                b0 = (1 + cosw0) / 2;
                b1 = -(1 + cosw0);
                b2 = (1 + cosw0) / 2;
                a0 = 1 + alpha;
                a1 = -2 * cosw0;
                a2 = 1 - alpha;
            } else {
                // bandpass (constant skirt gain, peak gain = Q)
                b0 = sinw0 / 2;
                b1 = 0;
                b2 = -sinw0 / 2;
                a0 = 1 + alpha;
                a1 = -2 * cosw0;
                a2 = 1 - alpha;
            }

            b.filter = {
                b0: b0 / a0,
                b1: b1 / a0,
                b2: b2 / a0,
                a1: a1 / a0,
                a2: a2 / a0,
                x1: 0, x2: 0,
                y1: 0, y2: 0
            };
        }
    }

    process(inputs, outputs) {
        const input = inputs[0];
        const inCh = (input && input.length > 0) ? input[0] : null;
        const blockLen = 128;

        if (!inCh) {
            // Decay envelopes to 0
            for (let i = 0; i < 4; i++) {
                this.bands[i].env *= 0.8;
                const outCh = outputs[i] && outputs[i][0];
                if (outCh) outCh.fill(0);
                this.latestLevels[i] = this.bands[i].env;
            }
            return true;
        }

        const len = inCh.length;

        for (let bIdx = 0; bIdx < 4; bIdx++) {
            const b = this.bands[bIdx];
            const out = outputs[bIdx] && outputs[bIdx][0];
            const isEnabled = bIdx < this.bandsCount;

            if (!isEnabled) {
                b.env = 0;
                if (out) out.fill(0);
                this.latestLevels[bIdx] = 0;
                continue;
            }

            const flt = b.filter;
            const b0 = flt.b0, b1 = flt.b1, b2 = flt.b2, a1 = flt.a1, a2 = flt.a2;
            let x1 = flt.x1, x2 = flt.x2, y1 = flt.y1, y2 = flt.y2;
            let env = b.env;
            const sens = b.sens;
            const att = this.attackCoeff;
            const rel = this.releaseCoeff;

            for (let i = 0; i < len; i++) {
                const x = inCh[i];
                // Biquad filter
                const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
                x2 = x1;
                x1 = x;
                y2 = y1;
                y1 = y;

                // Rectify
                const absVal = Math.abs(y);

                // Attack / Release envelope follower
                if (absVal > env) {
                    env += att * (absVal - env);
                } else {
                    env += rel * (absVal - env);
                }

                // Output scaled CV (clamped to 0.0 - 1.0)
                const cvVal = Math.min(1.0, Math.max(0.0, env * sens));
                if (out) out[i] = cvVal;
            }

            // Save filter state and current envelope
            flt.x1 = x1; flt.x2 = x2; flt.y1 = y1; flt.y2 = y2;
            b.env = env;
            this.latestLevels[bIdx] = Math.min(1.0, Math.max(0.0, env * sens));
        }

        // Post UI levels message periodically (~30fps: 48000/128/12 ~ 31Hz)
        this.msgCounter++;
        if (this.msgCounter >= 12) {
            this.msgCounter = 0;
            this.port.postMessage({
                type: 'LEVELS',
                levels: [
                    this.latestLevels[0],
                    this.latestLevels[1],
                    this.latestLevels[2],
                    this.latestLevels[3]
                ]
            });
        }

        return true;
    }
}

registerProcessor('level-processor', LevelProcessor);
