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

const MIX_HEADER_SCHEMA = {
    color: 'blue',
    header: {
        channel: { label: 'CHANNELS', min: 2, max: 4, portPrefix: 'wave_in' }
    }
};

export const MIX = {
    color: 'blue',
    defaults: () => ({
        type: 'MIX',
        channels: 2,
        lvl1: 1.0, lvl2: 1.0, lvl3: 1.0, lvl4: 1.0,
        mute1: false, mute2: false, mute3: false, mute4: false
    }),
    ports: (m) => ({
        in: Array.from({ length: m.channels || 2 }, (_, i) => ({ port: `wave_in${i+1}`, pin: 5 + i, color: 'bg-blue-500' })),
        out: [{ port: 'wave_out', pin: 10, color: 'bg-blue-500' }]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => `<div class="flex items-center justify-center w-full h-full pointer-events-none"><div class="mix-bars-wrap flex items-center justify-center px-1.5 py-1 rounded border border-transparent transition-all duration-150">${UIHelpers.renderPanelBars(
        Array.from({ length: m.channels || 2 }, (_, i) => {
            const isMuted = Boolean(m[`mute${i + 1}`]);
            return {
                pct: isMuted ? 4 : Math.round((m[`lvl${i + 1}`] ?? 1) * 100),
                color: isMuted ? 'bg-slate-700/60' : undefined,
                width: 'w-2'
            };
        }),
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
    renderModal: (m, ctx) => {
        const chCount = Math.min(4, Math.max(2, m.channels || 2));
        const headerHtml = UIHelpers.renderSchemaModal(m, ctx, MIX_HEADER_SCHEMA);
        const colsHtml = Array.from({ length: chCount }, (_, i) => {
            const ch = i + 1;
            const val = m[`lvl${ch}`] ?? 1.0;
            const isMuted = Boolean(m[`mute${ch}`]);
            const isPatched = ctx?.patched ? !ctx.patched.has(`wave_in${ch}`) : false;
            return `
                <div class="flex flex-col items-center flex-1 min-w-0 gap-1">
                    <div class="w-full flex flex-col items-center ${isMuted ? 'opacity-40 grayscale' : ''}">
                        ${UIHelpers.createVSliderHTML(`mix-lvl-${ch}`, `CH${ch}`, 0, 1.0, 0.01, val, 'lvl', 'blue', isPatched, val.toFixed(2))}
                    </div>
                    <button type="button" data-mix-mute="${ch}" class="w-full text-[6.5px] leading-none font-bold py-[1px] rounded border transition-colors shrink-0 ${isMuted ? 'bg-rose-950 text-rose-300 border-rose-500/80' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-600'}" title="CH${ch} MUTE">MUTE</button>
                </div>`;
        }).join('');
        return `${headerHtml}<div class="flex items-stretch justify-around py-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1 mt-1">${colsHtml}</div>`;
    },
    bindEvents: (m, ctx, cb) => {
        UIHelpers.bindSchemaEvents(m, ctx, MIX_HEADER_SCHEMA, cb);
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;
        const chCount = Math.min(4, Math.max(2, m.channels || 2));
        for (let ch = 1; ch <= chCount; ch++) {
            const isUnpatched = ctx?.patched ? !ctx.patched.has(`wave_in${ch}`) : false;
            if (!isUnpatched) {
                UIHelpers.bindSlider(`mix-lvl-${ch}`, v => Number(v).toFixed(2), val => {
                    m[`lvl${ch}`] = val;
                    cb();
                }, 1, 0, 1.0, root);
            }
            root.querySelector(`[data-mix-mute="${ch}"]`)?.addEventListener('click', () => {
                m[`mute${ch}`] = !m[`mute${ch}`];
                cb();
                ctx?.reRenderModal?.();
            });
        }
    }
};

export const ampDefs = {
    VCA,
    MIX
};

