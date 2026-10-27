import { UIHelpers } from '../../ui/helpers.js';

export const STATE4 = {
    color: 'orange',
    defaults: () => ({ type: 'STATE4', steps: 4, mode: 'up' }),
    ports: (m) => ({
        in: [{ port: 'gate_in', pin: 4, color: 'bg-rose-500' }],
        out: [1, 2, 3, 4].map(idx => ({
            port: `cv_out${idx}`,
            pin: 5 + idx, // PIN 6, 7, 8, 9 along bottom edge
            color: 'bg-yellow-400',
            dimmed: idx > (m.steps ?? 4)
        }))
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const curSteps = m.steps ?? 4;
        return `<div class="flex items-center justify-center w-full h-full pointer-events-none">${UIHelpers.renderPanelBars(
            [1, 2, 3, 4].map(idx => {
                const isDis = idx > curSteps;
                return {
                    pct: isDis ? 0 : 100,
                    innerCls: `state4-bar-${idx - 1} ${isDis ? 'opacity-20' : ''}`,
                    outerCls: isDis ? 'opacity-25' : '',
                    attrs: `data-state4-bar="${idx - 1}"`,
                    width: 'w-2',
                    color: 'bg-gradient-to-t from-amber-600 to-yellow-400'
                };
            }),
            { gapCls: 'gap-1.5' }
        )}</div>`;
    },
    renderModal: (m, ctx) => {
        const curSteps = m.steps ?? 4;
        const curMode = m.mode || 'up';
        const modes = [
            { val: 'up', label: 'UP' },
            { val: 'down', label: 'DOWN' },
            { val: 'updown', label: 'UP/DOWN' },
            { val: 'random', label: 'RANDOM' }
        ];

        return `
            <div class="space-y-2 p-1">
                <div>
                    <label class="block text-[8px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Active Steps (2-4)</label>
                    <div class="grid grid-cols-3 gap-1">
                        ${[2, 3, 4].map(st => `
                            <button class="state4-steps-btn py-1 rounded text-[8.5px] font-bold border transition-all ${curSteps === st ? 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="${st}">${st} STEPS</button>
                        `).join('')}
                    </div>
                </div>
                <div>
                    <label class="block text-[8px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Direction Mode</label>
                    <div class="grid grid-cols-4 gap-1">
                        ${modes.map(md => `
                            <button class="state4-mode-btn py-1 rounded text-[8px] font-bold border transition-all ${curMode === md.val ? 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="${md.val}">${md.label}</button>
                        `).join('')}
                    </div>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        UIHelpers.bindButtonGroup('.state4-steps-btn', 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/50', 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800', val => {
            m.steps = parseInt(val, 10);
            ctx.reRenderModal();
            cb();
        });
        UIHelpers.bindButtonGroup('.state4-mode-btn', 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/50', 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800', val => {
            m.mode = val;
            ctx.reRenderModal();
            cb();
        });
    },
    updateLive: (cell, data, isPlaying, modalEl, m) => {
        if (!data || data.step === undefined) return;
        const cur = data.step;
        const curSteps = m.steps ?? 4;
        cell?.querySelectorAll('[data-state4-bar]').forEach((bar, idx) => {
            const isDis = (idx + 1) > curSteps;
            const isAct = (idx === cur) && !isDis && isPlaying;
            bar.classList.toggle('bar-active', isAct);
        });
    }
};

export const state4Defs = {
    STATE4
};

