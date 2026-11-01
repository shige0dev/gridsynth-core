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

    renderGrid: (m) => {
        const curVal = m.val ?? (m.def ?? 0.0);
        const labelText = m.label || m.name || 'VAL';

        return `
            <div class="val-box relative w-full h-full flex flex-col items-center justify-center p-1 select-none overflow-hidden touch-none" data-module-id="${m.id}">
                <!-- Square Centered Wheel Container (54px x 54px) -->
                <div class="relative w-[54px] h-[54px] flex items-center justify-center overflow-hidden rounded bg-slate-950 border border-slate-800/90 shadow-inner">
                    <canvas class="val-canvas block w-full h-full" width="54" height="54"></canvas>

                    <!-- Center Overlay: Variable Label at top, VAL at center -->
                    <div class="absolute inset-0 flex flex-col items-center justify-between py-1 pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                        <span class="val-label-disp text-[7px] font-mono font-bold text-amber-400 uppercase tracking-tight leading-none px-1 py-0.5 rounded bg-slate-900/80 border border-amber-500/30 max-w-[48px] truncate">${labelText}</span>
                        <div class="val-val-disp font-mono text-[13px] font-extrabold text-amber-300 tracking-tight leading-none flex items-baseline justify-center w-full">${VALUE.formatValHtml(curVal, m.stepType)}</div>
                        <div class="h-1"></div>
                    </div>
                </div>
            </div>`;
    },

    updateLive: (cell, data, isP, modal, m) => {
        const cvs = cell?.querySelector('.val-canvas');
        if (cvs) {
            VALUE.drawWheel(cvs.getContext('2d'), cvs.width, cvs.height, m);
        }
        const valDisp = cell?.querySelector('.val-val-disp');
        if (valDisp && m) {
            const v = m.val ?? (m.def ?? 0.0);
            const html = VALUE.formatValHtml(v, m.stepType);
            if (valDisp._lastHtml !== html) {
                valDisp.innerHTML = html;
                valDisp._lastHtml = html;
            }
        }
        const labelDisp = cell?.querySelector('.val-label-disp');
        if (labelDisp && m) {
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

    drawWheel: (ctx, w, h, m) => {
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(cx, cy) - 3;
        const minVal = m.min ?? -1.0;
        const maxVal = m.max ?? 1.0;
        const curVal = m.val ?? (m.def ?? 0.0);

        // Track background circle
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Active value arc (from 7 o'clock to 5 o'clock = 135 deg to 405 deg)
        const startAngle = Math.PI * 0.75; // 135 deg
        const totalSpan = Math.PI * 1.5;   // 270 deg
        const span = maxVal > minVal ? (maxVal - minVal) : 1;
        const pct = Math.max(0, Math.min(1, (curVal - minVal) / span));
        const endAngle = startAngle + totalSpan * pct;

        if (pct > 0.005) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, endAngle);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // Notch marks on perimeter (12 subtle tick marks)
        ctx.save();
        ctx.translate(cx, cy);
        for (let i = 0; i <= 10; i++) {
            const a = startAngle + (totalSpan / 10) * i;
            const x1 = Math.cos(a) * (r - 4);
            const y1 = Math.sin(a) * (r - 4);
            const x2 = Math.cos(a) * (r - 7);
            const y2 = Math.sin(a) * (r - 7);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    },

    bindGridEvents: (cell, m, ctx, onChange) => {
        const valBox = cell.querySelector('.val-box');
        if (!valBox) return;

        let isInteracting = false;
        let startY = 0;
        let startVal = 0;
        let min = m.min ?? -1.0;
        let max = m.max ?? 1.0;
        let step = m.step ?? 0.01;

        const initCvs = cell.querySelector('.val-canvas');
        if (initCvs) {
            VALUE.drawWheel(initCvs.getContext('2d'), initCvs.width, initCvs.height, m);
        }

        const updateVal = (newVal) => {
            const clamped = Math.max(min, Math.min(max, newVal));
            if (m.val === clamped) return;
            m.val = clamped;

            // Direct DOM update for high-speed responsiveness
            const valDisp = cell.querySelector('.val-val-disp');
            if (valDisp) {
                const html = VALUE.formatValHtml(clamped, m.stepType);
                valDisp.innerHTML = html;
                valDisp._lastHtml = html;
            }
            const cvs = cell.querySelector('.val-canvas');
            if (cvs) VALUE.drawWheel(cvs.getContext('2d'), cvs.width, cvs.height, m);

            onChange?.();
        };

        const handleDown = (clientY) => {
            isInteracting = true;
            startY = clientY;
            startVal = m.val ?? (m.def ?? 0.0);
            min = m.min ?? -1.0;
            max = m.max ?? 1.0;
            step = m.step ?? 0.01;
            if (m.stepType === '1semi') step = 1.0 / 12.0;
        };

        const handleMove = (clientY) => {
            if (!isInteracting) return;
            const deltaY = startY - clientY;
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
