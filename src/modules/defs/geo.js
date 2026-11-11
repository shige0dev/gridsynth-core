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
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const shapeName = (m?.shape || 'torus').toUpperCase();
        return `
        <div class="flex flex-col items-center justify-center w-full h-full pointer-events-none relative">
            <div class="relative w-[50px] h-7 border border-purple-500/50 bg-slate-950 p-[1px] flex items-center justify-center shadow-inner overflow-hidden">
                <canvas class="geo-panel-canvas w-full h-full block" width="50" height="28"></canvas>
                <div class="absolute bottom-full mb-[2px] inset-x-0 flex items-center justify-center pointer-events-none">
                    <span class="text-[7.5px] font-mono font-bold leading-none tracking-tight text-amber-400 text-center max-w-[64px]">${shapeName}</span>
                </div>
                <div class="absolute top-full mt-[2px] inset-x-0 flex items-center justify-center pointer-events-none">
                    <span class="text-[7.5px] font-mono font-bold leading-none tracking-tight text-cyan-300 text-center max-w-[64px]">OBJECT</span>
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
                OUTPUT: Default White (1:1 scale) Geometry Packet via GEO OUT (PIN11).
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
        if (!cell) return;
        const cvs = cell.querySelector('.geo-panel-canvas');
        if (cvs) {
            const ctx = cvs.getContext('2d');
            const w = cvs.width, h = cvs.height;
            ctx.clearRect(0, 0, w, h);

            ctx.save();
            ctx.translate(w / 2, h / 2);
            ctx.strokeStyle = '#ffffff'; // Base White wireframe
            ctx.lineWidth = 1.0;

            const shape = m?.shape || 'torus';
            if (shape === 'cube') {
                const s = 7;
                ctx.beginPath();
                ctx.moveTo(0, -s); ctx.lineTo(s * 1.2, -s * 0.4); ctx.lineTo(0, s * 0.3); ctx.lineTo(-s * 1.2, -s * 0.4); ctx.closePath();
                ctx.moveTo(0, s * 0.3); ctx.lineTo(0, s * 1.2); ctx.lineTo(s * 1.2, s * 0.5); ctx.lineTo(s * 1.2, -s * 0.4);
                ctx.moveTo(0, s * 1.2); ctx.lineTo(-s * 1.2, s * 0.5); ctx.lineTo(-s * 1.2, -s * 0.4);
                ctx.stroke();
            } else {
                const R = 8, r = 3.5;
                for (let i = 0; i < 6; i++) {
                    const theta = (i / 6) * Math.PI * 2;
                    ctx.beginPath();
                    for (let j = 0; j <= 8; j++) {
                        const phi = (j / 8) * Math.PI * 2;
                        const x = (R + r * Math.cos(phi)) * Math.cos(theta);
                        const y = r * Math.sin(phi);
                        const z = (R + r * Math.cos(phi)) * Math.sin(theta);
                        const projX = x;
                        const projY = y * 0.8 - z * 0.5;
                        if (j === 0) ctx.moveTo(projX, projY);
                        else ctx.lineTo(projX, projY);
                    }
                    ctx.stroke();
                }
            }
            ctx.restore();
        }
    }
};

export const geoDefs = {
    OBJECT
};
export default geoDefs;
