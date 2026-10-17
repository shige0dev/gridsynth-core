// src/audio/defs/rf.js
export const RF = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'rf-processor', {
            numberOfInputs: 3,
            numberOfOutputs: 2
        });

        w.port.postMessage({
            type: 'SET_PARAMS',
            time: d.time ?? 0.2,
            peak: d.peak ?? 0.5,
            level: d.level ?? 1.0
        });

        const trigIn = ctx.createGain();
        const cvTimeIn = ctx.createGain();
        const cvPeakIn = ctx.createGain();

        trigIn.connect(w, 0, 0);
        cvTimeIn.connect(w, 0, 1);
        cvPeakIn.connect(w, 0, 2);

        const outCv = ctx.createGain();
        const outTrig = ctx.createGain();

        w.connect(outCv, 0, 0);
        w.connect(outTrig, 1, 0);

        const an = ctx.createAnalyser();
        an.fftSize = 256;
        outCv.connect(an);

        if (eng?.silentSink) {
            outCv.connect(eng.silentSink);
            outTrig.connect(eng.silentSink);
        }

        const buf = new Float32Array(an.frequencyBinCount);

        return {
            nodes: { w, trigIn, cvTimeIn, cvPeakIn, outCv, outTrig, an },
            inputs: {
                trig_in: trigIn,
                gate_in: trigIn,
                time_cv: cvTimeIn,
                cv_time: cvTimeIn,
                peak_cv: cvPeakIn,
                cv_peak: cvPeakIn
            },
            outputs: {
                cv_out: outCv,
                out: outCv,
                trig_out: outTrig
            },
            trigger: () => {
                w.port.postMessage({ type: 'TRIGGER' });
            },
            reset: () => {
                w.port.postMessage({ type: 'RESET' });
            },
            read: () => {
                an.getFloatTimeDomainData(buf);
                return { values: [buf[0] || 0.0] };
            }
        };
    },
    update: (ctx, inst, d) => {
        inst.nodes.w.port.postMessage({
            type: 'SET_PARAMS',
            time: d.time ?? 0.2,
            peak: d.peak ?? 0.5,
            level: d.level ?? 1.0
        });
    }
};

export const rfAudioDefs = {
    RF
};
