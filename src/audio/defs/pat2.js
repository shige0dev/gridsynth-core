import { PAT } from './pat.js';

export const PAT2 = {
    create: (ctx, d, patch, eng) => PAT.create(ctx, d, patch, eng),
    update: (ctx, inst, d, patch, eng) => PAT.update(ctx, inst, d, patch, eng)
};

export const pat2AudioDefs = {
    PAT2
};
