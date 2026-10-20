import { UIHelpers } from '../../ui/helpers.js?v=279';

export const VCF = {
    color: 'emerald',
    defaults: () => ({ type: 'VCF', filterType: 'lowpass', cutoff: 1800, q: 2.5, modDepth: 1200 }),
    ports: () => ({
        in: [
            { port: 'wave_in', color: 'bg-emerald-500' },
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
            { key: 'cutoff', label: 'CUTOFF', min: 20, max: 20000, step: 10, default: 1800, unit: 'hz', color: 'emerald', cvPort: 'cv_in', format: (v) => `${Math.round(v)}hz` },
            { key: 'q', label: 'RESO', min: 0.1, max: 20, step: 0.1, default: 2.5, color: 'cyan', format: (v) => v.toFixed(1) },
            { key: 'modDepth', label: 'MOD DEPTH', min: -5000, max: 5000, step: 50, default: 1200, unit: 'cents', color: 'yellow', format: (v) => `${Math.round(v)}c` }
        ]
    },
    renderGrid: (m) => `<div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-cyan-400"><span class="text-[9px] font-bold uppercase">${m.filterType?.toUpperCase() || 'LP'}</span><span class="text-[13px] font-mono font-bold tracking-tight">${Math.round(m.cutoff || 1800)}<span class="text-[9px] ml-0.5">hz</span></span></div>`
};

export const FOLD = {
    color: 'amber',
    defaults: () => ({ type: 'FOLD', fold: 1.5, bias: 0.0, mix: 1.0, shape: 'fold' }),
    ports: () => ({
        in: [
            { port: 'wave_in', color: 'bg-emerald-500' },
            { port: 'fold_cv', color: 'bg-yellow-400' }
        ],
        out: [
            { port: 'wave_out', color: 'bg-cyan-500' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports, { wave_in: 0, fold_cv: 1 }),
    renderGrid: (m, ctx) => {
        const isFoldPatched = ctx?.patched?.has('fold_cv');
        const foldVal = (m.fold ?? 1.5).toFixed(1);
        const biasVal = (m.bias ?? 0.0).toFixed(1);
        const mixVal = Math.round((m.mix ?? 1.0) * 100);
        return `<div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-amber-400 select-none">
            <span class="text-[9px] font-bold uppercase tracking-wider">W-FOLD</span>
            <span class="text-[12px] font-mono font-bold">${isFoldPatched ? 'EXT' : foldVal + 'x'}</span>
            <span class="text-[8px] font-mono text-slate-400">B:${biasVal} M:${mixVal}%</span>
        </div>`;
    },
    schema: {
        color: 'amber',
        sliders: () => [
            { key: 'fold', label: 'FOLD', min: 0.0, max: 5.0, step: 0.05, default: 1.5, unit: 'drv', color: 'amber', cvPort: 'fold_cv', patchedText: 'EXT', format: v => v.toFixed(2) },
            { key: 'bias', label: 'BIAS', min: -1.0, max: 1.0, step: 0.02, default: 0.0, unit: 'dc', color: 'purple', format: v => v.toFixed(2) },
            { key: 'mix', label: 'MIX', min: 0.0, max: 1.0, step: 0.01, default: 1.0, unit: '%', color: 'cyan', format: v => `${Math.round(v * 100)}%` }
        ]
    }
};

export const filterDefs = {
    VCF,
    FOLD
};