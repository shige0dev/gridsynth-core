import { AudioHelpers } from '../helpers.js';

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

export const seqAudioDefs = {
    SEQ8,
    SEQ16
};
