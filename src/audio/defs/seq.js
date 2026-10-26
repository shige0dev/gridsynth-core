import { AudioHelpers } from '../helpers.js';

export const SEQ8 = {
    create: (ctx, d, patch, eng) => {
        const steps = (d?.steps && d.steps.length === 8) ? d.steps : Array.from({ length: 8 }, (_, i) => ({
            cv: i === 0 ? 0 : 0.25,
            active: true,
            cvActive: true,
            gate: true
        }));
        const isLoop = d?.loop !== undefined ? Boolean(d.loop) : (d?.mode !== 'oneshot');
        const mode = isLoop ? 'loop' : 'oneshot';
        const w = new AudioWorkletNode(ctx, 'seq-processor', {
            numberOfInputs: 2,
            numberOfOutputs: 3,
            processorOptions: { steps, mode }
        });
        w.port.postMessage({ type: 'SET_STEPS', steps });
        w.port.postMessage({ type: 'SET_MODE', mode });
        const cv = ctx.createGain(), gt = ctx.createGain(), eos = ctx.createGain(), gIn = ctx.createGain(), rIn = ctx.createGain();
        w.connect(cv, 0, 0);
        w.connect(gt, 1, 0);
        if (w.numberOfOutputs > 2) {
            w.connect(eos, 2, 0);
        }
        gIn.connect(w, 0, 0);
        rIn.connect(w, 0, 1);
        if (eng?.silentSink) {
            gt.connect(eng.silentSink);
            eos.connect(eng.silentSink);
        }
        let st = -1;
        w.port.onmessage = e => { if (e.data.type === 'STEP') st = e.data.step; };
        return {
            nodes: { w, cv, gt, eos, gIn, rIn },
            inputs: { gate_in: gIn, clk_in: gIn, trans_in: rIn, transition_in: rIn, reset_in: rIn },
            outputs: { cv_out: cv, gate_out: gt, trans_out: eos, transition_out: eos, eos_out: eos, eos: eos },
            resetStep: () => {
                st = -1;
                w.port.postMessage({ type: 'RESET' });
            },
            read: () => ({ step: st })
        };
    },
    update: (ctx, inst, d) => {
        if (d?.steps && inst?.nodes?.w) {
            inst.nodes.w.port.postMessage({ type: 'SET_STEPS', steps: d.steps });
        }
        if ((d?.loop !== undefined || d?.mode !== undefined) && inst?.nodes?.w) {
            const isLoop = d.loop !== undefined ? Boolean(d.loop) : (d.mode !== 'oneshot');
            inst.nodes.w.port.postMessage({ type: 'SET_MODE', mode: isLoop ? 'loop' : 'oneshot' });
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
        const isLoop = d?.loop !== undefined ? Boolean(d.loop) : (d?.mode !== 'oneshot');
        const mode = isLoop ? 'loop' : 'oneshot';
        const w = new AudioWorkletNode(ctx, 'seq-processor', {
            numberOfInputs: 2,
            numberOfOutputs: 3,
            processorOptions: { steps, mode }
        });
        w.port.postMessage({ type: 'SET_STEPS', steps });
        w.port.postMessage({ type: 'SET_MODE', mode });
        const cv = ctx.createGain(), gt = ctx.createGain(), eos = ctx.createGain(), gIn = ctx.createGain(), rIn = ctx.createGain();
        w.connect(cv, 0, 0);
        w.connect(gt, 1, 0);
        if (w.numberOfOutputs > 2) {
            w.connect(eos, 2, 0);
        }
        gIn.connect(w, 0, 0);
        rIn.connect(w, 0, 1);
        if (eng?.silentSink) {
            gt.connect(eng.silentSink);
            eos.connect(eng.silentSink);
        }
        let st = -1;
        w.port.onmessage = e => { if (e.data.type === 'STEP') st = e.data.step; };
        return {
            nodes: { w, cv, gt, eos, gIn, rIn },
            inputs: { gate_in: gIn, clk_in: gIn, trans_in: rIn, transition_in: rIn, reset_in: rIn },
            outputs: { cv_out: cv, gate_out: gt, trans_out: eos, transition_out: eos, eos_out: eos, eos: eos },
            resetStep: () => {
                st = -1;
                w.port.postMessage({ type: 'RESET' });
            },
            read: () => ({ step: st })
        };
    },
    update: (ctx, inst, d) => {
        if (d?.steps && inst?.nodes?.w) {
            inst.nodes.w.port.postMessage({ type: 'SET_STEPS', steps: d.steps });
        }
        if ((d?.loop !== undefined || d?.mode !== undefined) && inst?.nodes?.w) {
            const isLoop = d.loop !== undefined ? Boolean(d.loop) : (d.mode !== 'oneshot');
            inst.nodes.w.port.postMessage({ type: 'SET_MODE', mode: isLoop ? 'loop' : 'oneshot' });
        }
    }
};

export const seqAudioDefs = {
    SEQ8,
    SEQ16
};
