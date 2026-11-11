// src/modules/defs/rotate.js
// ROTATE - 3D Geometry Rotation Modifier (Selectable X/Y/Z Axis, Radian Angle Control)
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const ROTATE = {
    color: 'purple',
    defaults: () => ({
        type: 'ROTATE',
        axis: 'x', // 'x' | 'y' | 'z'
        angle: 0.0 // Rotation angle in radians
    }),
    ports: () => ({
        in: [
            { port: 'cv_in', pin: 4, color: 'bg-yellow-400', label: 'CV' },
            { port: 'obj_in', pin: 5, color: 'bg-purple-500', label: 'OBJ' }
        ],
        out: [
            { port: 'obj_out', pin: 10, color: 'bg-purple-500', label: 'OBJ' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const axis = (m.axis || 'x').toUpperCase();
        const rad = Number(m.angle ?? 0.0);
        const deg = Math.round((rad * 180) / Math.PI);
        return `
        <div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none select-none text-purple-400">
            <span data-rot-axis class="text-[8px] font-bold text-amber-400/90 tracking-tight">ROTATE ${axis}</span>
            <span data-rot-rad class="text-[12.5px] font-mono font-extrabold text-purple-300 tracking-tight">${rad.toFixed(2)}<span class="text-[7.5px] ml-0.5 text-purple-400/80">rad</span></span>
            <span data-rot-deg class="text-[7.5px] font-mono text-cyan-300 font-bold">${deg}°</span>
        </div>`;
    },
    renderModal: (m, ctx) => {
        const isCvPatched = Boolean(ctx?.patched?.has('cv_in') || ctx?.patched?.has('cv_x'));
        const curAxis = m.axis || 'x';
        const rad = Number(m.angle ?? 0.0);
        const deg = Math.round((rad * 180) / Math.PI);
        return `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1">
                <span class="text-xs font-mono font-bold text-purple-400">3D ROTATE</span>
                <span id="rotate-status-badge" class="text-[8.5px] font-mono font-bold ${isCvPatched ? 'text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50' : 'text-slate-400'}">
                    ${isCvPatched ? 'CV OVERRIDE' : 'MANUAL RAD'}
                </span>
            </div>

            <!-- Axis Selection Buttons -->
            <div class="flex flex-col gap-1">
                <span class="text-[8px] font-mono font-bold text-slate-400">SELECT ROTATION AXIS (回転軸)</span>
                <div class="grid grid-cols-3 gap-1.5">
                    <button data-axis="x" class="rotate-axis-btn py-1 rounded text-[9.5px] font-mono font-bold border transition ${curAxis === 'x' ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">X 軸 (PITCH)</button>
                    <button data-axis="y" class="rotate-axis-btn py-1 rounded text-[9.5px] font-mono font-bold border transition ${curAxis === 'y' ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">Y 軸 (YAW)</button>
                    <button data-axis="z" class="rotate-axis-btn py-1 rounded text-[9.5px] font-mono font-bold border transition ${curAxis === 'z' ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">Z 軸 (ROLL)</button>
                </div>
            </div>

            <!-- Angle Slider -->
            <div class="flex flex-col gap-1 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <div class="flex justify-between items-center text-[9px] font-mono">
                    <span class="text-slate-300 font-bold">MANUAL ANGLE</span>
                    <span id="rotate-val-disp" class="font-bold text-purple-300">${rad.toFixed(2)} rad (${deg}°)</span>
                </div>
                <input type="range" id="rotate-slide-rad" min="0" max="6.283" step="0.02" value="${rad}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-purple-500 ${isCvPatched ? 'opacity-35 pointer-events-none' : ''}">
                <div class="flex justify-between text-[7px] font-mono text-slate-400">
                    <span>0</span>
                    <span>π/2 (90°)</span>
                    <span>π (180°)</span>
                    <span>2π (360°)</span>
                </div>
            </div>

            <!-- Angle Presets -->
            <div class="grid grid-cols-4 gap-1 text-[8.5px] font-mono">
                <button data-rot="0.0" class="rotate-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">0°</button>
                <button data-rot="1.5708" class="rotate-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">90°</button>
                <button data-rot="3.1416" class="rotate-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">180°</button>
                <button data-rot="4.7124" class="rotate-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">270°</button>
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;
        const slider = root.querySelector('#rotate-slide-rad');
        const disp = root.querySelector('#rotate-val-disp');

        const updateDisp = (val) => {
            const deg = Math.round((val * 180) / Math.PI);
            if (disp) disp.textContent = `${val.toFixed(2)} rad (${deg}°)`;
        };

        if (slider) {
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                m.angle = val;
                updateDisp(val);
                onChange?.();
            });
        }

        root.querySelectorAll('.rotate-axis-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const axis = e.currentTarget.dataset.axis;
                m.axis = axis;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });

        root.querySelectorAll('.rotate-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const val = parseFloat(e.currentTarget.dataset.rot);
                m.angle = val;
                if (slider) slider.value = val;
                updateDisp(val);
                onChange?.();
            });
        });
    },
    updateLive: (cell, data, isPlaying, modal, m) => {
        if (!cell || !data) return;
        const axisEl = cell.querySelector('[data-rot-axis]');
        const radEl = cell.querySelector('[data-rot-rad]');
        const degEl = cell.querySelector('[data-rot-deg]');
        const curAxis = (data.axis || m.axis || 'x').toUpperCase();
        const curRad = Number(data.angle ?? m.angle ?? 0);
        const curDeg = Math.round((curRad * 180) / Math.PI);

        if (axisEl) {
            axisEl.textContent = `ROTATE ${curAxis}`;
        }
        if (radEl) {
            radEl.innerHTML = `${curRad.toFixed(2)}<span class="text-[7.5px] ml-0.5 text-purple-400/80">rad</span>`;
        }
        if (degEl) {
            degEl.textContent = `${curDeg}°${data.isCvPatched ? ' (CV)' : ''}`;
        }

        if (modal) {
            const badge = modal.querySelector('#rotate-status-badge');
            if (badge) {
                if (data.isCvPatched) {
                    badge.className = 'text-[8.5px] font-mono font-bold text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50';
                    badge.textContent = 'CV OVERRIDE';
                } else {
                    badge.className = 'text-[8.5px] font-mono text-slate-400';
                    badge.textContent = 'MANUAL RAD';
                }
            }
            if (data.isCvPatched) {
                const disp = modal.querySelector('#rotate-val-disp');
                if (disp) {
                    disp.textContent = `${curRad.toFixed(2)} rad (${curDeg}°) [CV]`;
                }
            }
        }
    }
};

export const rotateDefs = {
    ROTATE
};
export default rotateDefs;
