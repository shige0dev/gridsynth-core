import { getSR } from './common.js';

export class MarkovProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.state = 0;
        this.initOn = false;
        this.stateVal = 0.0;
        // weights: [self (TRANS_OUT 0), next1 (trans_out1), next2 (trans_out2), next3 (trans_out3)]
        this.weights = [10, 0, 0, 0];
        this.holdClocks = 1;
        this.clockCount = 0;
        this.clkActive = false;
        this.armed = false;
        this.trigOutCh = -1;
        this.pendingTrigCh = -1;
        this.trigOutLeft = 0;
        this.willEnd = false;
        this.shotActive = false;

        this.port.onmessage = e => {
            if (e.data.type === 'SET_STATE') {
                if (e.data.initOn !== undefined) this.initOn = !!e.data.initOn;
                if (e.data.state !== undefined) this.state = e.data.state ? 1 : 0;
                if (e.data.stateVal !== undefined) this.stateVal = e.data.stateVal;
                if (e.data.weights) {
                    this.weights = [
                        e.data.weights[0] || 0,
                        e.data.weights[1] || 0,
                        e.data.weights[2] || 0,
                        e.data.weights[3] || 0
                    ];
                }
                if (e.data.holdClocks !== undefined) this.holdClocks = Math.max(1, Math.round(e.data.holdClocks));
            } else if (e.data.type === 'TRIGGER_TOGGLE') {
                this.state = this.state ? 0 : 1;
                this.clockCount = 0;
                this.armed = false;
                this.trigOutCh = -1;
                this.pendingTrigCh = -1;
                this.trigOutLeft = 0;
                this.willEnd = false;
                this.clkActive = false;
                this.shotActive = false;
                this.port.postMessage({ type: 'STATE_CHANGED', state: this.state, remaining: this.holdClocks, clockCount: 0 });
            } else if (e.data.type === 'RESET') {
                this.state = this.initOn ? 1 : 0;
                this.clockCount = 0;
                this.armed = false;
                this.trigOutCh = -1;
                this.pendingTrigCh = -1;
                this.trigOutLeft = 0;
                this.willEnd = false;
                this.clkActive = false;
                this.shotActive = false;
                this.port.postMessage({ type: 'STATE_CHANGED', state: this.state, remaining: this.holdClocks, clockCount: 0 });
            }
        };
    }

    process(ins, outs) {
        const inClk = ins[0]?.[0];
        const inTrig = ins[1]?.[0];

        const o1 = outs[0]?.[0], o2 = outs[1]?.[0], o3 = outs[2]?.[0];
        const cvOut = outs[3]?.[0], startGtOut = outs[4]?.[0], thruGtOut = outs[5]?.[0], longGtOut = outs[6]?.[0];
        const outArr = [o1, o2, o3];
        const len = 128;
        const trigSamples = Math.max(1, Math.round(0.002 * getSR()));

        for (let i = 0; i < len; i++) {
            const clkV = inClk ? inClk[i] : 0.0;
            const trigV = inTrig ? inTrig[i] : 0.0;
            const isClkHi = clkV >= 0.5;

            // 1. 外部トリガ・TRANS_IN 始動予約（クロック立ち上がり前に判定し、KEY+CLKリセット等で同拍発火に対応）
            if (trigV >= 0.4 && this.state === 0) {
                this.armed = true;
            }

            // 2. クロック立ち下がり検知（事後遷移：最終拍なら立ち下がり時にTRANS_OUT短パルスを発射。ステート点灯とCVは次クロックまで維持）
            if (clkV < 0.3 && this.clkActive) {
                this.clkActive = false;
                this.shotActive = false;

                if (this.willEnd && this.pendingTrigCh !== -1) {
                    this.trigOutCh = this.pendingTrigCh;
                    this.trigOutLeft = trigSamples;
                    this.pendingTrigCh = -1;
                }

                if (this.state === 1 && !this.willEnd && this.clockCount >= this.holdClocks) {
                    // 自己継続が決定していた拍の終了：次拍で再び clockCount=1 から開始
                    this.clockCount = 0;
                }
            }

            // 3. クロック立ち上がり検知と発火（前拍willEndの消灯・予約消費・遷移判定）
            const isRising = (isClkHi && !this.clkActive);
            if (isRising) {
                this.clkActive = true;
                this.trigOutCh = -1;
                this.pendingTrigCh = -1;
                this.trigOutLeft = 0;

                if (this.state === 1 && this.willEnd) {
                    this.state = 0;
                    this.clockCount = 0;
                    this.willEnd = false;
                    if (!this.armed) {
                        this.port.postMessage({ type: 'STATE_CHANGED', state: 0, remaining: 0, clockCount: 0 });
                    }
                }

                if (this.state === 0 && this.armed) {
                    this.state = 1;
                    this.armed = false;
                    this.clockCount = 1;
                    this.shotActive = true;
                    const rem = Math.max(1, this.holdClocks);
                    this.port.postMessage({ type: 'STATE_CHANGED', state: 1, remaining: rem, clockCount: 1 });
                } else if (this.state === 1) {
                    if (this.clockCount === 0) {
                        this.clockCount = 1;
                        this.shotActive = true;
                        const rem = Math.max(1, this.holdClocks);
                        this.port.postMessage({ type: 'STATE_CHANGED', state: 1, remaining: rem, clockCount: 1 });
                    } else {
                        this.clockCount++;
                        this.shotActive = false;
                        const rem = Math.max(1, this.holdClocks - this.clockCount + 1);
                        this.port.postMessage({ type: 'STATE_CHANGED', state: 1, remaining: rem, clockCount: this.clockCount });
                    }
                }

                // 今この拍が最終保持拍（holdClocks）に達したなら、確率抽選して立ち下がり時の事後遷移を予約する
                if (this.state === 1 && this.clockCount >= this.holdClocks) {
                    const w0 = Math.max(0, this.weights[0] || 0);
                    const w1 = Math.max(0, this.weights[1] || 0);
                    const w2 = Math.max(0, this.weights[2] || 0);
                    const w3 = Math.max(0, this.weights[3] || 0);
                    const totalW = w0 + w1 + w2 + w3;

                    if (totalW > 0) {
                        const r = Math.random() * totalW;
                        let acc = w0;
                        if (r >= acc) {
                            let chosen = -1;
                            const extWeights = [w1, w2, w3];
                            for (let k = 0; k < 3; k++) {
                                acc += extWeights[k];
                                if (r < acc) {
                                    chosen = k;
                                    break;
                                }
                            }
                            if (chosen !== -1) {
                                this.pendingTrigCh = chosen;
                                this.willEnd = true;
                            }
                        }
                    }
                }
            }

            // 4. 外部トリガ出力（trans_out1..3）: 最終ステートのゲート立ち下がり後の事後遷移パルスを出力
            const activeOutCh = this.trigOutLeft > 0 ? this.trigOutCh : -1;
            for (let k = 0; k < 3; k++) {
                const outCh = outArr[k];
                if (outCh) {
                    outCh[i] = (activeOutCh === k) ? 1.0 : 0.0;
                }
            }
            if (this.trigOutLeft > 0) {
                this.trigOutLeft--;
                if (this.trigOutLeft === 0) this.trigOutCh = -1;
            }

            // 5. CV出力（cv_out）: アクティブ時は音程CV、次クロック立ち上がりまで保持
            if (cvOut) {
                cvOut[i] = this.state === 1 ? this.stateVal : 0.0;
            }

            // 6. 突入トリガー出力（startgate_out）: ノード突入時の最初の拍にクロックHighを出力（1発パルス）
            if (startGtOut) {
                startGtOut[i] = (this.state === 1 && this.shotActive && isClkHi) ? 1.0 : 0.0;
            }

            // 7. 素通しゲート出力（gate_out）: ステートがONの間、入力ゲートをそのまま素通し出力
            if (thruGtOut) {
                thruGtOut[i] = (this.state === 1 && isClkHi) ? 1.0 : 0.0;
            }

            // 8. 持続ロングゲート出力（longgate_out）: ステートがONの間ずっとON（1.0V持続ゲート）
            if (longGtOut) {
                longGtOut[i] = this.state === 1 ? 1.0 : 0.0;
            }
        }

        return true;
    }
}

registerProcessor('markov-processor', MarkovProcessor);

