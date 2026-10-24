import { AudioHelpers } from '../helpers.js';

const createMathAudio = (ctx, d, patch, eng, hasTwoInputs) => {
    const gA = ctx.createGain(), out = ctx.createGain(), an = ctx.createAnalyser();
    const gB = hasTwoInputs ? ctx.createGain() : null;
    an.fftSize = 256; out.connect(an);
    if (eng?.silentSink) out.connect(eng.silentSink);
    const w = new AudioWorkletNode(ctx, 'math-processor', { numberOfInputs: 2, numberOfOutputs: 1 });
    const hasA = patch?.has('CV_inA') || patch?.has('cv_ina') || patch?.has('a') || patch?.has('in_a') || false;
    const hasB = hasTwoInputs ? (patch?.has('CV_inB') || patch?.has('cv_inb') || patch?.has('b') || patch?.has('in_b') || false) : false;
    w.port.postMessage({
        type: 'SET_PARAMS',
        mode: d.mode || (hasTwoInputs ? 'ADD' : 'ABS'),
        valA: d.valA ?? 0.0,
        valB: hasTwoInputs ? (d.valB ?? 1.0) : 0.0,
        hasA,
        hasB
    });
    gA.connect(w, 0, 0);
    if (gB) gB.connect(w, 0, 1);
    w.connect(out);
    const buf = new Float32Array(an.frequencyBinCount);
    const nodes = { gA, out, an, w };
    const inputs = {
        CV_inA: gA,
        cv_ina: gA,
        a: gA,
        in_a: gA
    };
    if (gB) {
        nodes.gB = gB;
        inputs.CV_inB = gB;
        inputs.cv_inb = gB;
        inputs.b = gB;
        inputs.in_b = gB;
    }
    return {
        nodes,
        inputs,
        outputs: { CV_OUT: out, cv_out: out, out },
        read: () => {
            an.getFloatTimeDomainData(buf);
            return { values: [buf[0] || 0] };
        }
    };
};

const updateMathAudio = (inst, d, patch, hasTwoInputs) => {
    const hasA = patch?.has('CV_inA') || patch?.has('cv_ina') || patch?.has('a') || patch?.has('in_a') || false;
    const hasB = hasTwoInputs ? (patch?.has('CV_inB') || patch?.has('cv_inb') || patch?.has('b') || patch?.has('in_b') || false) : false;
    inst.nodes.w.port.postMessage({
        type: 'SET_PARAMS',
        mode: d.mode || (hasTwoInputs ? 'ADD' : 'ABS'),
        valA: d.valA ?? 0.0,
        valB: hasTwoInputs ? (d.valB ?? 1.0) : 0.0,
        hasA,
        hasB
    });
};

export const LFO = {
    create: (ctx, d, patch, eng) => {
        const effRate = d.period !== undefined ? (1.0 / Math.max(0.001, d.period)) : (d.rate ?? 2.0);
        const w = new AudioWorkletNode(ctx, 'lfo-processor', {
            numberOfInputs: 2,
            numberOfOutputs: 1,
            parameterData: {
                rate: effRate,
                depth: d.depth ?? 1.0,
                duty: d.duty ?? 0.5,
                phase: d.phase ?? 0.0
            }
        });
        w.port.postMessage({
            type: 'SET_CONFIG',
            waveType: d.waveType || 'sine',
            polarity: d.polarity || 'bipolar',
            syncMode: d.syncMode || 'free',
            division: d.division || '1/4',
            bpm: eng?.masterBPM || 120,
            rate: effRate,
            depth: d.depth ?? 1.0,
            duty: d.duty ?? 0.5,
            phase: d.phase ?? 0.0
        });
        const rIn = ctx.createGain(), cvIn = ctx.createGain();
        rIn.connect(w, 0, 0);
        cvIn.connect(w, 0, 1);
        return {
            nodes: { w, rIn, cvIn },
            inputs: { reset: rIn, reset_in: rIn, trig_in: rIn, cv_in: cvIn },
            outputs: { cv_out: w, out: w }
        };
    },
    update: (ctx, inst, d, patch, eng) => {
        const effRate = d.period !== undefined ? (1.0 / Math.max(0.001, d.period)) : (d.rate ?? 2.0);
        AudioHelpers.set(inst.nodes.w.parameters.get('rate'), effRate, ctx);
        ['depth', 'duty', 'phase'].forEach(p => {
            if (d[p] !== undefined) AudioHelpers.set(inst.nodes.w.parameters.get(p), d[p], ctx);
        });
        inst.nodes.w.port.postMessage({
            type: 'SET_CONFIG',
            waveType: d.waveType || 'sine',
            polarity: d.polarity || 'bipolar',
            syncMode: d.syncMode || 'free',
            division: d.division || '1/4',
            bpm: eng?.masterBPM || 120,
            rate: effRate,
            depth: d.depth,
            duty: d.duty,
            phase: d.phase
        });
    }
};

export const CLK = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'clock-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            parameterData: {
                bpm: eng.masterBPM || 120,
                pulseWidthMs: d.pulseWidthMs ?? 15,
                limitPct: Math.min(90, d.limitPct ?? 90)
            }
        });
        const hasPower = patch ? (patch.has('power_in') || patch.has('power')) : false;
        w.port.postMessage({
            type: 'SET_STATE',
            running: eng.isPlaying,
            div: d.div || 'x2',
            limitPct: Math.min(90, d.limitPct ?? 90),
            hasPowerIn: hasPower
        });
        const pIn = ctx.createGain();
        pIn.connect(w, 0, 0);
        if (eng?.silentSink) w.connect(eng.silentSink);
        return { nodes: { w, pIn }, inputs: { power_in: pIn }, outputs: { gate_out: w } };
    },
    update: (ctx, inst, d, patch, eng) => {
        AudioHelpers.set(inst.nodes.w.parameters.get('bpm'), eng.masterBPM || 120, ctx, 0.02);
        if (d.pulseWidthMs !== undefined) {
            AudioHelpers.set(inst.nodes.w.parameters.get('pulseWidthMs'), d.pulseWidthMs, ctx, 0.02);
        }
        if (d.limitPct !== undefined) {
            AudioHelpers.set(inst.nodes.w.parameters.get('limitPct'), Math.min(90, d.limitPct), ctx, 0.02);
        }
        const hasPower = patch ? (patch.has('power_in') || patch.has('power')) : false;
        inst.nodes.w.port.postMessage({
            type: 'SET_STATE',
            div: d.div,
            limitPct: Math.min(90, d.limitPct ?? 90),
            hasPowerIn: hasPower
        });
    }
};

export const THROUGH = {
    create: (ctx, d) => {
        const g = ctx.createGain(); g.gain.value = d.state !== false ? 1.0 : 0.0;
        return { nodes: { g }, inputs: { wave_in: g }, outputs: { wave_out: g } };
    },
    update: (ctx, inst, d) => AudioHelpers.set(inst.nodes.g.gain, d.state !== false ? 1.0 : 0.0, ctx, 0.003)
};

export const MATH1 = {
    create: (ctx, d, patch, eng) => createMathAudio(ctx, d, patch, eng, false),
    update: (ctx, inst, d, patch) => updateMathAudio(inst, d, patch, false)
};

export const MATH2 = {
    create: (ctx, d, patch, eng) => createMathAudio(ctx, d, patch, eng, true),
    update: (ctx, inst, d, patch) => updateMathAudio(inst, d, patch, true)
};

export const SH = {
    create: (ctx, d, patch) => {
        const w = new AudioWorkletNode(ctx, 'sh-processor', { numberOfInputs: 2, numberOfOutputs: 1, parameterData: { glide: d.glide ?? 0.0, scale: d.scale ?? 1.0 } });
        w.port.postMessage({ type: 'SET_CONFIG', hasExternalSig: patch.has('sig_in'), polarity: d.polarity || 'unipolar' });
        const sig = ctx.createGain(), trg = ctx.createGain(), out = ctx.createGain(), an = ctx.createAnalyser(); an.fftSize = 256;
        sig.connect(w, 0, 0); trg.connect(w, 0, 1); w.connect(out); out.connect(an);
        const buf = new Float32Array(an.frequencyBinCount);
        return { nodes: { w, sig, trg, out, an }, inputs: { sig_in: sig, trig_in: trg }, outputs: { cv_out: out }, read: () => { an.getFloatTimeDomainData(buf); return { values: [buf[0] || 0] }; } };
    },
    update: (ctx, inst, d, patch) => {
        if (d.glide !== undefined) AudioHelpers.set(inst.nodes.w.parameters.get('glide'), d.glide, ctx);
        if (d.scale !== undefined) AudioHelpers.set(inst.nodes.w.parameters.get('scale'), d.scale, ctx);
        inst.nodes.w.port.postMessage({ type: 'SET_CONFIG', hasExternalSig: patch.has('sig_in'), polarity: d.polarity || 'unipolar' });
    }
};

export const modAudioDefs = {
    LFO,
    CLK,
    THROUGH,
    MATH1,
    MATH2,
    SH
};
