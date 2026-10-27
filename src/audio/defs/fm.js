export const FMx3 = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'fm-processor', {
            numberOfInputs: 2,
            numberOfOutputs: 1
        });
        const outGain = ctx.createGain();
        outGain.gain.value = 1.0;
        w.connect(outGain);

        if (eng?.silentSink) w.connect(eng.silentSink);

        const gIn = ctx.createGain();
        const pIn = ctx.createGain();
        gIn.connect(w, 0, 0);
        pIn.connect(w, 0, 1);

        const hasGate = patch ? (patch.has('gate_in') || patch.has('gate')) : false;

        const payload = {
            type: 'SET_PARAMS',
            hasGateIn: hasGate,
            algorithm: d.algorithm ?? 1,
            rootMidi: d.rootMidi ?? 48,
            op1: d.op1 || { ratio: 1.0, level: 0.85, attack: 0.005, decay: 0.4, sustain: 0.0, release: 0.1, aCurve: 'lin', dCurve: 'lin', rCurve: 'lin', curve: 'lin' },
            op2: d.op2 || { ratio: 2.0, level: 1.5, attack: 0.005, decay: 0.15, sustain: 0.0, release: 0.05, aCurve: 'lin', dCurve: 'lin', rCurve: 'lin', curve: 'lin' },
            op3: d.op3 || { ratio: 3.5, level: 1.8, feedback: 0.0, wave: 'sine', attack: 0.005, decay: 0.05, sustain: 0.0, release: 0.02, aCurve: 'lin', dCurve: 'lin', rCurve: 'lin', curve: 'lin' }
        };
        w.port.postMessage(payload);

        return {
            nodes: { w, outGain, gIn, pIn },
            inputs: {
                gate_in: gIn,
                pitch_in: pIn,
                cv_in: pIn // alias
            },
            outputs: {
                wave_out: outGain
            },
            resetStage: () => w.port.postMessage({ type: 'RESET' }),
            clear: () => w.port.postMessage({ type: 'RESET' })
        };
    },
    update: (ctx, inst, d, patch, eng) => {
        const hasGate = patch ? (patch.has('gate_in') || patch.has('gate')) : false;
        inst.nodes.w?.port.postMessage({
            type: 'SET_PARAMS',
            hasGateIn: hasGate,
            algorithm: d.algorithm ?? 1,
            rootMidi: d.rootMidi ?? 48,
            op1: d.op1,
            op2: d.op2,
            op3: d.op3
        });
    }
};

export const FMCORE = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'fm-core-processor', {
            numberOfInputs: 3,
            numberOfOutputs: 1
        });
        const outGain = ctx.createGain();
        outGain.gain.value = 1.0;
        w.connect(outGain);

        if (eng?.silentSink) w.connect(eng.silentSink);

        const pIn = ctx.createGain();
        const mIn = ctx.createGain();
        const idxIn = ctx.createGain();

        pIn.connect(w, 0, 0);
        mIn.connect(w, 0, 1);
        idxIn.connect(w, 0, 2);

        const hasIndexCv = patch ? (patch.has('index_cv') || patch.has('idx_cv')) : false;

        w.port.postMessage({
            type: 'SET_PARAMS',
            hasIndexCv,
            level: d.level ?? 0.85,
            ratio: d.ratio ?? 1.0,
            fine: d.fine ?? 0,
            index: d.index ?? 1.0,
            feedback: d.feedback ?? 0.0,
            rootMidi: d.rootMidi ?? 48
        });

        return {
            nodes: { w, outGain, pIn, mIn, idxIn },
            inputs: {
                pitch_in: pIn,
                cv_in: pIn,
                mod_in: mIn,
                wave_in: mIn,
                index_cv: idxIn,
                idx_cv: idxIn
            },
            outputs: {
                wave_out: outGain
            },
            resetStage: () => w.port.postMessage({ type: 'RESET' }),
            clear: () => w.port.postMessage({ type: 'RESET' })
        };
    },
    update: (ctx, inst, d, patch) => {
        const hasIndexCv = patch ? (patch.has('index_cv') || patch.has('idx_cv')) : false;
        inst.nodes.w?.port.postMessage({
            type: 'SET_PARAMS',
            hasIndexCv,
            level: d.level ?? 0.85,
            ratio: d.ratio ?? 1.0,
            fine: d.fine ?? 0,
            index: d.index ?? 1.0,
            feedback: d.feedback ?? 0.0,
            rootMidi: d.rootMidi ?? 48
        });
    }
};

export const fmAudioDefs = {
    FMx3,
    FMCORE
};
