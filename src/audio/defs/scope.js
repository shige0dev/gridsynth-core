export const SCOPE = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'scope-processor', { numberOfInputs: 3, numberOfOutputs: 0 });
        w.port.postMessage({ type: 'SET_CONFIG', timeSpan: d.timeSpan ?? 0.1 });

        const g1 = ctx.createGain(), g2 = ctx.createGain(), gTrig = ctx.createGain();
        g1.connect(w, 0, 0);
        g2.connect(w, 0, 1);
        gTrig.connect(w, 0, 2);

        let latest = { buf1: new Float32Array(512), buf2: new Float32Array(512), trigBuf: new Float32Array(512), sampleRate: ctx.sampleRate };
        w.port.onmessage = e => {
            if (e.data.type === 'SCOPE_DATA') {
                latest = e.data;
            }
        };

        return {
            nodes: { w, g1, g2, gTrig },
            inputs: {
                wave_in1: g1,
                wave_in2: g2,
                trig_in: gTrig,
                in1: g1,
                in2: g2,
                trig: gTrig,
                wave_in: g1
            },
            outputs: {},
            _hasTrig: patch?.has('trig_in') || patch?.has('trig'),
            _hasIn2: patch?.has('wave_in2') || patch?.has('in2'),
            read: () => ({
                buf1: latest.buf1,
                buf2: latest.buf2,
                trigBuf: latest.trigBuf,
                hasTrig: patch?.has('trig_in') || patch?.has('trig'),
                hasIn2: patch?.has('wave_in2') || patch?.has('in2'),
                sampleRate: latest.sampleRate || ctx.sampleRate
            })
        };
    },
    update: (ctx, inst, d, patch) => {
        inst._hasTrig = patch?.has('trig_in') || patch?.has('trig');
        inst._hasIn2 = patch?.has('wave_in2') || patch?.has('in2');
        inst.nodes.w.port.postMessage({ type: 'SET_CONFIG', timeSpan: d.timeSpan ?? 0.1 });
    }
};

export const MON = {
    create: (ctx, d, patch, eng) => {
        const inputs = {}, nodes = {}, bufs = [new Float32Array(256), new Float32Array(256), new Float32Array(256), new Float32Array(256)];
        for (let c = 1; c <= 4; c++) {
            const an = ctx.createAnalyser(), inG = ctx.createGain(); an.fftSize = 256; inG.connect(an);
            if (eng?.silentSink) inG.connect(eng.silentSink);
            inputs[`cv_in${c}`] = inG; inputs[`in${c}`] = inG; nodes[`in${c}`] = inG; nodes[`an${c}`] = an;
        }
        return {
            nodes, inputs, outputs: {}, read: () => {
                const vals = []; for (let c = 1; c <= 4; c++) { nodes[`an${c}`].getFloatTimeDomainData(bufs[c - 1]); vals.push(bufs[c - 1][0] || 0); }
                return { values: vals };
            }
        };
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
    MON,
    SPEC
};
