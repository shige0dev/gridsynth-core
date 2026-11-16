import { getSR } from './common.js';

export class SampleHoldProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'glide', defaultValue: 0.0 },
            { name: 'scale', defaultValue: 1.0 }
        ];
    }

    constructor() {
        super();
        this.held = 0;
        this.cur = 0;
        this.lastTrig = false;
        this.lastSig = 0;
        this.hasExt = false;
        this.pol = 'unipolar';
        this.port.onmessage = e => {
            if (e.data.type === 'SET_CONFIG') {
                this.hasExt = e.data.hasExternalSig;
                this.pol = e.data.polarity;
            } else if (e.data.type === 'RESET' || e.data.type === 'CLEAR') {
                this.held = 0;
                this.cur = 0;
                this.lastTrig = false;
                this.lastSig = 0;
            }
        };
    }

    process(ins, outs, params) {
        const sig = ins[0]?.[0], trg = ins[1]?.[0], out = outs[0]?.[0];
        if (!out) return true;
        const sr = getSR();
        const sc = params.scale.length > 1 ? params.scale : (params.scale[0] ?? 1);
        const glArr = params.glide;
        for (let i = 0; i < out.length; i++) {
            // トリガーが 0 を離脱した瞬間（> 0.001）を検出
            const trgVal = trg ? trg[i] : 0;
            const isHi = trgVal > 0.001;

            if (isHi && !this.lastTrig) {
                // トリガーが0を離脱した直前の1サンプル値（this.lastSig）をその場でホールド
                if (this.hasExt && sig) {
                    this.held = this.lastSig;
                } else {
                    this.held = this.pol === 'bipolar' ? (Math.random() * 2 - 1) : Math.random();
                }
            }

            // トリガー立ち上がりと同一サンプルから直ちに新しいホールド値を出力（元トリガーと即座に同期）
            const curSc = typeof sc === 'number' ? sc : sc[i];
            const gl = glArr.length > 1 ? glArr[i] : (glArr[0] ?? 0);
            const target = this.held * curSc;
            const diff = target - this.cur;
            if (gl <= 0.001 || Math.abs(diff) < 1e-6) {
                this.cur = target;
            } else {
                // 差分の一定割合で目標値へ対称に漸近する（上昇・下降とも同一時定数）
                const coeff = 1.0 - Math.exp(-1.0 / (gl * sr));
                this.cur += diff * coeff;
            }
            out[i] = this.cur;

            if (sig) {
                this.lastSig = sig[i];
            }
            this.lastTrig = isHi;
        }
        return true;
    }
}

registerProcessor('sh-processor', SampleHoldProcessor);

