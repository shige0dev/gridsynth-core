import { getSR } from './common.js';

export function parseClockRate(val) {
    if (typeof val === 'number') return val > 0 ? val : 1.0;
    if (!val || typeof val !== 'string') return 1.0;
    const s = val.trim();
    if (s.startsWith('/')) {
        const d = parseFloat(s.slice(1));
        return (d && d > 0) ? 1.0 / d : 1.0;
    }
    if (s.includes('/')) {
        const parts = s.split('/');
        const num = parseFloat(parts[0]), den = parseFloat(parts[1]);
        if (num && den) return num / den;
    }
    if (s.toLowerCase().startsWith('x')) {
        const m = parseFloat(s.slice(1));
        return (m && m > 0) ? m : 1.0;
    }
    const n = parseFloat(s);
    return (n && n > 0) ? n : 1.0;
}

export class ClockProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'bpm', defaultValue: 120.0, minValue: 40.0, maxValue: 260.0 },
            { name: 'pulseWidthMs', defaultValue: 15.0 },
            { name: 'limitPct', defaultValue: 90.0, minValue: 10.0, maxValue: 90.0 }
        ];
    }

    constructor() {
        super();
        this.samplePhase = 0.0;
        this.left = 0;
        this.div = 'x2';
        this.limitPct = 90.0;
        this.running = false;
        this.hasPowerIn = false;
        this.lastPowerOn = true;
        this.port.onmessage = e => {
            if (e.data.type === 'SET_STATE') {
                if (typeof e.data.running === 'boolean') {
                    if (e.data.running && !this.running) {
                        this.samplePhase = 0.0;
                    }
                    this.running = e.data.running;
                }
                if (e.data.div) this.div = e.data.div;
                if (e.data.limitPct !== undefined) this.limitPct = Math.min(90.0, e.data.limitPct);
                if (typeof e.data.hasPowerIn === 'boolean') {
                    this.hasPowerIn = e.data.hasPowerIn;
                }
            } else if (e.data.type === 'RESET') {
                this.samplePhase = 0.0;
                this.left = 0;
                this.lastPowerOn = true;
            }
        };
    }

    process(ins, outs, params) {
        const out = outs[0]?.[0];
        if (!out) return true;
        const pIn = ins[0]?.[0];
        const mult = parseClockRate(this.div);
        const sr = getSR();
        const bpm = params.bpm[0] || 120.0;
        const sPerIntExact = (60.0 / bpm / mult) * sr;
        const lim = Math.min(90.0, (params.limitPct ? params.limitPct[0] : this.limitPct) ?? 90.0);
        const maxPDur = Math.max(1, Math.min(Math.floor(sPerIntExact - 1), Math.round(sPerIntExact * (lim / 100.0))));
        const reqPDur = Math.max(1, Math.round(((params.pulseWidthMs[0] || 15) / 1000) * sr));
        const pDur = Math.min(reqPDur, maxPDur);

        for (let i = 0; i < out.length; i++) {
            if (!this.running) {
                out[i] = 0;
                continue;
            }

            const isPowerOn = this.hasPowerIn ? ((pIn ? pIn[i] : 0.0) > 0.3) : true;
            if (isPowerOn && !this.lastPowerOn) {
                this.samplePhase = 0.0;
                this.left = pDur;
            } else if (this.samplePhase <= 0.0 || this.samplePhase >= sPerIntExact) {
                // 周期到達時、整数切り捨てではなく余剰（端数）を保持して次のサイクルへ引き継ぐ
                // これにより公倍数周期到達時に完全同期を維持
                if (this.samplePhase >= sPerIntExact) {
                    this.samplePhase -= sPerIntExact;
                }
                this.left = pDur;
            }
            this.samplePhase += 1.0;
            this.lastPowerOn = isPowerOn;

            if (this.left > 0) {
                this.left--;
                out[i] = isPowerOn ? 1.0 : 0.0;
            } else {
                out[i] = 0.0;
            }
        }
        return true;
    }
}

registerProcessor('clock-processor', ClockProcessor);

