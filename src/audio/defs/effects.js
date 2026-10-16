import { AudioHelpers } from '../helpers.js';

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

export const CVDELAY = {
    create: (ctx, d) => {
        const w = new AudioWorkletNode(ctx, 'cv-delay-processor', { numberOfInputs: 2, numberOfOutputs: 1 });
        const pTime = w.parameters.get('timeMs');
        const pDepth = w.parameters.get('cvDepth');
        if (pTime) pTime.value = d.timeMs ?? 50;
        if (pDepth) pDepth.value = d.cvDepth ?? 1.0;

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
    update: (ctx, inst, d) => {
        const pTime = inst.nodes.w.parameters.get('timeMs');
        const pDepth = inst.nodes.w.parameters.get('cvDepth');
        if (pTime) AudioHelpers.set(pTime, d.timeMs ?? 50, ctx, 0.005);
        if (pDepth) AudioHelpers.set(pDepth, d.cvDepth ?? 1.0, ctx, 0.005);
    }
};

export const REVERB = {
    create: (ctx, d) => {
        const inp = ctx.createGain(), out = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain(), conv = ctx.createConvolver(), damp = ctx.createBiquadFilter(), cvG = ctx.createGain();
        const mix = d.mix ?? 0.4;
        damp.type = 'lowpass'; damp.frequency.value = d.damp ?? 4500; dry.gain.value = 1.0 - mix; wet.gain.value = mix; cvG.gain.value = 0.5;
        conv.buffer = AudioHelpers.buildReverbBuffer(ctx, d.time ?? 1.8, d.mode || 'hall');
        inp.connect(dry); dry.connect(out); inp.connect(damp); damp.connect(conv); conv.connect(wet); wet.connect(out); cvG.connect(wet.gain);
        const inst = {
            nodes: { inp, out, dry, wet, conv, damp, cvG },
            inputs: { wave_in: inp, cv_in: cvG },
            outputs: { wave_out: out },
            _time: d.time ?? 1.8,
            _mode: d.mode || 'hall',
            clear: () => {
                try {
                    const curTime = ctx.currentTime;
                    wet.gain.cancelScheduledValues(curTime);
                    wet.gain.setValueAtTime(0, curTime);
                    wet.gain.setValueAtTime(d.mix ?? 0.4, curTime + 0.05);
                } catch (e) {}
            }
        };
        return inst;
    },
    update: (ctx, inst, d) => {
        const mix = d.mix ?? 0.4;
        AudioHelpers.set(inst.nodes.wet.gain, mix, ctx); AudioHelpers.set(inst.nodes.dry.gain, 1.0 - mix, ctx);
        AudioHelpers.set(inst.nodes.damp.frequency, d.damp ?? 4500, ctx);
        if (Math.abs((d.time ?? 1.8) - inst._time) > 0.1 || (d.mode || 'hall') !== inst._mode) {
            inst._time = d.time ?? 1.8; inst._mode = d.mode || 'hall';
            try { inst.nodes.conv.buffer = AudioHelpers.buildReverbBuffer(ctx, inst._time, inst._mode); } catch (e) {}
        }
    }
};

export const effectsAudioDefs = {
    DELAY,
    CVDELAY,
    REVERB
};
