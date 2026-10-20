import { getSR } from './common.js';

export class ArpProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.mode = 'up';
        this.activeInputs = [];
        this.pointer = 0;
        this.curCh = -1;
        this.prevCh = -1;
        this.fadeRemaining = 0;
        this.fadeSamples = 0;
        this.updownDir = 1;
        this.lastHi = false;

        this.port.onmessage = (e) => {
            if (e.data.type === 'SET_PARAMS') {
                if (e.data.mode !== undefined) {
                    this.mode = e.data.mode;
                }
                if (e.data.activeInputs !== undefined && Array.isArray(e.data.activeInputs)) {
                    this.activeInputs = e.data.activeInputs.map(n => Math.round(n)).filter(n => n >= 0 && n < 4);
                    const N = this.activeInputs.length;
                    if (N === 0) {
                        this.curCh = -1;
                        this.prevCh = -1;
                        this.fadeRemaining = 0;
                    } else if (this.curCh < 0 || !this.activeInputs.includes(this.curCh)) {
                        this.pointer = 0;
                        this.curCh = this.activeInputs[0];
                        this.fadeRemaining = 0;
                    } else {
                        this.pointer = this.activeInputs.indexOf(this.curCh);
                    }
                }
            } else if (e.data.type === 'RESET') {
                this.pointer = 0;
                this.curCh = this.activeInputs.length > 0 ? this.activeInputs[0] : -1;
                this.prevCh = -1;
                this.fadeRemaining = 0;
                this.updownDir = 1;
                this.lastHi = false;
            }
        };
    }

    process(ins, outs) {
        const clkIn = ins[0]?.[0];
        const outBuf = outs[0]?.[0];
        const gateBuf = outs[1]?.[0];

        if (!outBuf && !gateBuf) return true;

        const len = (outBuf || gateBuf || clkIn || []).length || 128;
        const sr = getSR();
        const fadeLen = Math.max(1, Math.round(0.0015 * sr)); // 1.5ms equal-power crossfade

        for (let i = 0; i < len; i++) {
            const clkVal = clkIn ? clkIn[i] : 0.0;
            const isHi = clkVal > 0.3;
            const N = this.activeInputs.length;

            if (isHi && !this.lastHi) {
                if (N > 0) {
                    if (N > 1) {
                        this.prevCh = (this.curCh >= 0) ? this.curCh : this.activeInputs[this.pointer];

                        switch (this.mode) {
                            case 'down':
                                this.pointer = (this.pointer - 1 + N) % N;
                                break;
                            case 'updown':
                                if (N === 2) {
                                    this.pointer = (this.pointer === 0) ? 1 : 0;
                                } else {
                                    this.pointer += this.updownDir;
                                    if (this.pointer >= N - 1) {
                                        this.pointer = N - 1;
                                        this.updownDir = -1;
                                    } else if (this.pointer <= 0) {
                                        this.pointer = 0;
                                        this.updownDir = 1;
                                    }
                                }
                                break;
                            case 'random':
                                this.pointer = Math.floor(Math.random() * N);
                                break;
                            case 'up':
                            default:
                                this.pointer = (this.pointer + 1) % N;
                                break;
                        }

                        this.curCh = this.activeInputs[this.pointer];
                        this.fadeSamples = fadeLen;
                        this.fadeRemaining = fadeLen;
                    } else {
                        this.curCh = this.activeInputs[0];
                        this.fadeRemaining = 0;
                    }

                    this.port.postMessage({ type: 'STEP', channel: this.curCh, pointer: this.pointer });
                }
            }
            this.lastHi = isHi;

            // Signal Switching with Equal-Power Crossfade
            let sig = 0.0;
            if (this.curCh >= 0) {
                const curBuf = ins[this.curCh + 1]?.[0];
                const sNew = curBuf ? curBuf[i] : 0.0;

                if (this.fadeRemaining > 0 && this.prevCh >= 0) {
                    const prevBuf = ins[this.prevCh + 1]?.[0];
                    const sOld = prevBuf ? prevBuf[i] : 0.0;
                    const progress = 1.0 - (this.fadeRemaining / this.fadeSamples);
                    const theta = progress * 1.5707963267948966; // Math.PI / 2
                    const gainNew = Math.sin(theta);
                    const gainOld = Math.cos(theta);

                    sig = sNew * gainNew + sOld * gainOld;
                    this.fadeRemaining--;
                } else {
                    sig = sNew;
                }
            }

            if (outBuf) {
                outBuf[i] = sig;
            }

            if (gateBuf) {
                // 出力ゲートは入力ゲートそのものを出力
                gateBuf[i] = (N > 0) ? clkVal : 0.0;
            }
        }

        return true;
    }
}

registerProcessor('arp-processor', ArpProcessor);

