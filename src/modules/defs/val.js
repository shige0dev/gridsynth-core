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
        name: 'VALUE'
    }),
    ports: () => ({
        in: [],
        out: [{ port: 'cv_out', pin: 10, color: 'bg-yellow-400' }]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),

    getStep: (m) => {
        if (m.stepType === '1semi') return 1.0 / 12.0;
        if (m.stepType === '0.1') return 0.1;
        if (m.stepType === '1') return 1.0;
        if (m.stepType === '10') return 10.0;
        return m.step || 0.01;
    },

    clampVal: (m, newVal) => {
        const min = m.min ?? -1.0;
        const max = m.max ?? 1.0;
        const step = VALUE.getStep(m);
        let clamped = Math.max(min, Math.min(max, newVal));
        if (step > 0) {
            clamped = Math.round((clamped - min) / step) * step + min;
            clamped = Math.max(min, Math.min(max, clamped));
        }
        return Math.round(clamped * 10000) / 10000;
    },

    formatValHtml: (v, stepType) => {
        if (stepType === '1semi') return `<span>${cvToNoteName(v)}</span>`;
        const num = Number(v);
        if (stepType === '1' || stepType === '10') return `<span>${Math.round(num)}</span>`;
        const parts = num.toFixed(2).split('.');
        return `<span class="inline-block w-[22px] text-right">${parts[0]}</span><span class="inline-block w-[3px] text-center">.</span><span class="inline-block w-[18px] text-left">${parts[1]}</span>`;
    },

    formatEdgeVal: (v, stepType) => {
        if (stepType === '1semi') return cvToNoteName(v);
        const n = Number(v);
        if (stepType === '1' || stepType === '10') return `${Math.round(n)}`;
        return (Math.abs(n) >= 10) ? n.toFixed(0) : n.toFixed(1);
    },

    getNormPct: (m) => {
        const minVal = m.min ?? -1.0;
        const maxVal = m.max ?? 1.0;
        const curVal = m.val ?? (m.def ?? 0.0);
        const range = Math.max(0.0001, maxVal - minVal);
        return Math.max(0, Math.min(100, Math.round(((curVal - minVal) / range) * 100)));
    },

    bindVerticalDrag: (el, m, pxPerStep, canStart, onUpdate) => {
        if (!el) return;
        let isDragging = false, startY = 0, startVal = 0;

        el.addEventListener('pointerdown', (e) => {
            if (canStart && !canStart(e)) return;
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            startY = e.clientY;
            startVal = m.val ?? (m.def ?? 0.0);
            try { el.setPointerCapture?.(e.pointerId); } catch (_) {}
        });

        el.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            e.stopPropagation();
            const stepsCount = Math.round((startY - e.clientY) / pxPerStep);
            const clamped = VALUE.clampVal(m, startVal + stepsCount * VALUE.getStep(m));
            m.val = clamped;
            onUpdate(clamped);
        });

        const onEnd = (e) => {
            if (!isDragging) return;
            e.stopPropagation();
            isDragging = false;
            try { el.releasePointerCapture?.(e.pointerId); } catch (_) {}
        };

        el.addEventListener('pointerup', onEnd);
        el.addEventListener('pointercancel', onEnd);
    },

    renderGrid: (m) => {
        const minVal = m.min ?? -1.0;
        const maxVal = m.max ?? 1.0;
        const curVal = m.val ?? (m.def ?? 0.0);
        const labelText = m.label || m.name || 'VAL';
        const pct = VALUE.getNormPct(m);
        const fmt = (v) => VALUE.formatEdgeVal(v, m.stepType);

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
                        <span class="text-[6px] font-mono text-slate-300 font-semibold tracking-tighter leading-none">${fmt(maxVal)}</span>
                        <div class="val-val-disp font-mono text-[12px] font-extrabold text-amber-200 tracking-tight leading-none flex items-baseline justify-center select-none">${VALUE.formatValHtml(curVal, m.stepType)}</div>
                        <span class="text-[6px] font-mono text-slate-300 font-semibold tracking-tighter leading-none">${fmt(minVal)}</span>
                    </div>
                </div>

                <!-- Absolutely Positioned Variable Name Label (Pinned above the bar slot without displacing it) -->
                <span class="val-label-disp absolute bottom-[calc(50%+16px)] left-1/2 -translate-x-1/2 text-[7px] font-mono font-bold text-amber-400 uppercase tracking-wider leading-none max-w-[56px] truncate pointer-events-none text-center">${labelText}</span>
            </div>`;
    },

    updateLive: (cell, data, isP, modal, m) => {
        if (!cell || !m) return;

        const pct = VALUE.getNormPct(m);
        const curVal = m.val ?? (m.def ?? 0.0);
        const html = VALUE.formatValHtml(curVal, m.stepType);

        const fillBar = cell.querySelector('.val-fill-bar');
        if (fillBar) fillBar.style.height = `${pct}%`;

        const valDisp = cell.querySelector('.val-val-disp');
        if (valDisp && valDisp._lastHtml !== html) {
            valDisp.innerHTML = html;
            valDisp._lastHtml = html;
        }

        const labelDisp = cell.querySelector('.val-label-disp');
        if (labelDisp) {
            const lText = m.label || m.name || 'VAL';
            if (labelDisp.textContent !== lText) labelDisp.textContent = lText;
        }

        if (modal) {
            const mFill = modal.querySelector('#val-modal-fill-bar');
            if (mFill) mFill.style.height = `${pct}%`;
            const mVal = modal.querySelector('#val-modal-val-disp');
            if (mVal) mVal.innerHTML = html;
        }
    },

    bindGridEvents: (cell, m, ctx, onChange) => {
        const valBox = cell.querySelector('.val-box');
        VALUE.bindVerticalDrag(
            valBox,
            m,
            8.0,
            (e) => Boolean(ctx?.ui?.isPerformanceMode || window.__GS_APP__?.isPerformanceMode) && !e.target.closest('.port'),
            (clamped) => {
                const valDisp = cell.querySelector('.val-val-disp');
                if (valDisp) {
                    const html = VALUE.formatValHtml(clamped, m.stepType);
                    if (valDisp._lastHtml !== html) {
                        valDisp.innerHTML = html;
                        valDisp._lastHtml = html;
                    }
                }
                const fillBar = cell.querySelector('.val-fill-bar');
                if (fillBar) fillBar.style.height = `${VALUE.getNormPct(m)}%`;

                const ui = ctx?.ui || ctx || window.__GS_APP__;
                if (ui?.synth) {
                    ui.synth.updateModule(`${ui.currentPageId}/${m.id}`, m, ui.getPatchState(m.id));
                }
                onChange?.();
            }
        );
    },

    renderModal: (m) => {
        const curVal = m.val ?? (m.def ?? 0.0);
        const curMax = m.max ?? 1.0;
        const curDef = m.def ?? 0.0;
        const curMin = m.min ?? -1.0;
        const curStepType = m.stepType || '0.01';
        const pct = VALUE.getNormPct(m);
        const fmt = (val) => VALUE.formatEdgeVal(val, curStepType);
        const stepBtns = ['0.01', '0.1', '1semi', '1', '10'];

        return `
            <div class="flex flex-col gap-1.5 p-0.5 select-none text-[9px] w-[160px] mx-auto">
                <!-- Row 1: 2x Panel Slider with Quick Limits (MAX / DEF / MIN) -->
                <div class="flex items-center justify-between gap-1.5 pt-0.5">
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
                    <div class="flex flex-col justify-between h-14 w-[42px] py-0.5 text-[7.5px] font-mono shrink-0">
                        <button id="val-edit-max" class="h-4 px-1 rounded bg-slate-900 border border-slate-700 hover:border-amber-400 text-amber-300 flex items-center justify-between transition-colors" title="MAX編集">
                            <span class="text-slate-500 text-[6.5px]">MX</span><span class="font-bold truncate">${fmt(curMax)}</span>
                        </button>
                        <button id="val-edit-def" class="h-4 px-1 rounded bg-slate-900 border border-slate-700 hover:border-amber-400 text-amber-300 flex items-center justify-between transition-colors" title="DEF編集">
                            <span class="text-slate-500 text-[6.5px]">DF</span><span class="font-bold truncate">${fmt(curDef)}</span>
                        </button>
                        <button id="val-edit-min" class="h-4 px-1 rounded bg-slate-900 border border-slate-700 hover:border-amber-400 text-amber-300 flex items-center justify-between transition-colors" title="MIN編集">
                            <span class="text-slate-500 text-[6.5px]">MN</span><span class="font-bold truncate">${fmt(curMin)}</span>
                        </button>
                    </div>
                </div>

                <!-- Row 2: 単位ステップ選択 (スライダの下に配置) -->
                <div class="grid grid-cols-5 gap-0.5 pt-1 border-t border-slate-800">
                    ${stepBtns.map(id => `
                        <button class="val-step-btn h-5 rounded font-mono font-bold text-[7.5px] border transition-colors flex items-center justify-center ${curStepType === id ? 'bg-amber-600 text-white border-amber-400 shadow-sm' : 'bg-slate-900 text-slate-400 border-slate-700/80 hover:text-slate-200'}" data-step="${id}">
                            ${id}
                        </button>
                    `).join('')}
                </div>
            </div>`;
    },

    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;

        // 1. STEP Button Group
        root.querySelectorAll('.val-step-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const stepKey = btn.dataset.step;
                if (!stepKey) return;
                m.stepType = stepKey;
                m.step = VALUE.getStep(m);
                ctx.reRenderModal();
                onChange();
            });
        });

        // 2. 2x Slider Swipe Control
        VALUE.bindVerticalDrag(
            root.querySelector('#val-modal-slider-box'),
            m,
            6.0,
            null,
            (clamped) => {
                const mFill = root.querySelector('#val-modal-fill-bar');
                if (mFill) mFill.style.height = `${VALUE.getNormPct(m)}%`;
                const mVal = root.querySelector('#val-modal-val-disp');
                if (mVal) mVal.innerHTML = VALUE.formatValHtml(clamped, m.stepType);
                onChange();
            }
        );

        // 3. Compact Limits Tap-to-Edit (MAX, DEF, MIN)
        const setupLimitEdit = (btnId, propKey, label) => {
            const btn = root.querySelector('#' + btnId);
            if (!btn) return;
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const res = await ctx.prompt(`${label} 入力`, String(m[propKey] ?? 0));
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
