// src/audio/defs/lfo.js
import { AudioHelpers } from '../helpers.js';

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
            inputs: {
                freq_cv_in: cvIn,
                trig_in: rIn,
                reset_in: rIn
            },
            outputs: { cv_out: w }
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

