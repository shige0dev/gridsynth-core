// src/dsp/processors/pad.js
import { getSR } from './common.js';

export class PadProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.isDown = false;
        this.trigSamples = 0;
        
        // Coordinates and pressure (0.0 - 1.0)
        this.currX = 0.5;
        this.currY = 0.5;
        this.currPressure = 0.0;
        
        this.targetX = 0.5;
        this.targetY = 0.5;
        this.targetPressure = 0.0;

        // Base slider values for HUE and BRIGHT (0.0 - 1.0)
        this.baseHue = 0.5;
        this.baseBright = 0.8;

        // Current measured input values from CV inputs
        this.inHueVal = 0.0;
        this.inBrightVal = 0.0;

        this.postCounter = 0;

        this.port.onmessage = (e) => {
            const data = e.data;
            if (!data) return;

            switch (data.type) {
                case 'PAD_DOWN': {
                    this.isDown = true;
                    if (typeof data.x === 'number') this.targetX = Math.max(0, Math.min(1, data.x));
                    if (typeof data.y === 'number') this.targetY = Math.max(0, Math.min(1, data.y));
                    if (typeof data.pressure === 'number') this.targetPressure = Math.max(0, Math.min(1, data.pressure));
                    this.currX = this.targetX;
                    this.currY = this.targetY;
                    this.currPressure = this.targetPressure;
                    // Trigger pulse length: ~15ms
                    const sr = getSR();
                    this.trigSamples = Math.max(1, Math.round(0.015 * sr));
                    break;
                }
                case 'PAD_MOVE': {
                    if (typeof data.x === 'number') this.targetX = Math.max(0, Math.min(1, data.x));
                    if (typeof data.y === 'number') this.targetY = Math.max(0, Math.min(1, data.y));
                    if (typeof data.pressure === 'number') this.targetPressure = Math.max(0, Math.min(1, data.pressure));
                    break;
                }
                case 'PAD_UP': {
                    this.isDown = false;
                    this.targetPressure = 0.0;
                    // Note: X and Y are latched to their last touched coordinates
                    break;
                }
                case 'SET_CONFIG': {
                    if (typeof data.hue === 'number') this.baseHue = Math.max(0, Math.min(1, data.hue));
                    if (typeof data.bright === 'number') this.baseBright = Math.max(0, Math.min(1, data.bright));
                    break;
                }
            }
        };
    }

    process(ins, outs) {
        const sr = getSR();
        // Smoothing constant (~5ms time constant)
        const alpha = 1.0 - Math.exp(-1.0 / (0.005 * sr));

        // Read input CVs (Input 0: hue_cv, Input 1: bright_cv)
        const inHue = ins[0]?.[0];
        const inBright = ins[1]?.[0];

        // Output buffers:
        // Output 0: trig_out
        // Output 1: gate_out
        // Output 2: x_cv
        // Output 3: y_cv
        // Output 4: pressure_cv
        const outTrig = outs[0]?.[0];
        const outGate = outs[1]?.[0];
        const outX = outs[2]?.[0];
        const outY = outs[3]?.[0];
        const outPress = outs[4]?.[0];

        const len = (outTrig || outGate || outX || outY || outPress || inHue || inBright)?.length || 128;

        for (let i = 0; i < len; i++) {
            // Smooth coordinates and pressure
            this.currX += (this.targetX - this.currX) * alpha;
            this.currY += (this.targetY - this.currY) * alpha;
            this.currPressure += (this.targetPressure - this.currPressure) * alpha;

            // Trigger output: 1.0 while trigSamples > 0
            let trigVal = 0.0;
            if (this.trigSamples > 0) {
                trigVal = 1.0;
                this.trigSamples--;
            }

            // Gate output: 1.0 when touching, 0.0 when released
            const gateVal = this.isDown ? 1.0 : 0.0;

            if (outTrig) outTrig[i] = trigVal;
            if (outGate) outGate[i] = gateVal;
            if (outX) outX[i] = this.currX;
            if (outY) outY[i] = this.currY;
            if (outPress) outPress[i] = this.currPressure;

            if (inHue) this.inHueVal = inHue[i];
            if (inBright) this.inBrightVal = inBright[i];
        }

        // Periodically notify UI for live visual rendering (~60Hz / every 512 samples)
        this.postCounter += len;
        if (this.postCounter >= 512) {
            this.postCounter = 0;
            const effectiveHue = ((this.baseHue + this.inHueVal) % 1.0 + 1.0) % 1.0;
            const effectiveBright = Math.max(0.0, Math.min(1.0, this.baseBright + this.inBrightVal));
            this.port.postMessage({
                type: 'PAD_DATA',
                x: this.currX,
                y: this.currY,
                pressure: this.currPressure,
                isDown: this.isDown,
                hue: effectiveHue,
                bright: effectiveBright,
                baseHue: this.baseHue,
                baseBright: this.baseBright,
                inHue: this.inHueVal,
                inBright: this.inBrightVal
            });
        }

        return true;
    }
}

registerProcessor('pad-processor', PadProcessor);
