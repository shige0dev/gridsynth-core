// src/modules/defs/geo.js
// OBJECT - 3D Geometry Object Generator with Material & Color styling
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const BASIC_SHAPES = [
    { id: 'torus', label: 'TORUS' },
    { id: 'cube', label: 'CUBE' },
    { id: 'plane', label: 'PLANE' },
    { id: 'sphere', label: 'SPHERE' },
    { id: 'cylinder', label: 'CYLINDER' },
    { id: 'cone', label: 'CONE' }
];

export const POLYHEDRA_SHAPES = [
    { id: 'tetra', label: 'TETRA' },
    { id: 'octa', label: 'OCTA' },
    { id: 'dodeca', label: 'DODECA' },
    { id: 'icosa', label: 'ICOSA' }
];

export const MESH_DETAILS = [
    { id: 'low', label: 'LOW' },
    { id: 'mid', label: 'MID' },
    { id: 'high', label: 'HIGH' }
];

export const MATERIAL_STYLES = [
    { id: 'wire', label: 'WIRE' },
    { id: 'solid', label: 'SOLID' },
    { id: 'normal', label: 'NORMAL' },
    { id: 'toon', label: 'TOON' },
    { id: 'point', label: 'POINT' },
    { id: 'glass', label: 'GLASS' }
];

export const OBJECT = {
    color: 'purple',
    defaults: () => ({
        type: 'OBJECT',
        shape: 'torus',
        material: 'wire',
        wireWidth: 1.5,
        pointSize: 3.0,
        glassOpacity: 0.25,
        glow: 0.0,
        color: '#ffffff',
        detail: 'mid'
    }),
    ports: () => ({
        in: [],
        out: [
            { port: 'obj_out', pin: 10, color: 'bg-purple-500', label: 'OBJ' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const shapeName = (m?.shape || 'torus').toUpperCase();
        const matName = (m?.material || 'wire').toUpperCase();
        const detName = (m?.detail || 'mid').toUpperCase();
        const isPoly = ['tetra', 'octa', 'dodeca', 'icosa'].includes(m?.shape);
        return `<div class="flex flex-col items-center justify-center w-full h-full pointer-events-none select-none text-center">
            <span class="text-[11px] font-mono font-extrabold ${isPoly ? 'text-amber-300' : 'text-purple-300'} tracking-wider">${shapeName}</span>
            <span class="text-[7px] font-mono font-bold text-slate-400 uppercase tracking-tight">[${matName}:${detName}]</span>
        </div>`;
    },
    renderModal: (m) => {
        const curShape = m.shape || 'torus';
        const curMat = m.material || 'wire';
        const curCol = (m.color || '#ffffff').toLowerCase();
        const curDet = m.detail || 'mid';

        return `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1">
                <span class="text-xs font-mono font-bold text-purple-400">OBJECT</span>
            </div>

            <!-- Section 1: Object Shapes -->
            <div class="flex flex-col gap-1">
                <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">SHAPE</span>
                <div class="grid grid-cols-3 gap-1">
                    ${BASIC_SHAPES.map(p => `
                        <button data-shape="${p.id}" class="geo-shape-btn py-1 rounded text-[8px] font-mono font-bold border transition ${curShape === p.id ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'}">${p.label}</button>
                    `).join('')}
                </div>
                <div class="grid grid-cols-4 gap-1">
                    ${POLYHEDRA_SHAPES.map(p => `
                        <button data-shape="${p.id}" class="geo-shape-btn py-1 rounded text-[8px] font-mono font-bold border transition ${curShape === p.id ? 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/50 ring-1 ring-amber-400/40' : 'bg-slate-800 text-amber-200/90 border-slate-700 hover:bg-slate-750'}">${p.label}</button>
                    `).join('')}
                </div>
            </div>

            <!-- Section 2: Mesh Detail -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">DETAIL</span>
                <div class="grid grid-cols-3 gap-1">
                    ${MESH_DETAILS.map(d => `
                        <button data-detail="${d.id}" class="geo-detail-btn py-1 rounded text-[8.5px] font-mono font-bold border transition ${curDet === d.id ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${d.label}</button>
                    `).join('')}
                </div>
            </div>

            <!-- Section 3: Material -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">MATERIAL</span>
                <div class="grid grid-cols-4 gap-1">
                    ${MATERIAL_STYLES.map(ms => `
                        <button data-mat="${ms.id}" class="geo-mat-btn py-1 rounded text-[8px] font-mono font-bold border transition ${curMat === ms.id ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${ms.label}</button>
                    `).join('')}
                </div>
            </div>

            ${curMat === 'wire' ? `
            <!-- Section 3B: Wire Width -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <div class="flex items-center justify-between">
                    <span class="text-[8px] font-mono font-bold text-cyan-400 uppercase tracking-wider">WIRE WIDTH</span>
                    <span id="geo-wire-width-val" class="text-[8px] font-mono font-bold text-cyan-300">${Number(m.wireWidth ?? 1.5).toFixed(1)} px</span>
                </div>
                <input id="geo-wire-width" type="range" min="0.5" max="8.0" step="0.5" value="${Number(m.wireWidth ?? 1.5)}" class="w-full accent-purple-500 h-1.5 bg-slate-800 rounded cursor-pointer">
            </div>
            ` : ''}

            ${curMat === 'point' ? `
            <!-- Section 3B: Point Size -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <div class="flex items-center justify-between">
                    <span class="text-[8px] font-mono font-bold text-cyan-400 uppercase tracking-wider">POINT SIZE</span>
                    <span id="geo-point-size-val" class="text-[8px] font-mono font-bold text-cyan-300">${Number(m.pointSize ?? 3.0).toFixed(1)}</span>
                </div>
                <input id="geo-point-size" type="range" min="0.5" max="12.0" step="0.5" value="${Number(m.pointSize ?? 3.0)}" class="w-full accent-purple-500 h-1.5 bg-slate-800 rounded cursor-pointer">
            </div>
            ` : ''}

            ${curMat === 'glass' ? `
            <!-- Section 3D: Glass Opacity -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <div class="flex items-center justify-between">
                    <span class="text-[8px] font-mono font-bold text-cyan-400 uppercase tracking-wider">GLASS DENSITY</span>
                    <span id="geo-glass-opacity-val" class="text-[8px] font-mono font-bold text-cyan-300">${Math.round(Number(m.glassOpacity ?? 0.25) * 100)}%</span>
                </div>
                <input id="geo-glass-opacity" type="range" min="0.05" max="0.85" step="0.05" value="${Number(m.glassOpacity ?? 0.25)}" class="w-full accent-purple-500 h-1.5 bg-slate-800 rounded cursor-pointer">
            </div>
            ` : ''}

            <!-- Section 4: Color -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1 ${curMat === 'normal' ? 'opacity-30 pointer-events-none' : ''}">
                <div class="flex items-center justify-between">
                    <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">COLOR</span>
                    <span id="geo-col-hex" class="text-[8px] font-mono font-bold text-cyan-300 uppercase">${curCol}</span>
                </div>
                <input id="geo-color-picker" type="color" value="${curCol}" class="w-full h-6 p-0.5 rounded bg-slate-800 border border-slate-600 cursor-pointer" title="カラーセレクタ">
            </div>

            <!-- Section 5: Neon Glow -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <div class="flex items-center justify-between">
                    <span class="text-[8px] font-mono font-bold text-amber-400 uppercase tracking-wider">NEON GLOW</span>
                    <span id="geo-glow-val" class="text-[8px] font-mono font-bold text-amber-300">${Number(m.glow ?? 0).toFixed(1)}</span>
                </div>
                <input id="geo-glow" type="range" min="0.0" max="3.0" step="0.1" value="${Number(m.glow ?? 0)}" class="w-full accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer">
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;

        // Shape buttons
        root.querySelectorAll('.geo-shape-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.shape = e.currentTarget.dataset.shape;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });

        // Detail buttons
        root.querySelectorAll('.geo-detail-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.detail = e.currentTarget.dataset.detail;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });

        // Material buttons
        root.querySelectorAll('.geo-mat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.material = e.currentTarget.dataset.mat;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });

        // Native color picker
        const colPicker = root.querySelector('#geo-color-picker');
        if (colPicker) {
            colPicker.addEventListener('input', (e) => {
                m.color = e.target.value;
                const hexEl = root.querySelector('#geo-col-hex');
                if (hexEl) hexEl.textContent = m.color.toLowerCase();
                onChange?.();
            });
            colPicker.addEventListener('change', () => {
                ctx.reRenderModal?.();
            });
        }

        // Neon glow slider
        const glowSl = root.querySelector('#geo-glow');
        if (glowSl) {
            glowSl.addEventListener('input', (e) => {
                m.glow = parseFloat(e.target.value);
                const disp = root.querySelector('#geo-glow-val');
                if (disp) disp.textContent = m.glow.toFixed(1);
                onChange?.();
            });
        }

        // Wire width slider
        const wireSl = root.querySelector('#geo-wire-width');
        if (wireSl) {
            wireSl.addEventListener('input', (e) => {
                m.wireWidth = parseFloat(e.target.value);
                const disp = root.querySelector('#geo-wire-width-val');
                if (disp) disp.textContent = `${m.wireWidth.toFixed(1)} px`;
                onChange?.();
            });
        }

        // Point size slider
        const ptSl = root.querySelector('#geo-point-size');
        if (ptSl) {
            ptSl.addEventListener('input', (e) => {
                m.pointSize = parseFloat(e.target.value);
                const disp = root.querySelector('#geo-point-size-val');
                if (disp) disp.textContent = m.pointSize.toFixed(1);
                onChange?.();
            });
        }

        // Glass opacity slider
        const glassSl = root.querySelector('#geo-glass-opacity');
        if (glassSl) {
            glassSl.addEventListener('input', (e) => {
                m.glassOpacity = parseFloat(e.target.value);
                const disp = root.querySelector('#geo-glass-opacity-val');
                if (disp) disp.textContent = `${Math.round(m.glassOpacity * 100)}%`;
                onChange?.();
            });
        }
    },
    updateLive: () => {}
};

export const geoDefs = {
    OBJECT
};
export default geoDefs;
