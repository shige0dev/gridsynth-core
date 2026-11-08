// src/audio/defs/clk.js
import { AudioHelpers } from '../helpers.js';

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
        w.port.postMessage({
            type: 'SET_STATE',
            running: eng.isPlaying,
            div: d.div || 'x2',
            limitPct: Math.min(90, d.limitPct ?? 90)
        });
        const rstIn = ctx.createGain();
        rstIn.connect(w, 0, 0); // input 0: reset_in
        if (eng?.silentSink) w.connect(eng.silentSink);
        return {
            nodes: { w, rstIn },
            inputs: {
                reset_in: rstIn
            },
            outputs: { gate_out: w }
        };
    },
    update: (ctx, inst, d, patch, eng) => {
        AudioHelpers.set(inst.nodes.w.parameters.get('bpm'), eng.masterBPM || 120, ctx, 0.02);
        if (d.pulseWidthMs !== undefined) {
            AudioHelpers.set(inst.nodes.w.parameters.get('pulseWidthMs'), d.pulseWidthMs, ctx, 0.02);
        }
        if (d.limitPct !== undefined) {
            AudioHelpers.set(inst.nodes.w.parameters.get('limitPct'), Math.min(90, d.limitPct), ctx, 0.02);
        }
        inst.nodes.w.port.postMessage({
            type: 'SET_STATE',
            div: d.div,
            limitPct: Math.min(90, d.limitPct ?? 90)
        });
    }
};

