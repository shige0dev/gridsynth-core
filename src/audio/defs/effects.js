import { AudioHelpers } from '../helpers.js?v=839';

export const DELAY = {
    create: (ctx, d) => {
        const del = ctx.createDelay(5.0), fb = ctx.createGain(), wet = ctx.createGain(), dry = ctx.createGain(), inp = ctx.createGain(), out = ctx.createGain();
        const mix = d.mix ?? 0.5;
        del.delayTime.value = d.delayTime ?? 0.3;
        fb.gain.value = d.feedback ?? 0.4;
        wet.gain.value = mix;
        dry.gain.value = 1.0 - mix;
        inp.connect(dry); inp.connect(del); del.connect(fb); fb.connect(del); del.connect(wet); dry.connect(out); wet.connect(out);
        const inst = {
            nodes: { del, fb, wet, dry, inp, out },
            inputs: { wave_in: inp },
            outputs: { wave_out: out },
            clear: () => {
                try {
                    const curTime = ctx.currentTime;
                    fb.gain.cancelScheduledValues(curTime);
                    fb.gain.setValueAtTime(0, curTime);
                    fb.gain.setValueAtTime(d.feedback ?? 0.4, curTime + 0.05);

                    inp.disconnect(inst.nodes.del);
                    fb.disconnect(inst.nodes.del);
                    inst.nodes.del.disconnect(fb);
                    inst.nodes.del.disconnect(wet);

                    const newDel = ctx.createDelay(5.0);
                    newDel.delayTime.value = d.delayTime ?? 0.3;
                    inp.connect(newDel);
                    fb.connect(newDel);
                    newDel.connect(fb);
                    newDel.connect(wet);
                    inst.nodes.del = newDel;
                } catch (e) {}
            }
        };
        return inst;
    },
    update: (ctx, inst, d) => {
        AudioHelpers.set(inst.nodes.del.delayTime, d.delayTime ?? 0.3, ctx);
        AudioHelpers.set(inst.nodes.fb.gain, d.feedback ?? 0.4, ctx);
        const mix = d.mix ?? 0.5;
        AudioHelpers.set(inst.nodes.wet.gain, mix, ctx);
        AudioHelpers.set(inst.nodes.dry.gain, 1.0 - mix, ctx);
    }
};

export const LAG = {
    create: (ctx, d, patch) => {
        const isTimeCvPatched = !!(patch?.has?.('time_cv'));
        const w = new AudioWorkletNode(ctx, 'cv-delay-processor', { numberOfInputs: 2, numberOfOutputs: 1 });
        const pTime = w.parameters.get('timeMs');
        const pDepth = w.parameters.get('cvDepth');
        if (pTime) pTime.value = isTimeCvPatched ? 0 : (d.timeMs ?? 50);
        if (pDepth) pDepth.value = d.cvDepth ?? 1.0;
        w.port.postMessage({ type: 'SET_PATCH', isTimeCvPatched });

        const sigIn = ctx.createGain();
        const timeCvIn = ctx.createGain();
        const out = ctx.createGain();

        sigIn.connect(w, 0, 0);
        timeCvIn.connect(w, 0, 1);
        w.connect(out);

        return {
            nodes: { w, sigIn, timeCvIn, out },
            inputs: { sig_in: sigIn, cv_in: sigIn, time_cv: timeCvIn },
            outputs: { cv_out: out, out },
            clear: () => {
                w.port.postMessage({ type: 'RESET' });
            }
        };
    },
    update: (ctx, inst, d, patch) => {
        const isTimeCvPatched = !!(patch?.has?.('time_cv'));
        const pTime = inst.nodes.w.parameters.get('timeMs');
        const pDepth = inst.nodes.w.parameters.get('cvDepth');
        if (pTime) AudioHelpers.set(pTime, isTimeCvPatched ? 0 : (d.timeMs ?? 50), ctx, 0.005);
        if (pDepth) AudioHelpers.set(pDepth, d.cvDepth ?? 1.0, ctx, 0.005);
        inst.nodes.w.port.postMessage({ type: 'SET_PATCH', isTimeCvPatched });
    }
};

export const REVERB = {
    create: (ctx, d, patch) => {
        const inp = ctx.createGain();
        const out = ctx.createGain();
        const outR = ctx.createGain();
        const split = ctx.createChannelSplitter(2);
        const dry = ctx.createGain();
        const wet = ctx.createGain();
        const conv = ctx.createConvolver();
        const hpf = ctx.createBiquadFilter();
        const damp = ctx.createBiquadFilter();
        const cvG = ctx.createGain();

        wet.channelCount = 2;
        wet.channelCountMode = 'explicit';
        wet.channelInterpretation = 'speakers';
        out.channelCount = 2;
        out.channelCountMode = 'explicit';
        out.channelInterpretation = 'speakers';

        const isCvPatched = !!(patch?.has?.('cv_in'));
        const rawMix = Math.max(0, Math.min(1, d.mix ?? 0.4));
        const dryGain = isCvPatched ? 0.85 : Math.cos(rawMix * Math.PI * 0.46);
        const wetGain = isCvPatched ? 0.0 : (Math.sin(rawMix * Math.PI * 0.5) * 1.4);

        hpf.type = 'highpass';
        hpf.frequency.value = 95;
        hpf.Q.value = 0.707;

        damp.type = 'lowpass';
        damp.frequency.value = d.damp ?? 4500;

        dry.gain.value = dryGain;
        wet.gain.value = wetGain;
        cvG.gain.value = (d.cvDepth ?? 1.0) * 1.4;

        conv.buffer = AudioHelpers.buildReverbBuffer(ctx, d.time ?? 1.8, d.mode || 'hall');

        inp.connect(dry);
        dry.connect(out);

        inp.connect(hpf);
        hpf.connect(damp);
        damp.connect(conv);
        conv.connect(wet);
        wet.connect(out);
        cvG.connect(wet.gain);

        out.connect(split);
        split.connect(outR, 1);

        const inst = {
            nodes: { inp, out, outR, split, dry, wet, conv, hpf, damp, cvG },
            inputs: { wave_in: inp, cv_in: cvG },
            outputs: { wave_out: out, wave_out_l: out, wave_out_r: outR },
            patch: patch,
            _time: d.time ?? 1.8,
            _mode: d.mode || 'hall',
            clear: () => {
                try {
                    const curTime = ctx.currentTime;
                    const curPatched = !!(inst.patch?.has?.('cv_in'));
                    const m = Math.max(0, Math.min(1, d.mix ?? 0.4));
                    const wG = curPatched ? 0.0 : (Math.sin(m * Math.PI * 0.5) * 1.4);
                    wet.gain.cancelScheduledValues(curTime);
                    wet.gain.setValueAtTime(0, curTime);
                    wet.gain.setValueAtTime(wG, curTime + 0.05);
                } catch (e) {}
            }
        };
        return inst;
    },
    update: (ctx, inst, d, patch) => {
        if (patch !== undefined) {
            inst.patch = patch;
        }
        const isCvPatched = !!(inst.patch?.has?.('cv_in'));
        const rawMix = Math.max(0, Math.min(1, d.mix ?? 0.4));
        const dryGain = isCvPatched ? 0.85 : Math.cos(rawMix * Math.PI * 0.46);
        const wetGain = isCvPatched ? 0.0 : (Math.sin(rawMix * Math.PI * 0.5) * 1.4);
        AudioHelpers.set(inst.nodes.wet.gain, wetGain, ctx);
        AudioHelpers.set(inst.nodes.dry.gain, dryGain, ctx);
        AudioHelpers.set(inst.nodes.cvG.gain, (d.cvDepth ?? 1.0) * 1.4, ctx);
        AudioHelpers.set(inst.nodes.damp.frequency, d.damp ?? 4500, ctx);
        if (Math.abs((d.time ?? 1.8) - inst._time) > 0.05 || (d.mode || 'hall') !== inst._mode) {
            inst._time = d.time ?? 1.8; inst._mode = d.mode || 'hall';
            try { inst.nodes.conv.buffer = AudioHelpers.buildReverbBuffer(ctx, inst._time, inst._mode); } catch (e) {}
        }
    }
};

export const effectsAudioDefs = {
    DELAY,
    LAG,
    REVERB
};
