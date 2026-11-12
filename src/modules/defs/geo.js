// src/modules/defs/geo.js
// OBJECT - 3D Geometry Object Generator with Material & Color styling
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const PRIMITIVES = [
    { id: 'torus', label: 'TORUS' },
    { id: 'cube', label: 'CUBE' },
    { id: 'plane', label: 'PLANE' },
    { id: 'sphere', label: 'SPHERE' },
    { id: 'cylinder', label: 'CYLINDER' },
    { id: 'tetra', label: 'TETRA' },
    { id: 'octa', label: 'OCTA' },
    { id: 'dodeca', label: 'DODECA' },
    { id: 'icosa', label: 'ICOSA' },
    { id: 'cone', label: 'CONE' },
    { id: 'capsule', label: 'CAPSULE' }
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
    { id: 'toon', label: 'TOON' }
];

export const PRESET_COLORS = [
    { hex: '#ffffff', label: 'WHT' },
    { hex: '#22d3ee', label: 'CYN' },
    { hex: '#34d399', label: 'EMR' },
    { hex: '#fbbf24', label: 'AMB' },
    { hex: '#fb7185', label: 'ROS' },
    { hex: '#c084fc', label: 'PRP' }
];

export const OBJECT = {
    color: 'purple',
    defaults: () => ({
        type: 'OBJECT',
        shape: 'torus',
        material: 'wire',
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
        return `<div class="flex flex-col items-center justify-center w-full h-full pointer-events-none select-none text-center">
            <span class="text-[11px] font-mono font-extrabold text-purple-300 tracking-wider">${shapeName}</span>
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
                <span class="text-xs font-mono font-bold text-purple-400">3D OBJECT</span>
                <span class="text-[9px] font-mono text-purple-300 bg-purple-950 px-1.5 py-0.5 rounded border border-purple-600/50">PRIMITIVE MESH</span>
            </div>

            <!-- Section 1: Shape Selector (11 primitives) -->
            <div class="flex flex-col gap-1">
                <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">PRIMITIVE SHAPE (多面体・幾何学)</span>
                <div class="grid grid-cols-4 gap-1">
                    ${PRIMITIVES.map(p => `
                        <button data-shape="${p.id}" class="geo-shape-btn py-1 rounded text-[8px] font-mono font-bold border transition ${curShape === p.id ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${p.label}</button>
                    `).join('')}
                </div>
            </div>

            <!-- Section 2: Mesh Detail (3 Levels: Low / Mid / High) -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">MESH DETAIL (詳細度 3段階)</span>
                <div class="grid grid-cols-3 gap-1">
                    ${MESH_DETAILS.map(d => `
                        <button data-detail="${d.id}" class="geo-detail-btn py-1 rounded text-[8.5px] font-mono font-bold border transition ${curDet === d.id ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${d.label}</button>
                    `).join('')}
                </div>
            </div>

            <!-- Section 3: Material Style -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">MATERIAL STYLE</span>
                <div class="grid grid-cols-4 gap-1">
                    ${MATERIAL_STYLES.map(ms => `
                        <button data-mat="${ms.id}" class="geo-mat-btn py-1 rounded text-[8px] font-mono font-bold border transition ${curMat === ms.id ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${ms.label}</button>
                    `).join('')}
                </div>
            </div>

            <!-- Section 4: Color Palette (Only relevant for Wire, Solid, Toon) -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1 ${curMat === 'normal' ? 'opacity-30 pointer-events-none' : ''}">
                <div class="flex items-center justify-between">
                    <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">COLOR</span>
                    <span class="text-[7.5px] font-mono text-slate-400">${curCol}</span>
                </div>
                <div class="grid grid-cols-6 gap-1">
                    ${PRESET_COLORS.map(c => `
                        <button data-col="${c.hex}" class="geo-col-btn h-5 rounded border flex items-center justify-center transition-all ${curCol === c.hex.toLowerCase() ? 'ring-2 ring-purple-400 border-white scale-105' : 'border-slate-700 hover:scale-105'}" style="background-color: ${c.hex};" title="${c.label}"></button>
                    `).join('')}
                </div>
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

        // Color buttons
        root.querySelectorAll('.geo-col-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.color = e.currentTarget.dataset.col;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });
    },
    updateLive: () => {}
};

export const geoDefs = {
    OBJECT
};
export default geoDefs;
