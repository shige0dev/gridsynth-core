// src/audio/defs/cue.js

export const CUE = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'cue-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 4
        });

        w.port.postMessage({
            type: 'SET_PARAMS',
            start: d.start ?? 0.0,
            end: d.end ?? 1.0,
            speedCv: d.speedCv ?? 0.0
        });

        const trigIn = ctx.createGain();
        trigIn.connect(w, 0, 0);

        const outTrig = ctx.createGain();
        const outStartCv = ctx.createGain();
        const outEndCv = ctx.createGain();
        const outSpeedCv = ctx.createGain();

        w.connect(outTrig, 0, 0);
        w.connect(outStartCv, 1, 0);
        w.connect(outEndCv, 2, 0);
        w.connect(outSpeedCv, 3, 0);

        const an = ctx.createAnalyser();
        an.fftSize = 256;
        outTrig.connect(an);

        if (eng?.silentSink) {
            outTrig.connect(eng.silentSink);
            outStartCv.connect(eng.silentSink);
            outEndCv.connect(eng.silentSink);
            outSpeedCv.connect(eng.silentSink);
        }

        const buf = new Float32Array(an.frequencyBinCount);
        let triggered = false;

        w.port.onmessage = (e) => {
            if (e.data?.type === 'TRIGGERED') {
                triggered = true;
            }
        };

        return {
            nodes: { w, trigIn, outTrig, outStartCv, outEndCv, outSpeedCv, an },
            inputs: {
                trig_in: trigIn,
                gate_in: trigIn
            },
            outputs: {
                trig_out: outTrig,
                start_cv: outStartCv,
                cv_start: outStartCv,
                end_cv: outEndCv,
                cv_end: outEndCv,
                speed_cv: outSpeedCv,
                cv_speed: outSpeedCv
            },
            trigger: () => {
                w.port.postMessage({ type: 'TRIGGER' });
            },
            reset: () => {
                triggered = false;
                w.port.postMessage({ type: 'RESET' });
            },
            read: () => {
                an.getFloatTimeDomainData(buf);
                const wasTrig = triggered || (buf[0] > 0.3);
                triggered = false;
                return {
                    values: [buf[0] || 0.0],
                    triggered: wasTrig
                };
            }
        };
    },
    update: (ctx, inst, d) => {
        if (!inst?.nodes?.w) return;
        inst.nodes.w.port.postMessage({
            type: 'SET_PARAMS',
            start: d.start ?? 0.0,
            end: d.end ?? 1.0,
            speedCv: d.speedCv ?? 0.0
        });
    }
};

export const cueAudioDefs = { CUE };
