// src/dsp/processors/cue.js

export class CueProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.start = 0.0;
        this.end = 1.0;
        this.speedCv = 0.0;

        // Current latched output values
        this.outStart = 0.0;
        this.outEnd = 1.0;
        this.outSpeed = 0.0;

        this.pulseSamplesRemaining = 0;
        this.lastTrigHi = false;

        this.port.onmessage = (e) => {
            const data = e.data;
            if (!data) return;

            if (data.type === 'SET_PARAMS') {
                if (data.start !== undefined) this.start = Math.max(0.0, Math.min(1.0, data.start));
                if (data.end !== undefined) this.end = Math.max(0.0, Math.min(1.0, data.end));
                if (data.speedCv !== undefined) this.speedCv = Math.max(-2.0, Math.min(2.0, data.speedCv));
            } else if (data.type === 'TRIGGER') {
                this.fireTrigger();
            } else if (data.type === 'RESET') {
                this.pulseSamplesRemaining = 0;
                this.lastTrigHi = false;
            }
        };
    }

    fireTrigger() {
        const sr = sampleRate || 48000;
        this.pulseSamplesRemaining = Math.max(1, Math.floor(sr * 0.001)); // 1ms pulse
        this.outStart = this.start;
        this.outEnd = this.end;
        this.outSpeed = this.speedCv;

        this.port.postMessage({ type: 'TRIGGERED' });
    }

    process(inputs, outputs) {
        const trigOut = outputs[0] ? outputs[0][0] : null;
        const startOut = outputs[1] ? outputs[1][0] : null;
        const endOut = outputs[2] ? outputs[2][0] : null;
        const speedOut = outputs[3] ? outputs[3][0] : null;

        const trigIn = inputs[0] ? inputs[0][0] : null;
        const len = trigOut ? trigOut.length : 128;

        for (let i = 0; i < len; i++) {
            const tVal = trigIn ? trigIn[i] : 0.0;
            const isHi = tVal > 0.3;
            if (isHi && !this.lastTrigHi) {
                this.fireTrigger();
            }
            this.lastTrigHi = isHi;

            if (trigOut) {
                if (this.pulseSamplesRemaining > 0) {
                    trigOut[i] = 1.0;
                    this.pulseSamplesRemaining--;
                } else {
                    trigOut[i] = 0.0;
                }
            }

            if (startOut) startOut[i] = this.outStart;
            if (endOut) endOut[i] = this.outEnd;
            if (speedOut) speedOut[i] = this.outSpeed;
        }

        return true;
    }
}

registerProcessor('cue-processor', CueProcessor);

