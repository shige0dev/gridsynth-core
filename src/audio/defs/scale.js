export const SCALE = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'scale-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1
        });
        w.port.postMessage({
            type: 'SET_CONFIG',
            rootMidi: d.root ?? 0,
            mask: d.mask || [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0]
        });

        const cvIn = ctx.createGain();
        const cvOut = ctx.createGain();

        cvIn.connect(w, 0, 0);
        w.connect(cvOut, 0, 0);

        // Keepalive (無接続時でもWorkletが停止しないように)
        if (eng?.silentSink) cvOut.connect(eng.silentSink);

        let liveData = { activeSemi: -1, cv: 0 };
        w.port.onmessage = (e) => {
            if (e.data.type === 'STATE') {
                liveData = e.data;
            }
        };

        return {
            nodes: { w, cvIn, cvOut },
            inputs: { cv_in: cvIn },
            outputs: { cv_out: cvOut },
            read: () => liveData
        };
    },
    update: (ctx, inst, d) => {
        if (inst?.nodes?.w) {
            inst.nodes.w.port.postMessage({
                type: 'SET_CONFIG',
                rootMidi: d.root ?? 0,
                mask: d.mask
            });
        }
    }
};

export const scaleAudioDefs = { SCALE };
