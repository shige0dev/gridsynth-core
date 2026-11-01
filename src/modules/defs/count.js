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
            const modalCvEl = modalEl.querySelector('#count-modal-cv') || document.getElementById('count-modal-cv');
            if (modalCvEl) {
                const cvVal = curMax > 0 ? (curCount / curMax).toFixed(4) : '0.0000';
                modalCvEl.textContent = `${cvVal}V`;
            }
        }
    },

    renderModal: (m) => {
        const curMax = parseInt(m.max, 10) || 16;
        const presetOptions = [8, 16, 32, 64, 128, 256];

        return `
            <div class="space-y-3 p-1">
                <!-- Monitor & MAX Row: 現在値 / (MAX入力欄) = 0.0000V を1行で表示 -->
                <div class="bg-slate-950/80 rounded-lg p-2.5 border border-emerald-500/30 shadow-inner flex items-center justify-between gap-2">
                    <div class="flex items-center gap-1.5 font-mono text-sm">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tight">RATIO:</span>
                        <span id="count-modal-val" class="font-black text-emerald-300 text-base min-w-[20px] text-right">0</span>
                        <span class="text-emerald-500/80 font-black text-base">/</span>
                        <input id="count-max-input" type="number" min="1" max="1024" value="${curMax}" class="w-16 bg-slate-900 border border-emerald-500/60 rounded px-1.5 py-0.5 text-emerald-300 font-mono font-black text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-400" placeholder="1-1024" />
                    </div>
                    <div class="flex items-center gap-1.5 font-mono text-sm border-l border-slate-800 pl-2">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tight">CV OUT:</span>
                        <span id="count-modal-cv" class="font-black text-amber-400 text-sm">0.0000V</span>
                    </div>
                </div>

                <!-- PRESET BUTTONS (タップで即入力欄に反映・即時適用) -->
                <div>
                    <div class="text-[8px] font-mono text-slate-400 font-bold uppercase mb-1">PRESET DIVISION (MAX)</div>
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

        const applyMax = (newMax, skipInputUpdate = false) => {
            const parsed = parseInt(newMax, 10);
            if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 1024) {
                m.max = parsed;
                const fullId = `${ctx.currentPageId || 0}/${m.id}`;
                const inst = ctx.synth?.modules?.[fullId] || ctx.synth?.modules?.[m.id];
                if (inst?.nodes?.w?.port) {
                    inst.nodes.w.port.postMessage({ type: 'SET_MAX', value: parsed });
                }
                const input = root.querySelector('#count-max-input');
                if (input && !skipInputUpdate && input.value !== String(parsed)) {
                    input.value = parsed;
                }
                // Highlight active preset button if matches
                root.querySelectorAll('.count-preset-btn').forEach(btn => {
                    const opt = parseInt(btn.dataset.max, 10);
                    if (opt === parsed) {
                        btn.className = 'count-preset-btn py-1 rounded text-[9px] font-mono font-bold border transition-colors bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/30';
                    } else {
                        btn.className = 'count-preset-btn py-1 rounded text-[9px] font-mono font-bold border transition-colors bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700';
                    }
                });
                ctx.reRenderGrid?.();
                cb();
            }
        };

        // Preset buttons: 即時入力欄に反映して適用
        root.querySelectorAll('.count-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const optMax = e.currentTarget.dataset.max;
                applyMax(optMax);
            });
        });

        // Input field: 即時（inputイベント）で適用
        const input = root.querySelector('#count-max-input');
        if (input) {
            input.addEventListener('input', (e) => {
                applyMax(e.target.value, true);
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

