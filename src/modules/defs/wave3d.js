// src/modules/defs/wave3d.js
// WAVE3D - 3D Scrolling Audio Oscilloscope / Waterfall Buffer Generator
import { UIHelpers } from '../../ui/helpers.js?v=811';

export const WAVE3D_MODES = [
    { id: 'wave', label: 'WAVE' },
    { id: 'spec', label: 'SPEC' }
];

export const WAVE3D_STYLES = [
    { id: 'ribbon', label: 'RIBBON' },
    { id: 'point', label: 'POINT' },
    { id: 'bars', label: 'BARS' }
];

export const WAVE3D = {
    color: 'purple',
    defaults: () => ({
        type: 'WAVE3D',
        sourceMode: 'wave',
        style: 'ribbon',
        slices: 40,
        cols: 64,
        gain: 1.6,
        speed: 1.0,
        tilt: 0.38,
        glow: 0.75,
        color: '#ffffff'
    }),
    ports: () => ({
        in: [
            { port: 'wave_in', pin: 5, color: 'bg-blue-500', label: 'AUD' },
            { port: 'cv_in', pin: 4, color: 'bg-yellow-400', label: 'GAIN' }
        ],
        out: [
            { port: 'obj_out', pin: 10, color: 'bg-purple-500', label: 'OBJ' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),

    renderGrid: (m) => {
        const mode = (m?.sourceMode || 'wave').toUpperCase();
        const style = (m?.style || 'ribbon').toUpperCase();
        return `<div class="flex flex-col items-center justify-center w-full h-full pointer-events-none select-none text-center">
            <span class="text-[10px] font-mono font-extrabold text-purple-300 tracking-wider">${mode}</span>
            <span class="text-[7px] font-mono font-bold text-cyan-300 uppercase tracking-tight">[${style}]</span>
        </div>`;
    },

    renderModal: (m, ctx) => {
        const isCvPatched = Boolean(ctx?.patched?.has('cv_in'));
        const curMode = m.sourceMode || 'wave';
        const curStyle = m.style || 'ribbon';
        const curSlices = Math.round(m.slices ?? 40);
        const curCols = Math.round(m.cols ?? 64);
        const curGain = Number(m.gain ?? 1.6);
        const curSpeed = Number(m.speed ?? 1.0);
        const curTilt = Number(m.tilt ?? 0.38);
        const curGlow = Number(m.glow ?? 0.75);
        const curCol = (m.color || '#ffffff').toLowerCase();

        const presets = ['#ffffff', '#38bdf8', '#a855f7', '#ec4899', '#10b981', '#eab308', '#ef4444'];

        return `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1">
                <span class="text-xs font-mono font-bold text-purple-400">WAVE3D / BUFFER</span>
                <span class="text-[8px] font-mono font-bold ${isCvPatched ? 'text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50' : 'text-slate-400'}">
                    ${isCvPatched ? 'CV GAIN' : 'MANUAL'}
                </span>
            </div>

            <!-- Source Mode & Style -->
            <div class="grid grid-cols-2 gap-1.5">
                <div class="flex flex-col gap-0.5">
                    <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">SOURCE</span>
                    <div class="grid grid-cols-2 gap-1">
                        ${WAVE3D_MODES.map(md => `
                            <button type="button" data-w3d-mode="${md.id}" class="py-1 rounded text-[9px] font-mono font-bold border transition ${
                                curMode === md.id
                                    ? 'bg-purple-600/40 border-purple-400 text-purple-200'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                            }">${md.label}</button>
                        `).join('')}
                    </div>
                </div>
                <div class="flex flex-col gap-0.5">
                    <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">STYLE</span>
                    <div class="grid grid-cols-3 gap-1">
                        ${WAVE3D_STYLES.map(st => `
                            <button type="button" data-w3d-style="${st.id}" class="py-1 rounded text-[8.5px] font-mono font-bold border transition ${
                                curStyle === st.id
                                    ? 'bg-cyan-600/40 border-cyan-400 text-cyan-200'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                            }">${st.label}</button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Sliders -->
            <div class="flex items-center justify-around py-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1">
                ${UIHelpers.createVSliderHTML('w3d-slices', 'SLICES', 16, 64, 4, curSlices, '', 'purple', false, String(curSlices), 1, 'sm')}
                ${UIHelpers.createVSliderHTML('w3d-cols', 'RES', 24, 96, 8, curCols, '', 'purple', false, String(curCols), 1, 'sm')}
                ${UIHelpers.createVSliderHTML('w3d-gain', 'GAIN', 0.2, 4.0, 0.05, curGain, 'x', 'cyan', isCvPatched, curGain.toFixed(2), 1, 'sm')}
                ${UIHelpers.createVSliderHTML('w3d-speed', 'SCROLL', 0.2, 2.0, 0.05, curSpeed, 'x', 'cyan', false, curSpeed.toFixed(2), 1, 'sm')}
                ${UIHelpers.createVSliderHTML('w3d-tilt', 'TILT', -0.2, 1.2, 0.02, curTilt, '', 'amber', false, curTilt.toFixed(2), 1, 'sm')}
                ${UIHelpers.createVSliderHTML('w3d-glow', 'GLOW', 0.0, 1.0, 0.05, curGlow, '', 'emerald', false, curGlow.toFixed(2), 1, 'sm')}
            </div>

            <!-- Color Swatches -->
            <div class="flex items-center justify-between gap-2 bg-slate-950/70 px-2 py-1 rounded-lg border border-slate-800">
                <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">COLOR</span>
                <div class="flex items-center gap-1.5">
                    ${presets.map(c => `
                        <button type="button" data-w3d-color="${c}" class="w-4 h-4 rounded-full border ${curCol === c ? 'border-white scale-110 ring-1 ring-white/60' : 'border-slate-700 opacity-75 hover:opacity-100'}" style="background:${c};"></button>
                    `).join('')}
                </div>
            </div>
        </div>`;
    },

    bindEvents: (m, ctx, cb) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;

        root.querySelectorAll('[data-w3d-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                m.sourceMode = btn.dataset.w3dMode;
                cb();
                ctx?.reRenderModal?.();
            });
        });

        root.querySelectorAll('[data-w3d-style]').forEach(btn => {
            btn.addEventListener('click', () => {
                m.style = btn.dataset.w3dStyle;
                cb();
                ctx?.reRenderModal?.();
            });
        });

        root.querySelectorAll('[data-w3d-color]').forEach(btn => {
            btn.addEventListener('click', () => {
                m.color = btn.dataset.w3dColor;
                cb();
                ctx?.reRenderModal?.();
            });
        });

        UIHelpers.bindSlider('w3d-slices', v => String(Math.round(v)), v => { m.slices = Math.round(v); cb(); }, 1, 16, 64, root);
        UIHelpers.bindSlider('w3d-cols', v => String(Math.round(v)), v => { m.cols = Math.round(v); cb(); }, 1, 24, 96, root);
        UIHelpers.bindSlider('w3d-gain', v => Number(v).toFixed(2), v => { m.gain = Number(v); cb(); }, 1, 0.2, 4.0, root);
        UIHelpers.bindSlider('w3d-speed', v => Number(v).toFixed(2), v => { m.speed = Number(v); cb(); }, 1, 0.2, 2.0, root);
        UIHelpers.bindSlider('w3d-tilt', v => Number(v).toFixed(2), v => { m.tilt = Number(v); cb(); }, 1, -0.2, 1.2, root);
        UIHelpers.bindSlider('w3d-glow', v => Number(v).toFixed(2), v => { m.glow = Number(v); cb(); }, 1, 0.0, 1.0, root);
    }
};

export const wave3dDefs = {
    WAVE3D
};
