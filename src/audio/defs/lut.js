import { AudioHelpers } from '../helpers.js';

export const LUT = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'lut-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1
        });

        const initialDivs = [16, 32, 64, 256].includes(d.divisions) ? d.divisions : 16;
        const initialQuantize = d.quantize === true;

        // Default table ramp 0..1 if not provided
        let table = d.table;
        if (!Array.isArray(table) || table.length !== 256) {
            table = Array.from({ length: 256 }, (_, i) => i / 255);
            d.table = table;
        }

        w.port.postMessage({ type: 'SET_DIVISIONS', value: initialDivs });
        w.port.postMessage({ type: 'SET_QUANTIZE', value: initialQuantize });
        w.port.postMessage({ type: 'SET_TABLE', table });

        const cvIn = ctx.createGain();
        cvIn.connect(w, 0, 0);

        const cvOut = ctx.createGain();
        w.connect(cvOut, 0, 0);

        if (eng?.silentSink) {
            cvOut.connect(eng.silentSink);
        }

        let latestIn = 0;
        let latestOut = 0;

        w.port.onmessage = e => {
            if (e.data?.type === 'LUT_STATUS') {
                latestIn = e.data.inVal ?? 0;
                latestOut = e.data.outVal ?? 0;
            }
        };

        return {
            nodes: { w, cvIn, cvOut },
            inputs: {
                cv_in: cvIn,
                in: cvIn
            },
            outputs: {
                cv_out: cvOut,
                out: cvOut
            },
            read: () => ({
                inVal: latestIn,
                outVal: latestOut
            })
        };
    },
    update: (ctx, inst, d) => {
        const divs = [16, 32, 64, 256].includes(d.divisions) ? d.divisions : 16;
        const quantize = d.quantize === true;
        inst.nodes.w.port.postMessage({ type: 'SET_DIVISIONS', value: divs });
        inst.nodes.w.port.postMessage({ type: 'SET_QUANTIZE', value: quantize });
        if (Array.isArray(d.table)) {
            inst.nodes.w.port.postMessage({ type: 'SET_TABLE', table: d.table });
        }
    }
};

export const lutAudioDefs = {
    LUT
};
