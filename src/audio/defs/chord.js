import { AudioHelpers } from '../helpers.js';
import { CHORD_TYPES, CHORD_VOICINGS, CHORD_ORDER, VOICING_ORDER } from '../../core/musical.js';

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

export const chordAudioDefs = {
    CHORD
};
