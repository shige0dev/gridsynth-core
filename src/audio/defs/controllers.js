export const KEY = {
    create: (ctx, d) => {
        const p = ctx.createConstantSource(), g = ctx.createConstantSource();
        p.offset.value = ((d.currentMidi ?? 60) - 24) / 12.0;
        p.start();
        g.offset.value = 0.0;
        g.start();
        return { nodes: { p, g }, inputs: {}, outputs: { cv_out: p, gate_out: g } };
    }
};

export const controllerAudioDefs = {
    KEY
};
