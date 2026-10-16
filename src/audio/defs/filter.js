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

export const filterAudioDefs = {
    VCF
};
