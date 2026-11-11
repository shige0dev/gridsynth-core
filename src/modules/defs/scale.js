// src/modules/defs/scale.js
// SCALE - 3D Geometry Scale Modifier (Uniform ALL or Selectable X/Y/Z Axis, CV Driven)
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const SCALE = {
    color: 'purple',
    defaults: () => ({
        type: 'SCALE',
        axis: 'all', // 'all' | 'x' | 'y' | 'z'
        scale: 1.0   // Scale ratio (1.0 = 100%)
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
        const axis = (m.axis || 'all').toUpperCase();
        const val = Number(m.scale ?? 1.0);
        return `
        <div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none select-none text-purple-400">
            <span data-scale-axis class="text-[8px] font-bold text-amber-400/90 tracking-tight">SCALE ${axis}</span>
            <span data-scale-val class="text-[13px] font-mono font-extrabold text-purple-300 tracking-tight">${val.toFixed(2)}x</span>
            <span class="text-[7.5px] font-mono text-cyan-300 font-bold tracking-tight">RATIO</span>
        </div>`;
    },
    renderModal: (m, ctx) => {
        const isCvPatched = Boolean(ctx?.patched?.has('cv_in'));
        const curAxis = m.axis || 'all';
        const val = Number(m.scale ?? 1.0);
        return `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1">
                <span class="text-xs font-mono font-bold text-purple-400">3D SCALE</span>
                <span id="scale-status-badge" class="text-[8.5px] font-mono font-bold ${isCvPatched ? 'text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50' : 'text-slate-400'}">
                    ${isCvPatched ? 'CV OVERRIDE' : 'MANUAL SCALE'}
                </span>
            </div>

            <!-- Axis Selection Buttons (ALL, X, Y, Z) -->
            <div class="flex flex-col gap-1">
                <span class="text-[8px] font-mono font-bold text-slate-400">SELECT SCALE AXIS (拡大軸)</span>
                <div class="grid grid-cols-4 gap-1">
                    <button data-axis="all" class="scale-axis-btn py-1 rounded text-[9px] font-mono font-bold border transition ${curAxis === 'all' ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">ALL 均等</button>
                    <button data-axis="x" class="scale-axis-btn py-1 rounded text-[9px] font-mono font-bold border transition ${curAxis === 'x' ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">X 軸</button>
                    <button data-axis="y" class="scale-axis-btn py-1 rounded text-[9px] font-mono font-bold border transition ${curAxis === 'y' ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">Y 軸</button>
                    <button data-axis="z" class="scale-axis-btn py-1 rounded text-[9px] font-mono font-bold border transition ${curAxis === 'z' ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">Z 軸</button>
                </div>
            </div>

            <!-- Scale Ratio Slider -->
            <div class="flex flex-col gap-1 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <div class="flex justify-between items-center text-[9px] font-mono">
                    <span class="text-slate-300 font-bold">SCALE RATIO</span>
                    <span id="scale-val-disp" class="font-bold text-purple-300">${val.toFixed(2)}x</span>
                </div>
                <input type="range" id="scale-slide-val" min="0.0" max="4.0" step="0.05" value="${val}" class="h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-purple-500" ${isCvPatched ? 'disabled' : ''}>
                <div class="flex justify-between text-[7.5px] font-mono text-slate-400">
                    <span>0.0x</span>
                    <span>1.0x (原寸)</span>
                    <span>4.0x</span>
                </div>
            </div>

            <!-- Quick Presets -->
            <div class="flex flex-col gap-1">
                <span class="text-[8px] font-mono font-bold text-slate-400">PRESET RATIOS</span>
                <div class="grid grid-cols-5 gap-1 text-[8.5px] font-mono font-bold">
                    <button data-scale="0.5" class="scale-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition">0.5x</button>
                    <button data-scale="1.0" class="scale-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition">1.0x</button>
                    <button data-scale="1.5" class="scale-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition">1.5x</button>
                    <button data-scale="2.0" class="scale-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition">2.0x</button>
                    <button data-scale="3.0" class="scale-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition">3.0x</button>
                </div>
            </div>

            <div class="text-[8px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded border border-slate-800/80 leading-normal">
                CV (PIN4) が結線されると外部CV値に合わせて最上位オブジェクトのローカル軸を中心に拡大・縮小します (1.0V = 2.0x)。複数ケーブルの同時結線（サミング）時は共通のローカル原点から全体が連動して拡大します。
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;
        const slider = root.querySelector('#scale-slide-val');
        const disp = root.querySelector('#scale-val-disp');

        const updateDisp = (val) => {
            if (disp) disp.textContent = `${val.toFixed(2)}x`;
        };

        if (slider) {
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                m.scale = val;
                updateDisp(val);
                onChange?.();
            });
        }

        root.querySelectorAll('.scale-axis-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const axis = e.currentTarget.dataset.axis;
                m.axis = axis;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });

        root.querySelectorAll('.scale-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const val = parseFloat(e.currentTarget.dataset.scale);
                m.scale = val;
                if (slider) slider.value = val;
                updateDisp(val);
                onChange?.();
            });
        });
    },
    updateLive: (cell, data, isPlaying, modal, m) => {
        if (!cell || !data) return;
        const axisEl = cell.querySelector('[data-scale-axis]');
        const valEl = cell.querySelector('[data-scale-val]');
        const curAxis = (data.axis || m.axis || 'all').toUpperCase();
        const curVal = Number(data.scale ?? m.scale ?? 1.0);

        if (axisEl) {
            axisEl.textContent = `SCALE ${curAxis}`;
        }
        if (valEl) {
            valEl.textContent = `${curVal.toFixed(2)}x`;
        }

        // If modal open, update live readout
        if (modal) {
            const badge = modal.querySelector('#scale-status-badge');
            if (badge) {
                if (data.isCvPatched) {
                    badge.className = 'text-[8.5px] font-mono font-bold text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50';
                    badge.textContent = 'CV OVERRIDE';
                } else {
                    badge.className = 'text-[8.5px] font-mono text-slate-400';
                    badge.textContent = 'MANUAL SCALE';
                }
            }
            if (data.isCvPatched) {
                const disp = modal.querySelector('#scale-val-disp');
                if (disp) {
                    disp.textContent = `${curVal.toFixed(2)}x [CV]`;
                }
                const slider = modal.querySelector('#scale-slide-val');
                if (slider) slider.value = curVal;
            }
        }
    }
};

export const scaleDefs = {
    SCALE
};
export default scaleDefs;
