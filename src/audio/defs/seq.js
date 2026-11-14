function createSeqAudio(stepCount) {
    return {
        create: (ctx, d, patch, eng) => {
            const steps = (d?.steps && d.steps.length === stepCount) ? d.steps : Array.from({ length: stepCount }, (_, i) => ({
                cv: i === 0 ? 0 : 0.25,
                active: true,
                cvActive: true,
                gate: true
            }));
            const keyMode = d.keyMode === 'oneshot' ? 'oneshot' : 'loop';

            const w = new AudioWorkletNode(ctx, 'seq-processor', {
                numberOfInputs: 2,
                numberOfOutputs: 2,
                processorOptions: { steps }
            });
            w.port.postMessage({ type: 'SET_STEPS', steps });
            w.port.postMessage({ type: 'SET_CONFIG', keyMode });

            const cv = ctx.createGain(), gt = ctx.createGain();
            const gIn = ctx.createGain(), gKeyGateIn = ctx.createGain();

            // Outputs: 0: cv_out (PIN 11), 1: gate_out (PIN 10)
            w.connect(cv, 0, 0);
            w.connect(gt, 1, 0);

            // Inputs: 0: gate_in / clk_in (PIN 5), 1: keygate_in / RUN (PIN 6)
            gIn.connect(w, 0, 0);
            gKeyGateIn.connect(w, 0, 1);

            if (eng?.silentSink) {
                gt.connect(eng.silentSink);
            }

            const sendPatch = (p) => {
                const appPatch = window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id) : null;
                const keyGatePatched = Boolean(p?.has?.('keygate_in') || appPatch?.has?.('keygate_in'));
                w.port.postMessage({ type: 'SET_PATCH', keyGatePatched });
            };
            sendPatch(patch || null);
            w.port.postMessage({ type: 'RESET', keyMode });

            let st = -1;
            let liveActive = true;
            w.port.onmessage = e => {
                if (e.data.type === 'STEP') {
                    st = e.data.step;
                    if (e.data.active !== undefined) {
                        liveActive = Boolean(e.data.active);
                    }
                }
            };

            return {
                nodes: { w, cv, gt, gIn, gKeyGateIn },
                inputs: {
                    gate_in: gIn,
                    clk_in: gIn,
                    keygate_in: gKeyGateIn
                },
                outputs: {
                    cv_out: cv,
                    gate_out: gt
                },
                updatePatchState: (p) => sendPatch(p),
                resetStep: () => {
                    st = -1;
                    w.port.postMessage({ type: 'RESET', keyMode: d.keyMode === 'oneshot' ? 'oneshot' : 'loop' });
                },
                read: () => ({
                    step: st,
                    active: liveActive
                })
            };
        },
        update: (ctx, inst, d, patch) => {
            if (d?.steps && inst?.nodes?.w) {
                inst.nodes.w.port.postMessage({ type: 'SET_STEPS', steps: d.steps });
            }
            if (d && inst?.nodes?.w) {
                inst.nodes.w.port.postMessage({
                    type: 'SET_CONFIG',
                    keyMode: d.keyMode === 'oneshot' ? 'oneshot' : 'loop'
                });
            }
            if (patch !== undefined && inst?.updatePatchState) {
                inst.updatePatchState(patch);
            }
        }
    };
}

export const SEQ8 = createSeqAudio(8);
export const SEQ16 = createSeqAudio(16);

export const seqAudioDefs = {
    SEQ8,
    SEQ16
};
