// src/modules/defs/scatter.js
// SCATTER - Replicates Child 3D Object onto Vertices of Base Mesh
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const SCATTER = {
    color: 'purple',
    defaults: () => ({
        type: 'SCATTER',
        scale: 0.25,
        showBase: true,
        alignNormal: true
    }),
    ports: () => ({
        in: [
            { port: 'cv_in', pin: 4, color: 'bg-yellow-400', label: 'CV' },
            { port: 'base_in', pin: 5, color: 'bg-purple-500', label: 'BASE' },
            { port: 'child_in', pin: 6, color: 'bg-purple-500', label: 'CHLD' }
        ],
        out: [
            { port: 'obj_out', pin: 10, color: 'bg-purple-500', label: 'OBJ' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const scale = Number(m?.scale ?? 0.25);
        const pct = Math.round(scale * 100);
        const showBase = m?.showBase !== false;
        const alignNorm = m?.alignNormal !== false;
        return `
        <div class="flex flex-col items-center justify-center gap-1 w-full h-full pointer-events-none select-none text-center">
            <div class="flex flex-col items-center gap-0.5 leading-none">
                <span data-scatter-scale class="text-[13px] font-mono font-extrabold text-cyan-300">${pct}%</span>
                <span class="text-[7.5px] font-mono font-bold text-amber-400 uppercase tracking-tight">CHILD SCALE</span>
            </div>
            <div class="flex items-center gap-1 text-[7px] font-mono font-bold">
                <span class="${showBase ? 'text-emerald-400' : 'text-slate-500'}">BASE:${showBase ? 'ON' : 'OFF'}</span>
                <span class="text-slate-600">|</span>
                <span class="${alignNorm ? 'text-cyan-400' : 'text-slate-500'}">NORM:${alignNorm ? 'ON' : 'OFF'}</span>
            </div>
        </div>`;
    },
    renderModal: (m, ctx) => {
        const isCvPatched = Boolean(ctx?.patched?.has('cv_in'));
        const scale = Number(m.scale ?? 0.25);
        const pct = Math.round(scale * 100);
        const showBase = m.showBase !== false;
        const alignNorm = m.alignNormal !== false;

        return `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1">
                <span class="text-xs font-mono font-bold text-purple-400">VERTEX SCATTER</span>
                <span id="scatter-status-badge" class="text-[8.5px] font-mono font-bold ${isCvPatched ? 'text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50' : 'text-slate-400'}">
                    ${isCvPatched ? 'CV SCALE MOD' : 'MANUAL SCALE'}
                </span>
            </div>

            <!-- Child Scale Slider -->
            <div class="flex flex-col gap-1.5 bg-slate-950/60 p-2 rounded border border-slate-800">
                <div class="flex justify-between items-center text-[9px] font-mono">
                    <span class="text-slate-300 font-bold">CHILD OBJECT SCALE</span>
                    <span id="scatter-scale-disp" class="font-bold text-cyan-300">${pct}% (${scale.toFixed(2)})</span>
                </div>
                <input type="range" id="scatter-scale-slider" min="0.05" max="1.0" step="0.01" value="${scale}" class="h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-purple-500 ${isCvPatched ? 'opacity-35 pointer-events-none' : ''}">
                <div class="flex justify-between text-[7px] font-mono text-slate-400">
                    <span>5% (Tiny)</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100% (1:1)</span>
                </div>
            </div>

            <!-- Scale Quick Presets -->
            <div class="grid grid-cols-4 gap-1 text-[8px] font-mono">
                <button data-scale="0.10" class="scatter-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">10%</button>
                <button data-scale="0.20" class="scatter-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">20%</button>
                <button data-scale="0.33" class="scatter-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">33%</button>
                <button data-scale="0.50" class="scatter-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">50%</button>
            </div>

            <!-- Options Toggles -->
            <div class="grid grid-cols-2 gap-1.5 border-t border-slate-800 pt-1.5">
                <!-- Show Base Mesh Toggle -->
                <button id="scatter-toggle-base" class="py-1.5 px-2 rounded border text-[8.5px] font-mono font-bold flex items-center justify-between transition cursor-pointer ${showBase ? 'bg-purple-950/70 border-purple-500 text-purple-200' : 'bg-slate-800 border-slate-700 text-slate-400'}">
                    <span>SHOW BASE MESH</span>
                    <span class="px-1 py-0.2 rounded text-[7px] ${showBase ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}">${showBase ? 'ON' : 'OFF'}</span>
                </button>

                <!-- Align to Normal Toggle -->
                <button id="scatter-toggle-normal" class="py-1.5 px-2 rounded border text-[8.5px] font-mono font-bold flex items-center justify-between transition cursor-pointer ${alignNorm ? 'bg-purple-950/70 border-purple-500 text-purple-200' : 'bg-slate-800 border-slate-700 text-slate-400'}">
                    <span>ALIGN NORMAL</span>
                    <span class="px-1 py-0.2 rounded text-[7px] ${alignNorm ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}">${alignNorm ? 'ON' : 'OFF'}</span>
                </button>
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;
        const slider = root.querySelector('#scatter-scale-slider');
        const disp = root.querySelector('#scatter-scale-disp');

        const updateDisp = (val) => {
            const pct = Math.round(val * 100);
            if (disp) disp.textContent = `${pct}% (${val.toFixed(2)})`;
        };

        if (slider) {
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                m.scale = val;
                updateDisp(val);
                onChange?.();
            });
        }

        root.querySelectorAll('.scatter-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const val = parseFloat(e.currentTarget.dataset.scale);
                m.scale = val;
                if (slider) slider.value = val;
                updateDisp(val);
                onChange?.();
            });
        });

        root.querySelector('#scatter-toggle-base')?.addEventListener('click', () => {
            m.showBase = (m.showBase === false) ? true : false;
            ctx.reRenderModal?.();
            onChange?.();
        });

        root.querySelector('#scatter-toggle-normal')?.addEventListener('click', () => {
            m.alignNormal = (m.alignNormal === false) ? true : false;
            ctx.reRenderModal?.();
            onChange?.();
        });
    },
    updateLive: (cell, data, isPlaying, modal, m) => {
        if (!cell || !data) return;
        const scaleEl = cell.querySelector('[data-scatter-scale]');
        const curScale = Number(data.scale ?? m.scale ?? 0.25);
        const pct = Math.round(curScale * 100);

        if (scaleEl) scaleEl.textContent = `${pct}%`;

        if (modal) {
            const badge = modal.querySelector('#scatter-status-badge');
            if (badge) {
                if (data.isCvPatched) {
                    badge.className = 'text-[8.5px] font-mono font-bold text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50';
                    badge.textContent = 'CV SCALE MOD';
                } else {
                    badge.className = 'text-[8.5px] font-mono text-slate-400';
                    badge.textContent = 'MANUAL SCALE';
                }
            }
            if (data.isCvPatched) {
                const disp = modal.querySelector('#scatter-scale-disp');
                if (disp) {
                    disp.textContent = `${pct}% (${curScale.toFixed(2)}) [CV]`;
                }
            }
        }
    }
};

export const scatterDefs = {
    SCATTER
};
export default scatterDefs;
