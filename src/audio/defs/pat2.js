import { PAT } from './pat.js';

export const PAT2 = {
    create: (ctx, d, patch, eng) => {
        const dCopy = { ...d, pattern: d.pattern || 'c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2' };
        return PAT.create(ctx, dCopy, patch, eng);
    },
    update: (ctx, inst, d, patch, eng) => PAT.update(ctx, inst, d, patch, eng)
};

export const pat2AudioDefs = {
    PAT2
};

