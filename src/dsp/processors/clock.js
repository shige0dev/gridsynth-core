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
        this.hasRunIn = false;
        this.lastRunState = true;
        this.lastResetTrig = false;
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
                if (typeof e.data.hasRunIn === 'boolean') {
                    this.hasRunIn = e.data.hasRunIn;
                }
            } else if (e.data.type === 'RESET') {
                this.samplePhase = 0.0;
                this.left = 0;
                this.lastRunState = true;
                this.lastResetTrig = false;
            }
        };
    }

    process(ins, outs, params) {
        const out = outs[0]?.[0];
        if (!out) return true;
        const runIn = ins[0]?.[0];
        const rstIn = ins[1]?.[0];
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

            // 1. 外部リセット端子 (reset_in) の立ち上がり検知 (> 0.001)
            const rstVal = rstIn ? rstIn[i] : 0.0;
            const isRstHi = rstVal > 0.001;
            if (isRstHi && !this.lastResetTrig) {
                this.samplePhase = 0.0;
                this.left = pDur; // リセットと同時に頭打ちパルスを出力
            }
            this.lastResetTrig = isRstHi;

            // 2. RUN 端子 (run_in) の判定: 接続がなければ常時オン (true)
            // 接続時は 0と1を検知 (0.3V以上で 1/RUN状態)
            const isRunning = this.hasRunIn ? ((runIn ? runIn[i] : 0.0) > 0.3) : true;

            // RUN が 0 -> 1 へ立ち上がった瞬間に拍の頭（0.0）から開始
            if (isRunning && !this.lastRunState) {
                this.samplePhase = 0.0;
                this.left = pDur;
            } else if (isRunning && (this.samplePhase <= 0.0 || this.samplePhase >= sPerIntExact)) {
                // 周期到達時、整数切り捨てず余剰（端数）を引き継ぎ、公倍数で完全一致
                if (this.samplePhase >= sPerIntExact) {
                    this.samplePhase -= sPerIntExact;
                }
                this.left = pDur;
            }

            // RUN が ON の間のみ位相を進める
            if (isRunning) {
                this.samplePhase += 1.0;
            }
            this.lastRunState = isRunning;

            if (this.left > 0) {
                this.left--;
                out[i] = isRunning ? 1.0 : 0.0;
            } else {
                out[i] = 0.0;
            }
        }
        return true;
    }
}

registerProcessor('clock-processor', ClockProcessor);

