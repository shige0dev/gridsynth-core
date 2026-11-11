// src/modules/defs/geo.js
// OBJECT - 3D Geometry Object Generator (Cube / Torus)
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const OBJECT = {
    color: 'purple',
    defaults: () => ({
        type: 'OBJECT',
        shape: 'torus' // 'cube' | 'torus'
    }),
    ports: () => ({
        in: [],
        out: [
            { port: 'obj_out', pin: 11, color: 'bg-purple-500', label: 'OBJ' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const shapeName = (m?.shape || 'torus').toUpperCase();
        return `<div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-purple-400 select-none">
            <span class="text-[8px] font-bold text-amber-400/90 tracking-tight">OBJECT</span>
            <span class="text-[14px] font-mono font-extrabold text-purple-300 tracking-wider">${shapeName}</span>
        </div>`;
    },
    renderModal: (m) => {
        const curShape = m.shape || 'torus';
        return `
        <div class="flex flex-col gap-3 p-2 bg-slate-900 text-slate-200 select-none">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
                <span class="text-xs font-mono font-bold text-purple-400">3D OBJECT</span>
                <span class="text-[10px] font-mono text-slate-400">MESH GENERATOR</span>
            </div>
            <div class="flex flex-col gap-1.5">
                <span class="text-[9px] font-mono font-bold text-slate-400">SELECT SHAPE</span>
                <div class="grid grid-cols-2 gap-2">
                    <button data-shape="torus" class="geo-shape-btn py-1.5 rounded text-[10px] font-mono font-bold border transition ${curShape === 'torus' ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">TORUS</button>
                    <button data-shape="cube" class="geo-shape-btn py-1.5 rounded text-[10px] font-mono font-bold border transition ${curShape === 'cube' ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">CUBE</button>
                </div>
            </div>
            <div class="text-[8px] font-mono text-slate-400 bg-slate-950 p-1.5 rounded border border-slate-800">
                OUTPUT: 1:1 Scale White Geometry via OBJ OUT (PIN11).
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
