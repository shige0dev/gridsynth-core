import { getSR } from './common.js';

export class ScaleProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.rootMidi = 0; // 0: C, 1: C#, ..., 11: B
        this.mask = [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0]; // default: PENT.MIN
        this.validSemis = [0, 3, 5, 7, 10]; // relative semitones
        this.hasTrig = false;
        this.lastTrigHi = false;

        this.heldCv = 0.0;
        this.heldSemi = 0; // 0〜11
        this.pulseCount = 0;
        this.sampleCount = 0;

        this.port.onmessage = (e) => {
            if (e.data.type === 'SET_CONFIG') {
                if (e.data.rootMidi !== undefined) this.rootMidi = Math.max(0, Math.min(11, Math.round(e.data.rootMidi)));
                if (Array.isArray(e.data.mask) && e.data.mask.length === 12) {
                    this.mask = e.data.mask;
                    this.rebuildValidSemis();
                }
                if (e.data.hasTrig !== undefined) this.hasTrig = !!e.data.hasTrig;
            }
        };
    }

    rebuildValidSemis() {
        const list = [];
        for (let i = 0; i < 12; i++) {
            if (this.mask[i] === 1) list.push(i);
        }
        this.validSemis = list;
    }

    quantizeEqual(inV) {
        const N = this.validSemis.length;
        if (N === 0) return { cv: inV, semi: 0 };

        // 負の電圧にも対応する数学的 floor と正の小数部 frac (0.0 <= frac < 1.0)
        const oct = Math.floor(inV);
        let frac = inV - oct;
        if (frac < 0) frac = 0;
        if (frac >= 0.999999) frac = 0.999999;

        // N等分して完全均等確率でインデックス決定
        const idx = Math.min(N - 1, Math.max(0, Math.floor(frac * N)));
        const relSemi = this.validSemis[idx];

        // ルート音オフセットを加味
        const totalSemi = relSemi + this.rootMidi;
        const addOct = Math.floor(totalSemi / 12);
        const absSemi = ((totalSemi % 12) + 12) % 12;

        const outOct = oct + addOct;
        const outCv = outOct + (absSemi / 12.0);

        return { cv: outCv, semi: absSemi };
    }

    process(ins, outs) {
        const cvIn = ins[0]?.[0];
        const trgIn = ins[1]?.[0];
        const cvOut = outs[0]?.[0];
        const gtOut = outs[1]?.[0];

        const len = (cvOut || gtOut || cvIn || []).length || 128;
        const sr = getSR();
        const pulseSamples = Math.max(1, Math.round(0.005 * sr)); // 5ms trigger pulse

        for (let i = 0; i < len; i++) {
            const rawV = cvIn ? cvIn[i] : 0.0;
            const trgVal = trgIn ? trgIn[i] : 0.0;
            const isTrigHi = trgVal > 0.3;

            let shouldUpdate = false;
            let firePulse = false;

            if (this.hasTrig) {
                // クロック・トリガー接続時: 立ち上がりエッジでのみ更新
                if (isTrigHi && !this.lastTrigHi) {
                    shouldUpdate = true;
                    firePulse = true;
                }
            } else {
                // トリガー未接続時: 連続追従（音程が変わった時にパルス出力）
                shouldUpdate = true;
            }
            this.lastTrigHi = isTrigHi;

            if (shouldUpdate) {
                const q = this.quantizeEqual(rawV);
                const prevCv = this.heldCv;
                this.heldCv = q.cv;
                this.heldSemi = q.semi;

                // 連続モードで音程が変化した場合もパルス発火
                if (!this.hasTrig && Math.abs(q.cv - prevCv) > 0.001) {
                    firePulse = true;
                }
            }

            if (firePulse) {
                this.pulseCount = pulseSamples;
            }

            let gateOutVal = 0.0;
            if (this.pulseCount > 0) {
                this.pulseCount--;
                gateOutVal = 1.0;
            }

            if (cvOut) cvOut[i] = this.heldCv;
            if (gtOut) gtOut[i] = gateOutVal;

            this.sampleCount++;
        }

        // 定期的にUIへ状態送信（約 30Hz: 44100 / 1470 ≈ 30fps）
        if (this.sampleCount >= 1470) {
            this.sampleCount = 0;
            this.port.postMessage({
                type: 'STATE',
                activeSemi: this.heldSemi,
                cv: this.heldCv
            });
        }

        return true;
    }
}

registerProcessor('scale-processor', ScaleProcessor);
