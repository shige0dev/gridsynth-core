export class Dist4Processor extends AudioWorkletProcessor {
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
        const cvIn = ins[1]?.[0];
        const out0 = outs[0]?.[0];
        const out1 = outs[1]?.[0];
        const out2 = outs[2]?.[0];
        const out3 = outs[3]?.[0];

        if (!out0 && !out1 && !out2 && !out3) return true;

        const outChannels = [out0, out1, out2, out3];
        const len = (out0 || gIn || cvIn || []).length || 128;
        const steps = this.steps;

        for (let i = 0; i < len; i++) {
            const trigVal = gIn ? gIn[i] : 0.0;
            const isHi = trigVal > 0.3;

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

            // Signal value: cvIn sample if connected, otherwise 1.0 (DC)
            const sig = cvIn ? cvIn[i] : 1.0;

            for (let ch = 0; ch < 4; ch++) {
                const chBuf = outChannels[ch];
                if (!chBuf) continue;
                chBuf[i] = (ch === this.step && ch < steps) ? sig : 0.0;
            }
        }

        return true;
    }
}

registerProcessor('dist4-processor', Dist4Processor);
