// src/dsp/wave-grain-shifter.js

const TWO_PI = Math.PI * 2.0;

/**
 * Lightweight WSOLA (Waveform Similarity Overlap-Add) Dual-Grain Pitch Shifter.
 * Keeps playback time/duration fixed while shifting pitch via two 180-degree out-of-phase
 * Hann-windowed read heads with 2-stage coarse-to-fine phase alignment on grain reset.
 */
export class WaveGrainShifter {
    constructor(grainDurationSec = 0.068) {
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
     * 2-stage coarse-to-fine WSOLA phase alignment search.
     * Finds the offset near `targetPos` whose waveform best matches the active head at `refPos`
     * so that peaks/troughs align during the Hann crossfade without phase cancellation.
     */
    findAlignedPosition(buf, bufLen, targetPos, refPos, direction, minB, maxB, sr) {
        const minI = Math.max(0, Math.floor(minB));
        const maxI = Math.min(bufLen - 1, Math.ceil(maxB));
        const span = maxI - minI;
        if (span < 256) return targetPos;

        const maxRadius = Math.min(Math.floor(sr * 0.015), Math.floor(span * 0.22));
        const corrLen = Math.min(Math.floor(sr * 0.010), Math.floor(span * 0.18));
        if (maxRadius < 16 || corrLen < 32) return targetPos;

        const dirSign = direction >= 0 ? 1 : -1;
        const refBase = Math.round(this.wrapInSlice(refPos, minI, maxI));
        const targetBase = Math.round(this.wrapInSlice(targetPos, minI, maxI));

        // Stage 1: Coarse search (step = 4 samples, template stride = 8)
        let bestCoarseDelta = 0;
        let bestCoarseErr = Infinity;

        for (let delta = -maxRadius; delta <= maxRadius; delta += 4) {
            let err = (delta * delta) * 1e-10;
            const candStart = targetBase + delta;
            for (let j = 0; j < corrLen; j += 8) {
                const stepJ = j * dirSign;
                let rIdx = refBase + stepJ;
                if (rIdx > maxI) rIdx = minI + ((rIdx - minI) % span);
                else if (rIdx < minI) rIdx = maxI - ((minI - rIdx) % span);

                let cIdx = candStart + stepJ;
                if (cIdx > maxI) cIdx = minI + ((cIdx - minI) % span);
                else if (cIdx < minI) cIdx = maxI - ((minI - cIdx) % span);

                const diff = buf[rIdx] - buf[cIdx];
                err += diff * diff;
                if (err >= bestCoarseErr) break;
            }
            if (err < bestCoarseErr) {
                bestCoarseErr = err;
                bestCoarseDelta = delta;
            }
        }

        // Stage 2: Fine search around bestCoarseDelta (step = 1 sample, template stride = 4)
        let bestDelta = bestCoarseDelta;
        let bestFineErr = Infinity;
        const fineMin = Math.max(-maxRadius, bestCoarseDelta - 4);
        const fineMax = Math.min(maxRadius, bestCoarseDelta + 4);

        for (let delta = fineMin; delta <= fineMax; delta += 1) {
            let err = (delta * delta) * 1e-10;
            const candStart = targetBase + delta;
            for (let j = 0; j < corrLen; j += 4) {
                const stepJ = j * dirSign;
                let rIdx = refBase + stepJ;
                if (rIdx > maxI) rIdx = minI + ((rIdx - minI) % span);
                else if (rIdx < minI) rIdx = maxI - ((minI - rIdx) % span);

                let cIdx = candStart + stepJ;
                if (cIdx > maxI) cIdx = minI + ((cIdx - minI) % span);
                else if (cIdx < minI) cIdx = maxI - ((minI - cIdx) % span);

                const diff = buf[rIdx] - buf[cIdx];
                err += diff * diff;
                if (err >= bestFineErr) break;
            }
            if (err < bestFineErr) {
                bestFineErr = err;
                bestDelta = delta;
            }
        }

        return targetPos + bestDelta;
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

        const minB = Math.min(effStart, effEnd);
        const maxB = Math.max(effStart, effEnd);

        const grainSamples = Math.max(512, Math.round(this.grainDurationSec * sr));
        const phaseInc = 1.0 / grainSamples;
        const prevPhase = this.phase;
        let nextPhase = prevPhase + phaseInc;

        // Grain A wraps at 1.0 -> 0.0 (where wA == 0.0 and Grain B is at peak wB == 1.0)
        if (nextPhase >= 1.0) {
            nextPhase -= 1.0;
            this.headA = this.findAlignedPosition(buf, bufLen, basePointer, this.headB, direction, minB, maxB, sr);
        }

        // Grain B wraps when phase crosses 0.5 (where wB == 0.0 and Grain A is at peak wA == 1.0)
        if (prevPhase < 0.5 && nextPhase >= 0.5) {
            this.headB = this.findAlignedPosition(buf, bufLen, basePointer, this.headA, direction, minB, maxB, sr);
        }

        this.phase = nextPhase;

        // Hann window weights: wA + wB === 1.0
        const wA = 0.5 * (1.0 - Math.cos(TWO_PI * nextPhase));
        const wB = 1.0 - wA;

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

