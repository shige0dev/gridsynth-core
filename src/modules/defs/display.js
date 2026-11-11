// src/modules/defs/display.js
// DISPLAY - Video Buffer Viewport with N x N Grid Tile Selector (CV X/Y Driven)
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const DISPLAY = {
    color: 'emerald',
    defaults: () => ({
        type: 'DISPLAY',
        divN: 1,     // Division N x N (1, 2, 3, 4)
        tileX: 0.0,  // Manual X position (0.0 to 1.0)
        tileY: 0.0   // Manual Y position (0.0 to 1.0)
    }),
    ports: () => ({
        in: [
            { port: 'cv_div', pin: 2, color: 'bg-yellow-400', label: 'DIV' },
            { port: 'cv_y', pin: 3, color: 'bg-yellow-400', label: 'Y' },
            { port: 'cv_x', pin: 4, color: 'bg-yellow-400', label: 'X' },
            { port: 'video_in', pin: 5, color: 'bg-emerald-500', label: 'VID' }
        ],
        out: [
            { port: 'video_out', pin: 10, color: 'bg-emerald-500', label: 'VID' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    // Cell grid: Full-slot display matching SCOPE / PAD (stealth text-slate-700 header via controller.js)
    renderGrid: (m, ctx) => `
        <div class="absolute inset-[1px] bg-black overflow-hidden z-0 pointer-events-none select-none">
            <canvas class="display-panel-canvas w-full h-full block" width="100" height="100"></canvas>
        </div>`,
    // Modal: N x N Division selector (Numeric Only) + X/Y Cartesian Sliders around Viewfinder
    renderModal: (m, ctx) => {
        const divN = Math.max(1, Math.min(4, Math.round(m.divN ?? 1)));
        const posX = Number(m.tileX ?? 0.0);
        const posY = Number(m.tileY ?? 0.0);

        const isCvX = Boolean(ctx?.patched?.has('cv_x'));
        const isCvY = Boolean(ctx?.patched?.has('cv_y'));
        const isCvDiv = Boolean(ctx?.patched?.has('cv_div'));

        return `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <!-- Section 1: NxN Division Numerical Selector (数値選定・スライダ不要) -->
            <div class="flex items-center justify-between border-b border-slate-800 pb-1.5 px-0.5">
                <span class="text-[9px] font-mono font-bold text-emerald-400">DIV (分割数)</span>
                <div class="flex items-center gap-1.5">
                    <span id="disp-div-disp" class="font-bold text-cyan-300 text-[10.5px] px-2 py-0.5 bg-slate-950 rounded border border-slate-800">${divN} x ${divN}</span>
                    <button id="disp-btn-div-dec" class="w-6 h-5 rounded bg-slate-800 hover:bg-slate-700 active:bg-emerald-600 border border-slate-700 text-slate-200 text-xs font-bold font-mono flex items-center justify-center transition leading-none select-none ${isCvDiv ? 'opacity-35 pointer-events-none' : ''}">-</button>
                    <button id="disp-btn-div-inc" class="w-6 h-5 rounded bg-slate-800 hover:bg-slate-700 active:bg-emerald-600 border border-slate-700 text-slate-200 text-xs font-bold font-mono flex items-center justify-center transition leading-none select-none ${isCvDiv ? 'opacity-35 pointer-events-none' : ''}">+</button>
                    ${isCvDiv ? `<span id="disp-active-badge" class="text-[8.5px] font-mono font-bold text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-600/50 shrink-0">[CV]</span>` : `<span id="disp-active-badge" class="hidden"></span>`}
                </div>
            </div>

            <!-- Section 2: Viewfinder Preview + Cartesian Y/X Sliders (近傍配置) -->
            <div class="flex flex-col items-center gap-1.5 pt-0.5">
                <!-- Top Row: Y Vertical Slider + Viewfinder Canvas -->
                <div class="flex items-center gap-2">
                    <!-- Y Vertical Slider Column -->
                    <div class="flex flex-col items-center gap-0.5 w-6">
                        <span class="text-[8px] font-mono font-bold text-slate-400">Y</span>
                        <input type="range" id="disp-slide-y" min="0" max="1" step="0.01" value="${posY}" 
                               class="cursor-pointer accent-cyan-400 h-[116px] w-3" 
                               style="writing-mode: vertical-lr;" ${isCvY ? 'disabled' : ''}>
                        <span id="disp-val-y" class="text-[7.5px] font-mono font-bold text-cyan-300 text-center">${posY.toFixed(2)}${isCvY ? '*' : ''}</span>
                    </div>

                    <!-- Canvas Box (130x130 Compact Viewfinder) -->
                    <div class="relative w-[130px] h-[130px] bg-black border border-slate-800 rounded overflow-hidden flex items-center justify-center shrink-0">
                        <canvas class="display-modal-canvas w-full h-full block bg-black" width="130" height="130"></canvas>
                    </div>
                </div>

                <!-- Bottom Row: X Horizontal Slider (Aligned directly under Viewfinder Canvas) -->
                <div class="flex items-center gap-2">
                    <div class="w-6 flex justify-end">
                        <span class="text-[8px] font-mono font-bold text-slate-400">X</span>
                    </div>
                    <div class="w-[130px] flex items-center gap-1">
                        <input type="range" id="disp-slide-x" min="0" max="1" step="0.01" value="${posX}" 
                               class="flex-1 h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400" ${isCvX ? 'disabled' : ''}>
                        <span id="disp-val-x" class="text-[7.5px] font-mono font-bold text-cyan-300 w-6 text-right shrink-0">${posX.toFixed(2)}${isCvX ? '*' : ''}</span>
                    </div>
                </div>
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;

        const sliderX = root.querySelector('#disp-slide-x');
        const sliderY = root.querySelector('#disp-slide-y');
        const valXDisp = root.querySelector('#disp-val-x');
        const valYDisp = root.querySelector('#disp-val-y');

        if (sliderX) {
            sliderX.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                m.tileX = val;
                if (valXDisp) valXDisp.textContent = val.toFixed(2);
                onChange?.();
            });
        }

        if (sliderY) {
            sliderY.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                m.tileY = val;
                if (valYDisp) valYDisp.textContent = val.toFixed(2);
                onChange?.();
            });
        }

        const divDisp = root.querySelector('#disp-div-disp');
        const btnDec = root.querySelector('#disp-btn-div-dec');
        if (btnDec) {
            btnDec.addEventListener('click', () => {
                m.divN = Math.max(1, (m.divN ?? 1) - 1);
                if (divDisp) divDisp.textContent = `${m.divN} x ${m.divN}`;
                ctx.reRenderModal?.();
                onChange?.();
            });
        }

        const btnInc = root.querySelector('#disp-btn-div-inc');
        if (btnInc) {
            btnInc.addEventListener('click', () => {
                m.divN = Math.min(4, (m.divN ?? 1) + 1);
                if (divDisp) divDisp.textContent = `${m.divN} x ${m.divN}`;
                ctx.reRenderModal?.();
                onChange?.();
            });
        }
    },
    updateLive: (cell, data, isPlaying, modal, m) => {
        if (!cell || !data) return;

        const srcCanvas = data.canvas;
        const divN = Math.max(1, Math.min(4, data.divN ?? m.divN ?? 1));
        const col = Math.min(divN - 1, Math.max(0, data.col ?? 0));
        const row = Math.min(divN - 1, Math.max(0, data.row ?? 0));

        let sx = 0, sy = 0, sw = 100, sh = 100;
        let cropX = 0, cropY = 0;
        let tileW = 100, tileH = 100;
        if (srcCanvas) {
            tileW = srcCanvas.width / divN;
            tileH = srcCanvas.height / divN;
            if (divN > 1) {
                // Geometric bezel compensation:
                // Grid cell pitch P = cellW (82px) + gap (6px) = 88px.
                // Visible display canvas W = cellW - 2px (inset 1px) = 80px.
                // Inactive bezel gap D = P - W = 8px.
                // Margin crop ratio per border = (P - W) / (2 * P) = 8 / 176 ~= 0.04545 (4.545%).
                const cellW = cell.clientWidth || 82;
                const gap = 6;
                const pitch = cellW + gap;
                const dispW = (cell.querySelector('.display-panel-canvas')?.clientWidth || (cellW - 2)) || 80;
                const marginRatio = pitch > dispW ? (pitch - dispW) / (2 * pitch) : (8 / (2 * 88));
                cropX = tileW * marginRatio;
                cropY = tileH * marginRatio;
            }
            sx = col * tileW + cropX;
            sy = row * tileH + cropY;
            sw = tileW - (cropX * 2);
            sh = tileH - (cropY * 2);
        }

        // 1. Render to cell canvas (Display the selected tile)
        const cvs = cell.querySelector('.display-panel-canvas');
        if (cvs) {
            const ctx = cvs.getContext('2d');
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            if (srcCanvas) {
                ctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, cvs.width, cvs.height);
            } else {
                ctx.fillStyle = '#020617';
                ctx.fillRect(0, 0, cvs.width, cvs.height);
            }
        }

        // 2. Render to modal preview canvas with N x N grid and emerald highlight box (130x130 Compact Viewfinder)
        if (modal) {
            const mCvs = modal.querySelector('.display-modal-canvas');
            if (mCvs && srcCanvas) {
                const mw = 130, mh = 130;
                if (mCvs.width !== mw || mCvs.height !== mh) {
                    mCvs.width = mw;
                    mCvs.height = mh;
                }
                const mCtx = mCvs.getContext('2d');
                mCtx.clearRect(0, 0, mw, mh);

                // Draw source buffer
                mCtx.drawImage(srcCanvas, 0, 0, srcCanvas.width, srcCanvas.height, 0, 0, mw, mh);

                // Draw N x N division grid lines
                mCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                mCtx.lineWidth = 1.0;
                mCtx.setLineDash([3, 3]);

                const cellMw = mw / divN;
                const cellMh = mh / divN;

                for (let i = 1; i < divN; i++) {
                    // Vertical grid line
                    mCtx.beginPath();
                    mCtx.moveTo(i * cellMw, 0);
                    mCtx.lineTo(i * cellMw, mh);
                    mCtx.stroke();
                    // Horizontal grid line
                    mCtx.beginPath();
                    mCtx.moveTo(0, i * cellMh);
                    mCtx.lineTo(mw, i * cellMh);
                    mCtx.stroke();
                }
                mCtx.setLineDash([]); // Reset line dash

                // Dim areas outside selected tile
                const rx = col * cellMw;
                const ry = row * cellMh;
                const rw = cellMw;
                const rh = cellMh;

                mCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                mCtx.fillRect(0, 0, mw, ry); // top
                mCtx.fillRect(0, ry + rh, mw, mh - (ry + rh)); // bottom
                mCtx.fillRect(0, ry, rx, rh); // left
                mCtx.fillRect(rx + rw, ry, mw - (rx + rw), rh); // right

                // Highlight bounding box on selected tile (Emerald)
                mCtx.strokeStyle = '#10b981';
                mCtx.lineWidth = 2.0;
                mCtx.strokeRect(rx, ry, rw, rh);

                // Corner ticks
                const tick = 5;
                mCtx.strokeStyle = '#a7f3d0';
                mCtx.lineWidth = 2.0;
                mCtx.beginPath(); mCtx.moveTo(rx, ry + tick); mCtx.lineTo(rx, ry); mCtx.lineTo(rx + tick, ry); mCtx.stroke();
                mCtx.beginPath(); mCtx.moveTo(rx + rw - tick, ry); mCtx.lineTo(rx + rw); mCtx.lineTo(rx + rw, ry + tick); mCtx.stroke();
                mCtx.beginPath(); mCtx.moveTo(rx, ry + rh - tick); mCtx.lineTo(rx, ry + rh); mCtx.lineTo(rx + tick, ry + rh); mCtx.stroke();
                mCtx.beginPath(); mCtx.moveTo(rx + rw - tick, ry + rh); mCtx.lineTo(rx + rw); mCtx.lineTo(rx + rw, ry + rh - tick); mCtx.stroke();

                // Bezel compensation active viewport indicator (dashed sky-blue rectangle)
                if (divN > 1 && cropX > 0 && tileW > 0) {
                    const mCropX = cellMw * (cropX / tileW);
                    const mCropY = cellMh * (cropY / tileH);
                    mCtx.save();
                    mCtx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
                    mCtx.lineWidth = 1.2;
                    mCtx.setLineDash([2, 2]);
                    mCtx.strokeRect(rx + mCropX, ry + mCropY, rw - mCropX * 2, rh - mCropY * 2);
                    mCtx.restore();
                }
            }

            // Update CV badge in modal
            const badge = modal.querySelector('#disp-active-badge');
            if (badge) {
                if (data.isCvDiv) {
                    badge.textContent = '[CV]';
                    badge.classList.remove('hidden');
                } else {
                    badge.textContent = '';
                    badge.classList.add('hidden');
                }
            }

            // Sync division display in modal if CV driven
            const divDisp = modal.querySelector('#disp-div-disp');
            if (divDisp && data.isCvDiv) {
                divDisp.textContent = `${divN} x ${divN}`;
            }

            const valXDisp = modal.querySelector('#disp-val-x');
            const valYDisp = modal.querySelector('#disp-val-y');
            const slideX = modal.querySelector('#disp-slide-x');
            const slideY = modal.querySelector('#disp-slide-y');

            if (data.isCvX) {
                if (valXDisp) valXDisp.textContent = `${(data.posX ?? 0).toFixed(2)} [CV]`;
                if (slideX) slideX.value = data.posX ?? 0;
            }
            if (data.isCvY) {
                if (valYDisp) valYDisp.textContent = `${(data.posY ?? 0).toFixed(2)} [CV]`;
                if (slideY) slideY.value = data.posY ?? 0;
            }
        }
    }
};

export const displayDefs = {
    DISPLAY
};
export default displayDefs;
