export const MARKOV = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'markov-processor', {
            numberOfInputs: 2,
            numberOfOutputs: 7
        });
        const rootM = d.rootMidi ?? 36;
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
            weights: d.weights || [0, 0, 0],
            holdClocks: d.holdClocks ?? 1
        });

        // Keepalive silent sink to destination
        const silent = ctx.createGain();
        silent.gain.value = 0.0;
        w.connect(silent, 3);
        silent.connect(ctx.destination);

        // Inputs: 0: clk_in, 1: trig_in
        const gClk = ctx.createGain();
        gClk.connect(w, 0, 0);

        const gTrig = ctx.createGain();
        gTrig.connect(w, 0, 1);

        // Outputs: 0..2: trans_out1..3, 3: cv_out, 4: startgate_out, 5: gate_out, 6: longgate_out
        const g1 = ctx.createGain(), g2 = ctx.createGain(), g3 = ctx.createGain();
        const gCv = ctx.createGain(), gStartGate = ctx.createGain(), gThruGate = ctx.createGain(), gLongGate = ctx.createGain();
        w.connect(g1, 0);
        w.connect(g2, 1);
        w.connect(g3, 2);
        w.connect(gCv, 3);
        w.connect(gStartGate, 4);
        w.connect(gThruGate, 5);
        w.connect(gLongGate, 6);

        let liveRemaining = d.holdClocks ?? 1;
        let liveCount = 0;

        const inst = {
            nodes: { w, silent, gClk, gTrig, g1, g2, g3, gCv, gStartGate, gThruGate, gLongGate },
            inputs: {
                gate_in: gClk,
                trans_in: gTrig
            },
            outputs: {
                trans_out1: g1,
                trans_out2: g2,
                trans_out3: g3,
                startgate_out: gStartGate,
                gate_out: gThruGate,
                longgate_out: gLongGate,
                cv_out: gCv
            },
            _liveState: initialState,
            resetStep: () => {
                const st = d.initOn ? 1 : 0;
                inst._liveState = st;
                d.state = st;
                liveRemaining = d.holdClocks ?? 1;
                liveCount = 0;
            },
            read: () => ({
                state: inst._liveState,
                remaining: liveRemaining,
                count: liveCount,
                holdClocks: d.holdClocks ?? 1
            })
        };

        w.port.onmessage = e => {
            if (e.data.type === 'STATE_CHANGED') {
                inst._liveState = e.data.state;
                d.state = e.data.state;
                if (e.data.remaining !== undefined) {
                    liveRemaining = e.data.remaining;
                }
                if (e.data.clockCount !== undefined) {
                    liveCount = e.data.clockCount;
                }
            }
        };

        return inst;
    },
    update: (ctx, inst, d, patch, eng) => {
        const rootM = d.rootMidi ?? 36;
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
            weights: d.weights || [0, 0, 0],
            holdClocks: d.holdClocks ?? 1
        });
    }
};

export const markovAudioDefs = {
    MARKOV
};
