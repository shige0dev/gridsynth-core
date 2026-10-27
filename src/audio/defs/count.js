import { AudioHelpers } from '../helpers.js';

export const COUNT = {
    create: (ctx, d, patch, eng) => {
        const count = d?.count ?? 8;
        const w = new AudioWorkletNode(ctx, 'count-processor', {
            numberOfInputs: 2,
            numberOfOutputs: 2,
            processorOptions: { count }
        });
        w.port.postMessage({ type: 'SET_COUNT', count });

        const gIn = ctx.createGain();
        const tIn = ctx.createGain();

        const gOut = ctx.createGain();
        const tOut = ctx.createGain();

        gIn.connect(w, 0, 0);
        tIn.connect(w, 0, 1);

        w.connect(gOut, 0, 0);
        w.connect(tOut, 1, 0);

        if (eng?.silentSink) {
            gOut.connect(eng.silentSink);
            tOut.connect(eng.silentSink);
        }

        let curCount = 0;
        let isOpen = false;
        w.port.onmessage = e => {
            if (e.data.type === 'STATE') {
                curCount = e.data.count;
                isOpen = e.data.isOpen;
            }
        };

        return {
            nodes: { w, gIn, tIn, gOut, tOut },
            inputs: {
                gate_in: gIn,
                in: gIn,
                clk_in: gIn,
                trans_in: tIn,
                transition_in: tIn,
                trig_in: tIn
            },
            outputs: {
                gate_out: gOut,
                out: gOut,
                trans_out: tOut,
                transition_out: tOut,
                eos_out: tOut,
                eos: tOut
            },
            fire: () => w.port.postMessage({ type: 'FIRE' }),
            reset: () => w.port.postMessage({ type: 'RESET' }),
            read: () => ({ count: curCount, isOpen })
        };
    },
    update: (ctx, inst, d) => {
        if (d?.count !== undefined && inst?.nodes?.w) {
            inst.nodes.w.port.postMessage({ type: 'SET_COUNT', count: d.count });
        }
    }
};

export const countAudioDefs = {
    COUNT
};
