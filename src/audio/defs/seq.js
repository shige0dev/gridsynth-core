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
                numberOfInputs: 2,
                numberOfOutputs: 3,
                processorOptions: { steps }
            });
            w.port.postMessage({ type: 'SET_STEPS', steps });

            const isInit = d.initOn !== false;
            w.port.postMessage({ type: 'SET_INIT', initOn: isInit });

            const cv = ctx.createGain(), gt = ctx.createGain(), gTransOut = ctx.createGain();
            const gIn = ctx.createGain(), gTransIn = ctx.createGain();

            // Outputs: 0: cv_out (PIN 11), 1: gate_out (PIN 10), 2: trans_out (PIN 9)
            w.connect(cv, 0, 0);
            w.connect(gt, 1, 0);
            w.connect(gTransOut, 2, 0);

            // Inputs: 0: gate_in / clk_in (PIN 5), 1: trans_in (PIN 6)
            gIn.connect(w, 0, 0);
            gTransIn.connect(w, 0, 1);

            if (eng?.silentSink) {
                gt.connect(eng.silentSink);
                gTransOut.connect(eng.silentSink);
            }

            let patchState = patch || null;
            const sendPatch = (p) => {
                patchState = p;
                const transOutPatched = Boolean(p?.has?.('trans_out') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has?.('trans_out') : false));
                const transInPatched = Boolean(p?.has?.('trans_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has?.('trans_in') : false));
                w.port.postMessage({
                    type: 'SET_PATCH',
                    transOutPatched,
                    transInPatched
                });
            };
            sendPatch(patchState);

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
                nodes: { w, cv, gt, gTransOut, gIn, gTransIn },
                inputs: {
                    gate_in: gIn,
                    clk_in: gIn,
                    trans_in: gTransIn
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
                    w.port.postMessage({ type: 'RESET', initOn: d.initOn !== false });
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
            if (d?.initOn !== undefined && inst?.nodes?.w) {
                inst.nodes.w.port.postMessage({ type: 'SET_INIT', initOn: d.initOn !== false });
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
