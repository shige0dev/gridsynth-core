function parseKeyNoteToCv(val) {
    if (typeof val === 'number') return val;
    if (typeof val !== 'string') return 1.0;
    const s = val.trim();
    const num = Number(s);
    if (!isNaN(num)) return num;
    const m = s.match(/^([a-gA-G])([#bB]?)(-?\d+)?$/);
    if (!m) return 1.0;
    const letter = m[1].toUpperCase();
    const accidental = m[2] || '';
    const oct = m[3] !== undefined ? parseInt(m[3], 10) : 2;
    const baseMap = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    let semi = baseMap[letter] ?? 0;
    if (accidental === '#') semi += 1;
    else if (accidental.toLowerCase() === 'b') semi -= 1;
    return (semi + (oct - 1) * 12) / 12.0;
}

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

