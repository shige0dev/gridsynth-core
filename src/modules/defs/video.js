// src/modules/defs/video.js
// VIDEO - 3D Rendering & Framebuffer Viewer / Crop Module
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const VIDEO = {
    color: 'emerald',
    defaults: () => ({
        type: 'VIDEO',
        cropX: 0.0,
        cropY: 0.0,
        cropSize: 1.0,
        // Camera properties
        camX: 0.0,
        camY: 0.0,
        camZ: 5.0,
        targetX: 0.0,
        targetY: 0.0,
        targetZ: 0.0,
        fov: 45.0,
        camRoll: 0.0,
        _isLinked: false
    }),
    ports: () => ({
        in: [
            { port: 'cv_x', pin: 4, color: 'bg-yellow-400', label: 'X' },
            { port: 'cv_y', pin: 3, color: 'bg-yellow-400', label: 'Y' },
            { port: 'cv_size', pin: 2, color: 'bg-yellow-400', label: 'SZ' },
            { port: 'cv_fov', pin: 1, color: 'bg-yellow-400', label: 'FOV' },
            { port: 'geo_in', pin: 5, color: 'bg-purple-500', label: 'GEO' },
            { port: 'video_in', color: 'bg-emerald-500' }
        ],
        out: [
            { port: 'video_out', color: 'bg-emerald-500' }
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
    // Cell grid: Full-slot display matching SCOPE (text-slate-700 header via controller.js)
    renderGrid: (m, ctx) => `
        <div class="absolute inset-0.5 bg-black rounded-sm border border-slate-800/90 overflow-hidden z-0 pointer-events-none select-none">
            <canvas class="video-panel-canvas w-full h-full block" width="100" height="100"></canvas>
        </div>`,
    // Modal: 3-Variable Crop (X, Y, SIZE) + Camera Position, Optics & LookAt Target controls
    renderModal: (m) => {
        const isLinked = Boolean(m._isLinked);
        return `
        <div class="flex flex-col gap-2 p-1 bg-slate-900 text-slate-200 select-none w-full">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1">
                <span class="text-xs font-mono font-bold text-emerald-400">3D DISPLAY & CAMERA</span>
                <span class="text-[9px] font-mono ${isLinked ? 'text-emerald-300 font-bold bg-emerald-950 px-1 rounded' : 'text-slate-400'}">${isLinked ? 'LINKED VIEWER' : 'MASTER RENDERER'}</span>
            </div>
            <!-- Viewfinder Preview -->
            <div class="flex justify-center bg-black border border-slate-800 rounded p-1">
                <canvas class="video-modal-canvas w-[120px] h-[120px] block rounded bg-black" width="120" height="120"></canvas>
            </div>
            
            <!-- Section 1: 1:1 Square Crop (3 Variables) -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <span class="text-[8.5px] font-mono font-bold text-emerald-400">VIEWPORT CROP (1:1 SQUARE)</span>
                <div class="grid grid-cols-3 gap-1.5 text-[8.5px] font-mono">
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>X</span><span id="video-val-x">${(m.cropX ?? 0).toFixed(2)}</span></div>
                        <input type="range" id="video-slide-x" min="0" max="0.9" step="0.01" value="${m.cropX ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>Y</span><span id="video-val-y">${(m.cropY ?? 0).toFixed(2)}</span></div>
                        <input type="range" id="video-slide-y" min="0" max="0.9" step="0.01" value="${m.cropY ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>SIZE</span><span id="video-val-size">${(m.cropSize ?? 1.0).toFixed(2)}</span></div>
                        <input type="range" id="video-slide-size" min="0.1" max="1.0" step="0.01" value="${m.cropSize ?? 1.0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer">
                    </div>
                </div>
            </div>

            <!-- Section 2: Camera Position & Optics (カメラ位置・画角・回転角) -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <span class="text-[8.5px] font-mono font-bold text-cyan-400">CAMERA POSITION & OPTICS (カメラ位置・画角・回転角)</span>
                <div class="grid grid-cols-3 gap-1.5 text-[8.5px] font-mono">
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>CAM X</span><span id="video-val-camx">${(m.camX ?? 0).toFixed(1)}</span></div>
                        <input type="range" id="video-slide-camx" min="-10" max="10" step="0.2" value="${m.camX ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>CAM Y</span><span id="video-val-camy">${(m.camY ?? 0).toFixed(1)}</span></div>
                        <input type="range" id="video-slide-camy" min="-10" max="10" step="0.2" value="${m.camY ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>CAM Z</span><span id="video-val-camz">${(m.camZ ?? 5).toFixed(1)}</span></div>
                        <input type="range" id="video-slide-camz" min="1.0" max="20.0" step="0.2" value="${m.camZ ?? 5}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-[8.5px] font-mono mt-0.5">
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>FOV (画角)</span><span id="video-val-fov">${Math.round(m.fov ?? 45)}°</span></div>
                        <input type="range" id="video-slide-fov" min="15" max="120" step="1" value="${m.fov ?? 45}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>ROLL (回転角)</span><span id="video-val-roll">${Math.round(m.camRoll ?? 0)}°</span></div>
                        <input type="range" id="video-slide-roll" min="-180" max="180" step="1" value="${m.camRoll ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer">
                    </div>
                </div>
            </div>

            <!-- Section 3: LookAt Target (注視点) -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <span class="text-[8.5px] font-mono font-bold text-amber-400">LOOKAT TARGET (注視点)</span>
                <div class="grid grid-cols-3 gap-1.5 text-[8.5px] font-mono">
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>AIM X</span><span id="video-val-tgx">${(m.targetX ?? 0).toFixed(1)}</span></div>
                        <input type="range" id="video-slide-tgx" min="-5" max="5" step="0.1" value="${m.targetX ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>AIM Y</span><span id="video-val-tgy">${(m.targetY ?? 0).toFixed(1)}</span></div>
                        <input type="range" id="video-slide-tgy" min="-5" max="5" step="0.1" value="${m.targetY ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>AIM Z</span><span id="video-val-tgz">${(m.targetZ ?? 0).toFixed(1)}</span></div>
                        <input type="range" id="video-slide-tgz" min="-5" max="5" step="0.1" value="${m.targetZ ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer">
                    </div>
                </div>
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;
        const bindSlider = (id, prop, dispId, fmt = (v) => v.toFixed(2)) => {
            const input = root.querySelector('#' + id);
            const disp = root.querySelector('#' + dispId);
            if (!input) return;
            input.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                m[prop] = val;
                if (disp) disp.textContent = fmt(val);
                onChange?.();
            });
        };
        // 3-variable Crop
        bindSlider('video-slide-x', 'cropX', 'video-val-x');
        bindSlider('video-slide-y', 'cropY', 'video-val-y');
        bindSlider('video-slide-size', 'cropSize', 'video-val-size');
        // Camera Position
        bindSlider('video-slide-camx', 'camX', 'video-val-camx', v => v.toFixed(1));
        bindSlider('video-slide-camy', 'camY', 'video-val-camy', v => v.toFixed(1));
        bindSlider('video-slide-camz', 'camZ', 'video-val-camz', v => v.toFixed(1));
        // Optics (画角・回転角)
        bindSlider('video-slide-fov', 'fov', 'video-val-fov', v => `${Math.round(v)}°`);
        bindSlider('video-slide-roll', 'camRoll', 'video-val-roll', v => `${Math.round(v)}°`);
        // LookAt Target (注視点)
        bindSlider('video-slide-tgx', 'targetX', 'video-val-tgx', v => v.toFixed(1));
        bindSlider('video-slide-tgy', 'targetY', 'video-val-tgy', v => v.toFixed(1));
        bindSlider('video-slide-tgz', 'targetZ', 'video-val-tgz', v => v.toFixed(1));
    },
    updateLive: (cell, data, isPlaying, modal, m) => {
        if (!cell || !data) return;

        const srcCanvas = data.canvas;
        const crop = data.crop || { x: 0, y: 0, size: 1.0 };
        const sz = crop.size ?? crop.w ?? 1.0;

        // Render to cell canvas (Square 1:1 display fill)
        const cvs = cell.querySelector('.video-panel-canvas');
        if (cvs) {
            const ctx = cvs.getContext('2d');
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            if (srcCanvas) {
                const sx = Math.max(0, Math.min(srcCanvas.width - 1, crop.x * srcCanvas.width));
                const sy = Math.max(0, Math.min(srcCanvas.height - 1, crop.y * srcCanvas.height));
                const sw = Math.max(1, Math.min(srcCanvas.width - sx, sz * srcCanvas.width));
                const sh = Math.max(1, Math.min(srcCanvas.height - sy, sz * srcCanvas.height));
                ctx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, cvs.width, cvs.height);
            } else {
                ctx.fillStyle = '#020617';
                ctx.fillRect(0, 0, cvs.width, cvs.height);
            }
        }

        // Render to modal canvas if open (Show FULL BUFFER + 1:1 Square Crop Overlay Box)
        if (modal) {
            const mCvs = modal.querySelector('.video-modal-canvas');
            if (mCvs && srcCanvas) {
                const mCtx = mCvs.getContext('2d');
                const mw = mCvs.width, mh = mCvs.height;
                mCtx.clearRect(0, 0, mw, mh);

                // 1. Draw entire source buffer (Full View)
                mCtx.drawImage(srcCanvas, 0, 0, srcCanvas.width, srcCanvas.height, 0, 0, mw, mh);

                // 2. Draw dim overlay over out-of-crop region
                mCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                const rx = crop.x * mw;
                const ry = crop.y * mh;
                const rSize = sz * mw;

                // Dim areas around the crop square
                mCtx.fillRect(0, 0, mw, ry); // top
                mCtx.fillRect(0, ry + rSize, mw, mh - (ry + rSize)); // bottom
                mCtx.fillRect(0, ry, rx, rSize); // left
                mCtx.fillRect(rx + rSize, ry, mw - (rx + rSize), rSize); // right

                // 3. Draw Square Crop Bounding Box (Emerald Green)
                mCtx.strokeStyle = '#10b981';
                mCtx.lineWidth = 1.5;
                mCtx.strokeRect(rx, ry, rSize, rSize);

                // Corner crosshairs / tick markers
                const tick = 4;
                mCtx.strokeStyle = '#a7f3d0';
                mCtx.lineWidth = 2.0;
                // Top-left
                mCtx.beginPath(); mCtx.moveTo(rx, ry + tick); mCtx.lineTo(rx, ry); mCtx.lineTo(rx + tick, ry); mCtx.stroke();
                // Top-right
                mCtx.beginPath(); mCtx.moveTo(rx + rSize - tick, ry); mCtx.lineTo(rx + rSize, ry); mCtx.lineTo(rx + rSize, ry + tick); mCtx.stroke();
                // Bottom-left
                mCtx.beginPath(); mCtx.moveTo(rx, ry + rSize - tick); mCtx.lineTo(rx, ry + rSize); mCtx.lineTo(rx + tick, ry + rSize); mCtx.stroke();
                // Bottom-right
                mCtx.beginPath(); mCtx.moveTo(rx + rSize - tick, ry + rSize); mCtx.lineTo(rx + rSize, ry + rSize); mCtx.lineTo(rx + rSize, ry + rSize - tick); mCtx.stroke();
            }
        }
    }
};

export const videoDefs = {
    VIDEO
};
export default videoDefs;
