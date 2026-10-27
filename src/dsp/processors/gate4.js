export class Gate4Processor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.steps = 4;
        this.mode = 'up';
        this.step = -1;
        this.updownDir = 1;
        this.lastHi = false;

        this.port.onmessage = (e) => {
            if (e.data.type === 'SET_PARAMS') {
                if (e.data.steps !== undefined) {
                    this.steps = Math.max(2, Math.min(4, Math.round(e.data.steps)));
                    if (this.step >= this.steps) {
                        this.step = this.steps - 1;
                    }
                }
                if (e.data.mode !== undefined) {
                    this.mode = e.data.mode;
                }
            } else if (e.data.type === 'RESET') {
                this.step = -1;
                this.updownDir = 1;
                this.lastHi = false;
            }
        };
    }

    process(ins, outs) {
        const gIn = ins[0]?.[0];
        const out0 = outs[0]?.[0];
        const out1 = outs[1]?.[0];
        const out2 = outs[2]?.[0];
        const out3 = outs[3]?.[0];

        if (!out0 && !out1 && !out2 && !out3) return true;

        const outChannels = [out0, out1, out2, out3];
        const len = (out0 || gIn || []).length || 128;
        const steps = this.steps;

        for (let i = 0; i < len; i++) {
            const val = gIn ? gIn[i] : 0.0;
            const isHi = val > 0.3;

            if (isHi && !this.lastHi) {
                if (this.step < 0) {
                    this.step = (this.mode === 'down') ? (steps - 1) : 0;
                    this.updownDir = 1;
                } else {
                    switch (this.mode) {
                        case 'down':
                            this.step = (this.step - 1 + steps) % steps;
                            break;
                        case 'updown':
                            if (steps === 2) {
                                this.step = this.step === 0 ? 1 : 0;
                            } else {
                                this.step += this.updownDir;
                                if (this.step >= steps - 1) {
                                    this.step = steps - 1;
                                    this.updownDir = -1;
                                } else if (this.step <= 0) {
                                    this.step = 0;
                                    this.updownDir = 1;
                                }
                            }
                            break;
                        case 'random':
                            this.step = Math.floor(Math.random() * steps);
                            break;
                        case 'up':
                        default:
                            this.step = (this.step + 1) % steps;
                            break;
                    }
                }

                this.port.postMessage({ type: 'STEP', step: this.step });
            }
            this.lastHi = isHi;

            // Output incoming gate directly to current active step, 0 to all others
            for (let ch = 0; ch < 4; ch++) {
                const chBuf = outChannels[ch];
                if (!chBuf) continue;

                if (ch === this.step && ch < steps) {
                    chBuf[i] = val;
                } else {
                    chBuf[i] = 0.0;
                }
            }
        }

        return true;
    }
}

registerProcessor('gate4-processor', Gate4Processor);

export class State4Processor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.steps = 4;
        this.mode = 'up';
        this.step = 0; // Starts at step 0 active
        this.updownDir = 1;
        this.lastHi = false;

        this.port.onmessage = (e) => {
            if (e.data.type === 'SET_PARAMS') {
                if (e.data.steps !== undefined) {
                    this.steps = Math.max(2, Math.min(4, Math.round(e.data.steps)));
                    if (this.step >= this.steps) {
                        this.step = this.steps - 1;
                    }
                }
                if (e.data.mode !== undefined) {
                    this.mode = e.data.mode;
                }
            } else if (e.data.type === 'RESET') {
                this.step = 0;
                this.updownDir = 1;
                this.lastHi = false;
                this.port.postMessage({ type: 'STEP', step: this.step });
            }
        };
    }

    process(ins, outs) {
        const gIn = ins[0]?.[0];
        const out0 = outs[0]?.[0];
        const out1 = outs[1]?.[0];
        const out2 = outs[2]?.[0];
        const out3 = outs[3]?.[0];

        if (!out0 && !out1 && !out2 && !out3) return true;

        const outChannels = [out0, out1, out2, out3];
        const len = (out0 || gIn || []).length || 128;
        const steps = this.steps;

        for (let i = 0; i < len; i++) {
            const val = gIn ? gIn[i] : 0.0;
            const isHi = val > 0.3;

            if (isHi && !this.lastHi) {
                switch (this.mode) {
                    case 'down':
                        this.step = (this.step - 1 + steps) % steps;
                        break;
                    case 'updown':
                        if (steps === 2) {
                            this.step = this.step === 0 ? 1 : 0;
                        } else {
                            this.step += this.updownDir;
                            if (this.step >= steps - 1) {
                                this.step = steps - 1;
                                this.updownDir = -1;
                            } else if (this.step <= 0) {
                                this.step = 0;
                                this.updownDir = 1;
                            }
                        }
                        break;
                    case 'random':
                        this.step = Math.floor(Math.random() * steps);
                        break;
                    case 'up':
                    default:
                        this.step = (this.step + 1) % steps;
                        break;
                }

                this.port.postMessage({ type: 'STEP', step: this.step });
            }
            this.lastHi = isHi;

            // Output latched DC (1.0V) on the active step, 0.0V on others
            for (let ch = 0; ch < 4; ch++) {
                const chBuf = outChannels[ch];
                if (!chBuf) continue;
                chBuf[i] = (ch === this.step && ch < steps) ? 1.0 : 0.0;
            }
        }

        return true;
    }
}

registerProcessor('state4-processor', State4Processor);

export class FlipFlopProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.state = 1;
        this.lastHi = false;

        this.port.onmessage = (e) => {
            if (e.data.type === 'TRIG') {
                this.state = this.state ? 0 : 1;
                this.port.postMessage({ type: 'STATE', state: this.state });
            } else if (e.data.type === 'RESET') {
                this.state = 1;
                this.lastHi = false;
                this.port.postMessage({ type: 'STATE', state: this.state });
            }
        };
    }

    process(ins, outs) {
        const gIn = ins[0]?.[0];
        const out0 = outs[0]?.[0];
        const out1 = outs[1]?.[0];
        if (!out0 && !out1) return true;

        const len = (out0 || out1 || gIn || []).length || 128;

        for (let i = 0; i < len; i++) {
            const val = gIn ? gIn[i] : 0.0;
            const isHi = val > 0.3;

            if (isHi && !this.lastHi) {
                this.state = this.state ? 0 : 1;
                this.port.postMessage({ type: 'STATE', state: this.state });
            }
            this.lastHi = isHi;

            if (out0) out0[i] = this.state ? 1.0 : 0.0;
            if (out1) out1[i] = this.state ? 0.0 : 1.0;
        }

        return true;
    }
}

registerProcessor('ff-processor', FlipFlopProcessor);

