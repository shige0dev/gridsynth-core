import { UIHelpers } from '../../ui/helpers.js?v=187';

export const VCA = {
    color: 'emerald',
    defaults: () => ({ type: 'VCA', level: 1.0, cvDepth: 1.0 }),
    ports: () => ({
        in: [
            { port: 'wave_in', color: 'bg-blue-500' },
            { port: 'cv_in', color: 'bg-yellow-400' }
        ],
        out: [{ port: 'wave_out', color: 'bg-blue-500' }]
    }),
    schema: {
        color: 'emerald',
        sliders: [
            { key: 'level', label: 'LEVEL', min: 0, max: 1.0, step: 0.01, default: 1.0, unit: 'BIAS', cvPort: 'cv_in', patchedVal: 0, patchedText: 'EXT', format: v => v.toFixed(2) },
            { key: 'cvDepth', label: 'CV MOD', min: 0, max: 2.0, step: 0.05, default: 1.0, unit: 'xDEPTH', color: 'amber', requirePort: 'cv_in', format: v => v.toFixed(2) }
        ]
    },
    renderGrid: (m, ctx) => {
        const isExt = Boolean(ctx?.patched?.has('cv_in'));
        const depth = Number((m.cvDepth ?? 1.0).toFixed(2));
        const dispText = isExt ? `x${depth}` : `${Math.round((m.level ?? 1.0) * 100)}%`;
        const textCls = isExt ? 'text-amber-300' : 'text-emerald-400';
        return `<div class="flex items-center justify-center w-full h-full pointer-events-none">
            <span class="vca-disp-val text-[14px] font-mono font-bold tracking-tight ${textCls}">${dispText}</span>
        </div>`;
    },
    updateLive: (cell, data, isP, modal, m) => {
        const d = cell.querySelector('.vca-disp-val');
        if (d && m) {
            const isExt = Boolean(data?.hasCvIn);
            const depth = Number((m.cvDepth ?? 1.0).toFixed(2));
            const dispText = isExt ? `x${depth}` : `${Math.round((m.level ?? 1.0) * 100)}%`;
            if (d.textContent !== dispText) {
                d.textContent = dispText;
                d.className = `vca-disp-val text-[14px] font-mono font-bold tracking-tight ${isExt ? 'text-amber-300' : 'text-emerald-400'}`;
            }
        }
    }
};

export const MIX = {
    color: 'blue',
    defaults: () => ({ type: 'MIX', channels: 2, lvl1: 1.0, lvl2: 1.0, lvl3: 1.0, lvl4: 1.0 }),
    ports: (m) => ({
        in: Array.from({ length: m.channels || 2 }, (_, i) => ({ port: `wave_in${i+1}`, pin: 4 + i, color: 'bg-blue-500' })),
        out: [{ port: 'wave_out', pin: 9, color: 'bg-blue-500' }]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => `<div class="flex items-center justify-center w-full h-full pointer-events-none"><div class="mix-bars-wrap flex items-center justify-center px-1.5 py-1 rounded border border-transparent transition-all duration-150">${UIHelpers.renderPanelBars(
        Array.from({ length: m.channels || 2 }, (_, i) => ({
            pct: Math.round((m[`lvl${i + 1}`] ?? 1) * 100),
            width: 'w-2'
        })),
        { gapCls: 'gap-1.5', theme: 'cv' }
    )}</div></div>`,
    updateLive: (cell, data) => {
        const port = cell.querySelector('[data-port="wave_out"]');
        if (!port) return;
        const isClipping = !!data?.isClipping;
        if (port._isClipping !== isClipping) {
            port._isClipping = isClipping;
            port.classList.toggle('port-clipping', isClipping);
        }
    },
    schema: {
        color: 'blue',
        header: {
            channel: { label: 'CHANNELS', min: 2, max: 4, portPrefix: 'wave_in' }
        },
        sliders: (m) => {
            const ch = Math.min(4, Math.max(2, m.channels || 2));
            return Array.from({ length: ch }, (_, i) => ({
                key: `lvl${i + 1}`,
                label: `CH${i + 1}`,
                min: 0, max: 1.0, step: 0.01, default: 1.0,
                unit: 'lvl',
                requirePort: `wave_in${i + 1}`,
                format: v => v.toFixed(2)
            }));
        }
    }
};

export const SLIDER = {
    color: 'emerald',
    defaults: () => ({ type: 'SLIDER', vol: 0.70 }),
    ports: () => ({ in: [], out: [{ port: 'cv_out', color: 'bg-yellow-400' }] }),
    schema: { color: 'emerald', sliders: [{ key: 'vol', label: 'VAL', min: 0, max: 1.0, step: 0.01, default: 0.70, unit: 'out', format: v => v.toFixed(2) }] },
    renderGrid: (m) => `<div class="flex items-center justify-center w-full h-full pointer-events-none">${UIHelpers.renderPanelBars([
        {
            pct: Math.round((m.vol ?? 0.7) * 100),
            width: 'w-3.5'
        }
    ], { theme: 'cv' })}</div>`
};

export const ampDefs = {
    VCA,
    MIX,
    SLIDER
};

