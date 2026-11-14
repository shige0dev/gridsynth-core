import { getSR } from './common.js';

export class SeqProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.step = -1;
        this.lastHi = false;
        this.lastTrigHi = false;
        this.lastKeyHi = false;
        this.keyOneShotDone = false;
        this.cv = 0;
        this.gate = 0;
        this.gap = 0;
        this.trigOut = false;
        this.armed = false;

        this.transOutPatched = false;
        this.transInPatched = false;
        this.keyGatePatched = false;
        this.keyMode = 'loop';
        this.initOn = true;
        this.active = true;

        if (options?.processorOptions?.steps && Array.isArray(options.processorOptions.steps) && options.processorOptions.steps.length > 0) {
            this.steps = options.processorOptions.steps;
        } else {
            this.steps = Array.from({ length: 8 }, (_, i) => ({
                cv: i === 0 ? 0 : 0.25,
                active: true,
                cvActive: true,
                gate: true
            }));
        }
        this.port.onmessage = e => {
            if (e.data.type === 'SET_STEPS') {
                if (Array.isArray(e.data.steps) && e.data.steps.length > 0) {
                    this.steps = e.data.steps;
                }
            } else if (e.data.type === 'SET_PATCH') {
                if (e.data.transOutPatched !== undefined) {
                    this.transOutPatched = Boolean(e.data.transOutPatched);
                }
                if (e.data.keyGatePatched !== undefined) {
                    const nextKey = Boolean(e.data.keyGatePatched);
                    if (nextKey !== this.keyGatePatched) {
                        this.keyGatePatched = nextKey;
                        this.lastKeyHi = false;
                        this.keyOneShotDone = false;
                        if (this.keyGatePatched) {
                            this.active = false;
                            this.step = -1;
                            this.gate = 0;
                            this.port.postMessage({ type: 'STEP', step: -1, active: false });
                        } else if (this.step === -1 && !this.armed) {
                            this.active = (!this.transInPatched) ? true : (this.initOn !== false);
                            this.port.postMessage({ type: 'STEP', step: this.step, active: this.active });
                        }
                    }
                }
                if (e.data.transInPatched !== undefined) {
                    const nextIn = Boolean(e.data.transInPatched);
                    if (nextIn !== this.transInPatched) {
                        this.transInPatched = nextIn;
                        if (!this.keyGatePatched && this.step === -1 && !this.armed) {
                            this.active = (!this.transInPatched) ? true : (this.initOn !== false);
                            this.port.postMessage({ type: 'STEP', step: this.step, active: this.active });
                        }
                    }
                }
            } else if (e.data.type === 'SET_INIT') {
                if (e.data.keyMode !== undefined) {
                    this.keyMode = e.data.keyMode === 'oneshot' ? 'oneshot' : 'loop';
                }
                if (e.data.initOn !== undefined) {
                    const nextInit = Boolean(e.data.initOn);
                    if (nextInit !== this.initOn) {
                        this.initOn = nextInit;
                        if (!this.keyGatePatched && this.step === -1 && !this.armed) {
                            this.active = (!this.transInPatched) ? true : this.initOn;
                            this.port.postMessage({ type: 'STEP', step: this.step, active: this.active });
                        }
                    }
                }
            } else if (e.data.type === 'RESET') {
                if (e.data.keyMode !== undefined) {
                    this.keyMode = e.data.keyMode === 'oneshot' ? 'oneshot' : 'loop';
                }
                const isInit = e.data.initOn !== undefined ? Boolean(e.data.initOn) : (this.initOn !== false);
                this.active = this.keyGatePatched ? false : ((!this.transInPatched) ? true : isInit);
                this.step = -1;
                this.lastHi = false;
                this.lastTrigHi = false;
                this.lastKeyHi = false;
                this.keyOneShotDone = false;
                this.gap = 0;
                this.gate = 0;
                this.trigOut = false;
                this.armed = false;
                this.port.postMessage({ type: 'STEP', step: -1, active: this.active });
            }
        };
    }

    process(ins, outs) {
        const gIn = ins[0]?.[0];
        const inTrig = ins[1]?.[0];
        const inKey = ins[2]?.[0];
        const cvOut = outs[0]?.[0], gOut = outs[1]?.[0], transOut = outs[2]?.[0];
        const len = (cvOut || gOut || transOut || gIn || inTrig || inKey || []).length || 128;
        const minGap = Math.max(1, Math.round(0.002 * getSR()));
        const numSteps = (this.steps && this.steps.length > 0) ? this.steps.length : 8;

        for (let i = 0; i < len; i++) {
            const clkV = gIn ? gIn[i] : 0.0;
            const trigV = inTrig ? inTrig[i] : 0.0;
            const keyV = inKey ? inKey[i] : 0.0;
            const isHi = clkV > 0.3;
            const isTrigHi = trigV >= 0.4;
            const isKeyHi = keyV >= 0.4;
            const isTrigRising = isTrigHi && !this.lastTrigHi;
            this.lastTrigHi = isTrigHi;

            // 1A. KEYGATE_IN control (when patched):
            // Gate rising edge resets & starts from step 0; gate falling edge immediately stops & resets to step -1.
            if (this.keyGatePatched) {
                if (!isKeyHi) {
                    if (this.lastKeyHi || this.active || this.step !== -1) {
                        const wasActiveOrLit = this.lastKeyHi || this.active || this.step !== -1;
                        this.active = false;
                        this.step = -1;
                        this.gate = 0.0;
                        this.trigOut = false;
                        this.armed = false;
                        this.keyOneShotDone = false;
                        if (wasActiveOrLit) {
                            this.port.postMessage({ type: 'STEP', step: -1, active: false });
                        }
                    }
                    this.lastKeyHi = false;
                } else if (!this.lastKeyHi) {
                    this.lastKeyHi = true;
                    this.keyOneShotDone = false;
                    this.active = true;
                    this.step = -1;
                    if (isHi) {
                        let found = false;
                        for (let a = 0; a < numSteps; a++) {
                            this.step = (this.step + 1) % numSteps;
                            const st = this.steps[this.step];
                            if (st && (typeof st === 'object' ? st.active !== false : true)) {
                                found = true;
                                break;
                            }
                        }
                        if (found) {
                            const cur = this.steps[this.step];
                            if (cur != null) {
                                if (typeof cur === 'number') {
                                    this.cv = cur;
                                } else if (cur.cvActive !== false) {
                                    this.cv = cur.cv ?? 0;
                                }
                                this.gap = minGap;
                                this.port.postMessage({ type: 'STEP', step: this.step, active: true });
                            }
                        }
                        this.lastHi = true;
                        this.trigOut = false;
                    }
                }
            } else {
                // 1B. TRANS_IN trigger reception (EOS baton / external gate):
                // When inactive: if clock is already High, start step 0 immediately on this beat; if clock is Low, arm for next clock.
                // When active: a new rising edge on TRANS_IN reserves continuation into the next cycle.
                if (!this.active) {
                    if (isTrigHi) {
                        if (isHi) {
                            this.active = true;
                            this.armed = false;
                            this.step = -1;
                            let found = false;
                            for (let a = 0; a < numSteps; a++) {
                                this.step = (this.step + 1) % numSteps;
                                const st = this.steps[this.step];
                                if (st && (typeof st === 'object' ? st.active !== false : true)) {
                                    found = true;
                                    break;
                                }
                            }
                            if (found) {
                                const cur = this.steps[this.step];
                                if (cur != null) {
                                    if (typeof cur === 'number') {
                                        this.cv = cur;
                                    } else if (cur.cvActive !== false) {
                                        this.cv = cur.cv ?? 0;
                                    }
                                    this.gap = minGap;
                                    this.port.postMessage({ type: 'STEP', step: this.step, active: true });
                                }
                            }
                            this.lastHi = true;
                            this.trigOut = false;
                        } else {
                            this.armed = true;
                        }
                    }
                } else if (isTrigRising) {
                    this.armed = true;
                }
            }

            // 2. Clock falling edge: clear trigOut and allow next clock rising edge
            if (!isHi) {
                this.lastHi = false;
                this.trigOut = false;
            }

            // 3. Clock rising edge: advance step or emit EOS transition at cycle wrap
            if (isHi && !this.lastHi) {
                this.lastHi = true;
                this.trigOut = false;

                if (!this.keyGatePatched && !this.active && (this.armed || isTrigHi)) {
                    this.active = true;
                    this.armed = false;
                    this.step = -1;
                }

                if (this.active) {
                    let nextStep = this.step;
                    let found = false;
                    let wrapped = false;
                    for (let a = 0; a < numSteps; a++) {
                        nextStep = (nextStep + 1) % numSteps;
                        if (this.step >= 0 && nextStep <= this.step) {
                            wrapped = true;
                        }
                        const st = this.steps[nextStep];
                        if (st && (typeof st === 'object' ? st.active !== false : true)) {
                            found = true;
                            break;
                        }
                    }

                    if (this.keyGatePatched) {
                        if (wrapped) {
                            if (this.keyMode === 'oneshot') {
                                this.active = false;
                                this.step = -1;
                                this.gate = 0.0;
                                this.keyOneShotDone = true;
                                if (this.transOutPatched) this.trigOut = true;
                                this.port.postMessage({ type: 'STEP', step: -1, active: false });
                                found = false;
                            } else if (this.transOutPatched) {
                                this.trigOut = true;
                            }
                        }
                    } else {
                        const isOneShot = this.transOutPatched || this.transInPatched;
                        if (wrapped && isOneShot) {
                            if (this.armed || isTrigHi) {
                                // Continue to next cycle if re-triggered or while gate is held high
                                this.armed = false;
                                if (this.transOutPatched) this.trigOut = true;
                            } else {
                                // Sequence finished: transition out (EOS) to next module on this clock edge
                                this.active = false;
                                this.step = -1;
                                this.gate = 0.0;
                                if (this.transOutPatched) this.trigOut = true;
                                this.port.postMessage({ type: 'STEP', step: -1, active: false });
                                found = false;
                            }
                        }
                    }

                    if (found && this.active) {
                        this.step = nextStep;
                        const cur = this.steps[this.step];
                        if (cur != null) {
                            if (typeof cur === 'number') {
                                this.cv = cur;
                            } else if (cur.cvActive !== false) {
                                this.cv = cur.cv ?? 0;
                            }
                            this.gap = minGap;
                            this.port.postMessage({ type: 'STEP', step: this.step, active: true });
                        }
                    }
                }
            }

            // 4. Output gate, cv, and EOS transOut
            const cur = (this.active && this.step >= 0 && this.step < numSteps) ? this.steps[this.step] : null;
            const isGateOn = typeof cur === 'number' ? true : (cur && cur.gate !== false);
            const isActOn = typeof cur === 'number' ? true : (cur && cur.active !== false);
            const shouldGate = this.active && cur != null && isActOn && isGateOn && isHi;

            if (this.gap > 0) {
                this.gap--;
                this.gate = 0;
            } else {
                this.gate = shouldGate ? 1.0 : 0.0;
            }

            if (cvOut) cvOut[i] = this.cv;
            if (gOut) gOut[i] = this.gate;
            if (transOut) transOut[i] = (this.trigOut && isHi) ? 1.0 : 0.0;
        }
        return true;
    }
}

registerProcessor('seq-processor', SeqProcessor);
