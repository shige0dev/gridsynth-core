import { UIHelpers } from '../../ui/helpers.js?v=351';

export const COUNT = {
    color: 'emerald',
    defaults: () => ({
        type: 'COUNT',
        max: 256,         // 16, 32, 64, 256
        format: 'HEX',    // 'HEX' or 'DEC'
        name: 'COUNT'
    }),
    ports: () => ({
        in: [
            { port: 'clk_in', pin: 5, color: 'bg-red-500' },
            { port: 'reset_in', pin: 4, color: 'bg-red-500' }
        ],
        out: [
            { port: 'cv_out', pin: 10, color: 'bg-yellow-400' },
            { port: 'carry_out', pin: 11, color: 'bg-red-500' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),

    renderGrid: (m) => {
        const curMax = m.max || 256;
        const curFmt = m.format || 'HEX';
        return `
            <div class="h-full flex flex-col justify-between py-1 select-none pointer-events-none">
                <div class="flex items-center justify-between px-1.5 pt-0.5">
                    <span class="text-[7px] font-mono text-emerald-400/80 font-bold tracking-tight">MAX:${curMax}</span>
                    <span class="text-[6.5px] font-mono text-slate-400 font-bold">${curFmt}</span>
                </div>
                <div class="flex flex-col items-center justify-center my-auto">
                    <div id="count-val-${m.id}" class="text-[17px] font-mono font-black text-emerald-300 tracking-wider leading-none drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">
                        ${curFmt === 'HEX' ? '00' : '0'}
                    </div>
                </div>
                <div class="flex items-center justify-between px-1.5 pb-0.5 text-[6.5px] font-mono text-slate-500">
                    <span>CLK</span>
                    <span>CARRY</span>
                </div>
            </div>
        `;
    },

    updateLive: (cell, data, isPlaying, modalEl, m) => {
        const curCount = data?.count ?? 0;
        const curMax = data?.max ?? (m.max || 256);
        const curFmt = m.format || 'HEX';

        let displayStr;
        if (curFmt === 'HEX') {
            displayStr = curCount.toString(16).toUpperCase().padStart(2, '0');
        } else {
            displayStr = curCount.toString(10);
        }

        const countEl = cell?.querySelector(`#count-val-${m.id}`) || document.getElementById(`count-val-${m.id}`);
        if (countEl && countEl.textContent.trim() !== displayStr) {
            countEl.textContent = displayStr;
        }

        if (modalEl) {
            const modalCountEl = modalEl.querySelector('#count-modal-val') || document.getElementById('count-modal-val');
            if (modalCountEl && modalCountEl.textContent.trim() !== displayStr) {
                modalCountEl.textContent = displayStr;
            }
            const modalCvEl = modalEl.querySelector('#count-modal-cv') || document.getElementById('count-modal-cv');
            if (modalCvEl) {
                const cvPercent = curMax > 0 ? ((curCount / curMax) * 100).toFixed(1) : '0.0';
                modalCvEl.textContent = `${(curCount / curMax).toFixed(3)}V (${cvPercent}%)`;
            }
        }
    },

    renderModal: (m) => {
        const curMax = m.max || 256;
        const curFmt = m.format || 'HEX';
        const maxOptions = [16, 32, 64, 256];
        const fmtOptions = ['HEX', 'DEC'];

        return `
            <div class="space-y-3 p-1">
                <!-- Monitor Box -->
                <div class="bg-slate-950/80 rounded-lg p-2.5 border border-emerald-500/30 text-center shadow-inner">
                    <div class="text-[7.5px] font-mono text-slate-400 uppercase tracking-widest mb-0.5">CURRENT COUNT</div>
                    <div id="count-modal-val" class="text-3xl font-mono font-black text-emerald-400 tracking-wider">
                        ${curFmt === 'HEX' ? '00' : '0'}
                    </div>
                    <div class="flex items-center justify-between mt-1 pt-1 border-t border-slate-800 text-[8px] font-mono text-slate-400">
                        <span>CV OUT:</span>
                        <span id="count-modal-cv" class="text-amber-400 font-bold">0.000V (0.0%)</span>
                    </div>
                </div>

                <!-- MAX SELECTOR -->
                <div>
                    <div class="text-[8px] font-mono text-slate-400 font-bold uppercase mb-1">MAX COUNT (OVERFLOW)</div>
                    <div class="grid grid-cols-4 gap-1">
                        ${maxOptions.map(opt => `
                            <button class="count-max-btn py-1 rounded text-[9px] font-mono font-bold border transition-colors ${curMax === opt ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/30' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}" data-max="${opt}">
                                ${opt}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- DISPLAY FORMAT -->
                <div>
                    <div class="text-[8px] font-mono text-slate-400 font-bold uppercase mb-1">DISPLAY FORMAT</div>
                    <div class="grid grid-cols-2 gap-1">
                        ${fmtOptions.map(opt => `
                            <button class="count-fmt-btn py-1 rounded text-[9px] font-mono font-bold border transition-colors ${curFmt === opt ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/30' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}" data-fmt="${opt}">
                                ${opt}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- RESET ACTION -->
                <div class="pt-1">
                    <button id="count-reset-btn" class="w-full py-1.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 font-mono font-bold text-[9px] tracking-wider transition-colors active:scale-95 flex items-center justify-center gap-1 shadow-sm">
                        <span>↺ RESET TO 0</span>
                    </button>
                </div>
            </div>
        `;
    },

    bindEvents: (m, ctx, cb) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;

        root.querySelectorAll('.count-max-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newMax = parseInt(e.currentTarget.dataset.max, 10);
                m.max = newMax;
                ctx.reRenderModal();
                ctx.reRenderGrid?.();
                cb();
            });
        });

        root.querySelectorAll('.count-fmt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newFmt = e.currentTarget.dataset.fmt;
                m.format = newFmt;
                ctx.reRenderModal();
                ctx.reRenderGrid?.();
                cb();
            });
        });

        root.querySelector('#count-reset-btn')?.addEventListener('click', () => {
            const fullId = `${ctx.currentPageId || 0}/${m.id}`;
            const inst = ctx.synth?.modules?.[fullId] || ctx.synth?.modules?.[m.id];
            if (inst?.resetStep) {
                inst.resetStep();
            }
            ctx.reRenderGrid?.();
        });
    }
};

export const countDefs = {
    COUNT
};

