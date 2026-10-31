import { UIHelpers } from '../../ui/helpers.js';

export const ARP = {
    color: 'purple',
    defaults: () => ({ type: 'ARP', mode: 'up' }),
    ports: (m, ctx) => ({
        in: [
            { port: 'gate_in', pin: 1, color: 'bg-red-500' },
            { port: 'cv_in4', pin: 2, color: 'bg-yellow-400', dimmed: !ctx?.patched?.has('cv_in4') && !ctx?.patched?.has('in_4') && !ctx?.patched?.has('in4') },
            { port: 'cv_in3', pin: 3, color: 'bg-yellow-400', dimmed: !ctx?.patched?.has('cv_in3') && !ctx?.patched?.has('in_3') && !ctx?.patched?.has('in3') },
            { port: 'cv_in2', pin: 4, color: 'bg-yellow-400', dimmed: !ctx?.patched?.has('cv_in2') && !ctx?.patched?.has('in_2') && !ctx?.patched?.has('in2') },
            { port: 'cv_in1', pin: 5, color: 'bg-yellow-400', dimmed: !ctx?.patched?.has('cv_in1') && !ctx?.patched?.has('in_1') && !ctx?.patched?.has('in1') }
        ],
        out: [
            { port: 'cv_out', pin: 10, color: 'bg-yellow-400' },
            { port: 'gate_out', pin: 11, color: 'bg-red-500' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m, ctx) => {
        const patched = ctx?.patched || new Set();
        return `<div class="flex items-center justify-center w-full h-full pointer-events-none">${UIHelpers.renderPanelBars(
            [1, 2, 3, 4].map(idx => {
                const isP = patched.has(`cv_in${idx}`) || patched.has(`in_${idx}`) || patched.has(`in${idx}`);
                return {
                    pct: isP ? 100 : 0,
                    innerCls: `arp-bar-${idx - 1} ${!isP ? 'opacity-20' : ''}`,
                    outerCls: !isP ? 'opacity-25' : '',
                    attrs: `data-arp-bar="${idx - 1}"`,
                    width: 'w-2',
                    theme: 'cv'
                };
            }),
            { gapCls: 'gap-1.5' }
        )}</div>`;
    },
    renderModal: (m, ctx) => {
        const curMode = m.mode || 'up';
        const patched = ctx?.patched || new Set();
        const activeCount = [1, 2, 3, 4].filter(idx => patched.has(`cv_in${idx}`) || patched.has(`in_${idx}`) || patched.has(`in${idx}`)).length;
        const modes = [
            { val: 'up', label: 'UP' },
            { val: 'down', label: 'DOWN' },
            { val: 'updown', label: 'UP/DOWN' },
            { val: 'random', label: 'RANDOM' }
        ];

        return `
            <div class="space-y-2 p-1">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Active Inputs</span>
                    <span class="text-[8.5px] font-mono font-bold ${activeCount > 0 ? 'text-purple-300' : 'text-slate-500'}">${activeCount} / 4 CONNECTED</span>
                </div>
                <div class="flex items-center justify-around bg-slate-950/80 p-1.5 rounded border border-slate-800">
                    ${[1, 2, 3, 4].map(idx => {
                        const isP = patched.has(`cv_in${idx}`) || patched.has(`in_${idx}`) || patched.has(`in${idx}`);
                        return `
                            <div class="flex flex-col items-center gap-0.5">
                                <span class="text-[6.5px] font-mono text-slate-500">CV ${idx}</span>
                                <span class="px-2 py-0.5 rounded text-[8.5px] font-mono font-bold border ${isP ? 'bg-purple-950 text-purple-300 border-purple-500/60 shadow-sm shadow-purple-500/20' : 'bg-slate-900 text-slate-600 border-slate-800'}">${isP ? 'ON' : 'OFF'}</span>
                            </div>`;
                    }).join('')}
                </div>
                <div>
                    <label class="block text-[8px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Sequence Mode</label>
                    <div class="grid grid-cols-4 gap-1">
                        ${modes.map(md => `
                            <button class="arp-mode-btn py-1 rounded text-[8px] font-bold border transition-all ${curMode === md.val ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="${md.val}">${md.label}</button>
                        `).join('')}
                    </div>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        UIHelpers.bindButtonGroup('.arp-mode-btn', 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50', 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800', val => {
            m.mode = val;
            ctx.reRenderModal();
            cb();
        });
    },
    updateLive: (cell, data, isPlaying, modalEl, m) => {
        if (!data) return;
        const ch = data.activeChannel; // 0..3
        const activeInputs = data.activeInputs || [];
        cell?.querySelectorAll('[data-arp-bar]').forEach((bar, idx) => {
            const isConnected = activeInputs.includes(idx);
            const isAct = (idx === ch) && isConnected && isPlaying;
            bar.classList.toggle('bar-active', isAct);
        });
    }
};

export const arpDefs = {
    ARP
};
