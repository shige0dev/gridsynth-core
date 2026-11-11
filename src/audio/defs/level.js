// src/audio/defs/level.js
// 4-Band Spectrum Envelope Follower Audio Node

export const LEVEL = {
    create: (ctx, d, patch, eng) => {
        const inG = ctx.createGain();

        // Visualizer AnalyserNode (shared with SPEC logic)
        const an = ctx.createAnalyser();
        an.fftSize = 4096;
        an.minDecibels = -70;
        an.maxDecibels = -6;
        an.smoothingTimeConstant = 0.75;
        inG.connect(an);

        // DSP Multi-Band Audio-to-CV Worklet
        const w = new AudioWorkletNode(ctx, 'level-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 4,
            outputChannelCount: [1, 1, 1, 1]
        });
        inG.connect(w);

        const out1 = ctx.createGain();
        const out2 = ctx.createGain();
        const out3 = ctx.createGain();
        const out4 = ctx.createGain();

        w.connect(out1, 0, 0);
        w.connect(out2, 1, 0);
        w.connect(out3, 2, 0);
        w.connect(out4, 3, 0);

        if (eng?.silentSink) {
            out1.connect(eng.silentSink);
        }

        const freqBuf = new Uint8Array(an.frequencyBinCount);
        let latestLevels = [0, 0, 0, 0];

        w.port.onmessage = (e) => {
            if (e.data.type === 'LEVELS') {
                latestLevels = e.data.levels;
            }
        };

        // Initialize params
        w.port.postMessage({
            type: 'SET_PARAMS',
            bandsCount: d.bandsCount ?? 4,
            bands: d.bands || [
                { freq: 100,  q: 1.0, sens: 1.8, type: 'lowpass' },
                { freq: 400,  q: 1.2, sens: 2.0, type: 'bandpass' },
                { freq: 2400, q: 1.2, sens: 2.2, type: 'bandpass' },
                { freq: 8000, q: 1.0, sens: 2.5, type: 'highpass' }
            ],
            attack: d.attack ?? 0.05,
            release: d.release ?? 0.003
        });

        return {
            nodes: { inG, an, w, out1, out2, out3, out4 },
            inputs: {
                wave_in: inG,
                in: inG
            },
            outputs: {
                cv_out1: out1,
                cv_out2: out2,
                cv_out3: out3,
                cv_out4: out4
            },
            read: () => {
                an.getByteFrequencyData(freqBuf);
                return {
                    freqs: freqBuf,
                    levels: latestLevels,
                    sampleRate: ctx.sampleRate
                };
            }
        };
    },
    update: (ctx, inst, d) => {
        if (!inst?.nodes?.w) return;
        inst.nodes.w.port.postMessage({
            type: 'SET_PARAMS',
            bandsCount: d.bandsCount ?? 4,
            bands: d.bands,
            attack: d.attack,
            release: d.release
        });
    }
};

export const levelAudioDefs = {
    LEVEL
};
