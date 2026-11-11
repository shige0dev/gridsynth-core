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
            { port: 'geo_out', pin: 11, color: 'bg-purple-500', label: 'GEO' }
        ]
    }),
    renderPorts: (m, renderP, ports) => {
        const p = (ports.out || []).find(x => x.port === 'geo_out') || { port: 'geo_out', color: 'bg-purple-500' };
        return `<div class="absolute right-[3px] bottom-[3px] flex items-center pointer-events-auto z-10" title="GEO OUT">
            ${renderP([p])}
        </div>`;
    },
    renderGrid: (m) => {
        const shapeName = (m?.shape || 'torus').toUpperCase();
        return `
        <div class="flex flex-col items-center justify-center w-full h-full pointer-events-none relative">
            <div class="relative w-[50px] h-7 border border-purple-500/60 bg-slate-950 p-[1px] flex items-center justify-center shadow-inner overflow-hidden rounded-xs">
                <span class="text-[10px] font-mono font-extrabold tracking-wider text-purple-200 uppercase">${shapeName}</span>
                <div class="absolute bottom-full mb-[2px] inset-x-0 flex items-center justify-center pointer-events-none">
                    <span class="text-[7.5px] font-mono font-bold leading-none tracking-tight text-amber-400 text-center max-w-[64px]">OBJECT</span>
                </div>
                <div class="absolute top-full mt-[2px] inset-x-0 flex items-center justify-center pointer-events-none">
                    <span class="text-[7.5px] font-mono font-bold leading-none tracking-tight text-cyan-300 text-center max-w-[64px]">${shapeName}</span>
                </div>
            </div>
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
                OUTPUT: 1:1 Scale White Geometry via GEO OUT (PIN11).
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
