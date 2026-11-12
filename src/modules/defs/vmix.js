// src/modules/defs/vmix.js
// VMIX - Two-Source Video Mixer & GPU Transition Processor
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const VMIX_MODES = [
    { id: 'dissolve', label: 'DISSOLVE' },
    { id: 'alpha', label: 'ALPHA' },
    { id: 'mosaic', label: 'MOSAIC' },
    { id: 'blur', label: 'BLUR' },
    { id: 'zoom', label: 'ZOOM' },
    { id: 'slide_h', label: 'SLIDE H' },
    { id: 'slide_v', label: 'SLIDE V' },
    { id: 'blackout', label: 'BLACKOUT' },
    { id: 'whiteout', label: 'WHITEOUT' }
];

export const VMIX = {
    color: 'emerald',
    defaults: () => ({
        type: 'VMIX',
        mode: 'dissolve',
        mix: 0.5
    }),
    ports: () => ({
        in: [
            { port: 'cv_in', pin: 4, color: 'bg-yellow-400', label: 'CV' },
            { port: 'video_in1', pin: 5, color: 'bg-emerald-800', label: 'V1' },
            { port: 'video_in2', pin: 6, color: 'bg-emerald-800', label: 'V2' }
        ],
        out: [
            { port: 'video_out', pin: 10, color: 'bg-emerald-800', label: 'VID' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const mode = (m?.mode || 'dissolve').toUpperCase();
        const mix = Number(m?.mix ?? 0.5);
        const pct = Math.round(mix * 100);
        return `
        <div class="flex items-center justify-center w-full h-full pointer-events-none select-none">
            <div class="relative w-[50px] h-7 flex items-center justify-center">
                <!-- Top: Mode name per Rule 4 -->
                <span data-vmix-mode class="absolute bottom-full mb-[2px] left-1/2 -translate-x-1/2 text-[7.5px] font-mono font-bold text-amber-400 truncate tracking-tight text-center max-w-[54px] leading-none pointer-events-none select-none">${mode}</span>

                <!-- Standardized Panel Bar Slot (Matching sequencer / panel-bar-slot standard) -->
                <div class="w-full h-full rounded-sm p-[1px] flex flex-row items-center border border-slate-600 bg-slate-950/40 relative panel-bar-slot overflow-hidden">
                    <div class="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-700/60 z-10 pointer-events-none"></div>
                    <div data-vmix-bar class="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-xs transition-[width] duration-75" style="width: ${pct}%;"></div>
                </div>

                <!-- Bottom: Mix % value per Rule 4 -->
                <span data-vmix-pct class="absolute top-full mt-[2px] left-1/2 -translate-x-1/2 text-[7.5px] font-mono font-bold text-cyan-300 truncate tracking-tight text-center max-w-[54px] leading-none pointer-events-none select-none">${pct}%</span>
            </div>
        </div>`;
    },
    renderModal: (m, ctx) => {
        const isCvPatched = Boolean(ctx?.patched?.has('cv_in'));
        const curMode = m.mode || 'dissolve';
        const mix = Number(m.mix ?? 0.5);
        const pct = Math.round(mix * 100);

        return `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1">
                <span class="text-xs font-mono font-bold text-emerald-400">VMIX</span>
                <span id="vmix-status-badge" class="text-[8.5px] font-mono font-bold ${isCvPatched ? 'text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50' : 'text-slate-400'}">
                    ${isCvPatched ? 'CV' : 'MANUAL'}
                </span>
            </div>

            <!-- Transition Mode Selector (9 modes, 3x3) -->
            <div class="flex flex-col gap-1">
                <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">TRANSITION</span>
                <div class="grid grid-cols-3 gap-1">
                    ${VMIX_MODES.map(mod => `
                        <button data-mode="${mod.id}" class="vmix-mode-btn py-1 rounded text-[7.5px] font-mono font-bold border transition ${curMode === mod.id ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${mod.label}</button>
                    `).join('')}
                </div>
            </div>

            <!-- Mix Slider -->
            <div class="flex flex-col gap-1.5 bg-slate-950/60 p-2 rounded border border-slate-800">
                <div class="flex justify-between items-center text-[9px] font-mono">
                    <span class="text-slate-400 font-bold uppercase tracking-wider">MIX</span>
                    <span id="vmix-mix-disp" class="font-bold text-emerald-300">${pct}%</span>
                </div>
                <input type="range" id="vmix-mix-slider" min="0" max="1" step="0.01" value="${mix}" class="h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500 ${isCvPatched ? 'no-thumb opacity-30 pointer-events-none' : ''}" ${isCvPatched ? 'disabled' : ''}>
                <div class="flex justify-between text-[7.5px] font-mono text-slate-400">
                    <span>V1</span>
                    <span>V2</span>
                </div>
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;
        const slider = root.querySelector('#vmix-mix-slider');
        const disp = root.querySelector('#vmix-mix-disp');

        const updateDisp = (val) => {
            const pct = Math.round(val * 100);
            if (disp) disp.textContent = `${pct}%`;
        };

        if (slider) {
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                m.mix = val;
                updateDisp(val);
                onChange?.();
            });
        }

        root.querySelectorAll('.vmix-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.mode = e.currentTarget.dataset.mode;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });
    },
    updateLive: (cell, data, isPlaying, modal, m) => {
        if (!cell || !data) return;
        const barEl = cell.querySelector('[data-vmix-bar]');
        const pctEl = cell.querySelector('[data-vmix-pct]');
        const modeEl = cell.querySelector('[data-vmix-mode]');
        const curMix = Number(data.mix ?? m.mix ?? 0.5);
        const curMode = (data.mode || m.mode || 'dissolve').toUpperCase();
        const pct = Math.round(curMix * 100);

        if (modeEl) modeEl.textContent = curMode;
        if (barEl) barEl.style.width = `${pct}%`;
        if (pctEl) pctEl.textContent = `${pct}%${data.isCvPatched ? '*' : ''}`;

        if (modal) {
            const badge = modal.querySelector('#vmix-status-badge');
            if (badge) {
                if (data.isCvPatched) {
                    badge.className = 'text-[8.5px] font-mono font-bold text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50';
                    badge.textContent = 'CV';
                } else {
                    badge.className = 'text-[8.5px] font-mono text-slate-400';
                    badge.textContent = 'MANUAL';
                }
            }
            const slider = modal.querySelector('#vmix-mix-slider');
            if (slider) {
                const isDis = Boolean(data.isCvPatched);
                slider.disabled = isDis;
                slider.classList.toggle('no-thumb', isDis);
                slider.classList.toggle('opacity-30', isDis);
                slider.classList.toggle('pointer-events-none', isDis);
            }
            if (data.isCvPatched) {
                const disp = modal.querySelector('#vmix-mix-disp');
                if (disp) {
                    disp.textContent = `${pct}% [CV]`;
                }
            }
        }
    }
};

export const vmixDefs = {
    VMIX
};
export default vmixDefs;
