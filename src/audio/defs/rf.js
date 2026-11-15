// src/audio/defs/rf.js
export const RF = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'rf-processor', {
            numberOfInputs: 3,
            numberOfOutputs: 2
        });

        const isTimeCvPatched = !!(patch?.has?.('time_cv') || patch?.has?.('cv_time'));
        const isPeakCvPatched = !!(patch?.has?.('peak_cv') || patch?.has?.('cv_peak'));
        w.port.postMessage({
            type: 'SET_PARAMS',
            time: isTimeCvPatched ? 0 : (d.time ?? 0.2),
            isTimeCvPatched,
            peak: isPeakCvPatched ? 0.5 : (d.peak ?? 0.5),
            isPeakCvPatched,
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
        let curStage = -1;
        w.port.onmessage = (e) => {
            if (e.data.type === 'STAGE') {
                curStage = e.data.stage;
            }
        };

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
            setSelfLoop: (enabled) => {
                w.port.postMessage({ type: 'SET_SELF_LOOP', enabled: !!enabled });
            },
            reset: () => {
                curStage = -1;
                w.port.postMessage({ type: 'RESET' });
            },
            read: () => {
                an.getFloatTimeDomainData(buf);
                return { values: [buf[0] || 0.0], stage: curStage };
            }
        };
    },
    update: (ctx, inst, d, patch) => {
        const isTimeCvPatched = !!(patch?.has?.('time_cv') || patch?.has?.('cv_time'));
        const isPeakCvPatched = !!(patch?.has?.('peak_cv') || patch?.has?.('cv_peak'));
        inst.nodes.w.port.postMessage({
            type: 'SET_PARAMS',
            time: isTimeCvPatched ? 0 : (d.time ?? 0.2),
            isTimeCvPatched,
            peak: isPeakCvPatched ? 0.5 : (d.peak ?? 0.5),
            isPeakCvPatched,
            level: d.level ?? 1.0
        });
    }
};

export const rfAudioDefs = {
    RF
};

