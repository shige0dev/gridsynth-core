import { UIHelpers } from '../../ui/helpers.js?v=351';

export const COUNT = {
    color: 'emerald',
    defaults: () => ({
        type: 'COUNT',
        max: 16,          // 16, 32, 64, 256
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
        const curMax = parseInt(m.max, 10) || 16;
        return `
            <div class="h-full flex flex-col justify-between py-1 select-none pointer-events-none">
                <div class="flex items-center justify-between px-1.5 pt-0.5">
                    <span class="text-[7px] font-mono text-emerald-400/80 font-bold tracking-tight">COUNTER</span>
                    <span class="text-[6.5px] font-mono text-slate-500 font-bold">RATIO</span>
                </div>
                <div class="flex flex-col items-center justify-center my-auto w-full px-1">
                    <div class="inline-flex flex-col items-center justify-center font-mono font-black text-emerald-300">
                        <div id="count-val-${m.id}" class="text-[14px] leading-tight drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">
                            0
                        </div>
                        <div class="w-full min-w-[20px] h-[1.5px] bg-emerald-400/80 my-0.5 rounded-full"></div>
                        <div id="count-denom-${m.id}" class="text-[14px] leading-tight drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">
                            ${curMax}
                        </div>
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
        const curMax = data?.max ?? (parseInt(m.max, 10) || 16);

        const countEl = cell?.querySelector(`#count-val-${m.id}`) || document.getElementById(`count-val-${m.id}`);
        if (countEl && countEl.textContent.trim() !== String(curCount)) {
            countEl.textContent = String(curCount);
        }

        const denomEl = cell?.querySelector(`#count-denom-${m.id}`) || document.getElementById(`count-denom-${m.id}`);
        if (denomEl && denomEl.textContent.trim() !== String(curMax)) {
            denomEl.textContent = String(curMax);
        }

        if (modalEl) {
            const modalCountEl = modalEl.querySelector('#count-modal-val') || document.getElementById('count-modal-val');
            if (modalCountEl && modalCountEl.textContent.trim() !== String(curCount)) {
                modalCountEl.textContent = String(curCount);
            }
            const modalDenomEl = modalEl.querySelector('#count-modal-denom') || document.getElementById('count-modal-denom');
            if (modalDenomEl && modalDenomEl.textContent.trim() !== String(curMax)) {
                modalDenomEl.textContent = String(curMax);
            }
            const modalCvEl = modalEl.querySelector('#count-modal-cv') || document.getElementById('count-modal-cv');
            if (modalCvEl) {
                const cvPercent = curMax > 0 ? ((curCount / curMax) * 100).toFixed(1) : '0.0';
                modalCvEl.textContent = `${(curCount / curMax).toFixed(3)}V (${cvPercent}%)`;
            }
        }
    },

    renderModal: (m) => {
        const curMax = parseInt(m.max, 10) || 16;
        const presetOptions = [8, 16, 32, 64, 128, 256];

        return `
            <div class="space-y-3 p-1">
                <!-- Monitor Box (Fraction Display with Equal Font Size) -->
                <div class="bg-slate-950/80 rounded-lg p-2.5 border border-emerald-500/30 text-center shadow-inner flex flex-col items-center">
                    <div class="text-[7.5px] font-mono text-slate-400 uppercase tracking-widest mb-1">CURRENT COUNT / RATIO</div>
                    <div class="inline-flex flex-col items-center justify-center font-mono font-black text-emerald-400 py-1">
                        <div id="count-modal-val" class="text-2xl leading-none tracking-wider">
                            0
                        </div>
                        <div class="w-12 h-[2px] bg-emerald-400/80 my-1 rounded-full"></div>
                        <div id="count-modal-denom" class="text-2xl leading-none tracking-wider">
                            ${curMax}
                        </div>
                    </div>
                    <div class="w-full flex items-center justify-between mt-1 pt-1.5 border-t border-slate-800 text-[8px] font-mono text-slate-400">
                        <span>CV OUT:</span>
                        <span id="count-modal-cv" class="text-amber-400 font-bold">0.000V (0.0%)</span>
                    </div>
                </div>

                <!-- Custom MAX Input & Preset Buttons -->
                <div>
                    <div class="text-[8px] font-mono text-slate-400 font-bold uppercase mb-1">MAX COUNT (OVERFLOW / DIVISION)</div>
                    <div class="flex items-center gap-1.5 mb-1.5">
                        <input id="count-max-input" type="number" min="1" max="1024" value="${curMax}" class="flex-1 bg-slate-900 border border-emerald-500/60 rounded px-2 py-1 text-emerald-300 font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" placeholder="1-1024" />
                        <button id="count-apply-btn" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-mono font-bold text-[10px] tracking-wide active:scale-95 transition-colors">SET</button>
                    </div>
                    <div class="grid grid-cols-6 gap-1">
                        ${presetOptions.map(opt => `
                            <button class="count-preset-btn py-1 rounded text-[9px] font-mono font-bold border transition-colors ${curMax === opt ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/30' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}" data-max="${opt}">
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

        const applyMax = (newMax) => {
            const parsed = parseInt(newMax, 10);
            if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 1024) {
                m.max = parsed;
                const fullId = `${ctx.currentPageId || 0}/${m.id}`;
                const inst = ctx.synth?.modules?.[fullId] || ctx.synth?.modules?.[m.id];
                if (inst?.nodes?.w?.port) {
                    inst.nodes.w.port.postMessage({ type: 'SET_MAX', value: parsed });
                }
                ctx.reRenderModal();
                ctx.reRenderGrid?.();
                cb();
            }
        };

        // Preset buttons: fill input and apply
        root.querySelectorAll('.count-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const optMax = e.currentTarget.dataset.max;
                const input = root.querySelector('#count-max-input');
                if (input) input.value = optMax;
                applyMax(optMax);
            });
        });

        // Set button and Enter key on input
        const input = root.querySelector('#count-max-input');
        const setBtn = root.querySelector('#count-apply-btn');
        if (setBtn && input) {
            setBtn.addEventListener('click', () => {
                applyMax(input.value);
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    applyMax(input.value);
                }
            });
        }

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

