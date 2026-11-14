import { getSR } from './common.js';

export class PatProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'bpm', defaultValue: 120.0, minValue: 30.0, maxValue: 300.0 }
        ];
    }

    constructor() {
        super();
        this.cycles = [[]];
        this.cycleBeats = 4.0;
        this.gateLen = 0.80;
        this.running = false;
        this.phase = 0.0;
        this.cycleCount = 0;
        this.cv = 0;
        this.gate = 0;
        this.gap = 0;
        this.activeIdx = -1;
        this.activeTokenId = null;
        this.activeLabel = '\u2014';
        this.activeIsRest = true;
        this.postCounter = 0;
        this.lastResetTrig = false;
        this.lastKeyHi = false;
        this.keyGatePatched = false;
        this.keyMode = 'loop';
        this.active = true;

        this.port.onmessage = e => {
            if (e.data.type === 'SET_EVENTS') {
                if (e.data.cycles && e.data.cycles.length > 0) {
                    this.cycles = e.data.cycles;
                }
                if (e.data.cycleBeats) this.cycleBeats = e.data.cycleBeats;
                if (e.data.gateLen !== undefined) this.gateLen = Math.max(0.05, Math.min(0.98, e.data.gateLen));
            } else if (e.data.type === 'SET_PATCH') {
                if (e.data.keyGatePatched !== undefined) {
                    const nextKey = Boolean(e.data.keyGatePatched);
                    if (nextKey !== this.keyGatePatched) {
                        this.keyGatePatched = nextKey;
                        this.lastKeyHi = false;
                        if (this.keyGatePatched) {
                            this.resetPlayhead(false);
                        } else {
                            this.active = true;
                        }
                    }
                }
            } else if (e.data.type === 'SET_CONFIG') {
                if (e.data.keyMode !== undefined) {
                    this.keyMode = e.data.keyMode === 'oneshot' ? 'oneshot' : 'loop';
                }
            } else if (e.data.type === 'SET_STATE') {
                if (typeof e.data.running === 'boolean') {
                    if (e.data.running && !this.running) {
                        this.phase = 0.0;
                        this.cycleCount = 0;
                        this.gap = 0;
                        this.activeIdx = -1;
                        this.activeTokenId = null;
                        this.activeLabel = '\u2014';
                        this.activeIsRest = true;
                    }
                    this.running = e.data.running;
                }
            } else if (e.data.type === 'RESET') {
                if (e.data.keyMode !== undefined) {
                    this.keyMode = e.data.keyMode === 'oneshot' ? 'oneshot' : 'loop';
                }
                this.lastResetTrig = false;
                this.lastKeyHi = false;
                this.resetPlayhead(!this.keyGatePatched);
            }
        };
    }

    resetPlayhead(active) {
        this.active = active;
        this.phase = 0.0;
        this.cycleCount = 0;
        this.gap = 0;
        this.gate = 0;
        this.activeIdx = -1;
        this.activeTokenId = null;
        this.activeLabel = '\u2014';
        this.activeIsRest = true;
        this.port.postMessage({
            type: 'PLAYHEAD',
            phase: 0.0,
            cycleCount: 0,
            activeIdx: -1,
            activeTokenId: null,
            activeLabel: '\u2014',
            isRest: true,
            gate: false,
            powerOn: this.running
        });
    }

    process(ins, outs, params) {
        const cvOut = outs[0]?.[0], gOut = outs[1]?.[0];
        const rstIn = ins[0]?.[0];
        const keyIn = ins[1]?.[0];
        const len = (cvOut || gOut || []).length || 128;
        const sr = getSR();
        const bpm = params.bpm[0] || 120.0;
        const cycleSec = (60.0 / bpm) * (this.cycleBeats || 4.0);
        const phaseInc = 1.0 / Math.max(1, cycleSec * sr);
        const minGapSamples = Math.max(1, Math.round(0.002 * sr));

        for (let i = 0; i < len; i++) {
            // 1. 外部リセット端子 (reset_in) の立ち上がり検知 (> 0.3)
            const rstVal = rstIn ? rstIn[i] : 0.0;
            const isRstHi = rstVal > 0.3;
            if (isRstHi && !this.lastResetTrig) {
                this.phase = 0.0;
                this.cycleCount = 0;
                this.gap = 0;
                this.activeIdx = -1;
            }
            this.lastResetTrig = isRstHi;

            // 2. RUN / KEYGATE_IN (PIN6) 制御:
            // - 未結線: 常時スタンバイ (active = true)
            // - 結線時: ゲート待ち、立ち上がりで再生開始、ゲートオフで停止 & リセット
            if (!this.keyGatePatched) {
                this.active = true;
                this.lastKeyHi = false;
            } else {
                const isKeyHi = (keyIn ? keyIn[i] : 0.0) >= 0.4;
                if (!isKeyHi) {
                    if (this.lastKeyHi || this.active || this.phase !== 0.0 || this.gate !== 0) {
                        this.resetPlayhead(false);
                    }
                    this.lastKeyHi = false;
                } else if (!this.lastKeyHi) {
                    this.lastKeyHi = true;
                    this.active = true;
                    this.phase = 0.0;
                    this.cycleCount = 0;
                    this.gap = 0;
                    this.activeIdx = -1;
                    this.activeTokenId = null;
                }
            }

            if (!this.running || !this.active) {
                if (cvOut) cvOut[i] = this.cv;
                if (gOut) gOut[i] = 0;
                continue;
            }

            this.phase += phaseInc;
            if (this.phase >= 1.0) {
                this.phase -= 1.0;
                this.cycleCount++;
                this.activeIdx = -1;
                if (this.keyGatePatched && this.keyMode === 'oneshot' && this.cycleCount >= this.cycles.length) {
                    this.resetPlayhead(false);
                    if (cvOut) cvOut[i] = this.cv;
                    if (gOut) gOut[i] = 0;
                    continue;
                }
            }

            const curEvents = this.cycles[this.cycleCount % this.cycles.length] || [];
            let curEv = null;
            let curIdx = -1;
            for (let eIdx = 0; eIdx < curEvents.length; eIdx++) {
                const ev = curEvents[eIdx];
                if (this.phase >= ev.start && this.phase < ev.end) {
                    curEv = ev;
                    curIdx = (ev.tokenIdx !== undefined) ? ev.tokenIdx : eIdx;
                    break;
                }
            }

            if (curIdx !== this.activeIdx) {
                this.activeIdx = curIdx;
                this.activeTokenId = curEv ? curEv.tokenId : null;
                if (curEv && !curEv.isRest) {
                    const trigger = (curEv.prob === undefined || curEv.prob >= 1.0) ? true : (Math.random() < curEv.prob);
                    if (trigger) {
                        this.cv = curEv.cv ?? 0;
                        this.gap = minGapSamples;
                        this.activeLabel = curEv.label || 'NOTE';
                        this.activeIsRest = false;
                    } else {
                        curEv = null;
                        this.activeLabel = '~';
                        this.activeIsRest = true;
                    }
                } else {
                    this.activeLabel = curEv ? curEv.label : '~';
                    this.activeIsRest = true;
                }
            }

            if (this.gap > 0) {
                this.gap--;
                this.gate = 0.0;
            } else if (curEv && !curEv.isRest) {
                const evDur = curEv.end - curEv.start;
                const evProg = (this.phase - curEv.start) / Math.max(0.0001, evDur);
                const gRatio = this.gateLen ?? 0.80;
                this.gate = (evProg < gRatio) ? 1.0 : 0.0;
            } else {
                this.gate = 0.0;
            }

            if (cvOut) cvOut[i] = this.cv;
            if (gOut) gOut[i] = this.gate;
        }

        this.postCounter += len;
        if (this.running && this.active && this.postCounter >= 256) {
            this.postCounter = 0;
            this.port.postMessage({
                type: 'PLAYHEAD',
                phase: this.phase,
                cycleCount: this.cycleCount,
                activeIdx: this.activeIdx,
                activeTokenId: this.activeTokenId,
                activeLabel: this.activeLabel,
                isRest: this.activeIsRest,
                gate: this.gate > 0,
                powerOn: true
            });
        }

        return true;
    }
}

registerProcessor('pat-processor', PatProcessor);

