// src/modules/defs/vertex.js
// VERTEX - Dynamic 3D Vertex Displacement / Deformation Modifier
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const VERTEX_MODES = [
    { id: 'wave', label: 'WAVE' },
    { id: 'spike', label: 'SPIKE' },
    { id: 'twist', label: 'TWIST' },
    { id: 'wobble', label: 'WOBBLE' },
    { id: 'pinch', label: 'PINCH' }
];

export const VERTEX = {
    color: 'purple',
    defaults: () => ({
        type: 'VERTEX',
        mode: 'wave',
        depth: 0.35,
        freq: 3.0,
        speed: 1.0
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
        const mode = (m?.mode || 'wave').toUpperCase();
        const depth = Number(m?.depth ?? 0.35);
        const pct = Math.round(depth * 100);
        return `
        <div class="flex flex-col items-center justify-between w-full h-full py-1 pointer-events-none select-none text-center">
            <span data-vtx-mode class="text-[8px] font-mono font-bold text-purple-400 uppercase tracking-tight">${mode}</span>
            <div class="flex flex-col items-center gap-0.5 leading-none">
                <span data-vtx-depth class="text-[12px] font-mono font-extrabold text-cyan-300">${pct}%</span>
                <span class="text-[7px] font-mono text-purple-300">DISPLACEMENT</span>
            </div>
            <span class="text-[6.5px] font-mono text-slate-500 uppercase tracking-tight">FREQ ${Number(m?.freq ?? 3.0).toFixed(1)}</span>
        </div>`;
    },
    renderModal: (m, ctx) => {
        const isCvPatched = Boolean(ctx?.patched?.has('cv_in'));
        const curMode = m.mode || 'wave';
        const depth = Number(m.depth ?? 0.35);
        const pct = Math.round(depth * 100);
        const freq = Number(m.freq ?? 3.0);
        const speed = Number(m.speed ?? 1.0);

        return `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1">
                <span class="text-xs font-mono font-bold text-purple-400">VERTEX DEFORMER</span>
                <span id="vtx-status-badge" class="text-[8.5px] font-mono font-bold ${isCvPatched ? 'text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50' : 'text-slate-400'}">
                    ${isCvPatched ? 'CV DEPTH MOD' : 'MANUAL DEPTH'}
                </span>
            </div>

            <!-- Mode Selector -->
            <div class="flex flex-col gap-1">
                <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">DEFORMATION MODE (変形パターン)</span>
                <div class="grid grid-cols-5 gap-1">
                    ${VERTEX_MODES.map(mod => `
                        <button data-mode="${mod.id}" class="vtx-mode-btn py-1 rounded text-[8px] font-mono font-bold border transition ${curMode === mod.id ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${mod.label}</button>
                    `).join('')}
                </div>
            </div>

            <!-- Depth Slider -->
            <div class="flex flex-col gap-1 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <div class="flex justify-between items-center text-[9px] font-mono">
                    <span class="text-slate-300 font-bold">DEPTH (変形強度)</span>
                    <span id="vtx-depth-disp" class="font-bold text-cyan-300">${pct}% (${depth.toFixed(2)})</span>
                </div>
                <input type="range" id="vtx-depth-slider" min="0" max="1" step="0.01" value="${depth}" class="h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-purple-500 ${isCvPatched ? 'opacity-35 pointer-events-none' : ''}">
                <div class="flex justify-between text-[7px] font-mono text-slate-400">
                    <span>0% (Flat)</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100% (Max)</span>
                </div>
            </div>

            <!-- Frequency & Speed Controls -->
            <div class="grid grid-cols-2 gap-1.5">
                <div class="flex flex-col gap-1 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                    <div class="flex justify-between items-center text-[8.5px] font-mono">
                        <span class="text-slate-300 font-bold">FREQUENCY</span>
                        <span id="vtx-freq-disp" class="font-bold text-purple-300">${freq.toFixed(1)}</span>
                    </div>
                    <input type="range" id="vtx-freq-slider" min="1.0" max="10.0" step="0.2" value="${freq}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-purple-500">
                </div>

                <div class="flex flex-col gap-1 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                    <div class="flex justify-between items-center text-[8.5px] font-mono">
                        <span class="text-slate-300 font-bold">SPEED</span>
                        <span id="vtx-speed-disp" class="font-bold text-purple-300">${speed.toFixed(1)}x</span>
                    </div>
                    <input type="range" id="vtx-speed-slider" min="0.0" max="3.0" step="0.1" value="${speed}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-purple-500">
                </div>
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;
        const depthSlider = root.querySelector('#vtx-depth-slider');
        const depthDisp = root.querySelector('#vtx-depth-disp');
        const freqSlider = root.querySelector('#vtx-freq-slider');
        const freqDisp = root.querySelector('#vtx-freq-disp');
        const speedSlider = root.querySelector('#vtx-speed-slider');
        const speedDisp = root.querySelector('#vtx-speed-disp');

        if (depthSlider) {
            depthSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                m.depth = val;
                if (depthDisp) depthDisp.textContent = `${Math.round(val * 100)}% (${val.toFixed(2)})`;
                onChange?.();
            });
        }

        if (freqSlider) {
            freqSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                m.freq = val;
                if (freqDisp) freqDisp.textContent = val.toFixed(1);
                onChange?.();
            });
        }

        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                m.speed = val;
                if (speedDisp) speedDisp.textContent = `${val.toFixed(1)}x`;
                onChange?.();
            });
        }

        root.querySelectorAll('.vtx-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.mode = e.currentTarget.dataset.mode;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });
    },
    updateLive: (cell, data, isPlaying, modal, m) => {
        if (!cell || !data) return;
        const depthEl = cell.querySelector('[data-vtx-depth]');
        const modeEl = cell.querySelector('[data-vtx-mode]');
        const curDepth = Number(data.depth ?? m?.depth ?? 0.35);
        const curMode = (data.mode || m?.mode || 'wave').toUpperCase();
        const pct = Math.round(curDepth * 100);

        if (depthEl) depthEl.textContent = `${pct}%`;
        if (modeEl) modeEl.textContent = curMode;

        if (modal) {
            const badge = modal.querySelector('#vtx-status-badge');
            if (badge) {
                if (data.isCvPatched) {
                    badge.className = 'text-[8.5px] font-mono font-bold text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50';
                    badge.textContent = 'CV DEPTH MOD';
                } else {
                    badge.className = 'text-[8.5px] font-mono text-slate-400';
                    badge.textContent = 'MANUAL DEPTH';
                }
            }
            if (data.isCvPatched) {
                const disp = modal.querySelector('#vtx-depth-disp');
                if (disp) {
                    disp.textContent = `${pct}% (${curDepth.toFixed(2)}) [CV]`;
                }
            }
        }
    }
};

export const vertexDefs = {
    VERTEX
};
export default vertexDefs;
