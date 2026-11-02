import { UIHelpers } from '../../ui/helpers.js?v=351';
import { cvToNoteName } from '../../core/musical.js?v=367';

export const VALUE = {
    color: 'amber',
    defaults: () => ({
        type: 'VALUE',
        label: 'VAL',
        val: 0.0,
        min: -1.0,
        max: 1.0,
        def: 0.0,
        step: 0.01,
        stepType: '0.01', // '0.01' | '0.1' | '1semi' | '1' | '10'
        mode: 'latch',
        name: 'VALUE'
    }),
    ports: () => ({
        in: [],
        out: [{ port: 'cv_out', pin: 10, color: 'bg-yellow-400' }]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),

    formatValHtml: (v, stepType) => {
        if (stepType === '1semi') {
            return `<span>${cvToNoteName(v)}</span>`;
        }
        const num = Number(v);
        // If step is 1 or 10: no decimal point (integer display)
        if (stepType === '1' || stepType === '10') {
            return `<span>${Math.round(num)}</span>`;
        }
        // Otherwise (0.01, 0.1, or default): fixed 2 decimal places with fixed-slot alignment
        const str = num.toFixed(2);
        const parts = str.split('.');
        return `<span class="inline-block w-[22px] text-right">${parts[0]}</span><span class="inline-block w-[3px] text-center">.</span><span class="inline-block w-[18px] text-left">${parts[1]}</span>`;
    },

    formatModalVal: (v, stepType) => {
        if (stepType === '1semi') {
            return `${cvToNoteName(v)} (${Number(v).toFixed(2)})`;
        }
        const num = Number(v);
        if (stepType === '1' || stepType === '10') {
            return `${Math.round(num)}`;
        }
        return num.toFixed(2);
    },

    getNormPct: (m) => {
        const minVal = m.min ?? -1.0;
        const maxVal = m.max ?? 1.0;
        const curVal = m.val ?? (m.def ?? 0.0);
        const range = Math.max(0.0001, maxVal - minVal);
        return Math.max(0, Math.min(100, Math.round(((curVal - minVal) / range) * 100)));
    },

    renderGrid: (m) => {
        const minVal = m.min ?? -1.0;
        const maxVal = m.max ?? 1.0;
        const curVal = m.val ?? (m.def ?? 0.0);
        const labelText = m.label || m.name || 'VAL';
        const pct = VALUE.getNormPct(m);

        const formatEdgeVal = (v) => {
            if (m.stepType === '1semi') return cvToNoteName(v);
            const n = Number(v);
            if (m.stepType === '1' || m.stepType === '10') return `${Math.round(n)}`;
            return (Math.abs(n) >= 10) ? n.toFixed(0) : n.toFixed(1);
        };

        const barSlotHtml = UIHelpers.renderPanelBars([
            {
                pct,
                width: 'w-full',
                innerCls: 'val-fill-bar transition-[height] duration-75',
                color: 'bg-gradient-to-t from-amber-600 to-yellow-400 opacity-90'
            }
        ], {
            widthCls: 'w-14',
            heightCls: 'h-7',
            noWrapper: true
        });

        return `
            <div class="val-box relative w-full h-full flex items-center justify-center select-none overflow-hidden touch-none" data-module-id="${m.id}">
                <!-- Shared Panel Bar Slot Container (w-14 h-7 / 56px x 28px) -->
                <div class="relative w-14 h-7 shrink-0 flex items-center justify-center">
                    ${barSlotHtml}

                    <!-- Center Overlay: MAX at top, VAL at center, MIN at bottom -->
                    <div class="absolute inset-0 flex flex-col items-center justify-between py-0.5 pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] z-10">
                        <span class="text-[6px] font-mono text-slate-300 font-semibold tracking-tighter leading-none">${formatEdgeVal(maxVal)}</span>
                        <div class="val-val-disp font-mono text-[12px] font-extrabold text-amber-200 tracking-tight leading-none flex items-baseline justify-center select-none">${VALUE.formatValHtml(curVal, m.stepType)}</div>
                        <span class="text-[6px] font-mono text-slate-300 font-semibold tracking-tighter leading-none">${formatEdgeVal(minVal)}</span>
                    </div>
                </div>

                <!-- Absolutely Positioned Variable Name Label (Pinned above the bar slot without displacing it) -->
                <span class="val-label-disp absolute bottom-[calc(50%+16px)] left-1/2 -translate-x-1/2 text-[7px] font-mono font-bold text-amber-400 uppercase tracking-wider leading-none max-w-[56px] truncate pointer-events-none text-center">${labelText}</span>
            </div>`;
    },

    updateLive: (cell, data, isP, modal, m) => {
        if (!cell || !m) return;

        const fillBar = cell.querySelector('.val-fill-bar');
        if (fillBar) {
            const pct = VALUE.getNormPct(m);
            fillBar.style.height = `${pct}%`;
        }
        const valDisp = cell.querySelector('.val-val-disp');
        if (valDisp) {
            const v = m.val ?? (m.def ?? 0.0);
            const html = VALUE.formatValHtml(v, m.stepType);
            if (valDisp._lastHtml !== html) {
                valDisp.innerHTML = html;
                valDisp._lastHtml = html;
            }
        }
        const labelDisp = cell.querySelector('.val-label-disp');
        if (labelDisp) {
            const lText = m.label || m.name || 'VAL';
            if (labelDisp.textContent !== lText) {
                labelDisp.textContent = lText;
            }
        }

        // Live update for scrubbable badges in Modal
        if (modal && m) {
            const valEl = modal.querySelector('#val-scrub-val');
            const maxEl = modal.querySelector('#val-scrub-max');
            const defEl = modal.querySelector('#val-scrub-def');
            const minEl = modal.querySelector('#val-scrub-min');
            const fmt = (val) => VALUE.formatModalVal(val, m.stepType);
            if (valEl && !valEl._isDragging) valEl.textContent = fmt(m.val ?? (m.def ?? 0.0));
            if (maxEl && !maxEl._isDragging) maxEl.textContent = fmt(m.max ?? 1.0);
            if (defEl && !defEl._isDragging) defEl.textContent = fmt(m.def ?? 0.0);
            if (minEl && !minEl._isDragging) minEl.textContent = fmt(m.min ?? -1.0);
        }
    },

    bindGridEvents: (cell, m, ctx, onChange) => {
        const valBox = cell.querySelector('.val-box');
        if (!valBox) return;

        let isInteracting = false;
        let startY = 0;
        let startVal = 0;

        const getStepValue = () => {
            if (m.stepType === '1semi') return 1.0 / 12.0;
            if (m.stepType === '0.1') return 0.1;
            if (m.stepType === '1') return 1.0;
            if (m.stepType === '10') return 10.0;
            return m.step || 0.01;
        };

        const updateVal = (newVal) => {
            const min = m.min ?? -1.0;
            const max = m.max ?? 1.0;
            const step = getStepValue();
            let clamped = Math.max(min, Math.min(max, newVal));
            if (step > 0) {
                clamped = Math.round((clamped - min) / step) * step + min;
                clamped = Math.max(min, Math.min(max, clamped));
            }
            m.val = clamped;

            // Direct DOM update for high-speed responsiveness
            const valDisp = cell.querySelector('.val-val-disp');
            if (valDisp) {
                const html = VALUE.formatValHtml(clamped, m.stepType);
                if (valDisp._lastHtml !== html) {
                    valDisp.innerHTML = html;
                    valDisp._lastHtml = html;
                }
            }
            const fillBar = cell.querySelector('.val-fill-bar');
            if (fillBar) {
                fillBar.style.height = `${VALUE.getNormPct(m)}%`;
            }

            onChange?.();
        };

        const handleDown = (clientY) => {
            isInteracting = true;
            startY = clientY;
            startVal = m.val ?? (m.def ?? 0.0);
        };

        const handleMove = (clientY) => {
            if (!isInteracting) return;
            const deltaY = startY - clientY; // upward drag increases value
            const step = getStepValue();
            // Gear-linked sensitivity: 8px drag = exactly 1 STEP change
            const stepsCount = Math.round(deltaY / 8.0);
            const targetVal = startVal + stepsCount * step;
            updateVal(targetVal);
        };

        const handleUp = () => {
            if (!isInteracting) return;
            isInteracting = false;
        };

        valBox.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.port')) return;
            e.stopPropagation();
            valBox.setPointerCapture?.(e.pointerId);
            handleDown(e.clientY);
        });

        valBox.addEventListener('pointermove', (e) => {
            if (!isInteracting) return;
            e.stopPropagation();
            handleMove(e.clientY);
        });

        const onPointerEnd = (e) => {
            if (!isInteracting) return;
            e.stopPropagation();
            try { valBox.releasePointerCapture?.(e.pointerId); } catch (_) {}
            handleUp();
        };

        valBox.addEventListener('pointerup', onPointerEnd);
        valBox.addEventListener('pointercancel', onPointerEnd);
    },

    renderModal: (m) => {
        const curVal = m.val ?? (m.def ?? 0.0);
        const curMax = m.max ?? 1.0;
        const curDef = m.def ?? 0.0;
        const curMin = m.min ?? -1.0;
        const curStepType = m.stepType || '0.01';
        const curLabel = m.label || m.name || 'VAL';

        const fmt = (val) => VALUE.formatModalVal(val, curStepType);

        const stepBtns = [
            { id: '0.01', label: '0.01' },
            { id: '0.1', label: '0.1' },
            { id: '1semi', label: '1semi' },
            { id: '1', label: '1' },
            { id: '10', label: '10' }
        ];

        return `
            <div class="space-y-2 select-none text-[9px]">
                <!-- Variable Name / Label Row -->
                <div class="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5">
                    <span class="font-bold text-slate-400 tracking-wider">VARIABLE NAME (変数名)</span>
                    <input id="val-label-input" type="text" maxlength="8" class="bg-slate-900 border border-amber-500/60 rounded px-2 py-0.5 text-amber-300 font-mono font-bold text-right text-[10px] w-24 outline-none focus:border-amber-400" value="${curLabel}" placeholder="VAL" />
                </div>

                <!-- STEP Button Group -->
                <div class="flex flex-col gap-1 bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-slate-400 tracking-wider">STEP (差分刻み)</span>
                        <span class="font-mono text-[8px] text-amber-400/80 font-bold">${curStepType === '1semi' ? '1半音 (1/12V)' : curStepType}</span>
                    </div>
                    <div class="grid grid-cols-5 gap-1 pt-0.5">
                        ${stepBtns.map(btn => `
                            <button class="val-step-btn h-5 rounded font-mono font-bold text-[8.5px] border leading-none transition-colors ${curStepType === btn.id ? 'bg-amber-600 text-white border-amber-400 shadow-sm' : 'bg-slate-900 text-slate-400 border-slate-700/80 hover:text-slate-200'}" data-step="${btn.id}">
                                ${btn.label}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- VALUE Row (Current Value) -->
                <div class="flex items-center justify-between bg-amber-950/20 border border-amber-500/40 rounded px-2.5 py-1.5 shadow-sm">
                    <div class="flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        <span class="font-bold text-amber-300 tracking-wider">VALUE (現在値)</span>
                    </div>
                    <div id="val-scrub-val" class="cursor-ns-resize touch-none select-none px-2 py-0.5 rounded bg-slate-900 border border-amber-500/70 hover:border-amber-400 font-mono font-extrabold text-amber-300 min-w-[70px] text-right transition-colors" title="上下スワイプで増減 / タップで手入力">${fmt(curVal)}</div>
                </div>

                <!-- MAX Row -->
                <div class="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5">
                    <span class="font-bold text-slate-400 tracking-wider">MAX (最大値)</span>
                    <div id="val-scrub-max" class="cursor-ns-resize touch-none select-none px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-amber-500 font-mono font-bold text-amber-300 min-w-[70px] text-right transition-colors" title="上下スワイプで増減 / タップで手入力">${fmt(curMax)}</div>
                </div>

                <!-- DEFAULT Row (Middle) -->
                <div class="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5">
                    <span class="font-bold text-slate-400 tracking-wider">DEFAULT (初期値)</span>
                    <div id="val-scrub-def" class="cursor-ns-resize touch-none select-none px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-amber-500 font-mono font-bold text-amber-300 min-w-[70px] text-right transition-colors" title="上下スワイプで増減 / タップで手入力">${fmt(curDef)}</div>
                </div>

                <!-- MIN Row (Bottom) -->
                <div class="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5">
                    <span class="font-bold text-slate-400 tracking-wider">MIN (下限値)</span>
                    <div id="val-scrub-min" class="cursor-ns-resize touch-none select-none px-2 py-0.5 rounded bg-slate-950 border border-slate-700 hover:border-amber-500 font-mono font-bold text-amber-300 min-w-[70px] text-right transition-colors" title="上下スワイプで増減 / タップで手入力">${fmt(curMin)}</div>
                </div>
            </div>`;
    },

    bindEvents: (m, ctx, onChange) => {
        // 0. Variable Label Input
        const labelInput = document.getElementById('val-label-input');
        if (labelInput) {
            labelInput.addEventListener('input', (e) => {
                m.label = e.target.value.trim() || 'VAL';
                ctx.reRenderGrid?.();
                onChange();
            });
        }

        // 1. STEP Button Group events
        document.querySelectorAll('.val-step-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stepKey = btn.dataset.step;
                if (!stepKey) return;
                m.stepType = stepKey;
                if (stepKey === '1semi') m.step = 1.0 / 12.0;
                else m.step = parseFloat(stepKey) || 0.01;

                ctx.reRenderModal();
                onChange();
            });
        });

        // 2. Scrubbable Badges for MAX, DEFAULT, MIN
        const setupScrub = (id, propKey, label) => {
            const el = document.getElementById(id);
            if (!el) return;

            let isDragging = false;
            let startY = 0;
            let startVal = 0;
            let moved = false;

            const onPointerMove = (e) => {
                if (!isDragging) return;
                e.preventDefault();
                const deltaY = startY - e.clientY;
                if (Math.abs(deltaY) > 3) moved = true;

                const stepAmount = (m.stepType === '1semi') ? (1.0 / 12.0) : (parseFloat(m.stepType) || 0.1);
                const stepsCount = Math.round(deltaY / 15);
                let targetVal = startVal + stepsCount * stepAmount;

                m[propKey] = targetVal;
                if (m.min !== undefined && m.max !== undefined && m.min > m.max) {
                    if (propKey === 'min') m.max = m.min;
                    else if (propKey === 'max') m.min = m.max;
                }
                m.val = Math.max(m.min ?? -1.0, Math.min(m.max ?? 1.0, m.val ?? (m.def ?? 0.0)));

                const fmt = (v) => VALUE.formatModalVal(v, m.stepType);
                el.textContent = fmt(targetVal);

                const valEl = document.getElementById('val-scrub-val');
                if (valEl) valEl.textContent = fmt(m.val);

                ctx.reRenderGrid?.();
                onChange();
            };

            const onPointerUp = async (e) => {
                if (!isDragging) return;
                isDragging = false;
                el._isDragging = false;
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                window.removeEventListener('pointercancel', onPointerUp);
                el.classList.remove('ring-1', 'ring-amber-400', 'bg-amber-950/60');
                try { el.releasePointerCapture(e.pointerId); } catch (_) {}

                // Tap opens custom prompt for manual numeric input
                if (!moved) {
                    const cur = String(m[propKey] ?? 0);
                    const res = await ctx.prompt(`${label} 入力`, cur);
                    if (res !== null && res !== '') {
                        const num = parseFloat(res);
                        if (!isNaN(num)) {
                            m[propKey] = num;
                            if (m.min > m.max) [m.min, m.max] = [m.max, m.min];
                            m.val = Math.max(m.min, Math.min(m.max, m.val ?? (m.def ?? 0.0)));
                            ctx.reRenderModal();
                            onChange();
                        }
                    }
                }
            };

            el.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                isDragging = true;
                el._isDragging = true;
                moved = false;
                startY = e.clientY;
                startVal = m[propKey] ?? 0.0;
                el.classList.add('ring-1', 'ring-amber-400', 'bg-amber-950/60');
                try { el.setPointerCapture(e.pointerId); } catch (_) {}
                window.addEventListener('pointermove', onPointerMove, { passive: false });
                window.addEventListener('pointerup', onPointerUp);
                window.addEventListener('pointercancel', onPointerUp);
            });
        };

        setupScrub('val-scrub-val', 'val', 'VALUE (現在値)');
        setupScrub('val-scrub-max', 'max', 'MAX (最大値)');
        setupScrub('val-scrub-def', 'def', 'DEFAULT (初期値)');
        setupScrub('val-scrub-min', 'min', 'MIN (下限値)');
    }
};

export const valDefs = {
    VALUE
};
export default valDefs;
