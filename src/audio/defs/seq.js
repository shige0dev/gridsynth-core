import { AudioHelpers } from '../helpers.js';

function createSeqAudio(stepCount) {
    return {
        create: (ctx, d, patch, eng) => {
            const steps = (d?.steps && d.steps.length === stepCount) ? d.steps : Array.from({ length: stepCount }, (_, i) => ({
                cv: i === 0 ? 0 : 0.25,
                active: true,
                cvActive: true,
                gate: true
            }));
            const w = new AudioWorkletNode(ctx, 'seq-processor', {
                numberOfInputs: 3,
                numberOfOutputs: 3,
                processorOptions: { steps }
            });
            w.port.postMessage({ type: 'SET_STEPS', steps });

            const isInit = d.initOn !== false;
            const keyMode = d.keyMode === 'oneshot' ? 'oneshot' : 'loop';
            w.port.postMessage({ type: 'SET_INIT', initOn: isInit, keyMode });

            const cv = ctx.createGain(), gt = ctx.createGain(), gTransOut = ctx.createGain();
            const gIn = ctx.createGain(), gTransIn = ctx.createGain(), gKeyGateIn = ctx.createGain();

            // Outputs: 0: cv_out (PIN 11), 1: gate_out (PIN 10), 2: trans_out (PIN 9)
            w.connect(cv, 0, 0);
            w.connect(gt, 1, 0);
            w.connect(gTransOut, 2, 0);

            // Inputs: 0: gate_in / clk_in (PIN 5), 1: trans_in (PIN 6), 2: keygate_in (PIN 7)
            gIn.connect(w, 0, 0);
            gTransIn.connect(w, 0, 1);
            gKeyGateIn.connect(w, 0, 2);

            if (eng?.silentSink) {
                gt.connect(eng.silentSink);
                gTransOut.connect(eng.silentSink);
            }

            let patchState = patch || null;
            const sendPatch = (p) => {
                patchState = p;
                const appPatch = window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id) : null;
                const transOutPatched = Boolean(p?.has?.('trans_out') || appPatch?.has?.('trans_out'));
                const transInPatched = Boolean(p?.has?.('trans_in') || appPatch?.has?.('trans_in'));
                const keyGatePatched = Boolean(p?.has?.('keygate_in') || appPatch?.has?.('keygate_in'));
                w.port.postMessage({
                    type: 'SET_PATCH',
                    transOutPatched,
                    transInPatched,
                    keyGatePatched
                });
            };
            sendPatch(patchState);
            w.port.postMessage({ type: 'RESET', initOn: isInit, keyMode });

            let st = -1;
            let liveActive = isInit;
            w.port.onmessage = e => {
                if (e.data.type === 'STEP') {
                    st = e.data.step;
                    if (e.data.active !== undefined) {
                        liveActive = Boolean(e.data.active);
                    }
                }
            };

            return {
                nodes: { w, cv, gt, gTransOut, gIn, gTransIn, gKeyGateIn },
                inputs: {
                    gate_in: gIn,
                    clk_in: gIn,
                    trans_in: gTransIn,
                    keygate_in: gKeyGateIn
                },
                outputs: {
                    cv_out: cv,
                    gate_out: gt,
                    trans_out: gTransOut
                },
                updatePatchState: (p) => {
                    sendPatch(p);
                },
                resetStep: () => {
                    st = -1;
                    w.port.postMessage({ type: 'RESET', initOn: d.initOn !== false, keyMode: d.keyMode === 'oneshot' ? 'oneshot' : 'loop' });
                },
                read: () => ({
                    step: st,
                    active: liveActive
                })
            };
        },
        update: (ctx, inst, d, patch, eng) => {
            if (d?.steps && inst?.nodes?.w) {
                inst.nodes.w.port.postMessage({ type: 'SET_STEPS', steps: d.steps });
            }
            if (d && inst?.nodes?.w) {
                inst.nodes.w.port.postMessage({
                    type: 'SET_INIT',
                    initOn: d.initOn !== false,
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
