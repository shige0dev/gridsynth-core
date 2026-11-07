import { AudioHelpers } from '../helpers.js';

export const VALUE = {
    create: (ctx, d, patch, eng) => {
        const s = ctx.createConstantSource();
        const g = ctx.createGain();
        s.offset.value = d.val ?? (d.def ?? 0.0);
        s.connect(g);
        s.start();
        if (eng?.silentSink) g.connect(eng.silentSink);
        return {
            nodes: { s, g },
            inputs: {},
            outputs: { cv_out: g },
            read: () => ({ val: s.offset.value })
        };
    },
    update: (ctx, inst, d) => {
        const targetVal = d.val ?? (d.def ?? 0.0);
        AudioHelpers.set(inst.nodes.s.offset, targetVal, ctx);
    }
};

export const valAudioDefs = {
    VALUE
};
export default valAudioDefs;


