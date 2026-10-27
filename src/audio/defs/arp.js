import { AudioHelpers } from '../helpers.js';

export const GATE4 = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'gate4-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 4,
            outputChannelCount: [1, 1, 1, 1]
        });

        w.port.postMessage({
            type: 'SET_PARAMS',
            steps: d.steps ?? 4,
            mode: d.mode || 'up'
        });

        const inGate = ctx.createGain();
        inGate.connect(w, 0, 0);

        const out1 = ctx.createGain();
        const out2 = ctx.createGain();
        const out3 = ctx.createGain();
        const out4 = ctx.createGain();

        w.connect(out1, 0, 0);
        w.connect(out2, 1, 0);
        w.connect(out3, 2, 0);
        w.connect(out4, 3, 0);
        if (eng?.silentSink) out1.connect(eng.silentSink);

        let currentStep = -1;
        w.port.onmessage = (e) => {
            if (e.data.type === 'STEP') {
                currentStep = e.data.step;
            }
        };

        return {
            nodes: { w, inGate, out1, out2, out3, out4 },
            inputs: { gate_in: inGate, clk_in: inGate, trig_in: inGate },
            outputs: {
                gate_out1: out1,
                gate_out2: out2,
                gate_out3: out3,
                gate_out4: out4,
                out1,
                out2,
                out3,
                out4,
                gate1: out1,
                gate2: out2,
                gate3: out3,
                gate4: out4
            },
            resetStep: () => {
                currentStep = -1;
                w.port.postMessage({ type: 'RESET' });
            },
            read: () => ({ step: currentStep })
        };
    },
    update: (ctx, inst, d) => {
        inst.nodes.w.port.postMessage({
            type: 'SET_PARAMS',
            steps: d.steps ?? 4,
            mode: d.mode || 'up'
        });
    }
};

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

export const STATE4 = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'state4-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 4,
            outputChannelCount: [1, 1, 1, 1]
        });

        w.port.postMessage({
            type: 'SET_PARAMS',
            steps: d.steps ?? 4,
            mode: d.mode || 'up'
        });

        const inGate = ctx.createGain();
        inGate.connect(w, 0, 0);

        const out1 = ctx.createGain();
        const out2 = ctx.createGain();
        const out3 = ctx.createGain();
        const out4 = ctx.createGain();

        w.connect(out1, 0, 0);
        w.connect(out2, 1, 0);
        w.connect(out3, 2, 0);
        w.connect(out4, 3, 0);
        if (eng?.silentSink) out1.connect(eng.silentSink);

        let currentStep = 0;
        w.port.onmessage = (e) => {
            if (e.data.type === 'STEP') {
                currentStep = e.data.step;
            }
        };

        return {
            nodes: { w, inGate, out1, out2, out3, out4 },
            inputs: { gate_in: inGate, clk_in: inGate, trig_in: inGate },
            outputs: {
                cv_out1: out1,
                cv_out2: out2,
                cv_out3: out3,
                cv_out4: out4,
                gate_out1: out1,
                gate_out2: out2,
                gate_out3: out3,
                gate_out4: out4,
                out1,
                out2,
                out3,
                out4
            },
            resetStep: () => {
                currentStep = 0;
                w.port.postMessage({ type: 'RESET' });
            },
            read: () => ({ step: currentStep, state: currentStep === 0 ? 1 : 0 })
        };
    },
    update: (ctx, inst, d) => {
        inst.nodes.w.port.postMessage({
            type: 'SET_PARAMS',
            steps: d.steps ?? 4,
            mode: d.mode || 'up'
        });
    }
};

export const arpAudioDefs = {
    GATE4,
    ARP,
    STATE4
};
