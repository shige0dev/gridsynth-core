import { AudioHelpers } from '../helpers.js';

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

export const SPK = {
    create: (ctx, d) => {
        const inL = ctx.createGain(), inR = ctx.createGain();
        const outL = ctx.createGain(), outR = ctx.createGain();
        const anL = ctx.createAnalyser(), anR = ctx.createAnalyser();
        anL.fftSize = 64;
        anR.fftSize = 64;
        const bufL = new Float32Array(anL.frequencyBinCount);
        const bufR = new Float32Array(anR.frequencyBinCount);

        const merger = ctx.createChannelMerger(2);
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -1.5;
        limiter.knee.value = 3.0;
        limiter.ratio.value = 20.0;
        limiter.attack.value = 0.002;
        limiter.release.value = 0.08;

        const vol = d.masterVol ?? 0.12;
        outL.gain.value = vol;
        outR.gain.value = vol;

        inL.connect(outL);
        inR.connect(outR);

        outL.connect(anL);
        outR.connect(anR);

        outL.connect(merger, 0, 0);
        outR.connect(merger, 0, 1);
        merger.connect(limiter);
        limiter.connect(ctx.destination);

        return {
            nodes: { inL, inR, outL, outR, anL, anR, merger, limiter },
            inputs: {
                wave_inL: inL,
                wave_inR: inR,
                wave_in_l: inL,
                wave_in_r: inR,
                wave_in: inL
            },
            outputs: {},
            read: () => {
                anL.getFloatTimeDomainData(bufL);
                anR.getFloatTimeDomainData(bufR);
                let peakL = 0, peakR = 0;
                for (let i = 0; i < bufL.length; i++) {
                    const aL = Math.abs(bufL[i]);
                    if (aL > peakL) peakL = aL;
                    const aR = Math.abs(bufR[i]);
                    if (aR > peakR) peakR = aR;
                }
                return { peakL, peakR };
            }
        };
    },
    update: (ctx, inst, d) => {
        const vol = d.masterVol ?? 0.12;
        if (inst.nodes.outL) AudioHelpers.set(inst.nodes.outL.gain, vol, ctx);
        if (inst.nodes.outR) AudioHelpers.set(inst.nodes.outR.gain, vol, ctx);
    }
};

export const KEY = {
    create: (ctx, d) => {
        const p = ctx.createConstantSource(), g = ctx.createConstantSource();
        p.offset.value = ((d.currentMidi ?? 60) - 24) / 12.0;
        p.start();
        g.offset.value = 0.0;
        g.start();
        return { nodes: { p, g }, inputs: {}, outputs: { cv_out: p, gate_out: g } };
    }
};

export const SUB = {
    create: (ctx, d) => {
        const nodes = {}, inputs = {}, outputs = {};
        // Slots 1..6: Inputs (Send: Parent -> Child)
        for (let i = 1; i <= 6; i++) {
            const pin = `PIN${i}_in`;
            const inGain = ctx.createGain();
            inGain.gain.value = 1.0;
            nodes[pin] = inGain;
            inputs[pin] = inGain;
            inputs[`PIN${i}`] = inGain;
            inputs[`io_${i}`] = inGain;
        }
        // Slots 7..12: Outputs (Return: Child -> Parent)
        for (let i = 7; i <= 12; i++) {
            const pin = `PIN${i}_out`;
            const outGain = ctx.createGain();
            outGain.gain.value = 1.0;
            nodes[pin] = outGain;
            outputs[pin] = outGain;
            outputs[`PIN${i}`] = outGain;
            outputs[`io_${i}`] = outGain;
        }
        outputs['io_9'] = outputs['PIN7_out'];
        return { nodes, inputs, outputs, targetPage: d.targetPage ?? 1 };
    },
    update: (ctx, inst, d) => {
        inst.targetPage = d.targetPage ?? 1;
    }
};

export const SUB_IO = {
    create: (ctx) => {
        const nodes = {}, inputs = {}, outputs = {};
        // Slots 1..6: Outputs (Receive from Parent)
        for (let i = 1; i <= 6; i++) {
            const pin = `PIN${i}_out`;
            const outGain = ctx.createGain();
            outGain.gain.value = 1.0;
            nodes[pin] = outGain;
            outputs[pin] = outGain;
            outputs[`PIN${i}`] = outGain;
            outputs[`io_${i}`] = outGain;
        }
        // Slots 7..12: Inputs (Send back to Parent)
        for (let i = 7; i <= 12; i++) {
            const pin = `PIN${i}_in`;
            const inGain = ctx.createGain();
            inGain.gain.value = 1.0;
            nodes[pin] = inGain;
            inputs[pin] = inGain;
            inputs[`PIN${i}`] = inGain;
            inputs[`io_${i}`] = inGain;
        }
        inputs['io_9'] = inputs['PIN7_in'];
        return { nodes, inputs, outputs };
    }
};

export const SPEC = {
    create: (ctx, d, patch, eng) => {
        const inG = ctx.createGain();
        const an = ctx.createAnalyser();
        an.fftSize = 2048;
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

export const ioAudioDefs = {
    SCOPE,
    MON,
    SPK,
    KEY,
    SUB,
    SUB_IO,
    SPEC
};
