// src/audio/defs/ar.js
export const AR = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'ar-processor', {
            numberOfInputs: 3,
            numberOfOutputs: 1
        });

        w.port.postMessage({
            type: 'SET_PARAMS',
            attack: d.attack ?? 0.05,
            release: d.release ?? 0.2,
            level: d.level ?? 1.0
        });

        const gateIn = ctx.createGain();
        const cvAIn = ctx.createGain();
        const cvRIn = ctx.createGain();

        gateIn.connect(w, 0, 0);
        cvAIn.connect(w, 0, 1);
        cvRIn.connect(w, 0, 2);

        const outCv = ctx.createGain();
        w.connect(outCv);

        const an = ctx.createAnalyser();
        an.fftSize = 256;
        outCv.connect(an);

        if (eng?.silentSink) {
            outCv.connect(eng.silentSink);
        }

        const buf = new Float32Array(an.frequencyBinCount);

        return {
            nodes: { w, gateIn, cvAIn, cvRIn, outCv, an },
            inputs: {
                gate_in: gateIn,
                trig_in: gateIn,
                a_cv: cvAIn,
                cv_a: cvAIn,
                attack_cv: cvAIn,
                r_cv: cvRIn,
                cv_r: cvRIn,
                release_cv: cvRIn
            },
            outputs: {
                cv_out: outCv,
                out: outCv
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
            attack: d.attack ?? 0.05,
            release: d.release ?? 0.2,
            level: d.level ?? 1.0
        });
    }
};

export const arAudioDefs = {
    AR
};

