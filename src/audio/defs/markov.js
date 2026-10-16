export const MARKOV = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'markov-processor', {
            numberOfInputs: 2,
            numberOfOutputs: 7
        });
        const rootM = d.rootMidi ?? 60;
        const cvVal = d.quantize !== false ? ((rootM - 24) / 12.0) : (d.stateVal ?? 1.0);

        const isInitOn = !!d.initOn;
        const initialState = isInitOn ? 1 : (d.state ? 1 : 0);
        d.state = initialState;

        w.port.postMessage({
            type: 'SET_STATE',
            state: initialState,
            initOn: isInitOn,
            stateVal: cvVal,
            stayWeight: d.stayWeight ?? 10,
            weights: d.weights || [0, 0, 0, 0],
            holdClocks: d.holdClocks ?? 1
        });

        // Keepalive silent sink to destination
        const silent = ctx.createGain();
        silent.gain.value = 0.0;
        w.connect(silent, 4);
        silent.connect(ctx.destination);

        // Inputs: 0: clk_in, 1: trig_in
        const gClk = ctx.createGain();
        gClk.connect(w, 0, 0);

        const gTrig = ctx.createGain();
        gTrig.connect(w, 0, 1);

        // Outputs: 0..3: trig_out1..4, 4: cv_out, 5: gate_out, 6: step_gate
        const g1 = ctx.createGain(), g2 = ctx.createGain(), g3 = ctx.createGain(), g4 = ctx.createGain();
        const gCv = ctx.createGain(), gGate = ctx.createGain(), gStepGate = ctx.createGain();
        w.connect(g1, 0);
        w.connect(g2, 1);
        w.connect(g3, 2);
        w.connect(g4, 3);
        w.connect(gCv, 4);
        w.connect(gGate, 5);
        w.connect(gStepGate, 6);

        const inst = {
            nodes: { w, silent, gClk, gTrig, g1, g2, g3, g4, gCv, gGate, gStepGate },
            inputs: {
                clk_in: gClk,
                transition_in: gTrig,
                trig_in: gTrig
            },
            outputs: {
                transition_out1: g1,
                transition_out2: g2,
                transition_out3: g3,
                transition_out4: g4,
                trig_out1: g1,
                trig_out2: g2,
                trig_out3: g3,
                trig_out4: g4,
                cv_out: gCv,
                state_out: gCv, // alias for backward compatibility
                gate_out: gGate,
                gt_out: gGate,
                trig_out: gStepGate,
                step_gate: gStepGate,
                step_gt: gStepGate
            },
            _liveState: initialState,
            resetStep: () => {
                const st = d.initOn ? 1 : 0;
                inst._liveState = st;
                d.state = st;
            },
            read: () => ({ state: inst._liveState })
        };

        w.port.onmessage = e => {
            if (e.data.type === 'STATE_CHANGED') {
                inst._liveState = e.data.state;
                d.state = e.data.state;
            }
        };

        return inst;
    },
    update: (ctx, inst, d, patch, eng) => {
        const rootM = d.rootMidi ?? 60;
        const cvVal = d.quantize !== false ? ((rootM - 24) / 12.0) : (d.stateVal ?? 1.0);
        const isInitOn = !!d.initOn;
        const curState = d.state ? 1 : 0;
        inst._liveState = curState;
        inst.nodes.w?.port.postMessage({
            type: 'SET_STATE',
            state: curState,
            initOn: isInitOn,
            stateVal: cvVal,
            stayWeight: d.stayWeight ?? 10,
            weights: d.weights || [0, 0, 0, 0],
            holdClocks: d.holdClocks ?? 1
        });
    }
};

export const markovAudioDefs = {
    MARKOV
};
