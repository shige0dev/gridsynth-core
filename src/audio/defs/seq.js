import { AudioHelpers } from '../helpers.js';
import { CHORD_TYPES, CHORD_VOICINGS, CHORD_ORDER, VOICING_ORDER } from '../../core/musical.js';

export const SEQ8 = {
    create: (ctx, d, patch, eng) => {
        const steps = (d?.steps && d.steps.length === 8) ? d.steps : Array.from({ length: 8 }, (_, i) => ({
            cv: i === 0 ? 0 : 0.25,
            active: true,
            cvActive: true,
            gate: true
        }));
        const w = new AudioWorkletNode(ctx, 'seq-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 2,
            processorOptions: { steps }
        });
        w.port.postMessage({ type: 'SET_STEPS', steps });
        const cv = ctx.createGain(), gt = ctx.createGain(), gIn = ctx.createGain();
        w.connect(cv, 0, 0);
        w.connect(gt, 1, 0);
        gIn.connect(w, 0, 0);
        if (eng?.silentSink) gt.connect(eng.silentSink);
        let st = -1;
        w.port.onmessage = e => { if (e.data.type === 'STEP') st = e.data.step; };
        return {
            nodes: { w, cv, gt, gIn },
            inputs: { gate_in: gIn },
            outputs: { cv_out: cv, gate_out: gt },
            resetStep: () => { st = -1; },
            read: () => ({ step: st })
        };
    },
    update: (ctx, inst, d) => {
        if (d?.steps && inst?.nodes?.w) {
            inst.nodes.w.port.postMessage({ type: 'SET_STEPS', steps: d.steps });
        }
    }
};

export const SEQ16 = {
    create: (ctx, d, patch, eng) => {
        const steps = (d?.steps && d.steps.length === 16) ? d.steps : Array.from({ length: 16 }, (_, i) => ({
            cv: i === 0 ? 0 : 0.25,
            active: true,
            cvActive: true,
            gate: true
        }));
        const w = new AudioWorkletNode(ctx, 'seq-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 2,
            processorOptions: { steps }
        });
        w.port.postMessage({ type: 'SET_STEPS', steps });
        const cv = ctx.createGain(), gt = ctx.createGain(), gIn = ctx.createGain();
        w.connect(cv, 0, 0);
        w.connect(gt, 1, 0);
        gIn.connect(w, 0, 0);
        if (eng?.silentSink) gt.connect(eng.silentSink);
        let st = -1;
        w.port.onmessage = e => { if (e.data.type === 'STEP') st = e.data.step; };
        return {
            nodes: { w, cv, gt, gIn },
            inputs: { gate_in: gIn },
            outputs: { cv_out: cv, gate_out: gt },
            resetStep: () => { st = -1; },
            read: () => ({ step: st })
        };
    },
    update: (ctx, inst, d) => {
        if (d?.steps && inst?.nodes?.w) {
            inst.nodes.w.port.postMessage({ type: 'SET_STEPS', steps: d.steps });
        }
    }
};

export const CHORD = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'chord-processor', {
            numberOfInputs: 3,
            numberOfOutputs: 4,
            outputChannelCount: [1, 1, 1, 1]
        });

        const chordIdx = CHORD_ORDER.indexOf(d.chord || 'min');
        const voiceIdx = VOICING_ORDER.indexOf(d.voicing || 'close');
        const rootCv = ((d.rootMidi ?? 48) - 24) / 12.0;

        const hasRoot = patch.has('cv_in');
        const hasType = patch.has('type_cv');
        const hasVoice = patch.has('voice_cv');

        w.port.postMessage({
            type: 'SET_PARAMS',
            rootCv,
            chordIdx: chordIdx >= 0 ? chordIdx : 0,
            voiceIdx: voiceIdx >= 0 ? voiceIdx : 0,
            hasRoot,
            hasType,
            hasVoice
        });

        const inRoot = ctx.createGain();
        const inType = ctx.createGain();
        const inVoice = ctx.createGain();
        inRoot.connect(w, 0, 0);
        inType.connect(w, 0, 1);
        inVoice.connect(w, 0, 2);

        const out1 = ctx.createGain();
        const out2 = ctx.createGain();
        const out3 = ctx.createGain();
        const out4 = ctx.createGain();
        w.connect(out1, 0, 0);
        w.connect(out2, 1, 0);
        w.connect(out3, 2, 0);
        w.connect(out4, 3, 0);

        if (eng?.silentSink) out1.connect(eng.silentSink);

        let activeChordIdx = chordIdx >= 0 ? chordIdx : 0;
        let activeVoiceIdx = voiceIdx >= 0 ? voiceIdx : 0;
        w.port.onmessage = (e) => {
            if (e.data.type === 'ACTIVE') {
                activeChordIdx = e.data.chordIdx;
                activeVoiceIdx = e.data.voiceIdx;
            }
        };

        return {
            nodes: { w, inRoot, inType, inVoice, out1, out2, out3, out4 },
            inputs: { cv_in: inRoot, type_cv: inType, voice_cv: inVoice },
            outputs: {
                cv_out1: out1,
                cv_out2: out2,
                cv_out3: out3,
                cv_out4: out4,
                out1,
                out2,
                out3,
                out4,
                cv1: out1,
                cv2: out2,
                cv3: out3,
                cv4: out4
            },
            read: () => ({ activeChordIdx, activeVoiceIdx })
        };
    },
    update: (ctx, inst, d, patch) => {
        const chordIdx = CHORD_ORDER.indexOf(d.chord || 'min');
        const voiceIdx = VOICING_ORDER.indexOf(d.voicing || 'close');
        const rootCv = ((d.rootMidi ?? 48) - 24) / 12.0;

        const hasRoot = patch.has('cv_in');
        const hasType = patch.has('type_cv');
        const hasVoice = patch.has('voice_cv');

        inst.nodes.w.port.postMessage({
            type: 'SET_PARAMS',
            rootCv,
            chordIdx: chordIdx >= 0 ? chordIdx : 0,
            voiceIdx: voiceIdx >= 0 ? voiceIdx : 0,
            hasRoot,
            hasType,
            hasVoice
        });
    }
};

export const GATE4 = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'gate4-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 4,
            outputChannelCount: [1, 1, 1, 1]
        });

        w.port.postMessage({
            type: 'SET_PARAMS',
            steps: d.steps ?? 4,
            mode: d.mode || 'up'
        });

        const inGate = ctx.createGain();
        inGate.connect(w, 0, 0);

        const out1 = ctx.createGain();
        const out2 = ctx.createGain();
        const out3 = ctx.createGain();
        const out4 = ctx.createGain();

        w.connect(out1, 0, 0);
        w.connect(out2, 1, 0);
        w.connect(out3, 2, 0);
        w.connect(out4, 3, 0);
        if (eng?.silentSink) out1.connect(eng.silentSink);

        let currentStep = -1;
        w.port.onmessage = (e) => {
            if (e.data.type === 'STEP') {
                currentStep = e.data.step;
            }
        };

        return {
            nodes: { w, inGate, out1, out2, out3, out4 },
            inputs: { gate_in: inGate, clk_in: inGate, trig_in: inGate },
            outputs: {
                gate_out1: out1,
                gate_out2: out2,
                gate_out3: out3,
                gate_out4: out4,
                out1,
                out2,
                out3,
                out4,
                gate1: out1,
                gate2: out2,
                gate3: out3,
                gate4: out4
            },
            resetStep: () => {
                currentStep = -1;
                w.port.postMessage({ type: 'RESET' });
            },
            read: () => ({ step: currentStep })
        };
    },
    update: (ctx, inst, d) => {
        inst.nodes.w.port.postMessage({
            type: 'SET_PARAMS',
            steps: d.steps ?? 4,
            mode: d.mode || 'up'
        });
    }
};

export const ARP = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'arp-processor', {
            numberOfInputs: 5,
            numberOfOutputs: 2,
            outputChannelCount: [1, 1]
        });

        const inClk = ctx.createGain();
        const in1 = ctx.createGain();
        const in2 = ctx.createGain();
        const in3 = ctx.createGain();
        const in4 = ctx.createGain();

        inClk.connect(w, 0, 0);
        in1.connect(w, 0, 1);
        in2.connect(w, 0, 2);
        in3.connect(w, 0, 3);
        in4.connect(w, 0, 4);

        const outSig = ctx.createGain();
        const outGate = ctx.createGain();

        w.connect(outSig, 0, 0);
        w.connect(outGate, 1, 0);
        if (eng?.silentSink) outGate.connect(eng.silentSink);

        const activeInputs = [1, 2, 3, 4]
            .filter(i => patch?.has?.(`cv_in${i}`) || patch?.has?.(`in_${i}`) || patch?.has?.(`in${i}`))
            .map(i => i - 1);

        w.port.postMessage({
            type: 'SET_PARAMS',
            mode: d.mode || 'up',
            activeInputs
        });

        let activeChannel = activeInputs.length > 0 ? activeInputs[0] : -1;
        let activePointer = 0;
        w.port.onmessage = (e) => {
            if (e.data.type === 'STEP') {
                activeChannel = e.data.channel;
                activePointer = e.data.pointer;
            }
        };

        const instObj = {
            nodes: { w, inClk, in1, in2, in3, in4, outSig, outGate },
            inputs: {
                clk_in: inClk,
                trig_in: inClk,
                cv_in1: in1,
                cv_in2: in2,
                cv_in3: in3,
                cv_in4: in4,
                // Backward compatibility aliases
                in_1: in1,
                in_2: in2,
                in_3: in3,
                in_4: in4,
                in1: in1,
                in2: in2,
                in3: in3,
                in4: in4
            },
            outputs: {
                cv_out: outSig,
                out: outSig,
                gate_out: outGate
            },
            activeInputs,
            resetStep: () => {
                w.port.postMessage({ type: 'RESET' });
            },
            read: () => ({
                activeChannel,
                activePointer,
                activeInputs: instObj.activeInputs
            })
        };
        return instObj;
    },
    update: (ctx, inst, d, patch) => {
        const activeInputs = [1, 2, 3, 4]
            .filter(i => patch?.has?.(`cv_in${i}`) || patch?.has?.(`in_${i}`) || patch?.has?.(`in${i}`))
            .map(i => i - 1);

        inst.activeInputs = activeInputs;
        inst.nodes.w.port.postMessage({
            type: 'SET_PARAMS',
            mode: d.mode || 'up',
            activeInputs
        });
    }
};

export const seqAudioDefs = {
    SEQ8,
    SEQ16,
    CHORD,
    GATE4,
    ARP
};
