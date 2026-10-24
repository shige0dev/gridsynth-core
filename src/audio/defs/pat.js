import { AudioHelpers } from '../helpers.js';
import { parseStrudelPatternCycles } from '../../core/strudel-parser.js';

export const PAT = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'pat-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 2,
            parameterData: {
                bpm: eng?.masterBPM || 120
            }
        });
        const hasPower = patch ? (patch.has('power_in') || patch.has('power')) : false;
        const cycles = parseStrudelPatternCycles(d.pattern || 'c2 c2 c2 c2', d.cycleBeats || 4, 16);
        w.port.postMessage({
            type: 'SET_EVENTS',
            cycles,
            cycleBeats: d.cycleBeats || 4,
            gateLen: d.gateLen ?? 0.80
        });
        w.port.postMessage({
            type: 'SET_STATE',
            running: eng?.isPlaying || false,
            hasPowerIn: hasPower
        });

        const pIn = ctx.createGain();
        pIn.connect(w, 0, 0);

        const cv = ctx.createGain(), gt = ctx.createGain();
        w.connect(cv, 0, 0);
        w.connect(gt, 1, 0);
        if (eng?.silentSink) {
            gt.connect(eng.silentSink);
        }

        let latestPhase = 0, latestIdx = -1, latestCycle = 0, latestLabel = '\u2014', latestIsRest = true, latestGate = false, latestPowerOn = true;
        w.port.onmessage = e => {
            if (e.data.type === 'PLAYHEAD') {
                latestPhase = e.data.phase;
                latestIdx = e.data.activeIdx;
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
            nodes: { w, cv, gt, pIn },
            inputs: { power_in: pIn },
            outputs: { cv_out: cv, gate_out: gt },
            resetStep: () => {
                latestPhase = 0;
                latestIdx = -1;
                latestCycle = 0;
                latestLabel = '\u2014';
                latestIsRest = true;
                latestGate = false;
                latestPowerOn = true;
            },
            read: () => ({
                phase: latestPhase,
                activeIdx: latestIdx,
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
        const cycles = parseStrudelPatternCycles(d.pattern || 'c2 c2 c2 c2', d.cycleBeats || 4, 16);
        inst.nodes.w.port.postMessage({
            type: 'SET_EVENTS',
            cycles,
            cycleBeats: d.cycleBeats || 4,
            gateLen: d.gateLen ?? 0.80
        });
        const hasPower = patch ? (patch.has('power_in') || patch.has('power')) : false;
        inst.nodes.w.port.postMessage({
            type: 'SET_STATE',
            hasPowerIn: hasPower
        });
    }
};

export const patAudioDefs = {
    PAT
};
