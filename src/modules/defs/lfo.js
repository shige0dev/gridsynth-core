// src/modules/defs/lfo.js

export const LFO = {
    color: 'indigo',
    DIVISIONS: ['4/1', '2/1', '1/1', '1/2', '1/4', '1/8', '1/16', '1/32', '1/4T', '1/8T', '1/4D', '1/8D'],
    defaults: () => ({
        type: 'LFO',
        waveType: 'sine',
        polarity: 'bipolar',
        syncMode: 'free',
        division: '1/4',
        period: 0.5,
        rate: 2.0,
        depth: 1.0,
        phase: 0,
        duty: 0.5
    }),
    onNormalize: (m) => {
        if (m.period === undefined && m.rate !== undefined) {
            m.period = 1.0 / Math.max(0.001, m.rate);
        } else if (m.period !== undefined) {
            m.rate = 1.0 / Math.max(0.001, m.period);
        } else {
            m.period = 0.5;
            m.rate = 2.0;
        }
    },
    ports: () => ({
        in: [
            { port: 'reset_in', pin: 4, color: 'bg-red-500' },
            { port: 'freq_cv_in', pin: 5, color: 'bg-yellow-400' }
        ],
        out: [{ port: 'cv_out', pin: 10, color: 'bg-yellow-400' }]
    }),
    formatTime: (sec) => {
        const s = Math.max(0.001, Number(sec) || 0.001);
        if (s >= 10.0) {
            return `${s.toFixed(1)}s`;
        }
        if (s >= 1.0) {
            return `${s.toFixed(2)}s`;
        }
        const ms = s * 1000;
        const hz = 1.0 / s;
        const hzStr = hz >= 10 ? Math.round(hz) : hz.toFixed(1);
        if (ms < 10) {
            return `${ms.toFixed(1)}ms (${hzStr}Hz)`;
        }
        return `${Math.round(ms)}ms (${hzStr}Hz)`;
    },
    renderGrid: (m) => {
        const isSync = m.syncMode === 'sync';
        const sp = m.polarity === 'unipolar' ? 'UNI' : 'BI';
        const period = m.period ?? (m.rate ? (1.0 / Math.max(0.001, m.rate)) : 0.5);
        let rateDisp = '';
        if (isSync) {
            rateDisp = m.division || '1/4';
        } else if (period >= 1.0) {
            rateDisp = period >= 10 ? `${Math.round(period)}s` : `${period.toFixed(1)}s`;
        } else {
            rateDisp = `${Math.round(period * 1000)}ms`;
        }
        const subDisp = isSync
            ? `φ:${Math.round(m.phase || 0)}°`
            : (period < 1.0 ? `${(1.0 / period).toFixed(period <= 0.1 ? 0 : 1)}Hz` : `φ:${Math.round(m.phase || 0)}°`);
        return `<div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-indigo-300">
            <span class="text-[8px] font-bold uppercase text-indigo-400">${(m.waveType || 'sin').substring(0,3)} (${sp})</span>
            <span class="text-[13px] font-mono font-bold text-white tracking-tight">${rateDisp}</span>
            <span class="text-[7.5px] font-mono text-indigo-400/80">${subDisp}</span>
        </div>`;
    },
    schema: {
        color: 'indigo',
        header: {
            groups: [
                {
                    key: 'syncMode',
                    reRender: true,
                    options: [
                        { val: 'free', label: 'FREE (Time)' },
                        { val: 'sync', label: 'SYNC (BPM)' }
                    ]
                },
                {
                    key: 'polarity',
                    options: [
                        { val: 'bipolar', label: 'BI (±)' },
                        { val: 'unipolar', label: 'UNI (+)' }
                    ]
                }
            ]
        },
        groups: [
            {
                key: 'waveType',
                label: 'Waveform',
                cols: 5,
                options: [
                    { val: 'sine', label: 'SIN' },
                    { val: 'triangle', label: 'TRI' },
                    { val: 'sawtooth', label: 'SAW' },
                    { val: 'ramp', label: 'RAMP' },
                    { val: 'square', label: 'SQR' }
                ]
            }
        ],
        sliders: (m) => {
            const isSync = m.syncMode === 'sync';
            const divs = LFO.DIVISIONS;
            const rateSlider = isSync ? {
                key: 'division',
                label: 'BEAT',
                min: 0, max: divs.length - 1, step: 1, default: 4,
                unit: 'DIV',
                getVal: (mod) => {
                    const idx = divs.indexOf(mod.division || '1/4');
                    return idx === -1 ? 4 : idx;
                },
                setVal: (mod, v) => {
                    mod.division = divs[Math.round(v)] || '1/4';
                },
                format: (v) => divs[Math.round(v)] || '1/4'
            } : {
                key: 'period',
                label: 'TIME',
                min: 0.01, max: 120.0, step: 0.001, default: 0.5,
                unit: 's',
                power: 3.0,
                getVal: (mod) => {
                    if (mod.period !== undefined) return mod.period;
                    if (mod.rate) return 1.0 / Math.max(0.001, mod.rate);
                    return 0.5;
                },
                setVal: (mod, v) => {
                    const sec = Math.max(0.01, Math.min(120.0, v));
                    mod.period = sec;
                    mod.rate = 1.0 / sec;
                },
                format: (v) => LFO.formatTime(v)
            };
            return [
                rateSlider,
                { key: 'phase', label: 'PHASE', min: 0, max: 360, step: 1, default: 0, unit: 'deg', format: (v) => `${Math.round(v)}°` },
                { key: 'depth', label: 'DEPTH', min: 0, max: 5.0, step: 0.05, default: 1.0, unit: 'cv', format: (v) => Number(v).toFixed(2) },
                { key: 'duty', label: 'DUTY', min: 0.05, max: 0.95, step: 0.01, default: 0.5, unit: '%', format: (v) => `${Math.round(v * 100)}%` }
            ];
        }
    }
};

