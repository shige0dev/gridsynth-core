import { UIHelpers } from '../../ui/helpers.js?v=354';

export const PASS = {
    color: 'slate',
    defaults: () => ({ type: 'PASS', count: 8 }),
    onNormalize: (m) => {
        m.count = Math.max(1, Math.min(64, Math.round(m.count ?? 8)));
    },
    ports: () => ({
        in: [
            { port: 'in', pin: 3, alias: 'clk_in,gate_in', color: 'bg-rose-500' },
            { port: 'trig_in', pin: 4, alias: 'fire_in,trans_in', color: 'bg-slate-400' },
            { port: 'reset_in', pin: 2, alias: 'close_in', color: 'bg-amber-400' }
        ],
        out: [
            { port: 'eos_out', pin: 9, alias: 'trans_out,transition_out,done_out', color: 'bg-slate-400' },
            { port: 'out', pin: 10, color: 'bg-rose-500' },
            { port: 'gate_out', pin: 11, color: 'bg-orange-500' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const c = m.count ?? 8;
        return `
            <div class="relative flex flex-col items-center justify-center w-full h-full pointer-events-none select-none">
                <div class="pass-count-box w-10 h-10 rounded-md border border-slate-700 bg-slate-950/70 flex flex-col items-center justify-center leading-none transition-all duration-75">
                    <span class="pass-count-num font-mono font-black text-[15px] text-slate-300 leading-none">${c}</span>
                    <span class="pass-sub-label font-mono text-[7px] text-slate-500 font-bold uppercase mt-0.5 tracking-tight">THRU</span>
                </div>
            </div>`;
    },
    updateLive: (cell, data, isP, modal, m) => {
        const isOpen = data?.isOpen ?? false;
        const cur = data?.count ?? 0;
        const box = cell.querySelector('.pass-count-box');
        const num = cell.querySelector('.pass-count-num');
        const sub = cell.querySelector('.pass-sub-label');

        if (box && num) {
            if (isOpen && isP) {
                box.classList.remove('border-slate-700', 'bg-slate-950/70');
                box.classList.add('border-cyan-400', 'bg-cyan-950/60', 'shadow-[0_0_12px_rgba(6,182,212,0.6)]', 'ring-1', 'ring-cyan-400/80');
                num.textContent = cur;
                num.classList.remove('text-slate-300');
                num.classList.add('text-cyan-200');
                if (sub) {
                    sub.textContent = 'PASS';
                    sub.classList.remove('text-slate-500');
                    sub.classList.add('text-cyan-400');
                }
            } else {
                box.classList.remove('border-cyan-400', 'bg-cyan-950/60', 'shadow-[0_0_12px_rgba(6,182,212,0.6)]', 'ring-1', 'ring-cyan-400/80');
                box.classList.add('border-slate-700', 'bg-slate-950/70');
                num.textContent = m.count ?? 8;
                num.classList.remove('text-cyan-200');
                num.classList.add('text-slate-300');
                if (sub) {
                    sub.textContent = 'THRU';
                    sub.classList.remove('text-cyan-400');
                    sub.classList.add('text-slate-500');
                }
            }
        }
    },
    renderModal: (m) => {
        const curCount = m.count ?? 8;
        const presets = [1, 2, 4, 8, 12, 16, 24, 32, 64];
        return `
            <div class="space-y-2">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] text-slate-400 uppercase font-semibold">PASS (COUNT THRU)</span>
                    <button id="pass-fire-btn" class="h-4 px-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[7.5px] font-bold cursor-pointer transition shadow-sm shadow-cyan-600/30 flex items-center gap-0.5">
                        <i data-lucide="play" class="w-2.5 h-2.5 pointer-events-none fill-current"></i>
                        <span>FIRE</span>
                    </button>
                </div>

                <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                        <span class="text-[8px] text-slate-400 uppercase font-bold">THRU COUNT</span>
                        <span id="pass-count-disp" class="text-[11px] font-mono font-bold text-cyan-300">${curCount} CLKS</span>
                    </div>

                    <input type="range" id="pass-count-slider" min="1" max="64" step="1" value="${curCount}" class="w-full accent-cyan-500 cursor-pointer">

                    <div class="flex flex-wrap gap-1 pt-1 border-t border-slate-800/80">
                        ${presets.map(p => `
                            <button data-pass-val="${p}" class="pass-preset-btn flex-1 min-w-[28px] h-5 rounded text-[8px] font-bold border transition-colors ${curCount === p ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm shadow-cyan-600/40' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'}">
                                ${p}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const slider = document.getElementById('pass-count-slider');
        const disp = document.getElementById('pass-count-disp');
        const fireBtn = document.getElementById('pass-fire-btn');

        if (slider && disp) {
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10) || 1;
                m.count = val;
                disp.textContent = `${val} CLKS`;
                document.querySelectorAll('.pass-preset-btn').forEach(btn => {
                    const bVal = parseInt(btn.dataset.passVal, 10);
                    btn.classList.toggle('bg-cyan-600', bVal === val);
                    btn.classList.toggle('text-white', bVal === val);
                    btn.classList.toggle('border-cyan-400', bVal === val);
                    btn.classList.toggle('bg-slate-900', bVal !== val);
                    btn.classList.toggle('text-slate-400', bVal !== val);
                    btn.classList.toggle('border-slate-800', bVal !== val);
                });
                cb();
            });
        }

        document.querySelectorAll('.pass-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.dataset.passVal, 10);
                if (val) {
                    m.count = val;
                    if (slider) slider.value = val;
                    if (disp) disp.textContent = `${val} CLKS`;
                    ctx.reRenderModal();
                    cb();
                }
            });
        });

        if (fireBtn) {
            fireBtn.addEventListener('click', () => {
                ctx.synth.sendControlEvent(m.id, { type: 'FIRE' });
                ctx.showToast?.(`PASS: ${m.count} CLKS 開門 ⚡`);
            });
        }
    }
};

export const passDefs = {
    PASS
};
