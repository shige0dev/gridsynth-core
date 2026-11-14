// src/modules/defs/vfx.js
// VFX - Video Post-Processing Effects Processor (Mosaic, CRT, Invert, RGB Split, with CV modulation)
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const EFFECT_MODES = [
    { id: 'blur', label: 'BLUR' },
    { id: 'bloom', label: 'BLOOM' },
    { id: 'mosaic', label: 'MOSAIC' },
    { id: 'invert', label: 'INVERT' },
    { id: 'crt', label: 'CRT' },
    { id: 'rgb', label: 'RGB SPLIT' }
];

export const TRAIL_TYPES = [
    { id: 'peak', label: 'PEAK' },
    { id: 'fade', label: 'FADE' },
    { id: 'diffuse', label: 'DIFFUSE' },
    { id: 'zoom', label: 'ZOOM' },
    { id: 'drift', label: 'DRIFT' },
    { id: 'prism', label: 'PRISM' }
];

export const VFX = {
    color: 'emerald',
    defaults: () => ({
        type: 'VFX',
        mode: 'mosaic',
        trailType: 'peak',
        amount: 0.7
    }),
    ports: () => ({
        in: [
            { port: 'cv_in', pin: 4, color: 'bg-yellow-400', label: 'CV' },
            { port: 'video_in', pin: 5, color: 'bg-emerald-800', label: 'VID' }
        ],
        out: [
            { port: 'video_out', pin: 10, color: 'bg-emerald-800', label: 'VID' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),

    renderGrid: (m) => {
        const mode = (m.mode || 'mosaic').toUpperCase();
        const amt = Math.round((m.amount ?? 0.7) * 100);
        return `
        <div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none select-none text-center">
            <span data-vfx-mode class="text-[12px] font-mono font-extrabold text-emerald-300 tracking-tight">${mode}</span>
            <span data-vfx-amt class="text-[8px] font-mono font-bold text-cyan-300">${amt}%</span>
        </div>`;
    },

    renderModal: (m, ctx) => {
        const isCvPatched = Boolean(ctx?.patched?.has('cv_in'));
        const curMode = m.mode || 'mosaic';
        const curTrailType = m.trailType || 'peak';
        const curAmt = Number(m.amount ?? 0.7);

        return `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1">
                <span class="text-xs font-mono font-bold text-emerald-400">VIDEO FX</span>
                <div class="flex items-center gap-1.5">
                    <button data-mode="bypass" class="vfx-mode-btn px-1.5 py-0.5 rounded text-[7.5px] font-mono font-bold border transition cursor-pointer ${curMode === 'bypass' ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">BYPASS</button>
                    <span id="vfx-status-badge" class="text-[8px] font-mono font-bold ${isCvPatched ? 'text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50' : 'text-slate-400'}">
                        ${isCvPatched ? 'CV MOD' : 'MANUAL'}
                    </span>
                </div>
            </div>

            <!-- Effect Mode Selector (3x2 grid of 6 standard effects) -->
            <div class="flex flex-col gap-1">
                <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">EFFECT MODE</span>
                <div class="grid grid-cols-3 gap-1">
                    ${EFFECT_MODES.map(md => `
                        <button data-mode="${md.id}" class="vfx-mode-btn py-1 rounded text-[7.5px] font-mono font-bold border transition cursor-pointer ${curMode === md.id ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${md.label}</button>
                    `).join('')}
                </div>
            </div>

            <!-- Afterimage / Trail Selector (Always visible 3x2 grid) -->
            <div class="flex flex-col gap-1">
                <span class="text-[8px] font-mono font-bold text-amber-400 uppercase tracking-wider">AFTERIMAGE (TRAIL)</span>
                <div class="grid grid-cols-3 gap-1">
                    ${TRAIL_TYPES.map(tt => {
                        const isTrailActive = (curMode === 'trail' && curTrailType === tt.id);
                        return `<button data-trail="${tt.id}" class="vfx-trail-btn py-1 rounded text-[7.5px] font-mono font-bold border transition cursor-pointer ${isTrailActive ? 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/40' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${tt.label}</button>`;
                    }).join('')}
                </div>
            </div>

            <!-- Effect Amount Slider -->
            <div class="flex flex-col gap-1 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <div class="flex justify-between items-center text-[9px] font-mono">
                    <span class="text-slate-300 font-bold">DEPTH / INTENSITY</span>
                    <span id="vfx-val-disp" class="font-bold text-cyan-300">${Math.round(curAmt * 100)}%</span>
                </div>
                <input type="range" id="vfx-slide-amt" min="0.0" max="1.0" step="0.02" value="${curAmt}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500 ${isCvPatched ? 'no-thumb opacity-35 pointer-events-none' : ''}" ${isCvPatched ? 'disabled' : ''}>
            </div>

            <!-- 1:1 Square Preview (130x130) -->
            <div class="flex flex-col items-center justify-center pt-0.5">
                <div class="relative bg-black rounded border border-emerald-500/40 shadow-inner overflow-hidden" style="width: 130px; height: 130px;">
                    <canvas id="vfx-modal-canvas" class="w-full h-full block bg-black" width="130" height="130"></canvas>
                </div>
            </div>
        </div>`;
    },

    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;
        const slider = root.querySelector('#vfx-slide-amt');
        const disp = root.querySelector('#vfx-val-disp');

        if (slider) {
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                m.amount = val;
                if (disp) disp.textContent = `${Math.round(val * 100)}%`;
                onChange?.();
            });
        }

        root.querySelectorAll('.vfx-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.mode = e.currentTarget.dataset.mode;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });

        root.querySelectorAll('.vfx-trail-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.mode = 'trail';
                m.trailType = e.currentTarget.dataset.trail;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });
    },

    updateLive: (cell, data, isPlaying, modal, m) => {
        if (!cell || !data) return;
        const modeEl = cell.querySelector('[data-vfx-mode]');
        const amtEl = cell.querySelector('[data-vfx-amt]');

        const curMode = (data.mode || m?.mode || 'mosaic').toUpperCase();
        const curAmt = Math.round((data.effectiveAmount ?? m?.amount ?? 0.7) * 100);

        if (modeEl) modeEl.textContent = curMode;
        if (amtEl) amtEl.textContent = `${curAmt}%${data.isCvPatched ? '*' : ''}`;

        // Modal Preview
        if (modal) {
            const slider = modal.querySelector('#vfx-slide-amt');
            if (slider) {
                const isDis = Boolean(data.isCvPatched);
                slider.disabled = isDis;
                slider.classList.toggle('no-thumb', isDis);
                slider.classList.toggle('opacity-35', isDis);
                slider.classList.toggle('pointer-events-none', isDis);
            }

            const mCvs = modal.querySelector('#vfx-modal-canvas');
            if (mCvs && data.canvas) {
                const mCtx = mCvs.getContext('2d');
                mCtx.fillStyle = '#000000';
                mCtx.fillRect(0, 0, mCvs.width, mCvs.height);
                mCtx.drawImage(data.canvas, 0, 0, mCvs.width, mCvs.height);
            }

            const disp = modal.querySelector('#vfx-val-disp');
            if (disp && data.isCvPatched) {
                disp.textContent = `${curAmt}% [CV]`;
            }
        }
    }
};

export const vfxDefs = {
    VFX
};
export default vfxDefs;
