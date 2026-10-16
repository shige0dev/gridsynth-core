export const DELAY = {
    color: 'teal',
    defaults: () => ({ type: 'DELAY', delayTime: 0.3, feedback: 0.4, mix: 0.5 }),
    ports: () => ({
        in: [{ port: 'wave_in', color: 'bg-blue-500' }],
        out: [{ port: 'wave_out', color: 'bg-blue-500' }]
    }),
    schema: {
        color: 'teal',
        sliders: [
            { key: 'delayTime', label: 'TIME', min: 0.02, max: 1.5, step: 0.01, default: 0.3, unit: 's', format: v => v.toFixed(2) + 's' },
            { key: 'feedback', label: 'FEEDBACK', min: 0, max: 0.95, step: 0.01, default: 0.4, unit: 'fb', format: v => v.toFixed(2) },
            { key: 'mix', label: 'MIX', min: 0, max: 1.0, step: 0.02, default: 0.5, unit: 'wet', format: v => v.toFixed(2) }
        ]
    },
    renderGrid: (m) => `<div class="flex flex-col items-center justify-center leading-tight pointer-events-none text-cyan-400"><span class="text-[13px] font-mono font-bold">${Math.round((m.delayTime??0.3)*1000)}ms</span><span class="text-[9px] font-mono">fb:${(m.feedback??0.4).toFixed(2)}</span></div>`
};

export const CVDELAY = {
    color: 'teal',
    defaults: () => ({ type: 'CVDELAY', timeMs: 50, cvDepth: 1.0 }),
    ports: () => ({
        in: [
            { port: 'sig_in', color: 'bg-yellow-400' },
            { port: 'time_cv', color: 'bg-yellow-400' }
        ],
        out: [{ port: 'cv_out', color: 'bg-yellow-400' }]
    }),
    schema: {
        color: 'teal',
        sliders: [
            { key: 'timeMs', label: 'DELAY', min: 0, max: 2000, step: 1, default: 50, unit: 'ms', cvPort: 'time_cv', patchedVal: 50, patchedText: 'EXT CV', format: v => `${Math.round(v)}ms` }
        ]
    },
    renderGrid: (m, ctx) => {
        const isP = ctx?.patched?.has('time_cv');
        return `<div class="flex flex-col items-center justify-center leading-tight pointer-events-none text-teal-300">
            <span class="text-[8px] font-bold uppercase tracking-wider text-slate-400">CV DELAY</span>
            <span class="text-[13px] font-mono font-bold">${isP ? 'EXT' : `${Math.round(m.timeMs ?? 50)}<span class="text-[9px] ml-0.5">ms</span>`}</span>
        </div>`;
    }
};

export const REVERB = {
    color: 'violet',
    defaults: () => ({ type: 'REVERB', time: 1.8, damp: 4500, mix: 0.4, mode: 'hall' }),
    ports: () => ({
        in: [
            { port: 'wave_in', color: 'bg-blue-500' },
            { port: 'cv_in', color: 'bg-yellow-400' }
        ],
        out: [{ port: 'wave_out', color: 'bg-blue-500' }]
    }),
    schema: {
        color: 'violet',
        groups: [{ key: 'mode', label: 'Mode', cols: 3, options: [{ val: 'room', label: 'ROOM' }, { val: 'hall', label: 'HALL' }, { val: 'plate', label: 'PLATE' }] }],
        sliders: [
            { key: 'time', label: 'TIME', min: 0.2, max: 6.0, step: 0.1, default: 1.8, unit: 's', format: v => v.toFixed(1) + 's' },
            { key: 'damp', label: 'DAMP', min: 500, max: 16000, step: 100, default: 4500, unit: 'hz', format: v => (v>=1000?`${(v/1000).toFixed(1)}k`:Math.round(v))+'hz' },
            { key: 'mix', label: 'MIX', min: 0, max: 1.0, step: 0.02, default: 0.4, unit: 'wet', format: v => v.toFixed(2) }
        ]
    },
    renderGrid: (m) => `<div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-cyan-400"><span class="text-[8px] font-bold uppercase">${m.mode||'HALL'}</span><span class="text-[13px] font-mono font-bold">${(m.time??1.8).toFixed(1)}s</span></div>`
};

export const effectsDefs = {
    DELAY,
    CVDELAY,
    REVERB
};

