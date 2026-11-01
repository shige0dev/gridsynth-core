import { AudioHelpers } from '../helpers.js';

export const MAT = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'mat-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 4,
            outputChannelCount: [1, 1, 1, 1]
        });

        const initialDivs = [16, 32, 64].includes(d.divisions) ? d.divisions : 16;
        w.port.postMessage({ type: 'SET_DIVISIONS', value: initialDivs });

        // Default 4 patterns if not provided
        if (Array.isArray(d.patterns) && d.patterns.length === 4) {
            w.port.postMessage({ type: 'SET_PATTERNS', patterns: d.patterns });
        }
        if (Array.isArray(d.modes) && d.modes.length === 4) {
            w.port.postMessage({ type: 'SET_MODES', modes: d.modes });
        }

        const cvIn = ctx.createGain();
        cvIn.connect(w, 0, 0);

        const out1 = ctx.createGain();
        const out2 = ctx.createGain();
        const out3 = ctx.createGain();
        const out4 = ctx.createGain();

        w.connect(out1, 0, 0);
        w.connect(out2, 1, 0);
        w.connect(out3, 2, 0);
        w.connect(out4, 3, 0);

        if (eng?.silentSink) {
            out1.connect(eng.silentSink);
            out2.connect(eng.silentSink);
            out3.connect(eng.silentSink);
            out4.connect(eng.silentSink);
        }

        let latestSlot = 0;
        w.port.onmessage = e => {
            if (e.data?.type === 'MAT_STATUS') {
                latestSlot = e.data.slot ?? 0;
            }
        };

        return {
            nodes: { w, cvIn, out1, out2, out3, out4 },
            inputs: {
                cv_in: cvIn,
                in: cvIn
            },
            outputs: {
                out_1: out1,
                out1: out1,
                out_2: out2,
                out2: out2,
                out_3: out3,
                out3: out3,
                out_4: out4,
                out4: out4
            },
            read: () => ({ slot: latestSlot })
        };
    },
    update: (ctx, inst, d) => {
        const divs = [16, 32, 64].includes(d.divisions) ? d.divisions : 16;
        inst.nodes.w.port.postMessage({ type: 'SET_DIVISIONS', value: divs });
        if (Array.isArray(d.patterns)) {
            inst.nodes.w.port.postMessage({ type: 'SET_PATTERNS', patterns: d.patterns });
        }
        if (Array.isArray(d.modes)) {
            inst.nodes.w.port.postMessage({ type: 'SET_MODES', modes: d.modes });
        }
    }
};

export const matAudioDefs = {
    MAT
};
export default matAudioDefs;

