import { AudioHelpers } from '../helpers.js';
import { parsePatternToTokens, tokensToCycles, getPatternCycleCount } from '../../core/pat-tokens.js?v=865';

function getCycles(d) {
    if (!d._tokens && d.pattern) {
        d._tokens = parsePatternToTokens(d.pattern);
    }
    if (d._tokens && d._tokens.length > 0) {
        return tokensToCycles(d._tokens, getPatternCycleCount(d._tokens, 16));
    }
    const defTokens = parsePatternToTokens('c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2');
    d._tokens = defTokens;
    return tokensToCycles(defTokens, 1);
}

export const PAT = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'pat-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 3,
            outputChannelCount: [1, 1, 1],
            parameterData: {
                bpm: eng?.masterBPM || 120
            }
        });
        const cycles = getCycles(d);
        w.port.postMessage({
            type: 'SET_EVENTS',
            cycles,
            cycleBeats: d.cycleBeats || 4,
            gateLen: d.gateLen ?? 0.80
        });
        w.port.postMessage({
            type: 'SET_STATE',
            running: eng?.isPlaying || false
        });

        const rstIn = ctx.createGain();
        rstIn.connect(w, 0, 0);     // input 0: reset_in (PIN 5)

        const sendPatch = (p) => {
            const appPatch = window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id) : null;
            const targetPatch = p || appPatch;
            const resetPatched = Boolean(targetPatch?.has?.('reset_in'));
            w.port.postMessage({ type: 'SET_PATCH', resetPatched });
        };
        sendPatch(patch || null);
        w.port.postMessage({ type: 'RESET' });

        const cv = ctx.createGain(), gt = ctx.createGain(), eos = ctx.createGain();
        w.connect(cv, 0, 0);
        w.connect(gt, 1, 0);
        w.connect(eos, 2, 0);
        if (eng?.silentSink) {
            gt.connect(eng.silentSink);
            eos.connect(eng.silentSink);
        }

        let latestPhase = 0, latestIdx = -1, latestCycle = 0, latestLabel = '\u2014', latestIsRest = true, latestGate = false, latestPowerOn = true, latestTokenId = null;
        w.port.onmessage = e => {
            if (e.data.type === 'PLAYHEAD') {
                latestPhase = e.data.phase;
                latestIdx = e.data.activeIdx;
                latestTokenId = e.data.activeTokenId || null;
                latestCycle = e.data.cycleCount || 0;
                latestLabel = e.data.activeLabel || '\u2014';
                latestIsRest = !!e.data.isRest;
                latestGate = !!e.data.gate;
                if (typeof e.data.powerOn === 'boolean') {
                    latestPowerOn = e.data.powerOn;
                }
            }
        };

        return {
            nodes: { w, cv, gt, eos, rstIn },
            inputs: {
                reset_in: rstIn
            },
            outputs: { cv_out: cv, gate_out: gt, eos_out: eos },
            updatePatchState: (p) => sendPatch(p),
            resetStep: () => {
                latestPhase = 0;
                latestIdx = -1;
                latestTokenId = null;
                latestCycle = 0;
                latestLabel = '\u2014';
                latestIsRest = true;
                latestGate = false;
                latestPowerOn = true;
            },
            read: () => ({
                phase: latestPhase,
                activeIdx: latestIdx,
                activeTokenId: latestTokenId,
                cycleCount: latestCycle,
                activeLabel: latestLabel,
                isRest: latestIsRest,
                gate: latestGate,
                powerOn: latestPowerOn
            })
        };
    },
    update: (ctx, inst, d, patch, eng) => {
        AudioHelpers.set(inst.nodes.w.parameters.get('bpm'), eng?.masterBPM || 120, ctx, 0.02);
        const cycles = getCycles(d);
        inst.nodes.w.port.postMessage({
            type: 'SET_EVENTS',
            cycles,
            cycleBeats: d.cycleBeats || 4,
            gateLen: d.gateLen ?? 0.80
        });
        if (patch !== undefined && inst?.updatePatchState) {
            inst.updatePatchState(patch);
        }
    }
};

export const patAudioDefs = {
    PAT
};
