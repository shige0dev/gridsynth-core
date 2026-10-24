export const SCOPE = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'scope-processor', { numberOfInputs: 3, numberOfOutputs: 0 });
        w.port.postMessage({ type: 'SET_CONFIG', timeSpan: d.timeSpan ?? 0.1 });

        const gWave = ctx.createGain(), gTrig = ctx.createGain();
        gWave.connect(w, 0, 0);
        gTrig.connect(w, 0, 2);

        let latest = { buf1: new Float32Array(512), trigBuf: new Float32Array(512), sampleRate: ctx.sampleRate };
        w.port.onmessage = e => {
            if (e.data.type === 'SCOPE_DATA') {
                latest = e.data;
            }
        };

        return {
            nodes: { w, gWave, gTrig },
            inputs: {
                wave_in: gWave,
                wave_in1: gWave,
                in: gWave,
                in1: gWave,
                trig_in: gTrig,
                trig: gTrig
            },
            outputs: {},
            _hasTrig: patch?.has('trig_in') || patch?.has('trig'),
            read: () => ({
                buf1: latest.buf1,
                trigBuf: latest.trigBuf,
                hasTrig: patch?.has('trig_in') || patch?.has('trig'),
                sampleRate: latest.sampleRate || ctx.sampleRate
            })
        };
    },
    update: (ctx, inst, d, patch) => {
        inst._hasTrig = patch?.has('trig_in') || patch?.has('trig');
        inst.nodes.w.port.postMessage({ type: 'SET_CONFIG', timeSpan: d.timeSpan ?? 0.1 });
    }
};

export const LISS = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'scope-processor', { numberOfInputs: 3, numberOfOutputs: 0 });
        w.port.postMessage({ type: 'SET_CONFIG', timeSpan: d.timeSpan ?? 0.04 });

        const gX = ctx.createGain(), gY = ctx.createGain();
        gX.connect(w, 0, 0);
        gY.connect(w, 0, 1);

        let latest = { buf1: new Float32Array(512), buf2: new Float32Array(512), sampleRate: ctx.sampleRate };
        w.port.onmessage = e => {
            if (e.data.type === 'SCOPE_DATA') {
                latest = e.data;
            }
        };

        return {
            nodes: { w, gX, gY },
            inputs: {
                x_in: gX,
                y_in: gY,
                wave_in1: gX,
                wave_in2: gY
            },
            outputs: {},
            read: () => ({
                buf1: latest.buf1,
                buf2: latest.buf2,
                sampleRate: latest.sampleRate || ctx.sampleRate
            })
        };
    },
    update: (ctx, inst, d) => {
        inst.nodes.w.port.postMessage({ type: 'SET_CONFIG', timeSpan: d.timeSpan ?? 0.04 });
    }
};

export const SPEC = {
    create: (ctx, d, patch, eng) => {
        const inG = ctx.createGain();
        const an = ctx.createAnalyser();
        an.fftSize = 8192;
        an.minDecibels = -65;
        an.maxDecibels = -6;
        an.smoothingTimeConstant = d.smooth ?? 0.75;
        inG.connect(an);
        if (eng?.silentSink) {
            inG.connect(eng.silentSink);
        }
        const freqBuf = new Uint8Array(an.frequencyBinCount);

        return {
            nodes: { inG, an },
            inputs: {
                wave_in: inG,
                in: inG
            },
            outputs: {},
            read: () => {
                an.getByteFrequencyData(freqBuf);
                return { freqs: freqBuf, sampleRate: ctx.sampleRate };
            }
        };
    },
    update: (ctx, inst, d) => {
        if (inst.nodes?.an) {
            inst.nodes.an.smoothingTimeConstant = d.smooth ?? 0.75;
        }
    }
};

export const scopeAudioDefs = {
    SCOPE,
    LISS,
    XY: LISS,
    SPEC
};
