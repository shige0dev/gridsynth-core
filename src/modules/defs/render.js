// src/modules/defs/render.js
// RENDER - 3D Graphics Renderer & Framebuffer Generator (1:1 Square Master Buffer)
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const RENDER = {
    color: 'emerald',
    defaults: () => ({
        type: 'RENDER',
        camX: 0.0,
        camY: 0.0,
        camZ: 5.0,
        targetX: 0.0,
        targetY: 0.0,
        targetZ: 0.0,
        fov: 45.0,
        camRoll: 0.0
    }),
    ports: () => ({
        in: [
            { port: 'geo_in', pin: 5, color: 'bg-purple-500', label: 'GEO' },
            { port: 'cv_fov', pin: 1, color: 'bg-yellow-400', label: 'FOV' }
        ],
        out: [
            { port: 'video_out', color: 'bg-emerald-500', label: 'VID' }
        ]
    }),
    renderPorts: (m, renderP, ports) => {
        const inPorts = ports.in || [];
        const outPorts = ports.out || [];
        const videoOut = outPorts.find(p => p.port === 'video_out');
        const otherOut = outPorts.filter(p => p.port !== 'video_out');

        const chassisHTML = UIHelpers.renderChassisPorts(renderP, { in: inPorts, out: otherOut });
        // Place video_out at top-right corner
        const vOutHTML = videoOut ? `
            <div class="absolute right-[3px] top-[3px] flex items-center pointer-events-auto z-10" title="VIDEO OUT (MASTER BUFFER)">
                ${renderP([videoOut])}
            </div>` : '';

        return `${chassisHTML}${vOutHTML}`;
    },
    renderGrid: () => `
        <div class="flex flex-col items-center justify-center leading-none gap-1 pointer-events-none select-none text-emerald-400">
            <span class="text-[8px] font-bold text-amber-400/90 tracking-tight">3D RENDER</span>
            <span class="text-[12px] font-mono font-extrabold text-emerald-300 tracking-wider">BUFFER</span>
            <span class="text-[7.5px] font-mono text-cyan-300 font-bold">1:1 OUT</span>
        </div>`,
    renderModal: (m) => `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1">
                <span class="text-xs font-mono font-bold text-emerald-400">3D RENDERER</span>
                <span class="text-[9px] font-mono text-emerald-300 bg-emerald-950 px-1 rounded border border-emerald-600/50">1:1 MASTER BUFFER</span>
            </div>

            <!-- Viewfinder Preview Container (1:1 Square) -->
            <div class="flex justify-center items-center bg-black border border-slate-800 rounded p-1 w-[128px] h-[128px] mx-auto overflow-hidden">
                <canvas class="render-modal-canvas block rounded bg-black" width="120" height="120"></canvas>
            </div>

            <!-- Section 1: Camera Position & Optics (カメラ位置・画角・回転角) -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <span class="text-[8.5px] font-mono font-bold text-cyan-400">CAMERA POSITION & OPTICS (カメラ位置・画角・回転角)</span>
                <div class="grid grid-cols-3 gap-1.5 text-[8.5px] font-mono">
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>CAM X</span><span id="render-val-camx">${(m.camX ?? 0).toFixed(1)}</span></div>
                        <input type="range" id="render-slide-camx" min="-10" max="10" step="0.2" value="${m.camX ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>CAM Y</span><span id="render-val-camy">${(m.camY ?? 0).toFixed(1)}</span></div>
                        <input type="range" id="render-slide-camy" min="-10" max="10" step="0.2" value="${m.camY ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>CAM Z</span><span id="render-val-camz">${(m.camZ ?? 5).toFixed(1)}</span></div>
                        <input type="range" id="render-slide-camz" min="1.0" max="20.0" step="0.2" value="${m.camZ ?? 5}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 text-[8.5px] font-mono mt-0.5">
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>FOV (画角)</span><span id="render-val-fov">${Math.round(m.fov ?? 45)}°</span></div>
                        <input type="range" id="render-slide-fov" min="15" max="120" step="1" value="${m.fov ?? 45}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>ROLL (回転角)</span><span id="render-val-roll">${Math.round(m.camRoll ?? 0)}°</span></div>
                        <input type="range" id="render-slide-roll" min="-180" max="180" step="1" value="${m.camRoll ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500">
                    </div>
                </div>
            </div>

            <!-- Section 2: LookAt Target (注視点) -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <span class="text-[8.5px] font-mono font-bold text-amber-400">LOOKAT TARGET (注視点)</span>
                <div class="grid grid-cols-3 gap-1.5 text-[8.5px] font-mono">
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>AIM X</span><span id="render-val-tgx">${(m.targetX ?? 0).toFixed(1)}</span></div>
                        <input type="range" id="render-slide-tgx" min="-5" max="5" step="0.1" value="${m.targetX ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>AIM Y</span><span id="render-val-tgy">${(m.targetY ?? 0).toFixed(1)}</span></div>
                        <input type="range" id="render-slide-tgy" min="-5" max="5" step="0.1" value="${m.targetY ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>AIM Z</span><span id="render-val-tgz">${(m.targetZ ?? 0).toFixed(1)}</span></div>
                        <input type="range" id="render-slide-tgz" min="-5" max="5" step="0.1" value="${m.targetZ ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500">
                    </div>
                </div>
            </div>

            <div class="text-[8px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded border border-slate-800/80 leading-normal">
                3Dジオメトリを描画して1:1正方形バッファを生成します。右上端子 (VID OUT) から緑ケーブルで DISPLAY モジュールへ接続してください。
            </div>
        </div>`,
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

        // Camera Position
        bindSlider('render-slide-camx', 'camX', 'render-val-camx', v => v.toFixed(1));
        bindSlider('render-slide-camy', 'camY', 'render-val-camy', v => v.toFixed(1));
        bindSlider('render-slide-camz', 'camZ', 'render-val-camz', v => v.toFixed(1));
        // Optics (画角・回転角)
        bindSlider('render-slide-fov', 'fov', 'render-val-fov', v => `${Math.round(v)}°`);
        bindSlider('render-slide-roll', 'camRoll', 'render-val-roll', v => `${Math.round(v)}°`);
        // LookAt Target (注視点)
        bindSlider('render-slide-tgx', 'targetX', 'render-val-tgx', v => v.toFixed(1));
        bindSlider('render-slide-tgy', 'targetY', 'render-val-tgy', v => v.toFixed(1));
        bindSlider('render-slide-tgz', 'targetZ', 'render-val-tgz', v => v.toFixed(1));
    },
    updateLive: (cell, data, isPlaying, modal) => {
        if (!cell || !data) return;
        const srcCanvas = data.canvas;

        // Render to modal preview canvas if open (1:1 square)
        if (modal) {
            const mCvs = modal.querySelector('.render-modal-canvas');
            if (mCvs && srcCanvas) {
                const mCtx = mCvs.getContext('2d');
                mCtx.clearRect(0, 0, mCvs.width, mCvs.height);
                mCtx.drawImage(srcCanvas, 0, 0, srcCanvas.width, srcCanvas.height, 0, 0, mCvs.width, mCvs.height);
            }
        }
    }
};

export const renderDefs = {
    RENDER
};
export default renderDefs;
