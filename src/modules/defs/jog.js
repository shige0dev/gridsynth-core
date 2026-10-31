import { UIHelpers } from '../../ui/helpers.js?v=351';

export const JOG = {
    color: 'amber',
    defaults: () => ({
        type: 'JOG',
        val: 0.0,
        min: -1.0,
        max: 1.0,
        def: 0.0,
        step: 0.01,
        mode: 'latch', // 'latch' | 'spring'
        name: 'JOG'
    }),
    ports: () => ({
        in: [],
        out: [{ port: 'cv_out', pin: 11, color: 'bg-yellow-400' }]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),

    renderGrid: (m) => {
        const minVal = m.min ?? -1.0;
        const maxVal = m.max ?? 1.0;
        const curVal = m.val ?? (m.def ?? 0.0);

        const formatVal = (v) => {
            const num = Number(v);
            if (Math.abs(num) >= 100) return num.toFixed(0);
            if (Math.abs(num) >= 10) return num.toFixed(1);
            return num.toFixed(2);
        };

        return `
            <div class="jog-box relative w-full h-full flex flex-col items-center justify-between p-1 select-none overflow-hidden touch-none" data-module-id="${m.id}">
                <!-- Top MAX value -->
                <div class="w-full flex items-center justify-between px-1 pointer-events-none z-10">
                    <span class="text-[6.5px] font-mono text-slate-500 font-semibold tracking-tighter">MAX</span>
                    <span class="text-[7.5px] font-mono font-bold text-amber-500/80 leading-none">${formatVal(maxVal)}</span>
                </div>

                <!-- Center Wheel Canvas & Value Display -->
                <div class="relative w-full flex-1 my-0.5 flex items-center justify-center overflow-hidden">
                    <canvas class="jog-canvas block w-full h-full rounded bg-slate-950 border border-slate-800/80" width="100" height="70"></canvas>
                    <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                        <span class="jog-val-disp font-mono text-[13px] font-extrabold text-amber-300 tracking-tight leading-none">${formatVal(curVal)}</span>
                    </div>
                </div>

                <!-- Bottom MIN value -->
                <div class="w-full flex items-center justify-between px-1 pointer-events-none z-10">
                    <span class="text-[6.5px] font-mono text-slate-500 font-semibold tracking-tighter">MIN</span>
                    <span class="text-[7.5px] font-mono font-bold text-amber-500/80 leading-none">${formatVal(minVal)}</span>
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
            const num = Number(v);
            const str = Math.abs(num) >= 100 ? num.toFixed(0) : (Math.abs(num) >= 10 ? num.toFixed(1) : num.toFixed(2));
            if (valDisp.textContent !== str) valDisp.textContent = str;
        }

        const modalCvs = modal?.querySelector('#jog-modal-canvas');
        if (modalCvs) {
            JOG.drawWheel(modalCvs.getContext('2d'), modalCvs.width, modalCvs.height, m, true);
        }
        const modalValDisp = modal?.querySelector('#jog-modal-val');
        if (modalValDisp && m) {
            const v = m.val ?? (m.def ?? 0.0);
            const num = Number(v);
            const str = Math.abs(num) >= 100 ? num.toFixed(0) : (Math.abs(num) >= 10 ? num.toFixed(1) : num.toFixed(2));
            if (modalValDisp.textContent !== str) modalValDisp.textContent = str;
        }
    },

    drawWheel: (ctx, w, h, m, isModal = false) => {
        ctx.clearRect(0, 0, w, h);

        const minVal = m.min ?? -1.0;
        const maxVal = m.max ?? 1.0;
        const curVal = m.val ?? (m.def ?? 0.0);
        const range = Math.max(0.0001, maxVal - minVal);
        const norm = Math.max(0, Math.min(1, (curVal - minVal) / range)); // 0.0 (bottom) to 1.0 (top)

        // 1. Draw 3D Cylinder Background (Wheel cavity)
        const gradBg = ctx.createLinearGradient(0, 0, 0, h);
        gradBg.addColorStop(0, '#020617');
        gradBg.addColorStop(0.25, '#0f172a');
        gradBg.addColorStop(0.5, '#1e293b');
        gradBg.addColorStop(0.75, '#0f172a');
        gradBg.addColorStop(1, '#020617');
        ctx.fillStyle = gradBg;
        ctx.fillRect(0, 0, w, h);

        // 2. Side bevel borders
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(0, 0, 3, h);
        ctx.fillRect(w - 3, 0, 3, h);

        // 3. Cylinder Grooves / Knurling Lines
        // Grooves rotate based on norm value (phase shift)
        const numVisibleGrooves = 9;
        const spacing = h / (numVisibleGrooves - 1);
        const phaseOffset = (norm * h * 2.5) % spacing;

        ctx.lineWidth = isModal ? 1.5 : 1.0;
        for (let y = -spacing + phaseOffset; y <= h + spacing; y += spacing) {
            // Distance from vertical center (-1 to 1) for spherical cylinder shading
            const distFromMid = (y - h / 2) / (h / 2);
            if (Math.abs(distFromMid) > 1.0) continue;

            // Curved 3D perspective line
            const alpha = Math.cos(distFromMid * (Math.PI / 2.2));
            if (alpha <= 0.05) continue;

            // Highlight side
            ctx.strokeStyle = `rgba(245, 158, 11, ${(alpha * 0.45).toFixed(2)})`;
            ctx.beginPath();
            ctx.moveTo(4, y);
            ctx.lineTo(w - 4, y);
            ctx.stroke();

            // Shadow ridge right below highlight
            ctx.strokeStyle = `rgba(0, 0, 0, ${(alpha * 0.75).toFixed(2)})`;
            ctx.beginPath();
            ctx.moveTo(4, y + 1);
            ctx.lineTo(w - 4, y + 1);
            ctx.stroke();
        }

        // 4. Center Reference / Zero Marker Line
        const defVal = m.def ?? 0.0;
        const defNorm = Math.max(0, Math.min(1, (defVal - minVal) / range));
        const defY = (1.0 - defNorm) * h;
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
        ctx.lineWidth = 1.0;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(0, defY);
        ctx.lineTo(w, defY);
        ctx.stroke();
        ctx.setLineDash([]);
    },

    bindGridEvents: (cell, m, ui) => {
        const jogBox = cell.querySelector('.jog-box');
        if (!jogBox) return;

        let isInteracting = false;
        let startY = 0;
        let startVal = 0;
        let lastTapTime = 0;

        const updateVal = (newVal) => {
            const min = m.min ?? -1.0;
            const max = m.max ?? 1.0;
            const step = m.step ?? 0.01;
            let clamped = Math.max(min, Math.min(max, newVal));
            if (step > 0) {
                clamped = Math.round((clamped - min) / step) * step + min;
                clamped = Math.max(min, Math.min(max, clamped));
            }
            m.val = clamped;
            ui.synth.updateModule(`${ui.currentPageId}/${m.id}`, m);

            const valDisp = cell.querySelector('.jog-val-disp');
            if (valDisp) {
                const str = Math.abs(clamped) >= 100 ? clamped.toFixed(0) : (Math.abs(clamped) >= 10 ? clamped.toFixed(1) : clamped.toFixed(2));
                valDisp.textContent = str;
            }
            const cvs = cell.querySelector('.jog-canvas');
            if (cvs) JOG.drawWheel(cvs.getContext('2d'), cvs.width, cvs.height, m);
        };

        const handleDown = (clientY) => {
            const now = Date.now();
            if (now - lastTapTime < 280) {
                // Double tap: instant reset to DEFAULT
                updateVal(m.def ?? 0.0);
                lastTapTime = 0;
                return;
            }
            lastTapTime = now;

            isInteracting = true;
            startY = clientY;
            startVal = m.val ?? (m.def ?? 0.0);
        };

        const handleMove = (clientY) => {
            if (!isInteracting) return;
            const deltaY = startY - clientY; // upward drag increases value
            const min = m.min ?? -1.0;
            const max = m.max ?? 1.0;
            const range = max - min;
            // Drag sensitivity: 100px drag traverses the full range
            const sensitivity = range / 120.0;
            const targetVal = startVal + deltaY * sensitivity;
            updateVal(targetVal);
        };

        const handleUp = () => {
            if (!isInteracting) return;
            isInteracting = false;
            if (m.mode === 'spring') {
                updateVal(m.def ?? 0.0);
            }
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
        const curMin = m.min ?? -1.0;
        const curMax = m.max ?? 1.0;
        const curDef = m.def ?? 0.0;
        const curVal = m.val ?? curDef;
        const curMode = m.mode || 'latch';

        return `
            <div class="space-y-2 select-none">
                <!-- Wheel Display in Modal -->
                <div class="h-24 bg-slate-950 p-1.5 rounded-lg border border-slate-800 relative flex items-center justify-center overflow-hidden">
                    <canvas id="jog-modal-canvas" class="w-full h-full block rounded bg-slate-950" width="300" height="90"></canvas>
                    <div class="absolute inset-0 flex items-center justify-center pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                        <span id="jog-modal-val" class="font-mono text-xl font-extrabold text-amber-300">${curVal.toFixed(2)}</span>
                    </div>
                </div>

                <!-- Parameters: MIN, MAX, DEF -->
                <div class="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800">
                    <div class="bg-slate-950/70 border border-slate-800 rounded p-1.5 flex flex-col items-center">
                        <span class="text-[7.5px] font-bold text-slate-400">MIN</span>
                        <input id="jog-min-input" type="number" step="0.1" value="${curMin}" class="w-full bg-slate-900 border border-slate-700 rounded text-center text-[10px] font-mono text-amber-300 py-0.5 mt-0.5 focus:outline-none focus:border-amber-500">
                    </div>
                    <div class="bg-slate-950/70 border border-slate-800 rounded p-1.5 flex flex-col items-center">
                        <span class="text-[7.5px] font-bold text-slate-400">DEFAULT</span>
                        <input id="jog-def-input" type="number" step="0.1" value="${curDef}" class="w-full bg-slate-900 border border-slate-700 rounded text-center text-[10px] font-mono text-amber-300 py-0.5 mt-0.5 focus:outline-none focus:border-amber-500">
                    </div>
                    <div class="bg-slate-950/70 border border-slate-800 rounded p-1.5 flex flex-col items-center">
                        <span class="text-[7.5px] font-bold text-slate-400">MAX</span>
                        <input id="jog-max-input" type="number" step="0.1" value="${curMax}" class="w-full bg-slate-900 border border-slate-700 rounded text-center text-[10px] font-mono text-amber-300 py-0.5 mt-0.5 focus:outline-none focus:border-amber-500">
                    </div>
                </div>

                <!-- MODE Toggle: LATCH vs SPRING -->
                <div class="flex items-center justify-between px-1 pt-1 border-t border-slate-800">
                    <span class="text-[8.5px] font-bold text-slate-400 uppercase">RETURN MODE:</span>
                    <div class="flex items-center gap-1">
                        <button id="jog-mode-latch" class="h-5 px-2 rounded text-[8.5px] font-bold border transition ${curMode === 'latch' ? 'bg-amber-600 text-white border-amber-400 shadow-sm' : 'bg-slate-800 text-slate-400 border-slate-700'}">LATCH (保持)</button>
                        <button id="jog-mode-spring" class="h-5 px-2 rounded text-[8.5px] font-bold border transition ${curMode === 'spring' ? 'bg-amber-600 text-white border-amber-400 shadow-sm' : 'bg-slate-800 text-slate-400 border-slate-700'}">SPRING (自動復帰)</button>
                    </div>
                </div>
            </div>`;
    },

    bindEvents: (m, ctx, onChange) => {
        const updateParams = () => {
            const minEl = document.getElementById('jog-min-input');
            const maxEl = document.getElementById('jog-max-input');
            const defEl = document.getElementById('jog-def-input');

            if (minEl) m.min = parseFloat(minEl.value) || 0.0;
            if (maxEl) m.max = parseFloat(maxEl.value) || 1.0;
            if (defEl) m.def = parseFloat(defEl.value) || 0.0;
            if (m.min > m.max) [m.min, m.max] = [m.max, m.min];
            m.val = Math.max(m.min, Math.min(m.max, m.val ?? m.def));

            onChange();
        };

        ['jog-min-input', 'jog-max-input', 'jog-def-input'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', updateParams);
        });

        document.getElementById('jog-mode-latch')?.addEventListener('click', () => {
            m.mode = 'latch';
            ctx.reRenderModal();
            onChange();
        });

        document.getElementById('jog-mode-spring')?.addEventListener('click', () => {
            m.mode = 'spring';
            ctx.reRenderModal();
            onChange();
        });
    }
};
