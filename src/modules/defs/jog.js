import { UIHelpers } from '../../ui/helpers.js?v=351';
import { cvToNoteName } from '../../core/musical.js?v=367';

export const JOG = {
    color: 'amber',
    defaults: () => ({
        type: 'JOG',
        val: 0.0,
        min: -1.0,
        max: 1.0,
        def: 0.0,
        step: 0.01,
        stepType: '0.01', // '0.01' | '0.1' | '1semi' | '1' | '10'
        mode: 'latch',
        name: 'JOG'
    }),
    ports: () => ({
        in: [],
        out: [{ port: 'cv_out', pin: 10, color: 'bg-yellow-400' }]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),

    renderGrid: (m) => {
        const minVal = m.min ?? -1.0;
        const maxVal = m.max ?? 1.0;
        const curVal = m.val ?? (m.def ?? 0.0);

        const formatVal = (v) => {
            if (m.stepType === '1semi') {
                return cvToNoteName(v);
            }
            const num = Number(v);
            if (Math.abs(num) >= 100) return num.toFixed(0);
            if (Math.abs(num) >= 10) return num.toFixed(1);
            return num.toFixed(2);
        };

        return `
            <div class="jog-box relative w-full h-full flex flex-col items-center justify-center p-1 select-none overflow-hidden touch-none" data-module-id="${m.id}">
                <!-- Square Centered Wheel Container (54px x 54px) -->
                <div class="relative w-[54px] h-[54px] flex items-center justify-center overflow-hidden rounded bg-slate-950 border border-slate-800/90 shadow-inner">
                    <canvas class="jog-canvas block w-full h-full" width="54" height="54"></canvas>

                    <!-- Center Overlay: MAX at top-center, VAL at absolute center, MIN at bottom-center -->
                    <div class="absolute inset-0 flex flex-col items-center justify-between py-1 pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                        <span class="text-[6.5px] font-mono text-slate-400 font-semibold tracking-tighter leading-none">${m.stepType === '1semi' ? cvToNoteName(maxVal) : Number(maxVal).toFixed(1)}</span>
                        <span class="jog-val-disp font-mono text-[13.5px] font-extrabold text-amber-300 tracking-tight leading-none">${formatVal(curVal)}</span>
                        <span class="text-[6.5px] font-mono text-slate-400 font-semibold tracking-tighter leading-none">${m.stepType === '1semi' ? cvToNoteName(minVal) : Number(minVal).toFixed(1)}</span>
                    </div>
                </div>
            </div>`;
    },

    updateLive: (cell, data, isP, modal, m) => {
        const cvs = cell?.querySelector('.jog-canvas');
        if (cvs) {
            JOG.drawWheel(cvs.getContext('2d'), cvs.width, cvs.height, m);
        }
        const valDisp = cell?.querySelector('.jog-val-disp');
        if (valDisp && m) {
            const v = m.val ?? (m.def ?? 0.0);
            let str = '';
            if (m.stepType === '1semi') {
                str = cvToNoteName(v);
            } else {
                const num = Number(v);
                str = Math.abs(num) >= 100 ? num.toFixed(0) : (Math.abs(num) >= 10 ? num.toFixed(1) : num.toFixed(2));
            }
            if (valDisp.textContent !== str) valDisp.textContent = str;
        }

        // Live update for scrubbable badges in Modal
        if (modal && m) {
            const valEl = modal.querySelector('#jog-scrub-val');
            const maxEl = modal.querySelector('#jog-scrub-max');
            const defEl = modal.querySelector('#jog-scrub-def');
            const minEl = modal.querySelector('#jog-scrub-min');
            const fmt = (val) => m.stepType === '1semi' ? `${cvToNoteName(val)} (${Number(val).toFixed(2)})` : Number(val).toFixed(2);
            if (valEl && !valEl._isDragging) valEl.textContent = fmt(m.val ?? (m.def ?? 0.0));
            if (maxEl && !maxEl._isDragging) maxEl.textContent = fmt(m.max ?? 1.0);
            if (defEl && !defEl._isDragging) defEl.textContent = fmt(m.def ?? 0.0);
            if (minEl && !minEl._isDragging) minEl.textContent = fmt(m.min ?? -1.0);
        }
    },

    drawWheel: (ctx, w, h, m, isModal = false) => {
        ctx.clearRect(0, 0, w, h);

        const minVal = m.min ?? -1.0;
        const maxVal = m.max ?? 1.0;
        const curVal = m.val ?? (m.def ?? 0.0);
        const range = Math.max(0.0001, maxVal - minVal);
        const norm = Math.max(0, Math.min(1, (curVal - minVal) / range)); // 0.0 (bottom) to 1.0 (top)

        // 1. Draw 3D Cylinder Background (Solid metal/carbon body)
        const gradBg = ctx.createLinearGradient(0, 0, 0, h);
        gradBg.addColorStop(0, '#020617');
        gradBg.addColorStop(0.2, '#0f172a');
        gradBg.addColorStop(0.5, '#1e293b');
        gradBg.addColorStop(0.8, '#0f172a');
        gradBg.addColorStop(1, '#020617');
        ctx.fillStyle = gradBg;
        ctx.fillRect(0, 0, w, h);

        // 2. Beveled side edges
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(0, 0, 2, h);
        ctx.fillRect(w - 2, 0, 2, h);

        // 3. Cylinder Grooves / Knurling Lines in SOLID BLACK
        const numVisibleGrooves = 8;
        const spacing = h / (numVisibleGrooves - 1);
        const stepVal = (m.stepType === '1semi') ? (1.0 / 12.0) : (parseFloat(m.stepType) || m.step || 0.01);
        // Grooves follow steps rotated: each 1 step rotates the wheel by 1 groove spacing
        const stepsRotated = (curVal - minVal) / (stepVal > 0 ? stepVal : 0.01);
        const phaseOffset = ((stepsRotated * spacing) % spacing + spacing) % spacing;

        ctx.lineWidth = isModal ? 2.0 : 1.4;
        for (let y = -spacing + phaseOffset; y <= h + spacing; y += spacing) {
            const distFromMid = (y - h / 2) / (h / 2);
            if (Math.abs(distFromMid) > 1.0) continue;

            const alpha = Math.cos(distFromMid * (Math.PI / 2.2));
            if (alpha <= 0.05) continue;

            // Deep black engraved groove
            ctx.strokeStyle = `rgba(0, 0, 0, ${(alpha * 0.95).toFixed(2)})`;
            ctx.beginPath();
            ctx.moveTo(3, y);
            ctx.lineTo(w - 3, y);
            ctx.stroke();

            // Subtle lower highlight to give deep 3D cut impression
            ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.12).toFixed(2)})`;
            ctx.beginPath();
            ctx.moveTo(3, y + 1);
            ctx.lineTo(w - 3, y + 1);
            ctx.stroke();
        }

        // 4. Current Value Marker Line (Solid Yellow Line)
        const curY = (1.0 - norm) * h;
        ctx.strokeStyle = '#facc15'; // Vibrant solid yellow
        ctx.lineWidth = 1.6;
        ctx.setLineDash([]); // Ensure solid line (no dash)
        ctx.beginPath();
        ctx.moveTo(0, curY);
        ctx.lineTo(w, curY);
        ctx.stroke();
    },

    bindGridEvents: (cell, m, ui) => {
        const jogBox = cell.querySelector('.jog-box');
        if (!jogBox) return;

        // Render initial wheel visual immediately (even before audio starts / PLAY)
        const initCvs = cell.querySelector('.jog-canvas');
        if (initCvs) {
            JOG.drawWheel(initCvs.getContext('2d'), initCvs.width, initCvs.height, m);
        }

        let isInteracting = false;
        let startY = 0;
        let startVal = 0;

        const getStepValue = () => {
            if (m.stepType === '1semi') return 1.0 / 12.0; // 1 semitone
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
            ui.synth.updateModule(`${ui.currentPageId}/${m.id}`, m);

            const valDisp = cell.querySelector('.jog-val-disp');
            if (valDisp) {
                let str = '';
                if (m.stepType === '1semi') {
                    str = cvToNoteName(clamped);
                } else {
                    const num = Number(clamped);
                    str = Math.abs(num) >= 100 ? num.toFixed(0) : (Math.abs(num) >= 10 ? num.toFixed(1) : num.toFixed(2));
                }
                valDisp.textContent = str;
            }
            const cvs = cell.querySelector('.jog-canvas');
            if (cvs) JOG.drawWheel(cvs.getContext('2d'), cvs.width, cvs.height, m);
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

        jogBox.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.port')) return;
            e.stopPropagation();
            jogBox.setPointerCapture?.(e.pointerId);
            handleDown(e.clientY);
        });

        jogBox.addEventListener('pointermove', (e) => {
            if (!isInteracting) return;
            e.stopPropagation();
            handleMove(e.clientY);
        });

        const onPointerEnd = (e) => {
            if (!isInteracting) return;
            e.stopPropagation();
            try { jogBox.releasePointerCapture?.(e.pointerId); } catch (_) {}
            handleUp();
        };

        jogBox.addEventListener('pointerup', onPointerEnd);
        jogBox.addEventListener('pointercancel', onPointerEnd);
    },

    renderModal: (m) => {
        const curVal = m.val ?? (m.def ?? 0.0);
        const curMax = m.max ?? 1.0;
        const curDef = m.def ?? 0.0;
        const curMin = m.min ?? -1.0;
        const curStepType = m.stepType || '0.01';

        const fmt = (val) => curStepType === '1semi' ? `${cvToNoteName(val)} (${Number(val).toFixed(2)})` : Number(val).toFixed(2);

        const stepBtns = [
            { id: '0.01', label: '0.01' },
            { id: '0.1', label: '0.1' },
            { id: '1semi', label: '1semi' },
            { id: '1', label: '1' },
            { id: '10', label: '10' }
        ];

        return `
            <div class="space-y-2 select-none text-[9px]">
                <!-- STEP Button Group (Top-most) -->
                <div class="flex flex-col gap-1 bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-slate-400 tracking-wider">STEP (差分刻み)</span>
                        <span class="font-mono text-[8px] text-amber-400/80 font-bold">${curStepType === '1semi' ? '1半音 (1/12V)' : curStepType}</span>
                    </div>
                    <div class="grid grid-cols-5 gap-1 pt-0.5">
                        ${stepBtns.map(btn => `
                            <button class="jog-step-btn h-5 rounded font-mono font-bold text-[8.5px] border leading-none transition-colors ${curStepType === btn.id ? 'bg-amber-600 text-white border-amber-400 shadow-sm' : 'bg-slate-900 text-slate-400 border-slate-700/80 hover:text-slate-200'}" data-step="${btn.id}">
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
                    <div id="jog-scrub-val" class="cursor-ns-resize touch-none select-none px-2 py-0.5 rounded bg-slate-900 border border-amber-500/70 hover:border-amber-400 font-mono font-extrabold text-amber-300 min-w-[70px] text-right transition-colors" title="上下スワイプで増減 / タップで手入力">${fmt(curVal)}</div>
                </div>

                <!-- MAX Row -->
                <div class="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5">
                    <span class="font-bold text-slate-400 tracking-wider">MAX (最大値)</span>
                    <div id="jog-scrub-max" class="cursor-ns-resize touch-none select-none px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-amber-500 font-mono font-bold text-amber-300 min-w-[70px] text-right transition-colors" title="上下スワイプで増減 / タップで手入力">${fmt(curMax)}</div>
                </div>

                <!-- DEFAULT Row (Middle) -->
                <div class="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5">
                    <span class="font-bold text-slate-400 tracking-wider">DEFAULT (初期値)</span>
                    <div id="jog-scrub-def" class="cursor-ns-resize touch-none select-none px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:border-amber-500 font-mono font-bold text-amber-300 min-w-[70px] text-right transition-colors" title="上下スワイプで増減 / タップで手入力">${fmt(curDef)}</div>
                </div>

                <!-- MIN Row (Bottom) -->
                <div class="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5">
                    <span class="font-bold text-slate-400 tracking-wider">MIN (下限値)</span>
                    <div id="jog-scrub-min" class="cursor-ns-resize touch-none select-none px-2 py-0.5 rounded bg-slate-950 border border-slate-700 hover:border-amber-500 font-mono font-bold text-amber-300 min-w-[70px] text-right transition-colors" title="上下スワイプで増減 / タップで手入力">${fmt(curMin)}</div>
                </div>
            </div>`;
    },

    bindEvents: (m, ctx, onChange) => {
        // 1. STEP Button Group events
        document.querySelectorAll('.jog-step-btn').forEach(btn => {
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
                // 15px drag step
                const stepsCount = Math.round(deltaY / 15);
                let targetVal = startVal + stepsCount * stepAmount;

                m[propKey] = targetVal;
                if (m.min !== undefined && m.max !== undefined && m.min > m.max) {
                    if (propKey === 'min') m.max = m.min;
                    else if (propKey === 'max') m.min = m.max;
                }
                m.val = Math.max(m.min ?? -1.0, Math.min(m.max ?? 1.0, m.val ?? (m.def ?? 0.0)));

                const fmt = (v) => m.stepType === '1semi' ? `${cvToNoteName(v)} (${Number(v).toFixed(2)})` : Number(v).toFixed(2);
                el.textContent = fmt(m[propKey]);
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

        setupScrub('jog-scrub-val', 'val', 'VALUE (現在値)');
        setupScrub('jog-scrub-max', 'max', 'MAX (最大値)');
        setupScrub('jog-scrub-def', 'def', 'DEFAULT (初期値)');
        setupScrub('jog-scrub-min', 'min', 'MIN (下限値)');
    }
};

