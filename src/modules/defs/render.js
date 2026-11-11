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
            { port: 'fov_in', pin: 4, color: 'bg-yellow-400', label: 'FOV' },
            { port: 'obj_in', pin: 5, color: 'bg-purple-500', label: 'OBJ' }
        ],
        out: [
            { port: 'video_out', pin: 10, color: 'bg-emerald-800', label: 'VID' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const cx = Number(m.camX ?? 0).toFixed(1);
        const cy = Number(m.camY ?? 0).toFixed(1);
        const cz = Number(m.camZ ?? 5).toFixed(1);
        const fov = Math.round(m.fov ?? 45);
        const roll = Math.round(m.camRoll ?? 0);
        const tx = Number(m.targetX ?? 0).toFixed(1);
        const ty = Number(m.targetY ?? 0).toFixed(1);
        const tz = Number(m.targetZ ?? 0).toFixed(1);
        return `
        <div class="flex flex-col items-center justify-center leading-none gap-1 pointer-events-none select-none font-mono text-center">
            <div class="flex flex-col items-center gap-0.5">
                <span class="text-[7px] font-bold text-amber-400">CAM POS</span>
                <span data-render-cam class="text-[8.5px] font-bold text-emerald-300 tracking-tight">${cx}, ${cy}, ${cz}</span>
            </div>
            <div class="flex items-center gap-2 text-[7px]">
                <div class="flex flex-col items-center">
                    <span class="text-[6.5px] text-slate-400 font-bold">FOV</span>
                    <span data-render-fov class="font-bold text-cyan-300">${fov}°</span>
                </div>
                <div class="flex flex-col items-center">
                    <span class="text-[6.5px] text-slate-400 font-bold">ROLL</span>
                    <span data-render-roll class="font-bold text-cyan-300">${roll}°</span>
                </div>
            </div>
            <div class="flex flex-col items-center gap-0.5">
                <span class="text-[6.5px] text-slate-400 font-bold">TARGET</span>
                <span data-render-target class="text-[7.5px] font-medium text-slate-300 tracking-tight">${tx}, ${ty}, ${tz}</span>
            </div>
        </div>`;
    },
    renderModal: (m) => `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <!-- Viewfinder Preview Container (Full Width 1:1 Square) -->
            <div class="relative w-full aspect-square bg-black border border-slate-800 rounded overflow-hidden flex items-center justify-center mx-auto">
                <canvas class="render-modal-canvas w-full h-full block bg-black" width="400" height="400"></canvas>
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
    updateLive: (cell, data, isPlaying, modal, m) => {
        if (!cell || !data) return;
        const srcCanvas = data.canvas;

        // 1. Update camera info readout on module cell panel
        const camEl = cell.querySelector('[data-render-cam]');
        const fovEl = cell.querySelector('[data-render-fov]');
        const rollEl = cell.querySelector('[data-render-roll]');
        const targetEl = cell.querySelector('[data-render-target]');

        const cx = Number(data.camX ?? m?.camX ?? 0).toFixed(1);
        const cy = Number(data.camY ?? m?.camY ?? 0).toFixed(1);
        const cz = Number(data.camZ ?? m?.camZ ?? 5).toFixed(1);
        const fov = Math.round(data.fov ?? m?.fov ?? 45);
        const roll = Math.round(data.roll ?? m?.camRoll ?? 0);
        const tx = Number(data.targetX ?? m?.targetX ?? 0).toFixed(1);
        const ty = Number(data.targetY ?? m?.targetY ?? 0).toFixed(1);
        const tz = Number(data.targetZ ?? m?.targetZ ?? 0).toFixed(1);

        if (camEl) camEl.textContent = `${cx}, ${cy}, ${cz}`;
        if (fovEl) fovEl.textContent = `${fov}°${data.isCvFov ? '*' : ''}`;
        if (rollEl) rollEl.textContent = `${roll}°`;
        if (targetEl) targetEl.textContent = `${tx}, ${ty}, ${tz}`;

        // 2. Render to modal preview canvas if open (1:1 square)
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
