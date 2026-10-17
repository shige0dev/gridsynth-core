import { UIHelpers } from '../../ui/helpers.js';

export const RF = {
    color: 'amber',
    defaults: () => ({
        type: 'RF',
        time: 0.2, // seconds: 0.02s (20ms) ~ 2.0s (2000ms)
        peak: 0.5, // 0.01 ~ 0.99
        level: 1.0 // 0.0 ~ 1.0
    }),
    ports: () => ({
        in: [
            { port: 'trig_in', color: 'bg-rose-500' },
            { port: 'time_cv', color: 'bg-amber-400' },
            { port: 'peak_cv', color: 'bg-purple-400' }
        ],
        out: [
            { port: 'cv_out', color: 'bg-yellow-400' },
            { port: 'trig_out', color: 'bg-red-500' }
        ]
    }),
    formatTime: (sec) => {
        const ms = sec * 1000;
        if (ms < 1000) return `${Math.round(ms)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    },
    renderSvgCurve: (m) => {
        const padX = 8, padY = 6, W = 160 - padX * 2, H = 40 - padY * 2;
        const yTop = padY, yBot = padY + H;
        const peak = Math.max(0.01, Math.min(0.99, m.peak ?? 0.5));
        const xPeak = padX + W * peak;

        const pathD = `M ${padX} ${yBot} L ${xPeak.toFixed(1)} ${yTop} L ${(padX + W).toFixed(1)} ${yBot}`;
        const fillD = `M ${padX} ${yBot} L ${xPeak.toFixed(1)} ${yTop} L ${(padX + W).toFixed(1)} ${yBot} Z`;

        return `
            <svg viewBox="0 0 160 40" class="w-full h-10 select-none">
                <defs>
                    <linearGradient id="rf-curve-grad-${m.id || 'def'}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.5"/>
                        <stop offset="100%" stop-color="#d97706" stop-opacity="0.05"/>
                    </linearGradient>
                </defs>
                <!-- Baseline -->
                <line x1="${padX}" y1="${yBot}" x2="${padX + W}" y2="${yBot}" stroke="#334155" stroke-width="1"/>
                <!-- Peak separator -->
                <line x1="${xPeak.toFixed(1)}" y1="${yTop}" x2="${xPeak.toFixed(1)}" y2="${yBot}" stroke="#475569" stroke-width="0.75" stroke-dasharray="2,2"/>
                <!-- Triangle Curve -->
                <path d="${fillD}" fill="url(#rf-curve-grad-${m.id || 'def'})" />
                <path d="${pathD}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <!-- Peak Dot -->
                <circle cx="${xPeak.toFixed(1)}" cy="${yTop}" r="2.5" fill="#fbbf24" stroke="#78350f" stroke-width="0.75"/>
                <!-- End Trig Pulse Indicator -->
                <path d="M ${(padX + W - 3).toFixed(1)} ${yBot} L ${(padX + W).toFixed(1)} ${yTop + 10} L ${(padX + W + 3).toFixed(1)} ${yBot}" fill="none" stroke="#ef4444" stroke-width="1.2"/>
            </svg>
        `;
    },
    renderGrid: (m) => {
        const timeStr = RF.formatTime(m.time ?? 0.2);
        const peakPct = Math.round((m.peak ?? 0.5) * 100);
        return `
            <div class="flex flex-col items-center justify-center w-full px-1 gap-1 text-amber-300 pointer-events-none select-none">
                <div class="flex items-center justify-between w-full text-[8.5px] font-mono leading-none">
                    <span class="text-amber-400/90 font-bold tracking-tight">${timeStr}</span>
                    <span class="text-amber-500/80 font-bold">${peakPct}%</span>
                </div>
                <!-- Dynamic Waveform & CV Bar -->
                <div class="w-full h-4 bg-slate-950/80 rounded border border-amber-950/60 overflow-hidden relative flex items-center">
                    <div class="rf-live-bar h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-75 w-0 opacity-80"></div>
                    <div class="absolute inset-0 flex items-center justify-center">
                        <span class="rf-live-val text-[8px] font-mono font-bold text-amber-200/90 drop-shadow">0.00V</span>
                    </div>
                </div>
            </div>
        `;
    },
    renderModal: (m, ctx) => {
        const isTimePatched = ctx?.patched?.has('time_cv') || ctx?.patched?.has('cv_time');
        const isPeakPatched = ctx?.patched?.has('peak_cv') || ctx?.patched?.has('cv_peak');

        const timeDisp = isTimePatched ? 'EXT' : RF.formatTime(m.time ?? 0.2);
        const peakDisp = isPeakPatched ? 'EXT' : `${Math.round((m.peak ?? 0.5) * 100)}%`;
        const lvlDisp = `${Math.round((m.level ?? 1.0) * 100)}%`;

        return `
            <div class="space-y-2 p-1 text-slate-200">
                <!-- SVG Waveform Display -->
                <div id="rf-svg-wrap" class="p-1.5 bg-slate-950/80 rounded-xl border border-slate-800/80 flex flex-col items-center justify-center shadow-inner">
                    ${RF.renderSvgCurve(m)}
                </div>

                <!-- Live Voltage Output Monitor -->
                <div class="flex items-center justify-between px-2 py-1 bg-slate-950/60 rounded-lg border border-slate-800/80">
                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider">OUTPUT VOLTAGE</span>
                    <span id="rf-modal-live-val" class="text-[10px] font-mono font-bold text-amber-400">0.00 V</span>
                </div>

                <!-- Vertical Sliders: TIME, PEAK, LEVEL (Standard GridSynth VSlider Rule) -->
                <div class="flex items-center justify-around py-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1">
                    ${UIHelpers.createVSliderHTML('rf-slider-time', 'TIME', 0.02, 2.0, 0.005, m.time ?? 0.2, 'time', 'amber', isTimePatched, timeDisp, 2.5)}
                    ${UIHelpers.createVSliderHTML('rf-slider-peak', 'PEAK', 0.01, 0.99, 0.01, m.peak ?? 0.5, 'shape', 'amber', isPeakPatched, peakDisp, 1)}
                    ${UIHelpers.createVSliderHTML('rf-slider-level', 'LEVEL', 0.0, 1.0, 0.01, m.level ?? 1.0, 'lvl', 'amber', false, lvlDisp, 1)}
                </div>

                <!-- Manual Trigger Button -->
                <div class="pt-0.5">
                    <button id="rf-btn-trigger" class="w-full py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 active:from-amber-700 active:to-rose-700 text-white font-bold text-[9px] rounded-lg shadow-sm border border-amber-400/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                        <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                        <span>MANUAL TRIGGER</span>
                    </button>
                </div>
            </div>
        `;
    },
    bindEvents: (m, ctx, cb) => {
        const svgWrap = document.getElementById('rf-svg-wrap');
        const trigBtn = document.getElementById('rf-btn-trigger');

        const onSliderChange = () => {
            if (svgWrap) svgWrap.innerHTML = RF.renderSvgCurve(m);
            cb();
        };

        const isTimePatched = ctx?.patched?.has('time_cv') || ctx?.patched?.has('cv_time');
        const isPeakPatched = ctx?.patched?.has('peak_cv') || ctx?.patched?.has('cv_peak');

        if (!isTimePatched) {
            UIHelpers.bindSlider('rf-slider-time', RF.formatTime, v => { m.time = v; onSliderChange(); }, 2.5, 0.02, 2.0);
            UIHelpers.bindScrubber('rf-slider-time-disp', 'rf-slider-time', RF.formatTime, v => { m.time = v; onSliderChange(); }, 2.5, 0.02, 2.0);
        }

        if (!isPeakPatched) {
            UIHelpers.bindSlider('rf-slider-peak', v => `${Math.round(v * 100)}%`, v => { m.peak = v; onSliderChange(); }, 1, 0.01, 0.99);
            UIHelpers.bindScrubber('rf-slider-peak-disp', 'rf-slider-peak', v => `${Math.round(v * 100)}%`, v => { m.peak = v; onSliderChange(); }, 1, 0.01, 0.99);
        }

        UIHelpers.bindSlider('rf-slider-level', v => `${Math.round(v * 100)}%`, v => { m.level = v; onSliderChange(); }, 1, 0.0, 1.0);
        UIHelpers.bindScrubber('rf-slider-level-disp', 'rf-slider-level', v => `${Math.round(v * 100)}%`, v => { m.level = v; onSliderChange(); }, 1, 0.0, 1.0);

        if (trigBtn) {
            trigBtn.addEventListener('click', () => {
                if (ctx?.sendControl) {
                    ctx.sendControl({ type: 'TRIG' });
                }
                const fullId = `${ctx.currentPageId || '0'}/${m.id}`;
                const inst = ctx.synth?.modules?.[fullId] || ctx.synth?.modules?.[m.id];
                if (inst?.trigger) {
                    inst.trigger();
                }
            });
        }
    },
    updateLive: (cell, data, isPlaying, targetModal, m) => {
        const val = data?.values?.[0] ?? 0.0;
        const clampedVal = Math.max(0.0, Math.min(1.0, val));

        // Grid Cell updates
        const bar = cell?.querySelector('.rf-live-bar');
        if (bar) bar.style.width = `${(clampedVal * 100).toFixed(1)}%`;
        const valText = cell?.querySelector('.rf-live-val');
        if (valText) valText.textContent = `${clampedVal.toFixed(2)}V`;

        // Modal updates if open
        if (targetModal) {
            const modalVal = targetModal.querySelector('#rf-modal-live-val');
            if (modalVal) modalVal.textContent = `${clampedVal.toFixed(2)} V`;
        }
    }
};

export const rfDefs = { RF };
