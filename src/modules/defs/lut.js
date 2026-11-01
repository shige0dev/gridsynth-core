import { UIHelpers } from '../../ui/helpers.js?v=351';

export const LUT = {
    color: 'teal',
    defaults: () => ({
        type: 'LUT',
        divisions: 16,     // 16, 32, 64, 256
        interp: 'linear',  // 'step' | 'linear'
        table: Array.from({ length: 256 }, (_, i) => i / 255),
        name: 'LUT'
    }),
    ports: () => ({
        in: [{ port: 'cv_in', pin: 5, color: 'bg-yellow-400' }],
        out: [{ port: 'cv_out', pin: 10, color: 'bg-yellow-400' }]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),

    renderGrid: (m) => {
        const curDiv = m.divisions || 16;
        const curInterp = (m.interp || 'linear').toUpperCase();
        return `
            <div class="h-full flex flex-col justify-between py-1 select-none pointer-events-none">
                <div class="flex items-center justify-between px-1.5 pt-0.5">
                    <span class="text-[7px] font-mono text-teal-400 font-bold tracking-tight">${curDiv}DIV</span>
                    <span class="text-[6.5px] font-mono text-slate-400 font-bold">${curInterp.slice(0, 3)}</span>
                </div>
                <div class="relative w-full px-2 flex items-center justify-center my-auto">
                    <canvas id="lut-grid-canvas-${m.id}" class="w-[38px] h-[22px] bg-slate-950 rounded border border-teal-500/40" width="76" height="44"></canvas>
                </div>
                <div class="flex items-center justify-between px-1.5 pb-0.5 text-[6.5px] font-mono text-slate-500">
                    <span>IN</span>
                    <span>OUT</span>
                </div>
            </div>
        `;
    },

    drawCanvas: (cvs, m, activeIn = null, activeOut = null, isModal = false) => {
        if (!cvs) return;
        const ctx2d = cvs.getContext('2d');
        if (!ctx2d) return;

        const w = cvs.width;
        const h = cvs.height;
        ctx2d.clearRect(0, 0, w, h);

        const divs = m.divisions || 16;
        const isStep = m.interp === 'step';
        const table = Array.isArray(m.table) && m.table.length === 256
            ? m.table
            : Array.from({ length: 256 }, (_, i) => i / 255);

        // 1. Grid Guidelines (16 subdivisions)
        ctx2d.strokeStyle = isModal ? '#1e293b' : 'rgba(30, 41, 59, 0.6)';
        ctx2d.lineWidth = 1;
        const gridDivs = 16;
        for (let g = 1; g < gridDivs; g++) {
            const gx = (g / gridDivs) * w;
            ctx2d.beginPath();
            ctx2d.moveTo(gx, 0);
            ctx2d.lineTo(gx, h);
            ctx2d.stroke();
        }
        // Horizontal guidelines (0.25, 0.5, 0.75)
        for (let gy = 1; gy <= 3; gy++) {
            const y = (gy / 4) * h;
            ctx2d.beginPath();
            ctx2d.moveTo(0, y);
            ctx2d.lineTo(w, y);
            ctx2d.stroke();
        }

        // 2. Draw Table Bars / Fill
        const barW = w / divs;
        for (let d = 0; d < divs; d++) {
            const tableIdx = Math.floor((d / (divs - 1 || 1)) * 255);
            const val = Math.max(0, Math.min(1, table[tableIdx] ?? 0));
            const barH = val * (h - 2);
            const x = d * barW;
            const y = h - barH;

            // Bar background
            ctx2d.fillStyle = isModal ? 'rgba(20, 184, 166, 0.25)' : 'rgba(20, 184, 166, 0.2)';
            ctx2d.fillRect(x + 0.5, y, Math.max(1, barW - 1), barH);

            // Bar top line
            ctx2d.fillStyle = '#2dd4bf';
            ctx2d.fillRect(x + 0.5, y, Math.max(1, barW - 1), isModal ? 2 : 1.5);
        }

        // 3. Draw Continuous Line (Linear interpolation overlay if in LINEAR mode)
        if (!isStep) {
            ctx2d.strokeStyle = '#5eead4';
            ctx2d.lineWidth = isModal ? 2 : 1.5;
            ctx2d.beginPath();
            for (let d = 0; d < divs; d++) {
                const tableIdx = Math.floor((d / (divs - 1 || 1)) * 255);
                const val = Math.max(0, Math.min(1, table[tableIdx] ?? 0));
                const x = d * barW + barW * 0.5;
                const y = h - val * (h - 4) - 2;
                if (d === 0) ctx2d.moveTo(x, y);
                else ctx2d.lineTo(x, y);
            }
            ctx2d.stroke();
        }

        // 4. Live Playhead Indicator (active input & output)
        if (typeof activeIn === 'number' && activeIn >= 0 && activeIn <= 1) {
            const liveX = activeIn * w;
            ctx2d.strokeStyle = '#f59e0b'; // Amber cursor
            ctx2d.lineWidth = isModal ? 2 : 1.5;
            ctx2d.beginPath();
            ctx2d.moveTo(liveX, 0);
            ctx2d.lineTo(liveX, h);
            ctx2d.stroke();

            if (typeof activeOut === 'number') {
                const liveY = h - activeOut * (h - 4) - 2;
                ctx2d.fillStyle = '#fbbf24';
                ctx2d.beginPath();
                ctx2d.arc(liveX, liveY, isModal ? 4 : 2.5, 0, Math.PI * 2);
                ctx2d.fill();
            }
        }
    },

    updateLive: (cell, data, isPlaying, modalEl, m) => {
        const inVal = data?.inVal ?? 0;
        const outVal = data?.outVal ?? 0;

        // Update miniature cell canvas
        const cellCanvas = cell?.querySelector(`#lut-grid-canvas-${m.id}`) || document.getElementById(`lut-grid-canvas-${m.id}`);
        if (cellCanvas) {
            LUT.drawCanvas(cellCanvas, m, inVal, outVal, false);
        }

        // Update modal canvas
        if (modalEl) {
            const modalCanvas = modalEl.querySelector('#lut-modal-canvas') || document.getElementById('lut-modal-canvas');
            if (modalCanvas) {
                LUT.drawCanvas(modalCanvas, m, inVal, outVal, true);
            }
            const inDisp = modalEl.querySelector('#lut-modal-in-disp') || document.getElementById('lut-modal-in-disp');
            if (inDisp) inDisp.textContent = `${inVal.toFixed(3)}V`;
            const outDisp = modalEl.querySelector('#lut-modal-out-disp') || document.getElementById('lut-modal-out-disp');
            if (outDisp) outDisp.textContent = `${outVal.toFixed(3)}V`;
        }
    },

    renderModal: (m) => {
        const divs = m.divisions || 16;
        const interp = m.interp || 'linear';
        const divOptions = [16, 32, 64, 256];

        return `
            <div class="space-y-2 p-1 select-none w-full">
                <!-- Top controls: DIVISIONS & INTERP -->
                <div class="flex items-center justify-between gap-1 pb-1 border-b border-slate-800">
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] font-mono text-slate-400 font-bold uppercase">DIV:</span>
                        <div class="inline-flex rounded border border-slate-700 overflow-hidden">
                            ${divOptions.map(opt => `
                                <button class="lut-div-btn px-2 py-0.5 text-[8.5px] font-mono font-bold transition-colors ${divs === opt ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}" data-div="${opt}">
                                    ${opt}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] font-mono text-slate-400 font-bold uppercase">MODE:</span>
                        <div class="inline-flex rounded border border-slate-700 overflow-hidden">
                            <button id="lut-mode-step" class="px-2 py-0.5 text-[8.5px] font-mono font-bold transition-colors ${interp === 'step' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}">STEP</button>
                            <button id="lut-mode-linear" class="px-2 py-0.5 text-[8.5px] font-mono font-bold transition-colors ${interp === 'linear' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}">LINEAR</button>
                        </div>
                    </div>
                </div>

                <!-- Main Canvas (Oscilloscope Style with Touch Draw) -->
                <div class="relative bg-slate-950 p-1 rounded-lg border border-teal-500/40 shadow-inner w-full">
                    <div class="flex items-center justify-between text-[7.5px] font-mono text-slate-400 px-1 pb-0.5">
                        <span class="text-teal-400 font-bold">16-DIV GUIDELINE (TOUCH & DRAG TO SHAPE)</span>
                        <div>IN: <span id="lut-modal-in-disp" class="text-amber-400 font-bold">0.000V</span> | OUT: <span id="lut-modal-out-disp" class="text-teal-300 font-bold">0.000V</span></div>
                    </div>
                    <canvas id="lut-modal-canvas" class="w-full h-[140px] block rounded bg-slate-950 touch-none cursor-crosshair border border-slate-800" width="560" height="280"></canvas>
                </div>
            </div>
        `;
    },

    bindEvents: (m, ctx, cb) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;

        // Division buttons
        root.querySelectorAll('.lut-div-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newDiv = parseInt(e.currentTarget.dataset.div, 10);
                m.divisions = newDiv;
                ctx.reRenderModal();
                ctx.reRenderGrid?.();
                cb();
            });
        });

        // Interp buttons
        root.querySelector('#lut-mode-step')?.addEventListener('click', () => {
            m.interp = 'step';
            ctx.reRenderModal();
            ctx.reRenderGrid?.();
            cb();
        });
        root.querySelector('#lut-mode-linear')?.addEventListener('click', () => {
            m.interp = 'linear';
            ctx.reRenderModal();
            ctx.reRenderGrid?.();
            cb();
        });

        // Touch & Drag drawing on Canvas
        const canvas = root.querySelector('#lut-modal-canvas');
        if (canvas) {
            let isDrawing = false;
            let lastSlot = -1;

            const handlePointer = (e) => {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const normX = Math.max(0, Math.min(1, x / rect.width));
                const normY = Math.max(0, Math.min(1, 1.0 - (y / rect.height)));

                const divs = m.divisions || 16;
                const slot = Math.max(0, Math.min(divs - 1, Math.floor(normX * divs)));

                if (!Array.isArray(m.table) || m.table.length !== 256) {
                    m.table = Array.from({ length: 256 }, (_, i) => i / 255);
                }

                // If dragged across multiple slots, interpolate between lastSlot and slot
                const start = lastSlot === -1 ? slot : Math.min(lastSlot, slot);
                const end = lastSlot === -1 ? slot : Math.max(lastSlot, slot);

                for (let s = start; s <= end; s++) {
                    const tableIdx = Math.floor((s / (divs - 1 || 1)) * 255);
                    m.table[tableIdx] = normY;
                }

                // Interpolate whole table values between defined division anchors
                for (let i = 0; i < 256; i++) {
                    const pos = (i / 255) * (divs - 1);
                    const i0 = Math.floor(pos);
                    const i1 = Math.min(divs - 1, i0 + 1);
                    const frac = pos - i0;

                    const t0 = Math.floor((i0 / (divs - 1 || 1)) * 255);
                    const t1 = Math.floor((i1 / (divs - 1 || 1)) * 255);
                    const v0 = m.table[t0] ?? 0;
                    const v1 = m.table[t1] ?? 0;
                    m.table[i] = v0 + (v1 - v0) * frac;
                }

                lastSlot = slot;

                const fullId = `${ctx.currentPageId || 0}/${m.id}`;
                const inst = ctx.synth?.modules?.[fullId] || ctx.synth?.modules?.[m.id];
                if (inst?.nodes?.w?.port) {
                    inst.nodes.w.port.postMessage({ type: 'SET_TABLE', table: m.table });
                }

                LUT.drawCanvas(canvas, m, null, null, true);
                cb();
            };

            canvas.addEventListener('pointerdown', (e) => {
                isDrawing = true;
                lastSlot = -1;
                canvas.setPointerCapture(e.pointerId);
                handlePointer(e);
            });

            canvas.addEventListener('pointermove', (e) => {
                if (!isDrawing) return;
                handlePointer(e);
            });

            const stopDraw = (e) => {
                if (isDrawing) {
                    isDrawing = false;
                    lastSlot = -1;
                    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
                    ctx.reRenderGrid?.();
                }
            };

            canvas.addEventListener('pointerup', stopDraw);
            canvas.addEventListener('pointercancel', stopDraw);

            // Initial render
            LUT.drawCanvas(canvas, m, null, null, true);
        }
    }
};

export const lutDefs = {
    LUT
};
