// src/modules/defs/video.js
// VIDEO - 3D Rendering & Framebuffer Viewer / Crop Module
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const VIDEO = {
    color: 'purple',
    defaults: () => ({
        type: 'VIDEO',
        cropX: 0.0,
        cropY: 0.0,
        cropW: 1.0,
        cropH: 1.0,
        _isLinked: false
    }),
    ports: () => ({
        in: [
            { port: 'cv_x', pin: 4, color: 'bg-yellow-400', label: 'X' },
            { port: 'cv_y', pin: 3, color: 'bg-yellow-400', label: 'Y' },
            { port: 'cv_w', pin: 2, color: 'bg-yellow-400', label: 'W' },
            { port: 'cv_h', pin: 1, color: 'bg-yellow-400', label: 'H' },
            { port: 'geo_in', pin: 5, color: 'bg-purple-500', label: 'GEO' },
            { port: 'video_in', color: 'bg-purple-500' }
        ],
        out: [
            { port: 'video_out', color: 'bg-purple-500' }
        ]
    }),
    renderPorts: (m, renderP, ports) => {
        const inPorts = ports.in || [];
        const outPorts = ports.out || [];
        const videoIn = inPorts.find(p => p.port === 'video_in');
        const videoOut = outPorts.find(p => p.port === 'video_out');
        const otherIn = inPorts.filter(p => p.port !== 'video_in');
        const otherOut = outPorts.filter(p => p.port !== 'video_out');

        const chassisHTML = UIHelpers.renderChassisPorts(renderP, { in: otherIn, out: otherOut });

        const vInHTML = videoIn ? `
            <div class="absolute left-[3px] top-[3px] flex items-center pointer-events-auto z-10" title="VIDEO IN (BUFFER LINK)">
                ${renderP([videoIn])}
            </div>` : '';

        const vOutHTML = videoOut ? `
            <div class="absolute right-[3px] top-[3px] flex items-center pointer-events-auto z-10" title="VIDEO OUT (MASTER BUFFER)">
                ${renderP([videoOut])}
            </div>` : '';

        return `${chassisHTML}${vInHTML}${vOutHTML}`;
    },
    // Cell grid: Full-slot display matching SCOPE and PAD dimensions
    renderGrid: (m, ctx) => {
        const isLinked = Boolean(ctx?.patched?.has('video_in') || m._isLinked);
        return `
        <div class="absolute inset-0.5 bg-black rounded-sm border border-purple-500/40 overflow-hidden z-0 pointer-events-none select-none">
            <canvas class="video-panel-canvas w-full h-full block" width="100" height="100"></canvas>
            ${isLinked ? '<div class="absolute top-0.5 left-1 pointer-events-none"><span class="text-[6.5px] font-mono font-bold tracking-wider text-purple-300 leading-none">LINKED</span></div>' : ''}
            <div class="absolute bottom-0.5 right-1 pointer-events-none">
                <span data-video-disp class="text-[6.5px] font-mono font-bold leading-none tracking-tight text-cyan-300">1:1</span>
            </div>
        </div>`;
    },
    // Modal: Standard width matching SCOPE / PAD controls
    renderModal: (m) => {
        const isLinked = Boolean(m._isLinked);
        return `
        <div class="flex flex-col gap-2 p-1 bg-slate-900 text-slate-200 select-none w-full">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1">
                <span class="text-xs font-mono font-bold text-purple-400">3D DISPLAY</span>
                <span class="text-[9px] font-mono text-slate-400">${isLinked ? 'LINKED VIEWER' : 'MASTER RENDERER'}</span>
            </div>
            <div class="flex justify-center bg-black border border-slate-800 rounded p-1">
                <canvas class="video-modal-canvas w-[120px] h-[120px] block rounded bg-black" width="120" height="120"></canvas>
            </div>
            <div class="grid grid-cols-2 gap-2 text-[9.5px] font-mono">
                <div class="flex flex-col gap-0.5">
                    <div class="flex justify-between text-slate-400">
                        <span>CROP X</span><span id="video-val-x">${(m.cropX ?? 0).toFixed(2)}</span>
                    </div>
                    <input type="range" id="video-slide-x" min="0" max="0.9" step="0.01" value="${m.cropX ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer">
                </div>
                <div class="flex flex-col gap-0.5">
                    <div class="flex justify-between text-slate-400">
                        <span>CROP Y</span><span id="video-val-y">${(m.cropY ?? 0).toFixed(2)}</span>
                    </div>
                    <input type="range" id="video-slide-y" min="0" max="0.9" step="0.01" value="${m.cropY ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer">
                </div>
                <div class="flex flex-col gap-0.5">
                    <div class="flex justify-between text-slate-400">
                        <span>CROP W</span><span id="video-val-w">${(m.cropW ?? 1.0).toFixed(2)}</span>
                    </div>
                    <input type="range" id="video-slide-w" min="0.1" max="1.0" step="0.01" value="${m.cropW ?? 1.0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer">
                </div>
                <div class="flex flex-col gap-0.5">
                    <div class="flex justify-between text-slate-400">
                        <span>CROP H</span><span id="video-val-h">${(m.cropH ?? 1.0).toFixed(2)}</span>
                    </div>
                    <input type="range" id="video-slide-h" min="0.1" max="1.0" step="0.01" value="${m.cropH ?? 1.0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer">
                </div>
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;
        const bindSlider = (id, prop, dispId) => {
            const input = root.querySelector('#' + id);
            const disp = root.querySelector('#' + dispId);
            if (!input) return;
            input.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                m[prop] = val;
                if (disp) disp.textContent = val.toFixed(2);
                onChange?.();
            });
        };
        bindSlider('video-slide-x', 'cropX', 'video-val-x');
        bindSlider('video-slide-y', 'cropY', 'video-val-y');
        bindSlider('video-slide-w', 'cropW', 'video-val-w');
        bindSlider('video-slide-h', 'cropH', 'video-val-h');
    },
    updateLive: (cell, data, isPlaying, modal, m) => {
        if (!cell || !data) return;

        const srcCanvas = data.canvas;
        const crop = data.crop || { x: 0, y: 0, w: 1, h: 1 };

        // Render to cell canvas (Square 1:1 display fill)
        const cvs = cell.querySelector('.video-panel-canvas');
        if (cvs) {
            const ctx = cvs.getContext('2d');
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            if (srcCanvas) {
                const sx = Math.max(0, Math.min(srcCanvas.width - 1, crop.x * srcCanvas.width));
                const sy = Math.max(0, Math.min(srcCanvas.height - 1, crop.y * srcCanvas.height));
                const sw = Math.max(1, Math.min(srcCanvas.width - sx, crop.w * srcCanvas.width));
                const sh = Math.max(1, Math.min(srcCanvas.height - sy, crop.h * srcCanvas.height));
                ctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, cvs.width, cvs.height);
            } else {
                ctx.fillStyle = '#020617';
                ctx.fillRect(0, 0, cvs.width, cvs.height);
            }
        }

        // Render to modal canvas if open
        if (modal) {
            const mCvs = modal.querySelector('.video-modal-canvas');
            if (mCvs && srcCanvas) {
                const mCtx = mCvs.getContext('2d');
                mCtx.clearRect(0, 0, mCvs.width, mCvs.height);
                const sx = Math.max(0, Math.min(srcCanvas.width - 1, crop.x * srcCanvas.width));
                const sy = Math.max(0, Math.min(srcCanvas.height - 1, crop.y * srcCanvas.height));
                const sw = Math.max(1, Math.min(srcCanvas.width - sx, crop.w * srcCanvas.width));
                const sh = Math.max(1, Math.min(srcCanvas.height - sy, crop.h * srcCanvas.height));
                mCtx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, mCvs.width, mCvs.height);
            }
        }

        const disp = cell.querySelector('[data-video-disp]');
        if (disp) {
            disp.textContent = `${crop.w.toFixed(1)}x${crop.h.toFixed(1)}`;
        }
    }
};

export const videoDefs = {
    VIDEO
};
export default videoDefs;
