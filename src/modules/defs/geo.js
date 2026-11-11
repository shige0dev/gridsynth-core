// src/modules/defs/geo.js
// GEO_PRIM - 3D Geometry Primitive Generator (Torus)
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const GEO_PRIM = {
    color: 'purple',
    defaults: () => ({
        type: 'GEO_PRIM',
        shape: 'torus',
        rotX: 0.0,
        rotY: 0.0,
        rotZ: 0.0,
        scale: 1.0,
        color: '#a855f7'
    }),
    ports: () => ({
        in: [
            { port: 'rot_x', pin: 4, color: 'bg-yellow-400', label: 'RX' },
            { port: 'rot_y', pin: 3, color: 'bg-yellow-400', label: 'RY' },
            { port: 'rot_z', pin: 2, color: 'bg-yellow-400', label: 'RZ' },
            { port: 'scale_cv', pin: 1, color: 'bg-yellow-400', label: 'SCL' }
        ],
        out: [
            { port: 'geo_out', pin: 11, color: 'bg-purple-500', label: 'GEO' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => `
        <div class="flex flex-col items-center justify-center w-full h-full pointer-events-none relative">
            <div class="relative w-[50px] h-7 border border-purple-500/50 bg-slate-950 p-[1px] flex items-center justify-center shadow-inner overflow-hidden">
                <canvas class="geo-panel-canvas w-full h-full block" width="50" height="28"></canvas>
                <div class="absolute bottom-full mb-[2px] inset-x-0 flex items-center justify-center pointer-events-none">
                    <span class="text-[7.5px] font-mono font-bold leading-none tracking-tight text-amber-400 text-center max-w-[64px]">TORUS</span>
                </div>
                <div class="absolute top-full mt-[2px] inset-x-0 flex items-center justify-center pointer-events-none">
                    <span data-geo-disp class="text-[7.5px] font-mono font-bold leading-none tracking-tight text-cyan-300 text-center max-w-[64px]">3D GEO</span>
                </div>
            </div>
        </div>`,
    updateLive: (cell, data, isPlaying, modal, m) => {
        if (!cell) return;
        const cvs = cell.querySelector('.geo-panel-canvas');
        if (cvs) {
            const ctx = cvs.getContext('2d');
            const w = cvs.width, h = cvs.height;
            ctx.clearRect(0, 0, w, h);

            // Simple 2.5D wireframe torus render on 50x28 canvas
            const rx = (data?.rx ?? m.rotX ?? 0) * Math.PI;
            const ry = (data?.ry ?? m.rotY ?? 0) * Math.PI;
            const scl = Math.max(0.2, Math.min(2.0, (data?.scale ?? m.scale ?? 1.0)));

            ctx.save();
            ctx.translate(w / 2, h / 2);
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 1.0;

            const R = 9 * scl;
            const r = 4 * scl;
            const segments = 8;
            for (let i = 0; i < segments; i++) {
                const theta = (i / segments) * Math.PI * 2 + ry;
                const cosT = Math.cos(theta), sinT = Math.sin(theta);
                ctx.beginPath();
                for (let j = 0; j <= 12; j++) {
                    const phi = (j / 12) * Math.PI * 2;
                    const x = (R + r * Math.cos(phi)) * cosT;
                    const y = r * Math.sin(phi);
                    const z = (R + r * Math.cos(phi)) * sinT;
                    const projX = x;
                    const projY = y * Math.cos(rx) - z * Math.sin(rx);
                    if (j === 0) ctx.moveTo(projX, projY);
                    else ctx.lineTo(projX, projY);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        const disp = cell.querySelector('[data-geo-disp]');
        if (disp && data) {
            disp.textContent = `S:${(data.scale ?? 1.0).toFixed(1)} R:${(data.ry ?? 0.0).toFixed(2)}`;
        }
    }
};

export const geoDefs = {
    GEO_PRIM
};
export default geoDefs;
