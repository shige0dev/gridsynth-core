export const SCALE = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'scale-processor', {
            numberOfInputs: 2,
            numberOfOutputs: 2
        });
        w.port.postMessage({
            type: 'SET_CONFIG',
            rootMidi: d.root ?? 0,
            mask: d.mask || [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0],
            hasTrig: patch.has('trig_in')
        });

        const cvIn = ctx.createGain();
        const trgIn = ctx.createGain();
        const cvOut = ctx.createGain();
        const gtOut = ctx.createGain();

        cvIn.connect(w, 0, 0);
        trgIn.connect(w, 0, 1);
        w.connect(cvOut, 0, 0);
        w.connect(gtOut, 1, 0);

        // Keepalive
        if (eng?.silentSink) gtOut.connect(eng.silentSink);

        let liveData = { activeSemi: -1, cv: 0 };
        w.port.onmessage = (e) => {
            if (e.data.type === 'STATE') {
                liveData = e.data;
            }
        };

        return {
            nodes: { w, cvIn, trgIn, cvOut, gtOut },
            inputs: { cv_in: cvIn, trig_in: trgIn },
            outputs: { cv_out: cvOut, gate_out: gtOut },
            read: () => liveData
        };
    },
    update: (ctx, inst, d, patch) => {
        if (inst?.nodes?.w) {
            inst.nodes.w.port.postMessage({
                type: 'SET_CONFIG',
                rootMidi: d.root ?? 0,
                mask: d.mask,
                hasTrig: patch.has('trig_in')
            });
        }
    }
};

export const scaleAudioDefs = { SCALE };
