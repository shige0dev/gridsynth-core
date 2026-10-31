import { AudioHelpers } from '../helpers.js';

export const ARP = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'arp-processor', {
            numberOfInputs: 5,
            numberOfOutputs: 2,
            outputChannelCount: [1, 1]
        });

        const inClk = ctx.createGain();
        const in1 = ctx.createGain();
        const in2 = ctx.createGain();
        const in3 = ctx.createGain();
        const in4 = ctx.createGain();

        inClk.connect(w, 0, 0);
        in1.connect(w, 0, 1);
        in2.connect(w, 0, 2);
        in3.connect(w, 0, 3);
        in4.connect(w, 0, 4);

        const outSig = ctx.createGain();
        const outGate = ctx.createGain();

        w.connect(outSig, 0, 0);
        w.connect(outGate, 1, 0);
        if (eng?.silentSink) outGate.connect(eng.silentSink);

        const activeInputs = [1, 2, 3, 4]
            .filter(i => patch?.has?.(`cv_in${i}`) || patch?.has?.(`in_${i}`) || patch?.has?.(`in${i}`))
            .map(i => i - 1);

        w.port.postMessage({
            type: 'SET_PARAMS',
            mode: d.mode || 'up',
            activeInputs
        });

        let activeChannel = activeInputs.length > 0 ? activeInputs[0] : -1;
        let activePointer = 0;
        w.port.onmessage = (e) => {
            if (e.data.type === 'STEP') {
                activeChannel = e.data.channel;
                activePointer = e.data.pointer;
            }
        };

        const instObj = {
            nodes: { w, inClk, in1, in2, in3, in4, outSig, outGate },
            inputs: {
                clk_in: inClk,
                trig_in: inClk,
                cv_in1: in1,
                cv_in2: in2,
                cv_in3: in3,
                cv_in4: in4,
                // Backward compatibility aliases
                in_1: in1,
                in_2: in2,
                in_3: in3,
                in_4: in4,
                in1: in1,
                in2: in2,
                in3: in3,
                in4: in4
            },
            outputs: {
                cv_out: outSig,
                out: outSig,
                gate_out: outGate
            },
            activeInputs,
            resetStep: () => {
                w.port.postMessage({ type: 'RESET' });
            },
            read: () => ({
                activeChannel,
                activePointer,
                activeInputs: instObj.activeInputs
            })
        };
        return instObj;
    },
    update: (ctx, inst, d, patch) => {
        const activeInputs = [1, 2, 3, 4]
            .filter(i => patch?.has?.(`cv_in${i}`) || patch?.has?.(`in_${i}`) || patch?.has?.(`in${i}`))
            .map(i => i - 1);

        inst.activeInputs = activeInputs;
        inst.nodes.w.port.postMessage({
            type: 'SET_PARAMS',
            mode: d.mode || 'up',
            activeInputs
        });
    }
};

export const arpAudioDefs = {
    ARP
};
