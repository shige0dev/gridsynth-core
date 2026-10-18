// src/dsp/wave-grain-shifter.js

const TWO_PI = Math.PI * 2.0;

/**
 * Lightweight Fixed-Crossfade Dual-Grain Pitch Shifter (No autocorrelation search).
 * Keeps playback time/duration fixed while shifting pitch via two 180-degree out-of-phase
 * Hann-windowed read heads.
 */
export class WaveGrainShifter {
    constructor(grainDurationSec = 0.036) {
        this.grainDurationSec = grainDurationSec;
        this.phase = 0.0;
        this.headA = 0.0;
        this.headB = 0.0;
        this.initialized = false;
    }

    reset(pointer = 0.0) {
        this.phase = 0.0;
        this.headA = pointer;
        this.headB = pointer;
        this.initialized = true;
    }

    readLerp(buf, bufLen, pos) {
        const clamped = Math.max(0.0, Math.min(bufLen - 1, pos));
        const idx = Math.floor(clamped);
        const frac = clamped - idx;
        const s0 = buf[idx];
        const s1 = (idx + 1 < bufLen) ? buf[idx + 1] : s0;
        return s0 + (s1 - s0) * frac;
    }

    wrapInSlice(pos, minB, maxB) {
        const span = maxB - minB;
        if (span <= 16.0) return Math.max(minB, Math.min(maxB, pos));
        if (pos > maxB) {
            return minB + ((pos - minB) % span);
        }
        if (pos < minB) {
            const rem = (minB - pos) % span;
            return rem === 0 ? minB : maxB - rem;
        }
        return pos;
    }

    /**
     * Computes one output sample in fixed-time pitch-shift mode.
     * @param {Float32Array} buf - Audio buffer
     * @param {number} bufLen - Buffer length in samples
     * @param {number} basePointer - Current 1.0x playback pointer
     * @param {number} pitchRatio - Pitch multiplier (e.g. 0.25 to 4.0)
     * @param {number} direction - +1.0 (forward) or -1.0 (reverse)
     * @param {number} rateRatio - bufferSampleRate / audioContextSampleRate
     * @param {number} effStart - Effective start sample index
     * @param {number} effEnd - Effective end sample index
     * @param {number} sr - AudioContext sample rate
     */
    processSample(buf, bufLen, basePointer, pitchRatio, direction, rateRatio, effStart, effEnd, sr = 48000) {
        if (!this.initialized) {
            this.reset(basePointer);
        }

        // Bit-perfect bypass when pitch is at unity (1.0x)
        if (Math.abs(pitchRatio - 1.0) < 0.002) {
            this.headA = basePointer;
            this.headB = basePointer;
            return this.readLerp(buf, bufLen, basePointer);
        }

        const grainSamples = Math.max(256, Math.round(this.grainDurationSec * sr));
        const phaseInc = 1.0 / grainSamples;
        const prevPhase = this.phase;
        let nextPhase = prevPhase + phaseInc;

        // Grain A wraps at 1.0 -> 0.0 (where wA == 0.0)
        if (nextPhase >= 1.0) {
            nextPhase -= 1.0;
            this.headA = basePointer;
        }

        // Grain B wraps when phase crosses 0.5 (where pB == 0.0 and wB == 0.0)
        if (prevPhase < 0.5 && nextPhase >= 0.5) {
            this.headB = basePointer;
        }

        this.phase = nextPhase;

        // Hann window weights: wA + wB === 1.0
        const wA = 0.5 * (1.0 - Math.cos(TWO_PI * nextPhase));
        const wB = 1.0 - wA;

        const minB = Math.min(effStart, effEnd);
        const maxB = Math.max(effStart, effEnd);

        const posA = this.wrapInSlice(this.headA, minB, maxB);
        const posB = this.wrapInSlice(this.headB, minB, maxB);

        const sampleA = this.readLerp(buf, bufLen, posA);
        const sampleB = this.readLerp(buf, bufLen, posB);

        const grainStep = direction * pitchRatio * rateRatio;
        this.headA += grainStep;
        this.headB += grainStep;

        return sampleA * wA + sampleB * wB;
    }
}

export default WaveGrainShifter;
