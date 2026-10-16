import { UIHelpers } from '../../ui/helpers.js';

export const VCF = {
    color: 'indigo',
    defaults: () => ({ type: 'VCF', cutoff: 1800, q: 2.5, filterType: 'lowpass', modDepth: 1200 }),
    ports: () => ({
        in: [
            { port: 'wave_in', color: 'bg-blue-500' },
            { port: 'cv_in', color: 'bg-yellow-400' }
        ],
        out: [{ port: 'wave_out', color: 'bg-blue-500' }]
    }),
    schema: {
        color: 'indigo',
        groups: [{ key: 'filterType', label: 'Mode', cols: 2, options: [{ val: 'lowpass', label: 'LP' }, { val: 'highpass', label: 'HP' }, { val: 'bandpass', label: 'BP' }, { val: 'notch', label: 'NOTCH' }] }],
        sliders: [
            { key: 'cutoff', label: 'CUTOFF', min: 30, max: 12000, step: 10, default: 1800, unit: 'hz', format: v => Math.round(v) + 'hz' },
            { key: 'q', label: 'RES (Q)', min: 0.1, max: 18, step: 0.1, default: 2.5, unit: 'q', format: v => v.toFixed(1) },
            { key: 'modDepth', label: 'CV MOD', min: 0, max: 3600, step: 50, default: 1200, unit: 'depth', color: 'amber', cvPort: 'cv_in', patchedVal: 0, patchedText: 'EXT', format: v => Math.round(v) }
        ]
    },
    renderGrid: (m) => `<div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-cyan-400"><span class="text-[9px] font-bold uppercase">${m.filterType?.toUpperCase() || 'LP'}</span><span class="text-[13px] font-mono font-bold tracking-tight">${Math.round(m.cutoff || 1800)}<span class="text-[9px] ml-0.5">hz</span></span></div>`
};

export const FOLD = {
    color: 'sky',
    defaults: () => ({ type: 'FOLD', channels: 1, wave: 'sine', fold: 1.5, bias: 0.0, freq1: 220, freq2: 220, freq3: 220, freq4: 220 }),
    ports: (m) => ({
        in: [...UIHelpers.getMultiPitchInPorts(m), { port: 'fold_cv', color: 'bg-yellow-400' }],
        out: [{ port: 'wave_out', color: 'bg-blue-500' }]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports, { fold_cv: 5 }),
    renderGrid: (m, ctx) => {
        const isFoldPatched = ctx?.patched?.has('fold_cv');
        const ch = Math.min(4, Math.max(1, m.channels || 1));
        const f1 = m.freq1 || 220;
        return `<div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-cyan-400">
            <span class="text-[8px] font-bold uppercase">${m.wave || 'SIN'} (${ch}T)</span>
            <span class="text-[12px] font-mono font-bold">${Math.round(f1)}hz</span>
            <span class="text-[8px] font-mono">${isFoldPatched ? 'EXT' : 'F:' + (m.fold||0).toFixed(1)}</span>
        </div>`;
    },
    schema: {
        color: 'sky',
        header: {
            channel: { label: 'TIMBRES', max: 4 },
            groups: [
                {
                    key: 'wave',
                    options: [{ val: 'sine', label: 'SIN' }, { val: 'triangle', label: 'TRI' }]
                }
            ]
        },
        sliders: (m) => {
            const ch = Math.min(4, Math.max(1, m.channels || 1));
            const pitchSliders = Array.from({ length: ch }, (_, i) => {
                const c = i + 1;
                const portName = c === 1 ? 'cv_in' : `cv_in${c}`;
                return {
                    key: `freq${c}`,
                    label: `OSC${c}`,
                    min: 40, max: 2000, step: 5, default: 220,
                    unit: 'hz',
                    cvPort: portName,
                    patchedText: '1V/OCT',
                    format: (v) => `${Math.round(v)}hz`
                };
            });
            return [
                ...pitchSliders,
                { key: 'fold', label: 'FOLD', min: 0, max: 5.0, step: 0.05, default: 1.5, unit: 'drv', color: 'amber', cvPort: 'fold_cv', patchedText: 'EXT', format: v => v.toFixed(2) },
                { key: 'bias', label: 'BIAS', min: -1.0, max: 1.0, step: 0.02, default: 0.0, unit: 'dc', color: 'purple', format: v => v.toFixed(2) }
            ];
        }
    }
};

export const filterDefs = {
    VCF,
    FOLD
};
