// src/modules/defs/move.js
// MOVE - 3D Geometry Position/Translation Modifier (Selectable X/Y/Z Axis, CV Driven)
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const MOVE = {
    color: 'purple',
    defaults: () => ({
        type: 'MOVE',
        axis: 'x', // 'x' | 'y' | 'z'
        offset: 0.0 // Translation offset
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
        const val = Number(m.offset ?? 0.0);
        const sign = val > 0 ? '+' : '';
        return `
        <div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none select-none text-purple-400">
            <span data-move-axis class="text-[8px] font-bold text-amber-400/90 tracking-tight">MOVE ${axis}</span>
            <span data-move-val class="text-[13px] font-mono font-extrabold text-purple-300 tracking-tight">${sign}${val.toFixed(2)}</span>
            <span class="text-[7.5px] font-mono text-cyan-300 font-bold tracking-tight">OFFSET</span>
        </div>`;
    },
    renderModal: (m, ctx) => {
        const isCvPatched = Boolean(ctx?.patched?.has('cv_in'));
        const curAxis = m.axis || 'x';
        const val = Number(m.offset ?? 0.0);
        const sign = val > 0 ? '+' : '';
        return `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1">
                <span class="text-xs font-mono font-bold text-purple-400">3D MOVE</span>
                <span id="move-status-badge" class="text-[8.5px] font-mono font-bold ${isCvPatched ? 'text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50' : 'text-slate-400'}">
                    ${isCvPatched ? 'CV OVERRIDE' : 'MANUAL POS'}
                </span>
            </div>

            <!-- Axis Selection Buttons -->
            <div class="flex flex-col gap-1">
                <span class="text-[8px] font-mono font-bold text-slate-400">SELECT TRANSLATION AXIS (移動軸)</span>
                <div class="grid grid-cols-3 gap-1.5">
                    <button data-axis="x" class="move-axis-btn py-1 rounded text-[9.5px] font-mono font-bold border transition ${curAxis === 'x' ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">X 軸 (LEFT/RIGHT)</button>
                    <button data-axis="y" class="move-axis-btn py-1 rounded text-[9.5px] font-mono font-bold border transition ${curAxis === 'y' ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">Y 軸 (UP/DOWN)</button>
                    <button data-axis="z" class="move-axis-btn py-1 rounded text-[9.5px] font-mono font-bold border transition ${curAxis === 'z' ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">Z 軸 (NEAR/FAR)</button>
                </div>
            </div>

            <!-- Position Offset Slider -->
            <div class="flex flex-col gap-1 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <div class="flex justify-between items-center text-[9px] font-mono">
                    <span class="text-slate-300 font-bold">POSITION OFFSET</span>
                    <span id="move-val-disp" class="font-bold text-purple-300">${sign}${val.toFixed(2)}</span>
                </div>
                <input type="range" id="move-slide-offset" min="-5.0" max="5.0" step="0.05" value="${val}" class="h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-purple-500" ${isCvPatched ? 'disabled' : ''}>
                <div class="flex justify-between text-[7.5px] font-mono text-slate-400">
                    <span>-5.0</span>
                    <span>0.0</span>
                    <span>+5.0</span>
                </div>
            </div>

            <!-- Quick Presets -->
            <div class="flex flex-col gap-1">
                <span class="text-[8px] font-mono font-bold text-slate-400">PRESET OFFSETS</span>
                <div class="grid grid-cols-5 gap-1 text-[8.5px] font-mono font-bold">
                    <button data-pos="-2.0" class="move-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition">-2.0</button>
                    <button data-pos="-1.0" class="move-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition">-1.0</button>
                    <button data-pos="0.0" class="move-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition">0.0</button>
                    <button data-pos="1.0" class="move-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition">+1.0</button>
                    <button data-pos="2.0" class="move-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition">+2.0</button>
                </div>
            </div>

            <div class="text-[8px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded border border-slate-800/80 leading-normal">
                CV (PIN4) が結線されると外部CV値を優先して選択軸の位置をオフセットします (1.0V = 2.0 units)。複数ケーブルの同時結線（サミング）に対応しており、複数入力時は自動でコンテナ化してまとめて移動します。
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;
        const slider = root.querySelector('#move-slide-offset');
        const disp = root.querySelector('#move-val-disp');

        const updateDisp = (val) => {
            const sign = val > 0 ? '+' : '';
            if (disp) disp.textContent = `${sign}${val.toFixed(2)}`;
        };

        if (slider) {
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                m.offset = val;
                updateDisp(val);
                onChange?.();
            });
        }

        root.querySelectorAll('.move-axis-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const axis = e.currentTarget.dataset.axis;
                m.axis = axis;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });

        root.querySelectorAll('.move-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const val = parseFloat(e.currentTarget.dataset.pos);
                m.offset = val;
                if (slider) slider.value = val;
                updateDisp(val);
                onChange?.();
            });
        });
    },
    updateLive: (cell, data, isPlaying, modal, m) => {
        if (!cell || !data) return;
        const axisEl = cell.querySelector('[data-move-axis]');
        const valEl = cell.querySelector('[data-move-val]');
        const curAxis = (data.axis || m.axis || 'x').toUpperCase();
        const curVal = Number(data.offset ?? m.offset ?? 0);
        const sign = curVal > 0 ? '+' : '';

        if (axisEl) {
            axisEl.textContent = `MOVE ${curAxis}`;
        }
        if (valEl) {
            valEl.textContent = `${sign}${curVal.toFixed(2)}`;
        }

        // If modal open, update live readout
        if (modal) {
            const badge = modal.querySelector('#move-status-badge');
            if (badge) {
                if (data.isCvPatched) {
                    badge.className = 'text-[8.5px] font-mono font-bold text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50';
                    badge.textContent = 'CV OVERRIDE';
                } else {
                    badge.className = 'text-[8.5px] font-mono text-slate-400';
                    badge.textContent = 'MANUAL POS';
                }
            }
            if (data.isCvPatched) {
                const disp = modal.querySelector('#move-val-disp');
                if (disp) {
                    disp.textContent = `${sign}${curVal.toFixed(2)} [CV]`;
                }
                const slider = modal.querySelector('#move-slide-offset');
                if (slider) slider.value = curVal;
            }
        }
    }
};

export const moveDefs = {
    MOVE
};
export default moveDefs;
