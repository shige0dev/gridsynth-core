import { CHORD_SPECS } from '../../core/musical.js';

export const CHORD = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'chord-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 4,
            outputChannelCount: [1, 1, 1, 1]
        });

        const info = CHORD_SPECS[d.chord] || CHORD_SPECS['min'];
        const chordIdx = info.index ?? 0;
        const offsets = info.intervals || [0, 3, 7, 12];
        const rootCv = ((d.rootMidi ?? 48) - 24) / 12.0;
        const hasRoot = patch.has('cv_in');

        w.port.postMessage({
            type: 'SET_PARAMS',
            rootCv,
            chordIdx,
            offsets,
            hasRoot
        });

        const inRoot = ctx.createGain();
        inRoot.connect(w, 0, 0);

        const out1 = ctx.createGain();
        const out2 = ctx.createGain();
        const out3 = ctx.createGain();
        const out4 = ctx.createGain();
        w.connect(out1, 0, 0);
        w.connect(out2, 1, 0);
        w.connect(out3, 2, 0);
        w.connect(out4, 3, 0);

        if (eng?.silentSink) out1.connect(eng.silentSink);

        return {
            nodes: { w, inRoot, out1, out2, out3, out4 },
            inputs: { cv_in: inRoot },
            outputs: {
                cv_out1: out1,
                cv_out2: out2,
                cv_out3: out3,
                cv_out4: out4,
                out1,
                out2,
                out3,
                out4
            }
        };
    },
    update: (ctx, inst, d, patch) => {
        const info = CHORD_SPECS[d.chord] || CHORD_SPECS['min'];
        const chordIdx = info.index ?? 0;
        const offsets = info.intervals || [0, 3, 7, 12];
        const rootCv = ((d.rootMidi ?? 48) - 24) / 12.0;
        const hasRoot = patch.has('cv_in');

        inst.nodes.w.port.postMessage({
            type: 'SET_PARAMS',
            rootCv,
            chordIdx,
            offsets,
            hasRoot
        });
    }
};

export const chordAudioDefs = {
    CHORD
};
