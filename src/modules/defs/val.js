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

        // Modal 2x Slider Sync
        if (modal) {
            const pct = VALUE.getNormPct(m);
            const mFill = modal.querySelector('#val-modal-fill-bar');
            if (mFill) mFill.style.height = `${pct}%`;
            const mVal = modal.querySelector('#val-modal-val-disp');
            if (mVal) mVal.innerHTML = VALUE.formatValHtml(m.val ?? (m.def ?? 0.0), m.stepType);
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
            clamped = Math.round(clamped * 10000) / 10000;
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

            // Immediately notify audio engine & patch
            const ui = ctx?.ui || ctx || window.__GS_APP__;
            if (ui?.synth) {
                ui.synth.updateModule(`${ui.currentPageId}/${m.id}`, m, ui.getPatchState(m.id));
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
            const stepsCount = Math.round(deltaY / 8.0);
            updateVal(startVal + stepsCount * step);
        };

        const handleUp = () => {
            if (!isInteracting) return;
            isInteracting = false;
        };

        valBox.addEventListener('pointerdown', (e) => {
            const isPerf = Boolean(ctx?.ui?.isPerformanceMode || window.__GS_APP__?.isPerformanceMode);
            if (!isPerf) return;
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
        const pct = VALUE.getNormPct(m);

        const fmt = (val) => VALUE.formatModalVal(val, curStepType);

        const stepBtns = [
            { id: '0.01', label: '0.01' },
            { id: '0.1', label: '0.1' },
            { id: '1semi', label: '1semi' },
            { id: '1', label: '1' },
            { id: '10', label: '10' }
        ];

        return `
            <div class="flex flex-col gap-2 p-1 select-none text-[9px]">
                <!-- Top Row: Compact Name & Step buttons -->
                <div class="flex items-center justify-between gap-1.5 pb-1 border-b border-slate-800">
                    <div class="flex items-center gap-1 shrink-0">
                        <span class="text-[7.5px] font-mono font-bold text-slate-400">NAME:</span>
                        <input id="val-label-input" type="text" maxlength="8" class="bg-slate-900 border border-amber-500/60 rounded px-1.5 py-0 text-amber-300 font-mono font-bold text-[9px] w-16 h-5 outline-none focus:border-amber-400" value="${curLabel}" placeholder="VAL" />
                    </div>
                    <div class="flex items-center gap-0.5">
                        ${stepBtns.map(btn => `
                            <button class="val-step-btn h-5 px-1.5 rounded font-mono font-bold text-[8px] border transition-colors ${curStepType === btn.id ? 'bg-amber-600 text-white border-amber-400 shadow-sm' : 'bg-slate-900 text-slate-400 border-slate-700/80 hover:text-slate-200'}" data-step="${btn.id}">
                                ${btn.label}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Center: 2x Panel Slider with MAX & MIN Touch Badges -->
                <div class="flex items-center justify-center gap-3 py-1">
                    <!-- Vertical 2x Slider (w-28 h-14 -> 112px x 56px, exactly 2x of w-14 h-7) -->
                    <div id="val-modal-slider-box" class="relative w-28 h-14 shrink-0 rounded border border-slate-600 bg-slate-950/60 p-[2px] flex flex-col justify-end overflow-hidden cursor-ns-resize touch-none shadow-lg">
                        <div id="val-modal-fill-bar" class="w-full bg-gradient-to-t from-amber-600 to-yellow-400 rounded-xs pointer-events-none transition-[height] duration-75" style="height: ${pct}%;"></div>
                        <!-- Overlay: MAX (Top), Value (Center), MIN (Bottom) -->
                        <div class="absolute inset-0 flex flex-col items-center justify-between py-1 pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] z-10">
                            <span class="text-[8px] font-mono text-slate-300 font-bold tracking-tight leading-none">${fmt(curMax)}</span>
                            <div id="val-modal-val-disp" class="font-mono text-[20px] font-extrabold text-amber-200 tracking-tight leading-none flex items-baseline justify-center select-none">${VALUE.formatValHtml(curVal, m.stepType)}</div>
                            <span class="text-[8px] font-mono text-slate-300 font-bold tracking-tight leading-none">${fmt(curMin)}</span>
                        </div>
                    </div>

                    <!-- Quick Limits Adjustment (MAX / DEF / MIN Buttons) -->
                    <div class="flex flex-col justify-between h-14 py-0.5 text-[8px] font-mono">
                        <button id="val-edit-max" class="h-4 px-1.5 rounded bg-slate-900 border border-slate-700 hover:border-amber-400 text-amber-300 flex items-center justify-between gap-1 transition-colors" title="MAXをタップして編集">
                            <span class="text-slate-500">MAX</span><span class="font-bold">${fmt(curMax)}</span>
                        </button>
                        <button id="val-edit-def" class="h-4 px-1.5 rounded bg-slate-900 border border-slate-700 hover:border-amber-400 text-amber-300 flex items-center justify-between gap-1 transition-colors" title="初期値（DEF）をタップして編集">
                            <span class="text-slate-500">DEF</span><span class="font-bold">${fmt(curDef)}</span>
                        </button>
                        <button id="val-edit-min" class="h-4 px-1.5 rounded bg-slate-900 border border-slate-700 hover:border-amber-400 text-amber-300 flex items-center justify-between gap-1 transition-colors" title="MINをタップして編集">
                            <span class="text-slate-500">MIN</span><span class="font-bold">${fmt(curMin)}</span>
                        </button>
                    </div>
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

        // 1. STEP Button Group
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

        // 2. 2x Slider Swipe Control
        const sliderBox = document.getElementById('val-modal-slider-box');
        if (sliderBox) {
            let isDragging = false;
            let startY = 0;
            let startVal = 0;

            const getStepValue = () => {
                if (m.stepType === '1semi') return 1.0 / 12.0;
                if (m.stepType === '0.1') return 0.1;
                if (m.stepType === '1') return 1.0;
                if (m.stepType === '10') return 10.0;
                return m.step || 0.01;
            };

            const updateModalVal = (newVal) => {
                const min = m.min ?? -1.0;
                const max = m.max ?? 1.0;
                const step = getStepValue();
                let clamped = Math.max(min, Math.min(max, newVal));
                if (step > 0) {
                    clamped = Math.round((clamped - min) / step) * step + min;
                    clamped = Math.max(min, Math.min(max, clamped));
                }
                clamped = Math.round(clamped * 10000) / 10000;
                m.val = clamped;

                // Direct DOM update in modal
                const mFill = document.getElementById('val-modal-fill-bar');
                if (mFill) mFill.style.height = `${VALUE.getNormPct(m)}%`;
                const mVal = document.getElementById('val-modal-val-disp');
                if (mVal) mVal.innerHTML = VALUE.formatValHtml(clamped, m.stepType);

                ctx.reRenderGrid?.();
                onChange();
            };

            sliderBox.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                isDragging = true;
                startY = e.clientY;
                startVal = m.val ?? (m.def ?? 0.0);
                try { sliderBox.setPointerCapture(e.pointerId); } catch (_) {}
            });

            sliderBox.addEventListener('pointermove', (e) => {
                if (!isDragging) return;
                e.preventDefault();
                e.stopPropagation();
                const deltaY = startY - e.clientY;
                const step = getStepValue();
                // 6px drag = 1 step
                const stepsCount = Math.round(deltaY / 6.0);
                updateModalVal(startVal + stepsCount * step);
            });

            const onEnd = (e) => {
                if (!isDragging) return;
                isDragging = false;
                try { sliderBox.releasePointerCapture(e.pointerId); } catch (_) {}
            };

            sliderBox.addEventListener('pointerup', onEnd);
            sliderBox.addEventListener('pointercancel', onEnd);
        }

        // 3. Compact Limits Tap-to-Edit (MAX, DEF, MIN)
        const setupLimitEdit = (btnId, propKey, label) => {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
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
            });
        };

        setupLimitEdit('val-edit-max', 'max', 'MAX');
        setupLimitEdit('val-edit-def', 'def', 'DEFAULT');
        setupLimitEdit('val-edit-min', 'min', 'MIN');
    }
};

export const valDefs = {
    VALUE
};
export default valDefs;
