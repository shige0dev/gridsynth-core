import { AudioHelpers } from '../helpers.js';

export const PASS = {
    create: (ctx, d, patch, eng) => {
        const count = d?.count ?? 8;
        const w = new AudioWorkletNode(ctx, 'pass-processor', {
            numberOfInputs: 3,
            numberOfOutputs: 3,
            processorOptions: { count }
        });
        w.port.postMessage({ type: 'SET_COUNT', count });

        const inSig = ctx.createGain();
        const inTrig = ctx.createGain();
        const inReset = ctx.createGain();

        const outSig = ctx.createGain();
        const outGate = ctx.createGain();
        const outEos = ctx.createGain();

        inSig.connect(w, 0, 0);
        inTrig.connect(w, 0, 1);
        inReset.connect(w, 0, 2);

        w.connect(outSig, 0, 0);
        w.connect(outGate, 1, 0);
        w.connect(outEos, 2, 0);

        if (eng?.silentSink) {
            outGate.connect(eng.silentSink);
            outEos.connect(eng.silentSink);
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
            nodes: { w, inSig, inTrig, inReset, outSig, outGate, outEos },
            inputs: {
                in: inSig,
                clk_in: inSig,
                gate_in: inSig,
                trig_in: inTrig,
                fire_in: inTrig,
                reset_in: inReset
            },
            outputs: {
                out: outSig,
                gate_out: outGate,
                eos_out: outEos,
                eos: outEos,
                trans_out: outEos,
                transition_out: outEos
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

export const passAudioDefs = {
    PASS
};
