import { AudioHelpers } from '../helpers.js';

export const VCF = {
    create: (ctx, d, patch) => {
        const f = ctx.createBiquadFilter(), cv = ctx.createGain();
        f.type = (d.filterType || 'lowpass').toLowerCase(); f.frequency.value = d.cutoff || 1800; f.Q.value = d.q || 2.5;
        cv.gain.value = d.modDepth !== undefined ? d.modDepth : 1200; cv.connect(f.detune);
        return { nodes: { f, cv }, inputs: { wave_in: f, cv_in: cv }, outputs: { wave_out: f } };
    },
    update: (ctx, inst, d, patch) => {
        AudioHelpers.set(inst.nodes.f.frequency, d.cutoff || 1800, ctx); AudioHelpers.set(inst.nodes.f.Q, d.q || 2.5, ctx);
        inst.nodes.f.type = (d.filterType || 'lowpass').toLowerCase();
        AudioHelpers.set(inst.nodes.cv.gain, d.modDepth !== undefined ? d.modDepth : 1200, ctx);
    }
};

export const FOLD = {
    create: (ctx, d, patch) => {
        const inp = ctx.createGain();
        const out = ctx.createGain();
        const fCv = ctx.createGain();

        const w = new AudioWorkletNode(ctx, 'fold-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            parameterData: {
                fold: patch.has('fold_cv') ? 0.0 : (d.fold ?? 1.5),
                bias: d.bias ?? 0.0,
                mix: d.mix ?? 1.0
            }
        });

        if (d.shape) {
            w.port.postMessage({ type: 'SET_SHAPE', mode: d.shape });
        }

        fCv.gain.value = 3.0;
        fCv.connect(w.parameters.get('fold'));

        inp.connect(w);
        w.connect(out);

        return {
            nodes: { inp, out, fCv, w },
            inputs: { wave_in: inp, fold_cv: fCv },
            outputs: { wave_out: out }
        };
    },
    update: (ctx, inst, d, patch) => {
        AudioHelpers.set(inst.nodes.w.parameters.get('fold'), patch.has('fold_cv') ? 0.0 : (d.fold ?? 1.5), ctx);
        AudioHelpers.set(inst.nodes.w.parameters.get('bias'), d.bias ?? 0.0, ctx);
        AudioHelpers.set(inst.nodes.w.parameters.get('mix'), d.mix ?? 1.0, ctx);
        if (d.shape) {
            inst.nodes.w.port.postMessage({ type: 'SET_SHAPE', mode: d.shape });
        }
    }
};

export const filterAudioDefs = {
    VCF,
    FOLD
};