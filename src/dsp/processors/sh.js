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
        this.manualTrig = false;
        this.hasExt = false;
        this.pol = 'unipolar';
        this.port.onmessage = e => {
            if (e.data.type === 'SET_CONFIG') {
                this.hasExt = e.data.hasExternalSig;
                this.pol = e.data.polarity;
            } else if (e.data.type === 'TRIG') {
                this.manualTrig = true;
            } else if (e.data.type === 'RESET' || e.data.type === 'CLEAR') {
                this.held = 0;
                this.cur = 0;
                this.lastTrig = false;
                this.lastSig = 0;
                this.manualTrig = false;
            }
        };
    }

    process(ins, outs, params) {
        const sig = ins[0]?.[0], trg = ins[1]?.[0], out = outs[0]?.[0];
        if (!out) return true;
        const sr = getSR(), sc = params.scale[0] || 1, gl = params.glide[0] || 0;
        for (let i = 0; i < out.length; i++) {
            const isHi = (trg ? trg[i] : 0) > 0.3;
            // 先に現在の出力（前回の held 値）を確定して out[i] に書き込む
            const target = this.held * sc;
            this.cur = gl <= 0.001 ? target : (target + (this.cur - target) * Math.exp(-1.0 / (gl * sr)));
            out[i] = this.cur;

            // 出力確定後にトリガー立ち上がりを検知して次回の held を更新
            // これにより同サンプルの直列 SH カスケードでも新しい値が同拍で後段へ貫通しない
            if ((isHi && !this.lastTrig) || this.manualTrig) {
                if (this.hasExt && sig) {
                    this.held = this.lastSig;
                } else {
                    this.held = this.pol === 'bipolar' ? (Math.random() * 2 - 1) : Math.random();
                }
                this.manualTrig = false;
            }
            if (sig) {
                this.lastSig = sig[i];
            }
            this.lastTrig = isHi;
        }
        return true;
    }
}

registerProcessor('sh-processor', SampleHoldProcessor);

