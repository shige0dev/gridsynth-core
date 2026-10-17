import { UIHelpers } from '../../ui/helpers.js';

export const AR = {
    color: 'sky',
    defaults: () => ({
        type: 'AR',
        attack: 0.05, // seconds: 0.005s (5ms) ~ 2.0s (2000ms)
        release: 0.2, // seconds: 0.005s (5ms) ~ 3.0s (3000ms)
        level: 1.0 // 0.0 ~ 1.0
    }),
    ports: () => ({
        in: [
            { port: 'gate_in', color: 'bg-orange-500' },
            { port: 'a_cv', color: 'bg-sky-400' },
            { port: 'r_cv', color: 'bg-indigo-400' }
        ],
        out: [
            { port: 'cv_out', color: 'bg-yellow-400' }
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

        // Visual proportions for SVG preview
        const wA = W * 0.35;
        const wHold = W * 0.2;
        const wR = W * 0.45;

        // Sample points for RC Attack (1 - exp(-4.6 * t))
        const N = 12;
        const pts = [];
        pts.push([padX, yBot]);
        for (let i = 1; i <= N; i++) {
            const t = i / N;
            const v = 1.0 - Math.exp(-4.6 * t);
            pts.push([padX + t * wA, yBot - v * H]);
        }

        // Hold segment
        const xHoldEnd = padX + wA + wHold;
        pts.push([xHoldEnd, yTop]);

        // Sample points for RC Release (exp(-4.6 * t))
        for (let i = 1; i <= N; i++) {
            const t = i / N;
            const v = Math.exp(-4.6 * t);
            pts.push([xHoldEnd + t * wR, yBot - v * H]);
        }
        pts.push([padX + W, yBot]);

        const pathD = 'M ' + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ');
        const fillD = pathD + ` L ${padX + W} ${yBot} L ${padX} ${yBot} Z`;

        return `
            <svg viewBox="0 0 160 40" class="w-full h-10 select-none">
                <defs>
                    <linearGradient id="ar-curve-grad-${m.id || 'def'}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.5"/>
                        <stop offset="100%" stop-color="#0284c7" stop-opacity="0.05"/>
                    </linearGradient>
                </defs>
                <!-- Baseline -->
                <line x1="${padX}" y1="${yBot}" x2="${padX + W}" y2="${yBot}" stroke="#334155" stroke-width="1"/>
                <!-- Gate High guide -->
                <line x1="${(padX + wA).toFixed(1)}" y1="${yTop}" x2="${xHoldEnd.toFixed(1)}" y2="${yTop}" stroke="#0284c7" stroke-width="1" stroke-dasharray="2,2"/>
                <!-- RC Curve -->
                <path d="${fillD}" fill="url(#ar-curve-grad-${m.id || 'def'})" />
                <path d="${pathD}" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <!-- Markers -->
                <circle cx="${(padX + wA).toFixed(1)}" cy="${yTop}" r="2" fill="#bae6fd" stroke="#0369a1" stroke-width="0.75"/>
                <circle cx="${xHoldEnd.toFixed(1)}" cy="${yTop}" r="2" fill="#bae6fd" stroke="#0369a1" stroke-width="0.75"/>
            </svg>
        `;
    },
    renderGrid: (m) => {
        const aStr = AR.formatTime(m.attack ?? 0.05);
        const rStr = AR.formatTime(m.release ?? 0.2);
        return `
            <div class="flex flex-col items-center justify-center w-full px-1 gap-1 text-sky-300 pointer-events-none select-none">
                <div class="flex items-center justify-between w-full text-[8.5px] font-mono leading-none">
                    <span class="text-sky-400 font-bold tracking-tight">A:${aStr}</span>
                    <span class="text-sky-400 font-bold tracking-tight">R:${rStr}</span>
                </div>
                <!-- Dynamic Waveform & CV Bar -->
                <div class="w-full h-4 bg-slate-950/80 rounded border border-sky-950/60 overflow-hidden relative flex items-center">
                    <div class="ar-live-bar h-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-75 w-0 opacity-80"></div>
                    <div class="absolute inset-0 flex items-center justify-center">
                        <span class="ar-live-val text-[8px] font-mono font-bold text-sky-200/90 drop-shadow">0.00V</span>
                    </div>
                </div>
            </div>
        `;
    },
    renderModal: (m, ctx) => {
        const isAPatched = ctx?.patched?.has('a_cv') || ctx?.patched?.has('cv_a') || ctx?.patched?.has('attack_cv');
        const isRPatched = ctx?.patched?.has('r_cv') || ctx?.patched?.has('cv_r') || ctx?.patched?.has('release_cv');

        const attDisp = isAPatched ? 'EXT' : AR.formatTime(m.attack ?? 0.05);
        const relDisp = isRPatched ? 'EXT' : AR.formatTime(m.release ?? 0.2);
        const lvlDisp = `${Math.round((m.level ?? 1.0) * 100)}%`;

        return `
            <div class="space-y-2 p-1 text-slate-200">
                <!-- SVG Waveform Display -->
                <div id="ar-svg-wrap" class="p-1.5 bg-slate-950/80 rounded-xl border border-slate-800/80 flex flex-col items-center justify-center shadow-inner">
                    ${AR.renderSvgCurve(m)}
                </div>

                <!-- Live Voltage Output Monitor -->
                <div class="flex items-center justify-between px-2 py-1 bg-slate-950/60 rounded-lg border border-slate-800/80">
                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider">OUTPUT VOLTAGE</span>
                    <span id="ar-modal-live-val" class="text-[10px] font-mono font-bold text-sky-400">0.00 V</span>
                </div>

                <!-- Vertical Sliders: ATTACK, RELEASE, LEVEL (Standard GridSynth VSlider Rule) -->
                <div class="flex items-center justify-around py-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1">
                    ${UIHelpers.createVSliderHTML('ar-slider-attack', 'ATTACK', 0.005, 2.0, 0.001, m.attack ?? 0.05, 'time', 'sky', isAPatched, attDisp, 2.5)}
                    ${UIHelpers.createVSliderHTML('ar-slider-release', 'RELEASE', 0.005, 3.0, 0.005, m.release ?? 0.2, 'time', 'sky', isRPatched, relDisp, 2.5)}
                    ${UIHelpers.createVSliderHTML('ar-slider-level', 'LEVEL', 0.0, 1.0, 0.01, m.level ?? 1.0, 'lvl', 'sky', false, lvlDisp, 1)}
                </div>

                <div class="text-[7.5px] text-slate-500 px-1 italic text-center">
                    * Gate入力がHighの間ホールド、Lowで指数減衰します
                </div>
            </div>
        `;
    },
    bindEvents: (m, ctx, cb) => {
        const svgWrap = document.getElementById('ar-svg-wrap');

        const onSliderChange = () => {
            if (svgWrap) svgWrap.innerHTML = AR.renderSvgCurve(m);
            cb();
        };

        const isAPatched = ctx?.patched?.has('a_cv') || ctx?.patched?.has('cv_a') || ctx?.patched?.has('attack_cv');
        const isRPatched = ctx?.patched?.has('r_cv') || ctx?.patched?.has('cv_r') || ctx?.patched?.has('release_cv');

        if (!isAPatched) {
            UIHelpers.bindSlider('ar-slider-attack', AR.formatTime, v => { m.attack = v; onSliderChange(); }, 2.5, 0.005, 2.0);
            UIHelpers.bindScrubber('ar-slider-attack-disp', 'ar-slider-attack', AR.formatTime, v => { m.attack = v; onSliderChange(); }, 2.5, 0.005, 2.0);
        }

        if (!isRPatched) {
            UIHelpers.bindSlider('ar-slider-release', AR.formatTime, v => { m.release = v; onSliderChange(); }, 2.5, 0.005, 3.0);
            UIHelpers.bindScrubber('ar-slider-release-disp', 'ar-slider-release', AR.formatTime, v => { m.release = v; onSliderChange(); }, 2.5, 0.005, 3.0);
        }

        UIHelpers.bindSlider('ar-slider-level', v => `${Math.round(v * 100)}%`, v => { m.level = v; onSliderChange(); }, 1, 0.0, 1.0);
        UIHelpers.bindScrubber('ar-slider-level-disp', 'ar-slider-level', v => `${Math.round(v * 100)}%`, v => { m.level = v; onSliderChange(); }, 1, 0.0, 1.0);
    },
    updateLive: (cell, data, isPlaying, targetModal, m) => {
        const val = data?.values?.[0] ?? 0.0;
        const clampedVal = Math.max(0.0, Math.min(1.0, val));

        // Grid Cell updates
        const bar = cell?.querySelector('.ar-live-bar');
        if (bar) bar.style.width = `${(clampedVal * 100).toFixed(1)}%`;
        const valText = cell?.querySelector('.ar-live-val');
        if (valText) valText.textContent = `${clampedVal.toFixed(2)}V`;

        // Modal updates if open
        if (targetModal) {
            const modalVal = targetModal.querySelector('#ar-modal-live-val');
            if (modalVal) modalVal.textContent = `${clampedVal.toFixed(2)} V`;
        }
    }
};

export const arDefs = { AR };
