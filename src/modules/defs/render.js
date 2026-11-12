// src/modules/defs/render.js
// RENDER - 3D Graphics Renderer & Framebuffer Generator (1:1 Square Master Buffer)
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const STYLE_OVERRIDES = [
    { id: 'auto', label: 'AUTO' },
    { id: 'wire', label: 'WIRE' },
    { id: 'solid', label: 'SOLID' },
    { id: 'normal', label: 'NORMAL' },
    { id: 'toon', label: 'TOON' },
    { id: 'neon', label: 'NEON' }
];

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
        camRoll: 0.0,
        materialOverride: 'auto', // 'auto' | 'wire' | 'solid' | 'normal' | 'toon' | 'neon'
        dofFocus: 5.0,
        dofBokeh: 0.0
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
        const style = (m.materialOverride || 'auto').toUpperCase();

        return `
        <div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none select-none font-mono text-center">
            <div class="flex flex-col items-center gap-0.5">
                <span class="text-[7px] font-bold text-amber-400">CAM POS</span>
                <span data-render-cam class="text-[8.5px] font-bold text-emerald-300 tracking-tight">${cx}, ${cy}, ${cz}</span>
            </div>
            <div class="flex items-center gap-1.5 text-[7px]">
                <div class="flex flex-col items-center">
                    <span class="text-[6.5px] text-slate-400 font-bold">FOV</span>
                    <span data-render-fov class="font-bold text-cyan-300">${fov}°</span>
                </div>
                <div class="flex flex-col items-center">
                    <span class="text-[6.5px] text-slate-400 font-bold">STYLE</span>
                    <span class="font-bold text-purple-300">${style}</span>
                </div>
            </div>
            <div class="flex flex-col items-center gap-0.5">
                <span class="text-[6.5px] text-slate-400 font-bold">TARGET</span>
                <span data-render-target class="text-[7.5px] font-medium text-slate-300 tracking-tight">${tx}, ${ty}, ${tz}</span>
            </div>
        </div>`;
    },
    renderModal: (m) => {
        const curOverride = m.materialOverride || 'auto';

        return `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <!-- Viewfinder Preview Container (Full Width 1:1 Square) -->
            <div class="relative w-full aspect-square bg-black border border-slate-800 rounded overflow-hidden flex items-center justify-center mx-auto">
                <canvas class="render-modal-canvas w-full h-full block bg-black" width="400" height="400"></canvas>
            </div>

            <!-- Section 1: Material Style Override -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <div class="flex items-center justify-between">
                    <span class="text-[8px] font-mono font-bold text-purple-400 uppercase tracking-wider">STYLE OVERRIDE (マテリアル一括上書き)</span>
                    <span class="text-[7.5px] font-mono text-slate-400">${curOverride === 'auto' ? 'OBJ SPECIFIC' : 'FORCED'}</span>
                </div>
                <div class="grid grid-cols-6 gap-1">
                    ${STYLE_OVERRIDES.map(s => `
                        <button data-override="${s.id}" class="render-override-btn py-1 rounded text-[8px] font-mono font-bold border transition ${curOverride === s.id ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${s.label}</button>
                    `).join('')}
                </div>
            </div>

            <!-- Section 2: Camera Position & Optics -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <span class="text-[8px] font-mono font-bold text-cyan-400 uppercase tracking-wider">CAMERA POSITION & OPTICS</span>
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
                <div class="grid grid-cols-2 gap-1.5 text-[8.5px] font-mono pt-0.5">
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>FOV (視野角)</span><span id="render-val-fov">${Math.round(m.fov ?? 45)}°</span></div>
                        <input type="range" id="render-slide-fov" min="15" max="110" step="1" value="${m.fov ?? 45}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-500">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>ROLL (回転角)</span><span id="render-val-roll">${Math.round(m.camRoll ?? 0)}°</span></div>
                        <input type="range" id="render-slide-roll" min="-180" max="180" step="5" value="${m.camRoll ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-500">
                    </div>
                </div>
            </div>

            <!-- Section 3: Depth of Field (DoF) & Bokeh -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <div class="flex items-center justify-between">
                    <span class="text-[8px] font-mono font-bold text-rose-400 uppercase tracking-wider">DEPTH OF FIELD (被写界深度 / ボケ)</span>
                    <span id="render-val-bokeh-mode" class="text-[7.5px] font-mono font-bold ${(m.dofBokeh ?? 0) > 0 ? 'text-rose-400' : 'text-slate-500'}">${(m.dofBokeh ?? 0) > 0 ? 'ACTIVE' : 'OFF'}</span>
                </div>
                <div class="grid grid-cols-2 gap-1.5 text-[8.5px] font-mono">
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>FOCUS (ピント距離)</span><span id="render-val-focus">${(m.dofFocus ?? 5.0).toFixed(1)}m</span></div>
                        <input type="range" id="render-slide-focus" min="1.0" max="15.0" step="0.2" value="${m.dofFocus ?? 5.0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-rose-500">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>BOKEH (ボケ強度)</span><span id="render-val-bokeh">${Math.round((m.dofBokeh ?? 0) * 100)}%</span></div>
                        <input type="range" id="render-slide-bokeh" min="0.0" max="1.0" step="0.02" value="${m.dofBokeh ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-rose-500">
                    </div>
                </div>
            </div>

            <!-- Section 4: LookAt Target -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <span class="text-[8px] font-mono font-bold text-amber-400 uppercase tracking-wider">LOOKAT TARGET (注視点)</span>
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
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;

        // Override Buttons
        root.querySelectorAll('.render-override-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.materialOverride = e.currentTarget.dataset.override;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });

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
        // Optics
        bindSlider('render-slide-fov', 'fov', 'render-val-fov', v => `${Math.round(v)}°`);
        bindSlider('render-slide-roll', 'camRoll', 'render-val-roll', v => `${Math.round(v)}°`);
        // Depth of Field
        bindSlider('render-slide-focus', 'dofFocus', 'render-val-focus', v => `${v.toFixed(1)}m`);
        bindSlider('render-slide-bokeh', 'dofBokeh', 'render-val-bokeh', v => {
            const modeEl = root.querySelector('#render-val-bokeh-mode');
            if (modeEl) {
                modeEl.textContent = v > 0 ? 'ACTIVE' : 'OFF';
                modeEl.className = `text-[7.5px] font-mono font-bold ${v > 0 ? 'text-rose-400' : 'text-slate-500'}`;
            }
            return `${Math.round(v * 100)}%`;
        });
        // LookAt Target
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
