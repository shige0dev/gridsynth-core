// src/modules/defs/display.js
// DISPLAY - Pure Daisy-Chain Video Viewport (Auto-Tile N x N Grid)
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const DISPLAY = {
    color: 'emerald',
    defaults: () => ({
        type: 'DISPLAY',
        divN: 2     // Default to 2x2 (4 screens)
    }),
    ports: () => ({
        in: [
            { port: 'video_in', pin: 5, color: 'bg-emerald-800', label: 'VID' }
        ],
        out: [
            { port: 'video_out', pin: 10, color: 'bg-emerald-800', label: 'VID' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),

    // Cell panel: Clean, borderless video viewport (No text overlays)
    renderGrid: (m, ctx) => `
        <div class="absolute inset-[1px] bg-black overflow-hidden z-0 pointer-events-none select-none">
            <canvas class="display-panel-canvas w-full h-full block" width="100" height="100"></canvas>
        </div>`,

    // Modal: Division selector buttons + Viewfinder Preview with Tile # readout
    renderModal: (m, ctx) => {
        const divN = Math.max(1, Math.min(4, Math.round(m.divN ?? 2)));

        return `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <!-- Division Selector (1x1, 2x2, 3x3, 4x4) -->
            <div class="flex items-center justify-between border-b border-slate-800 pb-1 px-0.5">
                <span class="text-[9px] font-mono font-bold text-emerald-400">DIVISION</span>
                <div class="flex items-center gap-1">
                    ${[1, 2, 3, 4].map(n => `
                        <button class="disp-div-btn px-2 py-0.5 rounded text-[8.5px] font-mono font-bold border transition-colors ${divN === n ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/40' : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-div="${n}">${n}x${n}</button>
                    `).join('')}
                </div>
            </div>

            <!-- Tile Information Status Readout (Modal Only) -->
            <div class="flex items-center justify-between px-1 py-1 bg-slate-950 rounded border border-slate-800/80">
                <div class="flex items-center gap-1.5">
                    <span class="text-[8px] font-mono text-slate-400 uppercase">ACTIVE TILE:</span>
                    <span id="disp-tile-num" class="text-[11px] font-mono font-bold text-emerald-300">-- / --</span>
                </div>
                <span id="disp-chain-status" class="text-[8px] font-mono text-cyan-400 font-bold">DAISY-CHAIN</span>
            </div>

            <!-- Viewfinder Preview Canvas (130x130) -->
            <div class="flex flex-col items-center justify-center pt-0.5">
                <div class="relative bg-black rounded border border-emerald-500/40 shadow-inner overflow-hidden p-0" style="width: 130px; height: 130px;">
                    <canvas id="display-modal-canvas" class="w-full h-full block" width="130" height="130"></canvas>
                </div>
            </div>
        </div>`;
    },

    bindEvents: (m, ctx, cb) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;

        // Division selection buttons
        root.querySelectorAll('.disp-div-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const n = parseInt(btn.dataset.div, 10);
                if (n >= 1 && n <= 4) {
                    m.divN = n;
                    ctx.reRenderModal();
                    cb();
                }
            });
        });
    },

    updateLive: (cell, data, isPlaying, modal, m) => {
        if (!cell || !data) return;

        const pCvs = cell.querySelector('.display-panel-canvas');
        if (!pCvs) return;
        const pCtx = pCvs.getContext('2d');

        const divN = Math.max(1, Math.min(4, data.divN ?? 2));
        const col = data.col ?? 0;
        const row = data.row ?? 0;
        const srcCvs = data.canvas;

        if (!srcCvs || !data.isLinked) {
            pCtx.fillStyle = '#020617';
            pCtx.fillRect(0, 0, pCvs.width, pCvs.height);
            pCtx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
            pCtx.lineWidth = 1;
            pCtx.strokeRect(2, 2, pCvs.width - 4, pCvs.height - 4);
            return;
        }

        const sw = srcCvs.width;
        const sh = srcCvs.height;
        const tileW = sw / divN;
        const tileH = sh / divN;

        // Geometric Bezel Compensation (4.545% crop per side)
        let cropX = 0, cropY = 0;
        if (divN > 1) {
            const cropRatio = 4 / 88;
            cropX = tileW * cropRatio;
            cropY = tileH * cropRatio;
        }

        const sx = (col * tileW) + cropX;
        const sy = (row * tileH) + cropY;
        const sSubW = tileW - (cropX * 2);
        const sSubH = tileH - (cropY * 2);

        // Render to Grid Cell (Solid black clear first to prevent 1-frame ghosting)
        pCtx.fillStyle = '#000000';
        pCtx.fillRect(0, 0, pCvs.width, pCvs.height);
        pCtx.drawImage(srcCvs, sx, sy, sSubW, sSubH, 0, 0, pCvs.width, pCvs.height);

        // Update Modal if open
        if (modal) {
            // Update Tile readout
            const tileEl = modal.querySelector('#disp-tile-num');
            if (tileEl) {
                const tNum = data.tileNum ?? 1;
                const total = data.totalTiles ?? (divN * divN);
                tileEl.textContent = `TILE ${tNum} / ${total} (${divN}x${divN})`;
            }

            const chainEl = modal.querySelector('#disp-chain-status');
            if (chainEl) {
                const hop = data.hop ?? 0;
                chainEl.textContent = `HOP #${hop + 1} (AUTO)`;
            }

            // Draw Viewfinder Preview
            const mCvs = modal.querySelector('#display-modal-canvas');
            if (mCvs) {
                const mCtx = mCvs.getContext('2d');
                const mw = mCvs.width;
                const mh = mCvs.height;

                // 1. Full root image (Solid black clear first)
                mCtx.fillStyle = '#000000';
                mCtx.fillRect(0, 0, mw, mh);
                mCtx.drawImage(srcCvs, 0, 0, sw, sh, 0, 0, mw, mh);

                // 2. Division grid lines
                mCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                mCtx.lineWidth = 1.0;
                mCtx.setLineDash([3, 3]);

                const cellMw = mw / divN;
                const cellMh = mh / divN;

                for (let i = 1; i < divN; i++) {
                    mCtx.beginPath();
                    mCtx.moveTo(i * cellMw, 0); mCtx.lineTo(i * cellMw, mh);
                    mCtx.stroke();
                    mCtx.beginPath();
                    mCtx.moveTo(0, i * cellMh); mCtx.lineTo(mw, i * cellMh);
                    mCtx.stroke();
                }
                mCtx.setLineDash([]);

                // 3. Dim areas outside selected tile
                const rx = col * cellMw;
                const ry = row * cellMh;
                const rw = cellMw;
                const rh = cellMh;

                mCtx.fillStyle = 'rgba(0, 0, 0, 0.55)';
                mCtx.fillRect(0, 0, mw, ry);
                mCtx.fillRect(0, ry + rh, mw, mh - (ry + rh));
                mCtx.fillRect(0, ry, rx, rh);
                mCtx.fillRect(rx + rw, ry, mw - (rx + rw), rh);

                // 4. Highlight bounding box on selected tile (Emerald)
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
        }
    }
};

export const displayDefs = {
    DISPLAY
};
export default displayDefs;
