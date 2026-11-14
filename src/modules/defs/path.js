// src/modules/defs/path.js
// PATH - 2D Line, Arc/Circle, Polygon & Planar Geometry Generator (with CV modulation)
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const PATH_SHAPES = [
    { id: 'line', label: 'LINE' },
    { id: 'arc', label: 'ARC' },
    { id: 'poly', label: 'POLY' }
];

export const PATH_RENDER_MODES = [
    { id: 'line', label: 'LINE' },
    { id: 'fill', label: 'FILL' }
];

export const PATH_MATERIALS = [
    { id: 'wire', label: 'WIRE' },
    { id: 'solid', label: 'SOLID' },
    { id: 'neon', label: 'NEON' },
    { id: 'glass', label: 'GLASS' },
    { id: 'point', label: 'POINT' }
];

export const PATH = {
    color: 'purple',
    defaults: () => ({
        type: 'PATH',
        shape: 'arc',
        renderMode: 'line',
        points: 32,
        edgeSubdiv: 1,
        arc: 1.0,
        sides: 6,
        material: 'wire',
        glow: 0.0,
        color: '#ffffff'
    }),
    ports: () => ({
        in: [
            { port: 'cv_in', pin: 5, color: 'bg-yellow-400', label: 'CV' }
        ],
        out: [
            { port: 'obj_out', pin: 10, color: 'bg-purple-500', label: 'OBJ' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),

    renderGrid: (m) => {
        const shape = (m?.shape || 'arc').toUpperCase();
        const rMode = (m?.renderMode || 'line').toUpperCase();
        const sub = m?.shape === 'arc'
            ? `${Math.round((m.arc ?? 1.0) * 360)}°`
            : (m?.shape === 'poly' ? `${Math.round(m.sides ?? 6)}S` : `${Math.round(m.points ?? 32)}P`);
        return `<div class="flex flex-col items-center justify-center w-full h-full pointer-events-none select-none text-center">
            <span class="text-[11px] font-mono font-extrabold text-purple-300 tracking-wider">${shape}</span>
            <span class="text-[7px] font-mono font-bold text-cyan-300 uppercase tracking-tight">[${rMode}:${sub}]</span>
        </div>`;
    },

    renderModal: (m, ctx) => {
        const isCvPatched = Boolean(ctx?.patched?.has('cv_in'));
        const curShape = m.shape || 'arc';
        const curRMode = m.renderMode || 'line';
        const curPoints = Math.round(m.points ?? 32);
        const curSubdiv = Math.round(m.edgeSubdiv ?? 1);
        const curArc = Number(m.arc ?? 1.0);
        const curSides = Math.round(m.sides ?? 6);
        const curMat = m.material || 'wire';
        const curGlow = Number(m.glow ?? 0.0);
        const curCol = (m.color || '#ffffff').toLowerCase();

        const presets = ['#ffffff', '#38bdf8', '#a855f7', '#ec4899', '#10b981', '#eab308', '#ef4444', '#f97316'];

        return `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1">
                <span class="text-xs font-mono font-bold text-purple-400">PATH / 2D</span>
                <span id="path-status-badge" class="text-[8px] font-mono font-bold ${isCvPatched ? 'text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50' : 'text-slate-400'}">
                    ${isCvPatched ? 'CV MOD' : 'MANUAL'}
                </span>
            </div>

            <!-- Shape Selector (LINE / ARC / POLY) -->
            <div class="flex flex-col gap-1">
                <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">SHAPE</span>
                <div class="grid grid-cols-3 gap-1">
                    ${PATH_SHAPES.map(s => `
                        <button data-shape="${s.id}" class="path-shape-btn py-1 rounded text-[8px] font-mono font-bold border transition cursor-pointer ${curShape === s.id ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${s.label}</button>
                    `).join('')}
                </div>
            </div>

            <!-- Render Mode (LINE vs FILL) -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">OUTPUT TYPE</span>
                <div class="grid grid-cols-2 gap-1">
                    ${PATH_RENDER_MODES.map(rm => `
                        <button data-rmode="${rm.id}" class="path-rmode-btn py-1 rounded text-[8px] font-mono font-bold border transition cursor-pointer ${curRMode === rm.id ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm shadow-cyan-500/40' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${rm.label}</button>
                    `).join('')}
                </div>
            </div>

            ${curShape === 'arc' ? `
            <!-- ARC Factor (1.0 = 360 deg) -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <div class="flex items-center justify-between">
                    <span class="text-[8px] font-mono font-bold text-amber-400 uppercase tracking-wider">ARC (1.0 = 360°)</span>
                    <span id="path-arc-val" class="text-[8px] font-mono font-bold text-cyan-300">${curArc.toFixed(2)} (${Math.round(curArc * 360)}°)</span>
                </div>
                <input id="path-arc" type="range" min="0.05" max="1.0" step="0.01" value="${curArc}" class="w-full h-1 accent-amber-400 cursor-pointer ${isCvPatched ? 'no-thumb opacity-35 pointer-events-none' : ''}" ${isCvPatched ? 'disabled' : ''}>
            </div>
            ` : ''}

            ${curShape === 'poly' ? `
            <!-- POLY Sides (2 = Line .. 16) -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <div class="flex items-center justify-between">
                    <span class="text-[8px] font-mono font-bold text-amber-400 uppercase tracking-wider">SIDES (2 = LINE)</span>
                    <span id="path-sides-val" class="text-[8px] font-mono font-bold text-cyan-300">${curSides}</span>
                </div>
                <input id="path-sides" type="range" min="2" max="16" step="1" value="${curSides}" class="w-full h-1 accent-amber-400 cursor-pointer ${isCvPatched ? 'no-thumb opacity-35 pointer-events-none' : ''}" ${isCvPatched ? 'disabled' : ''}>
            </div>
            ` : ''}

            <!-- Points / Edge Subdiv -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                ${curShape === 'poly' ? `
                    <div class="flex items-center justify-between">
                        <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">EDGE SUBDIV</span>
                        <span id="path-subdiv-val" class="text-[8px] font-mono font-bold text-cyan-300">${curSubdiv}</span>
                    </div>
                    <input id="path-subdiv" type="range" min="1" max="8" step="1" value="${curSubdiv}" class="w-full h-1 accent-purple-400 cursor-pointer">
                ` : `
                    <div class="flex items-center justify-between">
                        <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">POINTS</span>
                        <span id="path-points-val" class="text-[8px] font-mono font-bold text-cyan-300">${curPoints}</span>
                    </div>
                    <input id="path-points" type="range" min="2" max="64" step="1" value="${curPoints}" class="w-full h-1 accent-purple-400 cursor-pointer">
                `}
            </div>

            ${curRMode === 'fill' ? `
            <!-- Material Style for Planar Fill -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">MATERIAL</span>
                <div class="grid grid-cols-5 gap-1">
                    ${PATH_MATERIALS.map(ms => `
                        <button data-mat="${ms.id}" class="path-mat-btn py-1 rounded text-[7px] font-mono font-bold border transition cursor-pointer ${curMat === ms.id ? 'bg-purple-600 text-white border-purple-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${ms.label}</button>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Neon Glow -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <div class="flex items-center justify-between">
                    <span class="text-[8px] font-mono font-bold text-amber-400 uppercase tracking-wider">NEON GLOW</span>
                    <span id="path-glow-val" class="text-[8px] font-mono font-bold text-amber-300">${curGlow.toFixed(1)}</span>
                </div>
                <input id="path-glow" type="range" min="0.0" max="3.0" step="0.1" value="${curGlow}" class="w-full h-1 accent-amber-400 cursor-pointer">
            </div>

            <!-- Color -->
            <div class="flex flex-col gap-1.5 border-t border-slate-800 pt-1">
                <div class="flex items-center justify-between">
                    <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">COLOR</span>
                    <input type="color" id="path-color-picker" value="${curCol}" class="w-6 h-4 bg-transparent border-0 cursor-pointer p-0">
                </div>
                <div class="grid grid-cols-8 gap-1">
                    ${presets.map(c => `
                        <button data-color="${c}" class="path-col-btn w-4 h-4 rounded-sm border transition cursor-pointer ${curCol === c ? 'border-white scale-110 shadow-sm' : 'border-slate-700'}" style="background-color: ${c};"></button>
                    `).join('')}
                </div>
            </div>
        </div>`;
    },

    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;

        root.querySelectorAll('.path-shape-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.shape = e.currentTarget.dataset.shape;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });

        root.querySelectorAll('.path-rmode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.renderMode = e.currentTarget.dataset.rmode;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });

        root.querySelectorAll('.path-mat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.material = e.currentTarget.dataset.mat;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });

        const arcSlider = root.querySelector('#path-arc');
        const arcVal = root.querySelector('#path-arc-val');
        if (arcSlider) {
            arcSlider.addEventListener('input', (e) => {
                m.arc = parseFloat(e.target.value);
                if (arcVal) arcVal.textContent = `${m.arc.toFixed(2)} (${Math.round(m.arc * 360)}°)`;
                onChange?.();
            });
        }

        const sidesSlider = root.querySelector('#path-sides');
        const sidesVal = root.querySelector('#path-sides-val');
        if (sidesSlider) {
            sidesSlider.addEventListener('input', (e) => {
                m.sides = parseInt(e.target.value, 10);
                if (sidesVal) sidesVal.textContent = `${m.sides}`;
                onChange?.();
            });
        }

        const ptsSlider = root.querySelector('#path-points');
        const ptsVal = root.querySelector('#path-points-val');
        if (ptsSlider) {
            ptsSlider.addEventListener('input', (e) => {
                m.points = parseInt(e.target.value, 10);
                if (ptsVal) ptsVal.textContent = `${m.points}`;
                onChange?.();
            });
        }

        const subSlider = root.querySelector('#path-subdiv');
        const subVal = root.querySelector('#path-subdiv-val');
        if (subSlider) {
            subSlider.addEventListener('input', (e) => {
                m.edgeSubdiv = parseInt(e.target.value, 10);
                if (subVal) subVal.textContent = `${m.edgeSubdiv}`;
                onChange?.();
            });
        }

        const glowSlider = root.querySelector('#path-glow');
        const glowVal = root.querySelector('#path-glow-val');
        if (glowSlider) {
            glowSlider.addEventListener('input', (e) => {
                m.glow = parseFloat(e.target.value);
                if (glowVal) glowVal.textContent = m.glow.toFixed(1);
                onChange?.();
            });
        }

        root.querySelectorAll('.path-col-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.color = e.currentTarget.dataset.color;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });

        const picker = root.querySelector('#path-color-picker');
        if (picker) {
            picker.addEventListener('input', (e) => {
                m.color = e.target.value;
                onChange?.();
            });
        }
    },

    updateLive: (cell, data, isPlaying, modal) => {
        if (!modal || !data) return;
        const badge = modal.querySelector('#path-status-badge');
        if (badge) {
            badge.textContent = data.isCvPatched ? 'CV MOD' : 'MANUAL';
        }
        const arcSlider = modal.querySelector('#path-arc');
        const arcVal = modal.querySelector('#path-arc-val');
        if (arcSlider && data.isCvPatched) {
            const v = Number(data.effectiveArc ?? 1.0);
            arcSlider.value = v;
            if (arcVal) arcVal.textContent = `${v.toFixed(2)} (${Math.round(v * 360)}°)`;
        }
        const sidesSlider = modal.querySelector('#path-sides');
        const sidesVal = modal.querySelector('#path-sides-val');
        if (sidesSlider && data.isCvPatched) {
            const s = Math.round(data.effectiveSides ?? 6);
            sidesSlider.value = s;
            if (sidesVal) sidesVal.textContent = `${s}`;
        }
    }
};

export const pathDefs = {
    PATH
};
export default pathDefs;
