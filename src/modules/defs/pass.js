import { UIHelpers } from '../../ui/helpers.js?v=354';

export const COUNT = {
    color: 'slate',
    defaults: () => ({ type: 'COUNT', count: 8 }),
    onNormalize: (m) => {
        m.count = Math.max(1, Math.min(64, Math.round(m.count ?? 8)));
    },
    ports: () => ({
        in: [
            { port: 'gate_in', pin: 3, color: 'bg-red-500' },
            { port: 'trans_in', pin: 4, color: 'bg-slate-400' }
        ],
        out: [
            { port: 'trans_out', pin: 9, color: 'bg-slate-400' },
            { port: 'gate_out', pin: 10, color: 'bg-red-500' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const c = m.count ?? 8;
        return `
            <div class="relative flex items-center justify-center w-full h-full pointer-events-none select-none">
                <div class="pass-count-box w-9 h-9 rounded-md border border-slate-700/80 bg-transparent flex items-center justify-center leading-none select-none transition-all duration-75 text-slate-300 font-bold">
                    <span class="pass-count-num font-mono text-[13px] leading-none">${c}</span>
                </div>
            </div>`;
    },
    updateLive: (cell, data, isP, modal, m) => {
        const isOpen = data?.isOpen ?? false;
        const cur = data?.count ?? 0;
        const box = cell.querySelector('.pass-count-box');
        const num = cell.querySelector('.pass-count-num');

        if (box && num) {
            const activeCls = 'bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-300 border-[#fde047] text-slate-950 scale-105 shadow-[0_0_10px_2px_rgba(251,191,36,0.95),0_0_20px_4px_rgba(245,158,11,0.7),inset_0_0_6px_rgba(253,224,71,0.6)] ring-1 ring-yellow-200/90 font-black';
            const idleCls = 'bg-transparent border-slate-700/80 text-slate-300 shadow-none ring-0 font-bold scale-100';

            if (isOpen && isP) {
                box.className = `pass-count-box w-9 h-9 rounded-md border flex items-center justify-center leading-none select-none transition-all duration-75 ${activeCls}`;
                num.textContent = cur;
                num.className = 'pass-count-num font-mono text-[13px] leading-none text-slate-950 font-black';
            } else {
                box.className = `pass-count-box w-9 h-9 rounded-md border flex items-center justify-center leading-none select-none transition-all duration-75 ${idleCls}`;
                num.textContent = m.count ?? 8;
                num.className = 'pass-count-num font-mono text-[13px] leading-none text-slate-300 font-bold';
            }
        }
    },
    renderModal: (m) => {
        const curCount = m.count ?? 8;
        return `
            <div class="space-y-2">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] text-slate-400 uppercase font-semibold">COUNT (CLOCK THRU)</span>
                    <span id="pass-count-disp" class="text-[11px] font-mono font-bold text-amber-300">${curCount} CLKS</span>
                </div>

                <div class="space-y-1.5 pt-0.5">
                    <input type="range" id="pass-count-slider" min="1" max="64" step="1" value="${curCount}" class="w-full accent-amber-500 cursor-pointer">
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const slider = document.getElementById('pass-count-slider');
        const disp = document.getElementById('pass-count-disp');

        if (slider && disp) {
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10) || 1;
                m.count = val;
                disp.textContent = `${val} CLKS`;
                cb();
            });
        }
    }
};

export const passDefs = {
    COUNT
};
