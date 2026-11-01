import { AudioHelpers } from '../helpers.js';

export const COUNT = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'count-processor', {
            numberOfInputs: 2,
            numberOfOutputs: 2,
            outputChannelCount: [1, 1]
        });

        const parsedMax = parseInt(d.max, 10);
        const initialMax = (Number.isFinite(parsedMax) && parsedMax >= 1) ? parsedMax : 16;
        w.port.postMessage({
            type: 'SET_MAX',
            value: initialMax
        });

        const clkIn = ctx.createGain();
        clkIn.connect(w, 0, 0); // input 0: clk_in
        const rstIn = ctx.createGain();
        rstIn.connect(w, 0, 1); // input 1: reset_in

        const cvOut = ctx.createGain();
        const carryOut = ctx.createGain();
        w.connect(cvOut, 0, 0);   // output 0: cv_out
        w.connect(carryOut, 1, 0); // output 1: carry_out

        if (eng?.silentSink) {
            carryOut.connect(eng.silentSink);
            cvOut.connect(eng.silentSink);
        }

        let latestCount = 0;
        let latestMax = initialMax;

        w.port.onmessage = e => {
            if (e.data?.type === 'COUNT') {
                latestCount = e.data.count ?? 0;
                latestMax = e.data.max ?? latestMax;
            }
        };

        return {
            nodes: { w, clkIn, rstIn, cvOut, carryOut },
            inputs: {
                clk_in: clkIn,
                gate_in: clkIn, // alias
                reset_in: rstIn
            },
            outputs: {
                cv_out: cvOut,
                carry_out: carryOut
            },
            resetStep: () => {
                latestCount = 0;
                w.port.postMessage({ type: 'RESET' });
            },
            read: () => ({
                count: latestCount,
                max: latestMax
            })
        };
    },
    update: (ctx, inst, d) => {
        const parsedMax = parseInt(d.max, 10);
        const targetMax = (Number.isFinite(parsedMax) && parsedMax >= 1) ? parsedMax : 16;
        inst.nodes.w.port.postMessage({
            type: 'SET_MAX',
            value: targetMax
        });
    }
};

export const countAudioDefs = {
    COUNT
};
