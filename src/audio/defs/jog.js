import { AudioHelpers } from '../helpers.js';

export const JOG = {
    create: (ctx, d) => {
        const s = ctx.createConstantSource();
        s.offset.value = d.val ?? (d.def ?? 0.0);
        s.start();
        return {
            nodes: { s },
            inputs: {},
            outputs: { cv_out: s },
            read: () => ({ val: s.offset.value })
        };
    },
    update: (ctx, inst, d) => {
        const targetVal = d.val ?? (d.def ?? 0.0);
        AudioHelpers.set(inst.nodes.s.offset, targetVal, ctx);
    }
};
