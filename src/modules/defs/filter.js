import { UIHelpers } from '../../ui/helpers.js?v=297';

const VCF_C1_FREQ = 440 * Math.pow(2, (24 - 69) / 12); // 0.0V = C1 (MIDI 24 ≈ 32.70Hz)
const hzToOctV = (hz) => Math.log2(Math.max(10, hz) / VCF_C1_FREQ);
const octVToHz = (v) => VCF_C1_FREQ * Math.pow(2, v);

export const VCF = {
    color: 'emerald',
    defaults: () => ({ type: 'VCF', filterType: 'lowpass', cutoff: 1800, q: 2.5, modDepth: 1200 }),
    ports: () => ({
        in: [
            { port: 'wave_in', color: 'bg-blue-500' },
            { port: 'cv_in', color: 'bg-yellow-400' }
        ],
        out: [{ port: 'wave_out', color: 'bg-blue-500' }]
    }),
    schema: {
        color: 'emerald',
        header: {
            groups: [
                {
                    key: 'filterType',
                    options: [{ val: 'lowpass', label: 'LP' }, { val: 'highpass', label: 'HP' }, { val: 'bandpass', label: 'BP' }, { val: 'notch', label: 'NOTCH' }]
                }
            ]
        },
        sliders: [
            {
                key: 'cutoff', label: 'CUTOFF', min: 0, max: 9.25, step: 0.01, default: 5.78,
                unit: 'OCT/V', color: 'emerald',
                getVal: (mod) => Math.max(0, hzToOctV(mod.cutoff ?? 1800)),
                setVal: (mod, v) => { mod.cutoff = Math.round(octVToHz(v) * 10) / 10; },
                format: (v) => `${v.toFixed(2)}V`
            },
            { key: 'q', label: 'RESO', min: 0.1, max: 20, step: 0.1, default: 2.5, color: 'cyan', format: (v) => v.toFixed(1) },
            {
                key: 'modDepth', label: 'MOD DEPTH', min: -4, max: 4, step: 0.05, default: 1,
                unit: 'OCT/V', color: 'yellow',
                getVal: (mod) => (mod.modDepth !== undefined ? mod.modDepth : 1200) / 1200,
                setVal: (mod, v) => { mod.modDepth = Math.round(v * 1200); },
                format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`
            }
        ]
    },
    renderGrid: (m) => {
        const hz = m.cutoff ?? 1800;
        const v = hzToOctV(hz);
        const typeMap = { lowpass: 'LP', highpass: 'HP', bandpass: 'BP', notch: 'NOTCH' };
        const typeLabel = typeMap[(m.filterType || 'lowpass').toLowerCase()] || 'LP';
        return `<div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-cyan-400">
            <span class="text-[8.5px] font-bold uppercase">${typeLabel}</span>
            <span class="text-[12.5px] font-mono font-bold tracking-tight">${v.toFixed(2)}<span class="text-[8.5px] ml-0.5">V</span></span>
            <span class="text-[7.5px] font-mono text-slate-400">${Math.round(hz)}Hz</span>
        </div>`;
    }
};

export const FOLD = {
    color: 'amber',
    defaults: () => ({ type: 'FOLD', gain: 1.5, mix: 1.0, shape: 'fold' }),
    ports: () => ({
        in: [
            { port: 'wave_in', pin: 5, color: 'bg-blue-500' },
            { port: 'gain_cv', pin: 6, color: 'bg-yellow-400' }
        ],
        out: [
            { port: 'wave_out', pin: 10, color: 'bg-blue-500' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const gainVal = (m.gain !== undefined ? m.gain : (m.fold ?? 1.5)).toFixed(1);
        const mixVal = Math.round((m.mix ?? 1.0) * 100);
        return `<div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-amber-400 select-none">
            <span class="text-[9px] font-bold uppercase tracking-wider">W-FOLD</span>
            <span class="text-[12px] font-mono font-bold">${gainVal}x</span>
            <span class="text-[8px] font-mono text-slate-400">MIX:${mixVal}%</span>
        </div>`;
    },
    schema: {
        color: 'amber',
        sliders: () => [
            { key: 'gain', label: 'GAIN', min: 0.0, max: 8.0, step: 0.05, default: 1.5, unit: 'x', color: 'amber', format: v => v.toFixed(2) + 'x' },
            { key: 'mix', label: 'MIX', min: 0.0, max: 1.0, step: 0.01, default: 1.0, unit: '%', color: 'cyan', format: v => `${Math.round(v * 100)}%` }
        ]
    }
};

export const filterDefs = {
    VCF,
    FOLD
};
