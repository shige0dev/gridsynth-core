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

export const state4AudioDefs = {
    STATE4
};

