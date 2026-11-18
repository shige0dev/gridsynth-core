import { getSR, isRisingSpike } from './common.js';

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
        this.lastResetVal = 0.0;
        this.resetPatched = false;
        this.eosPulseSamples = 0;
        this.active = true;

        this.port.onmessage = e => {
            if (e.data.type === 'SET_EVENTS') {
                if (e.data.cycles && e.data.cycles.length > 0) {
                    this.cycles = e.data.cycles;
                }
                if (e.data.cycleBeats) this.cycleBeats = e.data.cycleBeats;
                if (e.data.gateLen !== undefined) this.gateLen = Math.max(0.05, Math.min(0.98, e.data.gateLen));
            } else if (e.data.type === 'SET_PATCH') {
                if (e.data.resetPatched !== undefined) {
                    const nextReset = Boolean(e.data.resetPatched);
                    if (nextReset !== this.resetPatched) {
                        this.resetPatched = nextReset;
                        this.lastResetVal = 0.0;
                        if (!this.resetPatched) {
                            this.active = true;
                        }
                    }
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
                        this.eosPulseSamples = 0;
                    }
                    this.running = e.data.running;
                }
            } else if (e.data.type === 'RESET') {
                this.lastResetVal = 0.0;
                this.eosPulseSamples = 0;
                this.resetPlayhead(true);
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
        const cvOut = outs[0]?.[0], gOut = outs[1]?.[0], eosOut = outs[2]?.[0];
        const rstIn = ins[0]?.[0];
        const len = (cvOut || gOut || eosOut || rstIn || []).length || 128;
        const sr = getSR();
        const bpm = params.bpm[0] || 120.0;
        const cycleSec = (60.0 / bpm) * (this.cycleBeats || 4.0);
        const phaseInc = 1.0 / Math.max(1, cycleSec * sr);
        const minGapSamples = Math.max(1, Math.round(0.002 * sr));
        const firstEv = this.cycles[0]?.[0];
        const firstDur = firstEv ? Math.max(0.0001, firstEv.end - firstEv.start) : 0.25;
        const eosDur = Math.max(1, Math.round(firstDur * cycleSec * (this.gateLen ?? 0.80) * sr));

        for (let i = 0; i < len; i++) {
            // 1. 外部リセット端子 (reset_in) 制御 (微分スパイク立ち上がり検知 >= 0.4):
            // - 未結線: 常時ループ (active = true)
            // - 結線時: スパイクで先頭から再生開始、1周(全サイクル完了)で停止 (eos_out -> reset_in 戻しでループ)
            const rstVal = rstIn ? rstIn[i] : 0.0;
            if (!this.resetPatched) {
                this.active = true;
                this.lastResetVal = 0.0;
            } else {
                if (isRisingSpike(rstVal, this.lastResetVal, 0.4)) {
                    this.active = true;
                    this.phase = 0.0;
                    this.cycleCount = 0;
                    this.gap = 0;
                    this.activeIdx = -1;
                    this.activeTokenId = null;
                }
                this.lastResetVal = rstVal;
            }

            let eosSample = 0.0;
            if (!this.running || !this.active) {
                if (this.running && this.eosPulseSamples > 0) {
                    this.eosPulseSamples--;
                    eosSample = 1.0;
                }
                if (cvOut) cvOut[i] = this.cv;
                if (gOut) gOut[i] = 0;
                if (eosOut) eosOut[i] = eosSample;
                continue;
            }

            this.phase += phaseInc;
            if (this.phase >= 1.0) {
                this.phase -= 1.0;
                this.cycleCount++;
                this.activeIdx = -1;
                if (this.cycleCount >= this.cycles.length) {
                    this.cycleCount = 0;
                    this.eosPulseSamples = eosDur;
                    if (this.resetPatched) {
                        this.resetPlayhead(false);
                        if (this.eosPulseSamples > 0) {
                            this.eosPulseSamples--;
                            eosSample = 1.0;
                        }
                        if (cvOut) cvOut[i] = this.cv;
                        if (gOut) gOut[i] = 0;
                        if (eosOut) eosOut[i] = eosSample;
                        continue;
                    }
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

            if (this.eosPulseSamples > 0) {
                this.eosPulseSamples--;
                eosSample = 1.0;
            }
            if (cvOut) cvOut[i] = this.cv;
            if (gOut) gOut[i] = this.gate;
            if (eosOut) eosOut[i] = eosSample;
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

