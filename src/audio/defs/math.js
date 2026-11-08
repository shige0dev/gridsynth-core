// src/audio/defs/math.js

const createMathAudio = (ctx, d, patch, eng, hasTwoInputs) => {
    const gA = ctx.createGain(), out = ctx.createGain(), an = ctx.createAnalyser();
    const gB = hasTwoInputs ? ctx.createGain() : null;
    an.fftSize = 256;
    out.connect(an);
    if (eng?.silentSink) out.connect(eng.silentSink);

    const w = new AudioWorkletNode(ctx, 'math-processor', { numberOfInputs: 2, numberOfOutputs: 1 });
    const hasA = patch?.has('cv_in_a') || patch?.has('cv_ina') || patch?.has('in_a') || false;
    const hasB = hasTwoInputs ? (patch?.has('cv_in_b') || patch?.has('cv_inb') || patch?.has('in_b') || false) : false;

    w.port.postMessage({
        type: 'SET_PARAMS',
        mode: d.mode || (hasTwoInputs ? 'ADD' : 'ABS'),
        valA: d.valA ?? 0.0,
        valB: hasTwoInputs ? (d.valB ?? 1.0) : 0.0,
        hasA,
        hasB
    });

    gA.connect(w, 0, 0);
    if (gB) gB.connect(w, 0, 1);
    w.connect(out);

    const buf = new Float32Array(an.frequencyBinCount);
    const nodes = { gA, out, an, w };
    if (gB) nodes.gB = gB;

    const inputs = { cv_in_a: gA };
    if (gB) inputs.cv_in_b = gB;

    return {
        nodes,
        inputs,
        outputs: { cv_out: out },
        read: () => {
            an.getFloatTimeDomainData(buf);
            return { values: [buf[0] || 0] };
        }
    };
};

const updateMathAudio = (inst, d, patch, hasTwoInputs) => {
    const hasA = patch?.has('cv_in_a') || patch?.has('cv_ina') || patch?.has('in_a') || false;
    const hasB = hasTwoInputs ? (patch?.has('cv_in_b') || patch?.has('cv_inb') || patch?.has('in_b') || false) : false;
    inst.nodes.w.port.postMessage({
        type: 'SET_PARAMS',
        mode: d.mode || (hasTwoInputs ? 'ADD' : 'ABS'),
        valA: d.valA ?? 0.0,
        valB: hasTwoInputs ? (d.valB ?? 1.0) : 0.0,
        hasA,
        hasB
    });
};

export const MATH1 = {
    create: (ctx, d, patch, eng) => createMathAudio(ctx, d, patch, eng, false),
    update: (ctx, inst, d, patch) => updateMathAudio(inst, d, patch, false)
};

export const MATH2 = {
    create: (ctx, d, patch, eng) => createMathAudio(ctx, d, patch, eng, true),
    update: (ctx, inst, d, patch) => updateMathAudio(inst, d, patch, true)
};

