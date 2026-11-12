// src/modules/defs/vmix.js
// VMIX - Two-Source Video Mixer & GPU Transition Processor
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const VMIX_MODES = [
    { id: 'dissolve', label: 'DISSOLVE' },
    { id: 'blur', label: 'BLUR' },
    { id: 'blackout', label: 'BLACKOUT' },
    { id: 'whiteout', label: 'WHITEOUT' },
    { id: 'slide_l', label: 'SLIDE L' },
    { id: 'slide_r', label: 'SLIDE R' },
    { id: 'slide_u', label: 'SLIDE U' },
    { id: 'slide_d', label: 'SLIDE D' },
    { id: 'wipe', label: 'WIPE' },
    { id: 'zoom', label: 'ZOOM' },
    { id: 'glitch', label: 'GLITCH' }
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
            { port: 'video_in1', pin: 1, color: 'bg-emerald-800', label: 'V1' },
            { port: 'video_in2', pin: 2, color: 'bg-emerald-800', label: 'V2' },
            { port: 'cv_in', pin: 5, color: 'bg-yellow-400', label: 'CV' }
        ],
        out: [
            { port: 'video_out', pin: 11, color: 'bg-emerald-800', label: 'V' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const mode = (m?.mode || 'dissolve').toUpperCase();
        const mix = Number(m?.mix ?? 0.5);
        const pct = Math.round(mix * 100);
        return `
        <div class="flex flex-col items-center justify-between w-full h-full py-1 pointer-events-none select-none text-center">
            <span class="text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-tight">VMIX : ${mode}</span>
            <div class="flex flex-col items-center gap-0.5 w-full px-1.5">
                <div class="flex items-center justify-between w-full text-[7px] font-mono text-slate-400 font-bold">
                    <span>V1</span>
                    <span data-vmix-pct class="text-cyan-300 font-extrabold text-[9px]">${pct}%</span>
                    <span>V2</span>
                </div>
                <div class="w-full h-1.5 bg-slate-800 rounded overflow-hidden p-0.2 border border-slate-700/60">
                    <div data-vmix-bar class="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-purple-500 rounded-sm transition-all duration-75" style="width: ${pct}%;"></div>
                </div>
            </div>
            <span class="text-[6.5px] font-mono text-slate-500 uppercase tracking-tight">DUAL GPU BLEND</span>
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
                <span class="text-xs font-mono font-bold text-emerald-400">VIDEO MIXER (VMIX)</span>
                <span id="vmix-status-badge" class="text-[8.5px] font-mono font-bold ${isCvPatched ? 'text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50' : 'text-slate-400'}">
                    ${isCvPatched ? 'CV MODULATED' : 'MANUAL MIX'}
                </span>
            </div>

            <!-- Transition Mode Selector -->
            <div class="flex flex-col gap-1">
                <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">TRANSITION EFFECT (合成モード)</span>
                <div class="grid grid-cols-4 gap-1">
                    ${VMIX_MODES.map(mod => `
                        <button data-mode="${mod.id}" class="vmix-mode-btn py-1 rounded text-[8px] font-mono font-bold border transition ${curMode === mod.id ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${mod.label}</button>
                    `).join('')}
                </div>
            </div>

            <!-- Mix Balance Slider (0.0 to 1.0) -->
            <div class="flex flex-col gap-1.5 bg-slate-950/60 p-2 rounded border border-slate-800">
                <div class="flex justify-between items-center text-[9px] font-mono">
                    <span class="text-slate-300 font-bold">SOURCE BALANCE (V1 ◄► V2)</span>
                    <span id="vmix-mix-disp" class="font-bold text-emerald-300">${pct}% (V1: ${100 - pct}% / V2: ${pct}%)</span>
                </div>
                <input type="range" id="vmix-mix-slider" min="0" max="1" step="0.01" value="${mix}" class="h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500 ${isCvPatched ? 'opacity-35 pointer-events-none' : ''}">
                <div class="flex justify-between text-[7px] font-mono text-slate-400">
                    <span class="text-emerald-400 font-bold">100% V1</span>
                    <span>75/25</span>
                    <span class="text-cyan-300 font-bold">50/50</span>
                    <span>25/75</span>
                    <span class="text-purple-400 font-bold">100% V2</span>
                </div>
            </div>

            <!-- Mix Presets -->
            <div class="grid grid-cols-5 gap-1 text-[8px] font-mono">
                <button data-mix="0.0" class="vmix-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">V1 (0%)</button>
                <button data-mix="0.25" class="vmix-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">25%</button>
                <button data-mix="0.5" class="vmix-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">50/50</button>
                <button data-mix="0.75" class="vmix-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">75%</button>
                <button data-mix="1.0" class="vmix-preset-btn py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">V2 (100%)</button>
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;
        const slider = root.querySelector('#vmix-mix-slider');
        const disp = root.querySelector('#vmix-mix-disp');

        const updateDisp = (val) => {
            const pct = Math.round(val * 100);
            if (disp) disp.textContent = `${pct}% (V1: ${100 - pct}% / V2: ${pct}%)`;
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

        root.querySelectorAll('.vmix-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const val = parseFloat(e.currentTarget.dataset.mix);
                m.mix = val;
                if (slider) slider.value = val;
                updateDisp(val);
                onChange?.();
            });
        });
    },
    updateLive: (cell, data, isPlaying, modal, m) => {
        if (!cell || !data) return;
        const barEl = cell.querySelector('[data-vmix-bar]');
        const pctEl = cell.querySelector('[data-vmix-pct]');
        const curMix = Number(data.mix ?? m.mix ?? 0.5);
        const pct = Math.round(curMix * 100);

        if (barEl) barEl.style.width = `${pct}%`;
        if (pctEl) pctEl.textContent = `${pct}%`;

        if (modal) {
            const badge = modal.querySelector('#vmix-status-badge');
            if (badge) {
                if (data.isCvPatched) {
                    badge.className = 'text-[8.5px] font-mono font-bold text-amber-300 bg-amber-950 px-1 rounded border border-amber-600/50';
                    badge.textContent = 'CV MODULATED';
                } else {
                    badge.className = 'text-[8.5px] font-mono text-slate-400';
                    badge.textContent = 'MANUAL MIX';
                }
            }
            if (data.isCvPatched) {
                const disp = modal.querySelector('#vmix-mix-disp');
                if (disp) {
                    disp.textContent = `${pct}% (V1: ${100 - pct}% / V2: ${pct}%) [CV]`;
                }
            }
        }
    }
};

export const vmixDefs = {
    VMIX
};
export default vmixDefs;
