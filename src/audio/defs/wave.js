// src/audio/defs/wave.js
import { WaveCodec, TapeCodec } from '../wave-codec.js';

export const WAVE = {
    create: (ctx, d, patch, eng) => {
        let w;
        try {
            w = new AudioWorkletNode(ctx, 'wave-processor', {
                numberOfInputs: 4,
                numberOfOutputs: 1
            });
        } catch (_) {
            w = new AudioWorkletNode(ctx, 'tape-processor', {
                numberOfInputs: 4,
                numberOfOutputs: 1
            });
        }

        const isStartPatched = patch?.has?.('start_cv') || patch?.has?.('cv_start') || Boolean(d.startPatched);
        const isEndPatched = patch?.has?.('end_cv') || patch?.has?.('cv_end') || Boolean(d.endPatched);

        w.port.postMessage({
            type: 'SET_PARAMS',
            start: d.start ?? 0.0,
            end: d.end ?? 1.0,
            speed: d.speed ?? 1.0,
            loop: d.loop ?? false,
            retrigger: d.retrigger ?? true,
            startPatched: Boolean(isStartPatched),
            endPatched: Boolean(isEndPatched),
            snapMode: Boolean(d.snapMode),
            chops: Array.isArray(d.chops) ? d.chops : []
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
                    d._buffer = res.buffer;
                    d.duration = res.duration;
                    d.sampleRate = res.sampleRate;
                    if (!d.peaks || d.peaks.length === 0) {
                        const numBins = 64;
                        const peaks = new Float32Array(numBins);
                        const step = Math.floor(res.buffer.length / numBins);
                        for (let b = 0; b < numBins; b++) {
                            let max = 0;
                            const st = b * step;
                            const ed = Math.min(res.buffer.length, st + step);
                            for (let i = st; i < ed; i++) {
                                const abs = Math.abs(res.buffer[i]);
                                if (abs > max) max = abs;
                            }
                            peaks[b] = Math.min(1.0, max);
                        }
                        d.peaks = Array.from(peaks);
                    }
                    d._peaks = d.peaks;
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

        // Preview direct monitor gain (direct to speakers destination, bypassing wave_out)
        const previewGain = ctx.createGain();
        previewGain.gain.value = 0.0;
        w.connect(previewGain, 0, 0);
        previewGain.connect(ctx.destination);

        const an = ctx.createAnalyser();
        an.fftSize = 256;
        w.connect(an, 0, 0);

        if (eng?.silentSink) {
            outWave.connect(eng.silentSink);
        }

        const buf = new Float32Array(an.frequencyBinCount);
        let curPlayhead = 0.0;
        let isPlaying = false;
        let isTestPlaying = false;
        let curEffStart = d.start ?? 0.0;
        let curEffEnd = d.end ?? 1.0;

        let curRawStart = d.start ?? 0.0;
        let curRawEnd = d.end ?? 1.0;
        let isStartPatchedState = Boolean(isStartPatched);
        let isEndPatchedState = Boolean(isEndPatched);
        let isSnapModeState = Boolean(d.snapMode);

        const resetGains = () => {
            isTestPlaying = false;
            try {
                previewGain.gain.setValueAtTime(0.0, ctx.currentTime);
                outWave.gain.setValueAtTime(1.0, ctx.currentTime);
            } catch (_) {}
        };

        w.port.onmessage = (e) => {
            if (e.data?.type === 'STATE') {
                curPlayhead = e.data.pos ?? 0.0;
                isPlaying = Boolean(e.data.isPlaying);
                if (e.data.effStart !== undefined) curEffStart = e.data.effStart;
                if (e.data.effEnd !== undefined) curEffEnd = e.data.effEnd;
                if (e.data.rawStart !== undefined) curRawStart = e.data.rawStart;
                if (e.data.rawEnd !== undefined) curRawEnd = e.data.rawEnd;
                if (e.data.startPatched !== undefined) isStartPatchedState = Boolean(e.data.startPatched);
                if (e.data.endPatched !== undefined) isEndPatchedState = Boolean(e.data.endPatched);
                if (e.data.snapMode !== undefined) isSnapModeState = Boolean(e.data.snapMode);
                if (!isPlaying && isTestPlaying) {
                    resetGains();
                }
            }
        };

        return {
            nodes: { w, gateIn, cvStartIn, cvEndIn, cvSpeedIn, outWave, previewGain, an },
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
                resetGains();
                w.port.postMessage({ type: 'TRIGGER' });
            },
            testPlay: () => {
                isTestPlaying = true;
                try {
                    if (ctx.state === 'suspended') ctx.resume();
                    outWave.gain.cancelScheduledValues(ctx.currentTime);
                    outWave.gain.setValueAtTime(0.0, ctx.currentTime);
                    previewGain.gain.cancelScheduledValues(ctx.currentTime);
                    previewGain.gain.setValueAtTime(0.8, ctx.currentTime);
                } catch (_) {}
                w.port.postMessage({ type: 'PLAY' });
            },
            play: () => {
                resetGains();
                w.port.postMessage({ type: 'PLAY' });
            },
            stop: () => {
                resetGains();
                w.port.postMessage({ type: 'STOP' });
            },
            reset: () => {
                resetGains();
                curPlayhead = 0.0;
                isPlaying = false;
                w.port.postMessage({ type: 'RESET' });
            },
            read: () => {
                an.getFloatTimeDomainData(buf);
                return {
                    values: [buf[0] || 0.0],
                    playhead: curPlayhead,
                    isPlaying,
                    effStart: curEffStart,
                    effEnd: curEffEnd,
                    rawStart: curRawStart,
                    rawEnd: curRawEnd,
                    startPatched: isStartPatchedState,
                    endPatched: isEndPatchedState,
                    snapMode: isSnapModeState
                };
            }
        };
    },
    update: (ctx, inst, d, patch) => {
        if (!inst?.nodes?.w) return;
        if (patch !== undefined) {
            inst._patchState = patch;
        }
        const p = inst._patchState || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id) : null);
        const isStartPatched = p?.has?.('start_cv') || p?.has?.('cv_start') || Boolean(d.startPatched);
        const isEndPatched = p?.has?.('end_cv') || p?.has?.('cv_end') || Boolean(d.endPatched);

        inst.nodes.w.port.postMessage({
            type: 'SET_PARAMS',
            start: d.start ?? 0.0,
            end: d.end ?? 1.0,
            speed: d.speed ?? 1.0,
            loop: d.loop ?? false,
            retrigger: d.retrigger ?? true,
            startPatched: Boolean(isStartPatched),
            endPatched: Boolean(isEndPatched),
            snapMode: Boolean(d.snapMode),
            chops: Array.isArray(d.chops) ? d.chops : []
        });
    }
};

export const TAPE = WAVE;
export const waveAudioDefs = { WAVE, TAPE };
export const tapeAudioDefs = waveAudioDefs;
export default waveAudioDefs;

