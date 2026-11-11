// src/modules/defs/geo.js
// OBJECT - 3D Geometry Object Generator (Torus, Cube, Plane, Sphere, Cylinder, etc.)
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const PRIMITIVES = [
    { id: 'torus', label: 'TORUS' },
    { id: 'cube', label: 'CUBE' },
    { id: 'plane', label: 'PLANE' },
    { id: 'sphere', label: 'SPHERE' },
    { id: 'cylinder', label: 'CYLINDER' }
];

export const OBJECT = {
    color: 'purple',
    defaults: () => ({
        type: 'OBJECT',
        shape: 'torus' // 'torus' | 'cube' | 'plane' | 'sphere' | 'cylinder'
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
        return `<div class="flex items-center justify-center w-full h-full pointer-events-none select-none text-purple-400">
            <span class="text-[13px] font-mono font-extrabold text-purple-300 tracking-wider">${shapeName}</span>
        </div>`;
    },
    renderModal: (m) => {
        const curShape = m.shape || 'torus';
        return `
        <div class="flex flex-col gap-2.5 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1">
                <span class="text-xs font-mono font-bold text-purple-400">3D OBJECT</span>
                <span class="text-[9.5px] font-mono text-purple-300 bg-purple-950 px-1 py-0.5 rounded border border-purple-600/50">PRIMITIVE MESH</span>
            </div>
            <div class="flex flex-col gap-1">
                <span class="text-[8.5px] font-mono font-bold text-slate-400">SELECT PRIMITIVE (プリミティブ選択)</span>
                <div class="grid grid-cols-3 gap-1.5">
                    ${PRIMITIVES.map(p => `
                        <button data-shape="${p.id}" class="geo-shape-btn py-1.5 rounded text-[9.5px] font-mono font-bold border transition ${curShape === p.id ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${p.label}</button>
                    `).join('')}
                </div>
            </div>
            <div class="text-[8px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded border border-slate-800 leading-normal">
                OUTPUT: 1:1 Scale White Geometry via OBJ OUT (最下段 PIN10)。
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;
        root.querySelectorAll('.geo-shape-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const shape = e.currentTarget.dataset.shape;
                m.shape = shape;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });
    },
    updateLive: (cell, data, isPlaying, modal, m) => {
        // Simple shape name sync if updated
    }
};

export const geoDefs = {
    OBJECT
};
export default geoDefs;
