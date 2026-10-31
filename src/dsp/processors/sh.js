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
            // トリガーが 0 を離脱した瞬間（> 0.001）を検出
            const trgVal = trg ? trg[i] : 0;
            const isHi = trgVal > 0.001;

            if ((isHi && !this.lastTrig) || this.manualTrig) {
                // トリガーが0を離脱した直前の1サンプル値（this.lastSig）をその場でホールド
                if (this.hasExt && sig) {
                    this.held = this.lastSig;
                } else {
                    this.held = this.pol === 'bipolar' ? (Math.random() * 2 - 1) : Math.random();
                }
                this.manualTrig = false;
            }

            // トリガー立ち上がりと同一サンプルから直ちに新しいホールド値を出力（元トリガーと即座に同期）
            const target = this.held * sc;
            this.cur = gl <= 0.001 ? target : (target + (this.cur - target) * Math.exp(-1.0 / (gl * sr)));
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

