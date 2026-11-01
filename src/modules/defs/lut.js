import { UIHelpers } from '../../ui/helpers.js?v=351';

export const LUT = {
    color: 'teal',
    defaults: () => {
        // Default stepped table for 16 divisions (slot s is s / divs: 0/16, 1/16, 2/16, ...)
        const divs = 16;
        const slotW = 256 / divs;
        const table = new Array(256);
        for (let s = 0; s < divs; s++) {
            const v = s / divs;
            for (let i = s * slotW; i < (s + 1) * slotW; i++) {
                table[i] = v;
            }
        }
        return {
            type: 'LUT',
            divisions: 16,     // 16, 32, 64, 256
            quantize: false,   // Pitch quantize to 1V/Oct semitones (1/12V)
            table,
            name: 'LUT'
        };
    },
    ports: () => ({
        in: [{ port: 'cv_in', pin: 5, color: 'bg-yellow-400' }],
        out: [{ port: 'cv_out', pin: 10, color: 'bg-yellow-400' }]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),

    renderGrid: (m) => {
        return `
            <div class="flex items-center justify-center w-full h-full pointer-events-none">
                <div class="w-14 h-7 rounded border border-slate-600 bg-slate-950 p-[1px] relative flex items-center justify-center shadow-inner panel-bar-slot">
                    <canvas id="lut-grid-canvas-${m.id}" class="w-full h-full block rounded-[3px] bg-slate-950" width="112" height="56"></canvas>
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
        const isQ = m.quantize === true;
        const slotW256 = 256 / divs;
        let table = m.table;
        if (!Array.isArray(table) || table.length !== 256) {
            table = new Array(256);
            for (let s = 0; s < divs; s++) {
                const v = s / divs;
                for (let i = s * slotW256; i < (s + 1) * slotW256; i++) {
                    table[i] = v;
                }
            }
            m.table = table;
        }

        // 1. Grid Guidelines
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

        // Semitone pitch horizontal reference lines when Quantize is ON (12 semitones per octave)
        if (isQ && isModal) {
            ctx2d.strokeStyle = 'rgba(245, 158, 11, 0.12)';
            for (let s = 1; s < 12; s++) {
                const sy = h - (s / 12) * h;
                ctx2d.beginPath();
                ctx2d.moveTo(0, sy);
                ctx2d.lineTo(w, sy);
                ctx2d.stroke();
            }
        }

        // 2. Draw Table Bars / Fill (Step Mode)
        const barW = w / divs;
        for (let d = 0; d < divs; d++) {
            const tableIdx = Math.min(255, Math.floor(d * slotW256));
            let val = Math.max(0, Math.min(1, table[tableIdx] ?? 0));
            if (isQ) {
                val = Math.round(val * 12) / 12.0;
            }
            const barH = val * (h - 2);
            const x = d * barW;
            const y = h - barH;

            // Bar background
            ctx2d.fillStyle = isModal
                ? (isQ ? 'rgba(245, 158, 11, 0.22)' : 'rgba(20, 184, 166, 0.25)')
                : (isQ ? 'rgba(245, 158, 11, 0.18)' : 'rgba(20, 184, 166, 0.2)');
            ctx2d.fillRect(x + 0.5, y, Math.max(1, barW - 1), barH);

            // Bar top line
            ctx2d.fillStyle = isQ ? '#fbbf24' : '#2dd4bf';
            ctx2d.fillRect(x + 0.5, y, Math.max(1, barW - 1), isModal ? 2 : 1.5);
        }

        // 3. Live Playhead Indicator (active input & output)
        if (typeof activeIn === 'number' && activeIn >= 0 && activeIn <= 1) {
            const barW = w / divs;
            const curSlot = Math.max(0, Math.min(divs - 1, Math.floor(activeIn * divs + 0.0001)));
            const liveX = curSlot * barW + barW * 0.5;
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
        const isQ = m.quantize === true;
        const divOptions = [16, 32, 64, 256];

        return `
            <div class="space-y-2 p-1 select-none w-full">
                <!-- Top controls: DIVISIONS & QUANTIZE -->
                <div class="flex items-center justify-between gap-1 pb-1 border-b border-slate-800">
                    <div class="flex items-center gap-1 shrink-0">
                        <span class="text-[8.5px] font-mono text-slate-400 font-bold uppercase">DIV:</span>
                        <div class="inline-flex rounded border border-slate-700 overflow-hidden">
                            ${divOptions.map(opt => `
                                <button class="lut-div-btn px-2.5 py-0.5 text-[9px] font-mono font-bold transition-colors ${divs === opt ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}" data-div="${opt}">
                                    ${opt}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <button id="lut-quantize-btn" class="h-6 px-3 rounded-md text-[9.5px] font-mono font-bold border transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${isQ ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.6)]' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'}" title="1V/Oct 半音音程クオンタイズ (1/12Vステップにスナップ)">
                            <span>♯ PITCH QNT:</span>
                            <span class="font-black ${isQ ? 'text-yellow-200' : 'text-slate-400'}">${isQ ? 'ON' : 'OFF'}</span>
                        </button>
                    </div>
                </div>

                <!-- Main Canvas (Step Mode with Touch Draw) -->
                <div class="relative bg-slate-950 p-1 rounded-lg border border-teal-500/40 shadow-inner w-full">
                    <div class="flex items-center justify-between text-[7.5px] font-mono text-slate-400 px-1 pb-0.5">
                        <span class="text-teal-400 font-bold">${divs}-DIV STEP (TOUCH & DRAG TO SHAPE)</span>
                        <div>IN: <span id="lut-modal-in-disp" class="text-amber-400 font-bold">0.000V</span> | OUT: <span id="lut-modal-out-disp" class="text-teal-300 font-bold">0.000V</span></div>
                    </div>
                    <canvas id="lut-modal-canvas" class="w-full h-[106px] block rounded bg-slate-950 touch-none cursor-crosshair border border-slate-800" width="560" height="212"></canvas>
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

        // Quantize button toggle
        root.querySelector('#lut-quantize-btn')?.addEventListener('click', () => {
            m.quantize = !m.quantize;
            const fullId = `${ctx.currentPageId || 0}/${m.id}`;
            const inst = ctx.synth?.modules?.[fullId] || ctx.synth?.modules?.[m.id];
            if (inst?.nodes?.w?.port) {
                inst.nodes.w.port.postMessage({ type: 'SET_QUANTIZE', value: m.quantize });
            }
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
                    m.table = new Array(256);
                    const slotW = 256 / divs;
                    for (let s = 0; s < divs; s++) {
                        const v = s / divs;
                        for (let i = s * slotW; i < (s + 1) * slotW; i++) {
                            m.table[i] = v;
                        }
                    }
                }

                // If dragged across multiple slots, assign normY to all slots
                const start = lastSlot === -1 ? slot : Math.min(lastSlot, slot);
                const end = lastSlot === -1 ? slot : Math.max(lastSlot, slot);

                const slotW256 = 256 / divs;
                for (let s = start; s <= end; s++) {
                    const iStart = Math.floor(s * slotW256);
                    const iEnd = Math.min(256, Math.floor((s + 1) * slotW256));
                    for (let i = iStart; i < iEnd; i++) {
                        m.table[i] = normY;
                    }
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
