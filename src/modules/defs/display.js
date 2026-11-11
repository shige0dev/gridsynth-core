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
            { port: 'video_out', pin: 11, color: 'bg-emerald-500', label: 'VID' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    // Cell grid: Full-slot display matching SCOPE / PAD (stealth text-slate-700 header via controller.js)
    renderGrid: (m, ctx) => `
        <div class="absolute inset-[2px] bg-black overflow-hidden z-0 pointer-events-none select-none">
            <canvas class="display-panel-canvas w-full h-full block" width="100" height="100"></canvas>
            <div class="absolute bottom-0.5 left-0.5 bg-slate-950/85 px-1 py-0.5 rounded-xs border border-slate-800 flex items-center gap-1 text-[7px] font-mono leading-none pointer-events-none drop-shadow-md">
                <span class="disp-panel-div text-emerald-400 font-bold">${m.divN ?? 1}x${m.divN ?? 1}</span>
                <span class="disp-panel-tile text-cyan-300 font-semibold">[1,1]</span>
            </div>
        </div>`,
    // Modal: N x N Division selector + X/Y 0-1 Tile Selector + Live Highlight Viewfinder
    renderModal: (m, ctx) => {
        const divN = Math.max(1, Math.min(4, Math.round(m.divN ?? 1)));
        const posX = Number(m.tileX ?? 0.0);
        const posY = Number(m.tileY ?? 0.0);
        const col = Math.min(divN - 1, Math.max(0, Math.floor(posX * divN)));
        const row = Math.min(divN - 1, Math.max(0, Math.floor(posY * divN)));

        const isCvX = Boolean(ctx?.patched?.has('cv_x'));
        const isCvY = Boolean(ctx?.patched?.has('cv_y'));
        const isCvDiv = Boolean(ctx?.patched?.has('cv_div'));

        return `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <!-- Viewfinder Preview with N x N Grid and Highlight -->
            <div class="flex justify-center items-center bg-black border border-slate-800 rounded p-1 w-[128px] h-[128px] mx-auto overflow-hidden">
                <canvas class="display-modal-canvas block rounded bg-black" width="120" height="120"></canvas>
            </div>

            <!-- Section 1: NxN Division Selector -->
            <div class="flex items-center gap-2 border-t border-slate-800 pt-1.5 px-0.5">
                <span class="text-[9.5px] font-mono font-bold text-emerald-400 shrink-0">NxN:</span>
                <div class="flex gap-1 flex-1">
                    <button data-div="1" class="disp-div-btn flex-1 py-1 rounded text-[10px] font-mono font-bold border transition ${divN === 1 ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">1</button>
                    <button data-div="2" class="disp-div-btn flex-1 py-1 rounded text-[10px] font-mono font-bold border transition ${divN === 2 ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">2</button>
                    <button data-div="3" class="disp-div-btn flex-1 py-1 rounded text-[10px] font-mono font-bold border transition ${divN === 3 ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">3</button>
                    <button data-div="4" class="disp-div-btn flex-1 py-1 rounded text-[10px] font-mono font-bold border transition ${divN === 4 ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">4</button>
                </div>
                <span id="disp-active-badge" class="text-[8.5px] font-mono font-bold text-emerald-300 bg-emerald-950 px-1 py-0.5 rounded border border-emerald-600/50 shrink-0">
                    TILE (${col + 1}, ${row + 1})${isCvDiv ? ' [CV]' : ''}
                </span>
            </div>

            <!-- Section 2: Tile Selection Coordinates (X, Y in 0..1) -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <span class="text-[8.5px] font-mono font-bold text-cyan-400">TILE SELECT (X / Y 入力 0.0〜1.0)</span>
                <div class="grid grid-cols-2 gap-2 text-[8.5px] font-mono">
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between items-center text-slate-400">
                            <span>POS X (PIN4)</span>
                            <span id="disp-val-x" class="font-bold text-cyan-300">${posX.toFixed(2)}${isCvX ? ' [CV]' : ''}</span>
                        </div>
                        <input type="range" id="disp-slide-x" min="0" max="1" step="0.01" value="${posX}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between items-center text-slate-400">
                            <span>POS Y (PIN3)</span>
                            <span id="disp-val-y" class="font-bold text-cyan-300">${posY.toFixed(2)}${isCvY ? ' [CV]' : ''}</span>
                        </div>
                        <input type="range" id="disp-slide-y" min="0" max="1" step="0.01" value="${posY}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-400">
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

        root.querySelectorAll('.disp-div-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const n = parseInt(e.currentTarget.dataset.div, 10);
                m.divN = n;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });
    },
    updateLive: (cell, data, isPlaying, modal, m) => {
        if (!cell || !data) return;

        const srcCanvas = data.canvas;
        const divN = Math.max(1, Math.min(4, data.divN ?? m.divN ?? 1));
        const col = Math.min(divN - 1, Math.max(0, data.col ?? 0));
        const row = Math.min(divN - 1, Math.max(0, data.row ?? 0));

        let sx = 0, sy = 0, sw = 100, sh = 100;
        if (srcCanvas) {
            const tileW = srcCanvas.width / divN;
            const tileH = srcCanvas.height / divN;
            sx = col * tileW;
            sy = row * tileH;
            sw = tileW;
            sh = tileH;
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

        // Panel Status Overlay (NxN and Tile position)
        const panelDiv = cell.querySelector('.disp-panel-div');
        if (panelDiv) {
            panelDiv.textContent = `${divN}x${divN}${data.isCvDiv ? '*' : ''}`;
        }
        const panelTile = cell.querySelector('.disp-panel-tile');
        if (panelTile) {
            panelTile.textContent = `[${col + 1},${row + 1}]`;
        }

        // 2. Render to modal preview canvas with N x N grid and emerald highlight box
        if (modal) {
            const mCvs = modal.querySelector('.display-modal-canvas');
            if (mCvs && srcCanvas) {
                const aspect = srcCanvas.width / srcCanvas.height;
                let mw = 120, mh = 120;
                if (aspect >= 1) {
                    mw = 120;
                    mh = Math.max(20, Math.round(120 / aspect));
                } else {
                    mh = 120;
                    mw = Math.max(20, Math.round(120 * aspect));
                }
                if (mCvs.width !== mw || mCvs.height !== mh) {
                    mCvs.width = mw;
                    mCvs.height = mh;
                }
                const mCtx = mCvs.getContext('2d');
                mCtx.clearRect(0, 0, mw, mh);

                // Draw source buffer
                mCtx.drawImage(srcCanvas, 0, 0, srcCanvas.width, srcCanvas.height, 0, 0, mw, mh);

                // Draw N x N division grid lines
                mCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
                mCtx.lineWidth = 1.0;
                mCtx.setLineDash([2, 2]);

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

                mCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                mCtx.fillRect(0, 0, mw, ry); // top
                mCtx.fillRect(0, ry + rh, mw, mh - (ry + rh)); // bottom
                mCtx.fillRect(0, ry, rx, rh); // left
                mCtx.fillRect(rx + rw, ry, mw - (rx + rw), rh); // right

                // Highlight bounding box on selected tile (Emerald)
                mCtx.strokeStyle = '#10b981';
                mCtx.lineWidth = 2.0;
                mCtx.strokeRect(rx, ry, rw, rh);

                // Corner ticks
                const tick = 4;
                mCtx.strokeStyle = '#a7f3d0';
                mCtx.lineWidth = 2.0;
                mCtx.beginPath(); mCtx.moveTo(rx, ry + tick); mCtx.lineTo(rx, ry); mCtx.lineTo(rx + tick, ry); mCtx.stroke();
                mCtx.beginPath(); mCtx.moveTo(rx + rw - tick, ry); mCtx.lineTo(rx + rw); mCtx.lineTo(rx + rw, ry + tick); mCtx.stroke();
                mCtx.beginPath(); mCtx.moveTo(rx, ry + rh - tick); mCtx.lineTo(rx, ry + rh); mCtx.lineTo(rx + tick, ry + rh); mCtx.stroke();
                mCtx.beginPath(); mCtx.moveTo(rx + rw - tick, ry + rh); mCtx.lineTo(rx + rw, ry + rh); mCtx.lineTo(rx + rw, ry + rh - tick); mCtx.stroke();
            }

            // Update badge in modal
            const badge = modal.querySelector('#disp-active-badge');
            if (badge) {
                badge.textContent = `TILE (${col + 1}, ${row + 1})${data.isCvDiv ? ' [CV]' : ''}`;
            }

            // Sync division buttons highlight in modal if CV driven
            modal.querySelectorAll('.disp-div-btn').forEach(btn => {
                const btnDiv = parseInt(btn.dataset.div, 10);
                if (btnDiv === divN) {
                    btn.className = 'disp-div-btn flex-1 py-1 rounded text-[10px] font-mono font-bold border transition bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/50';
                } else {
                    btn.className = 'disp-div-btn flex-1 py-1 rounded text-[10px] font-mono font-bold border transition bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700';
                }
            });

            const valXDisp = modal.querySelector('#disp-val-x');
            const valYDisp = modal.querySelector('#disp-val-y');
            if (valXDisp && data.isCvX) {
                valXDisp.textContent = `${(data.posX ?? 0).toFixed(2)} [CV]`;
            }
            if (valYDisp && data.isCvY) {
                valYDisp.textContent = `${(data.posY ?? 0).toFixed(2)} [CV]`;
            }
        }
    }
};

export const displayDefs = {
    DISPLAY
};
export default displayDefs;
