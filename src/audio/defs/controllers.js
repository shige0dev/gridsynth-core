import { parseKeyNoteToCv } from '../../core/musical.js?v=367';

function resolveKeyCv(d) {
    if (!d) return 1.0;
    if (d.cv !== undefined) return Number(d.cv);
    if (d.initialCv !== undefined) return Number(d.initialCv);
    if (d.lastNote !== undefined) return parseKeyNoteToCv(d.lastNote);
    if (d.note !== undefined) return parseKeyNoteToCv(d.note);
    if (d.currentMidi !== undefined) return (d.currentMidi - 24) / 12.0;
    if (d.octave !== undefined) return d.octave - 1.0;
    return 1.0;
}

export const KEY = {
    create: (ctx, d) => {
        const p = ctx.createConstantSource(), g = ctx.createConstantSource();
        const initCv = resolveKeyCv(d);
        p.offset.value = initCv;
        p.start();
        g.offset.value = 0.0;
        g.start();
        return { nodes: { p, g }, inputs: {}, outputs: { cv_out: p, gate_out: g } };
    },
    update: (ctx, inst, d) => {
        if (inst?.nodes?.p && ctx) {
            const cv = resolveKeyCv(d);
            inst.nodes.p.offset.setTargetAtTime(cv, ctx.currentTime, 0.005);
        }
    }
};

export const controllerAudioDefs = {
    KEY
};

