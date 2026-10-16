import { AudioHelpers } from '../helpers.js';

let _softClipCurve = null;
const getSoftClipCurve = () => {
    if (!_softClipCurve) {
        _softClipCurve = new Float32Array(512);
        for (let i = 0; i < 512; i++) {
            const x = (i * 2) / 511 - 1;
            _softClipCurve[i] = Math.tanh(x * 1.25) / Math.tanh(1.25);
        }
    }
    return _softClipCurve;
};

export const VCA = {
    create: (ctx, d, patch) => {
        const vca = ctx.createGain(), cv = ctx.createGain(), an = ctx.createAnalyser(); an.fftSize = 256;
        vca.gain.value = patch.has('cv_in') ? 0.0 : (d.level ?? 1.0); cv.gain.value = d.cvDepth ?? 1.0;
        cv.connect(vca.gain); cv.connect(an);
        const buf = new Float32Array(an.frequencyBinCount);
        return {
            nodes: { vca, cv, an },
            inputs: { wave_in: vca, cv_in: cv },
            outputs: { wave_out: vca },
            read: () => {
                an.getFloatTimeDomainData(buf);
                return { values: [buf[0] || 0], hasCvIn: patch.has('cv_in') };
            }
        };
    },
    update: (ctx, inst, d, patch) => {
        AudioHelpers.set(inst.nodes.vca.gain, patch.has('cv_in') ? 0.0 : (d.level ?? 1.0), ctx);
        AudioHelpers.set(inst.nodes.cv.gain, d.cvDepth ?? 1.0, ctx);
    }
};

export const MIX = {
    create: (ctx, d) => {
        const sumBus = ctx.createGain();
        const out = ctx.createGain();

        // Always-on limiter (fast compressor) to prevent digital clipping
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -1.0;
        limiter.knee.value = 3.0;
        limiter.ratio.value = 20.0;
        limiter.attack.value = 0.001;
        limiter.release.value = 0.06;

        // Soft-clipper shaper to smoothly catch transients without harsh digital clipping
        const shaper = ctx.createWaveShaper();
        shaper.curve = getSoftClipCurve();
        shaper.oversample = '2x';

        // Level & clipping detector analyser
        const an = ctx.createAnalyser();
        an.fftSize = 64;
        const buf = new Float32Array(an.frequencyBinCount);

        sumBus.connect(an);
        sumBus.connect(limiter);
        limiter.connect(shaper);
        shaper.connect(out);

        const inputs = {}, nodes = { sumBus, limiter, shaper, an, out };
        for (let c = 1; c <= 4; c++) {
            const inG = ctx.createGain();
            inG.gain.value = d[`lvl${c}`] ?? 1.0;
            inG.connect(sumBus);
            inputs[`wave_in${c}`] = inG;
            inputs[`in${c}`] = inG;
            nodes[`in${c}`] = inG;
        }

        let clipHoldUntil = 0;

        return {
            nodes,
            inputs,
            outputs: { wave_out: out },
            read: () => {
                an.getFloatTimeDomainData(buf);
                let peak = 0;
                for (let i = 0; i < buf.length; i++) {
                    const a = Math.abs(buf[i]);
                    if (a > peak) peak = a;
                }
                const isClipNow = peak >= 1.05 || (typeof limiter.reduction === 'number' && limiter.reduction < -2.5);
                const now = performance.now();
                if (isClipNow) {
                    clipHoldUntil = now + 140;
                }
                return {
                    peak,
                    isClipping: now < clipHoldUntil
                };
            }
        };
    },
    update: (ctx, inst, d) => {
        for (let c = 1; c <= 4; c++) {
            if (inst.nodes[`in${c}`] && d[`lvl${c}`] !== undefined) AudioHelpers.set(inst.nodes[`in${c}`].gain, d[`lvl${c}`], ctx);
        }
    }
};

export const SLIDER = {
    create: (ctx, d) => {
        const s = ctx.createConstantSource();
        s.offset.value = d.vol ?? 0.7;
        s.start();
        return { nodes: { s }, inputs: {}, outputs: { cv_out: s } };
    },
    update: (ctx, inst, d) => AudioHelpers.set(inst.nodes.s.offset, d.vol ?? 0.7, ctx)
};

export const ampAudioDefs = {
    VCA,
    MIX,
    SLIDER
};
