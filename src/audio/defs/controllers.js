import { parseKeyNoteToCv } from '../../core/musical.js?v=367';

function resolveKeyCv(d) {
    if (!d) return 1.0;
    if (d.cv !== undefined) return Number(d.cv);
    if (d.initialCv !== undefined) return Number(d.initialCv);
    if (d.lastNote !== undefined) return parseKeyNoteToCv(d.lastNote);
    if (d.note !== undefined) return parseKeyNoteToCv(d.note);
    if (d.currentMidi !== undefined) return (d.currentMidi - 24) / 12.0;
    if (d.octave !== undefined) return d.octave - 1.0;
    return 1.0;
}

export const KEY = {
    create: (ctx, d, patch, eng) => {
        const initCv = resolveKeyCv(d);
        const w = new AudioWorkletNode(ctx, 'scale-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 2
        });

        w.port.postMessage({
            type: 'SET_CONFIG',
            root: d.root ?? 0,
            mask: d.mask || [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        });

        const initMidi = d.currentMidi ?? (Math.round(initCv * 12) + 24);
        w.port.postMessage({
            type: 'NOTE',
            midi: initMidi,
            isDown: false
        });

        const cvIn = ctx.createGain();
        const cvOut = ctx.createGain();
        const gateOut = ctx.createGain();

        cvIn.connect(w, 0, 0);
        w.connect(cvOut, 0, 0);
        w.connect(gateOut, 1, 0);

        if (eng?.silentSink) {
            cvOut.connect(eng.silentSink);
            gateOut.connect(eng.silentSink);
        }

        let liveData = { activeSemi: -1, cv: initCv, gate: 0 };
        w.port.onmessage = (e) => {
            if (e.data.type === 'STATE') {
                liveData = e.data;
            }
        };

        return {
            nodes: { w, cvIn, cvOut, gateOut },
            inputs: { cv_in: cvIn },
            outputs: { cv_out: cvOut, gate_out: gateOut },
            read: () => liveData
        };
    },
    update: (ctx, inst, d) => {
        if (inst?.nodes?.w) {
            inst.nodes.w.port.postMessage({
                type: 'SET_CONFIG',
                root: d.root ?? 0,
                mask: d.mask
            });
        }
    }
};

export const controllerAudioDefs = {
    KEY
};
