export const DIST4 = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'dist4-processor', {
            numberOfInputs: 2,
            numberOfOutputs: 4,
            outputChannelCount: [1, 1, 1, 1]
        });

        w.port.postMessage({
            type: 'SET_PARAMS',
            steps: d.steps ?? 4,
            mode: d.mode || 'up'
        });

        const inGate = ctx.createGain();
        inGate.connect(w, 0, 0); // Input 0: gate/trigger

        const inCv = ctx.createGain();
        const hasCvIn = patch ? (patch.has('cv_in') || patch.has('in')) : false;
        if (hasCvIn) {
            inCv.connect(w, 0, 1); // Input 1: cv/signal
        }

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
            nodes: { w, inGate, inCv, out1, out2, out3, out4 },
            inputs: {
                gate_in: inGate,
                cv_in: inCv
            },
            outputs: {
                cv_out1: out1,
                cv_out2: out2,
                cv_out3: out3,
                cv_out4: out4
            },
            resetStep: () => {
                currentStep = 0;
                w.port.postMessage({ type: 'RESET' });
            },
            read: () => ({ step: currentStep, state: currentStep === 0 ? 1 : 0 })
        };
    },
    update: (ctx, inst, d, patch) => {
        inst.nodes.w.port.postMessage({
            type: 'SET_PARAMS',
            steps: d.steps ?? 4,
            mode: d.mode || 'up'
        });
        const hasCvIn = patch ? (patch.has('cv_in') || patch.has('in')) : false;
        try {
            inst.nodes.inCv.disconnect();
        } catch (_) {}
        if (hasCvIn) {
            inst.nodes.inCv.connect(inst.nodes.w, 0, 1);
        }
    }
};

export const dist4AudioDefs = {
    DIST4
};
