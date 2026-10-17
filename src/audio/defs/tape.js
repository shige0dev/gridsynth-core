// src/audio/defs/tape.js
import { TapeCodec } from '../tape-codec.js';

export const TAPE = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'tape-processor', {
            numberOfInputs: 4,
            numberOfOutputs: 1
        });

        w.port.postMessage({
            type: 'SET_PARAMS',
            start: d.start ?? 0.0,
            end: d.end ?? 1.0,
            speed: d.speed ?? 1.0,
            loop: d.loop ?? false
        });

        // Initialize Audio Buffer from Base64
        const sendBufferToWorklet = (float32Buf, sRate) => {
            if (!float32Buf || float32Buf.length === 0) return;
            w.port.postMessage({
                type: 'SET_BUFFER',
                buffer: float32Buf,
                sampleRate: sRate || ctx.sampleRate
            });
        };

        if (d.data && typeof d.data === 'string' && d.data.length > 0) {
            TapeCodec.decodeFromBase64(d.data, ctx).then(res => {
                if (res?.buffer) {
                    sendBufferToWorklet(res.buffer, res.sampleRate);
                }
            }).catch(() => {});
        }

        const gateIn = ctx.createGain();
        const cvStartIn = ctx.createGain();
        const cvEndIn = ctx.createGain();
        const cvSpeedIn = ctx.createGain();

        gateIn.connect(w, 0, 0);
        cvStartIn.connect(w, 0, 1);
        cvEndIn.connect(w, 0, 2);
        cvSpeedIn.connect(w, 0, 3);

        const outWave = ctx.createGain();
        w.connect(outWave, 0, 0);

        const an = ctx.createAnalyser();
        an.fftSize = 256;
        outWave.connect(an);

        if (eng?.silentSink) {
            outWave.connect(eng.silentSink);
        }

        const buf = new Float32Array(an.frequencyBinCount);
        let curPlayhead = 0.0;
        let isPlaying = false;

        w.port.onmessage = (e) => {
            if (e.data?.type === 'STATE') {
                curPlayhead = e.data.pos ?? 0.0;
                isPlaying = Boolean(e.data.isPlaying);
            }
        };

        return {
            nodes: { w, gateIn, cvStartIn, cvEndIn, cvSpeedIn, outWave, an },
            inputs: {
                gate_in: gateIn,
                trig_in: gateIn,
                start_cv: cvStartIn,
                cv_start: cvStartIn,
                end_cv: cvEndIn,
                cv_end: cvEndIn,
                speed_cv: cvSpeedIn,
                cv_speed: cvSpeedIn
            },
            outputs: {
                wave_out: outWave,
                out: outWave
            },
            setAudioBuffer: (float32Buf, sRate) => {
                sendBufferToWorklet(float32Buf, sRate);
            },
            trigger: () => {
                w.port.postMessage({ type: 'TRIGGER' });
            },
            play: () => {
                w.port.postMessage({ type: 'PLAY' });
            },
            stop: () => {
                w.port.postMessage({ type: 'STOP' });
            },
            reset: () => {
                curPlayhead = 0.0;
                isPlaying = false;
                w.port.postMessage({ type: 'RESET' });
            },
            read: () => {
                an.getFloatTimeDomainData(buf);
                return {
                    values: [buf[0] || 0.0],
                    playhead: curPlayhead,
                    isPlaying
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
            speed: d.speed ?? 1.0,
            loop: d.loop ?? false
        });
    }
};

export const tapeAudioDefs = { TAPE };

