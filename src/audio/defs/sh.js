// src/audio/defs/sh.js
import { AudioHelpers } from '../helpers.js';

export const SWITCH = {
    create: (ctx, d) => {
        const g = ctx.createGain();
        g.gain.value = d.state !== false ? 1.0 : 0.0;
        return {
            nodes: { g },
            inputs: { cv_in: g },
            outputs: { cv_out: g }
        };
    },
    update: (ctx, inst, d) => AudioHelpers.set(inst.nodes.g.gain, d.state !== false ? 1.0 : 0.0, ctx, 0.003)
};

export const SH = {
    create: (ctx, d, patch) => {
        const w = new AudioWorkletNode(ctx, 'sh-processor', {
            numberOfInputs: 2,
            numberOfOutputs: 1,
            parameterData: {
                glide: d.glide ?? 0.0,
                scale: d.scale ?? 1.0
            }
        });
        const hasExternalSig = patch.has('cv_in') || patch.has('sig_in');
        w.port.postMessage({ type: 'SET_CONFIG', hasExternalSig, polarity: d.polarity || 'unipolar' });

        const sig = ctx.createGain(), trg = ctx.createGain(), out = ctx.createGain(), an = ctx.createAnalyser();
        an.fftSize = 256;
        sig.connect(w, 0, 0);
        trg.connect(w, 0, 1);
        w.connect(out);
        out.connect(an);

        const buf = new Float32Array(an.frequencyBinCount);
        return {
            nodes: { w, sig, trg, out, an },
            inputs: { cv_in: sig, sig_in: sig, trig_in: trg },
            outputs: { cv_out: out },
            read: () => {
                an.getFloatTimeDomainData(buf);
                return { values: [buf[0] || 0] };
            }
        };
    },
    update: (ctx, inst, d, patch) => {
        if (d.glide !== undefined) AudioHelpers.set(inst.nodes.w.parameters.get('glide'), d.glide, ctx);
        if (d.scale !== undefined) AudioHelpers.set(inst.nodes.w.parameters.get('scale'), d.scale, ctx);
        const hasExternalSig = patch.has('cv_in') || patch.has('sig_in');
        inst.nodes.w.port.postMessage({ type: 'SET_CONFIG', hasExternalSig, polarity: d.polarity || 'unipolar' });
    }
};

