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
        const attSec = Math.max(0.005, Math.min(2.0, m.attack ?? 0.05));
        const relSec = Math.max(0.005, Math.min(3.0, m.release ?? 0.2));

        // Exponential mapping normalized 0..1
        const normA = Math.log(attSec / 0.005) / Math.log(400.0);
        const normR = Math.log(relSec / 0.005) / Math.log(600.0);
        const lvlPct = Math.round((m.level ?? 1.0) * 100);

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

                <!-- Parameters Controls -->
                <div class="space-y-1.5 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                    <!-- ATTACK (5ms ~ 2000ms Exponential) -->
                    <div class="space-y-0.5">
                        <div class="flex justify-between text-[8px] font-bold">
                            <span class="text-sky-400 tracking-wider">ATTACK TIME (RC CHARGE)</span>
                            <span id="ar-att-disp" class="font-mono text-sky-300 font-bold">${AR.formatTime(attSec)}</span>
                        </div>
                        <input type="range" id="ar-slider-attack" min="0" max="1" step="0.005" value="${normA.toFixed(3)}" class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500">
                        <div class="flex justify-between text-[7px] text-slate-500 font-mono">
                            <span>5ms</span>
                            <span>50ms</span>
                            <span>2.0s</span>
                        </div>
                    </div>

                    <!-- RELEASE (5ms ~ 3000ms Exponential) -->
                    <div class="space-y-0.5 pt-1 border-t border-slate-800/60">
                        <div class="flex justify-between text-[8px] font-bold">
                            <span class="text-sky-400 tracking-wider">RELEASE TIME (RC DISCHARGE)</span>
                            <span id="ar-rel-disp" class="font-mono text-sky-300 font-bold">${AR.formatTime(relSec)}</span>
                        </div>
                        <input type="range" id="ar-slider-release" min="0" max="1" step="0.005" value="${normR.toFixed(3)}" class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500">
                        <div class="flex justify-between text-[7px] text-slate-500 font-mono">
                            <span>5ms</span>
                            <span>200ms</span>
                            <span>3.0s</span>
                        </div>
                    </div>

                    <!-- OUTPUT LEVEL (0% ~ 100%) -->
                    <div class="space-y-0.5 pt-1 border-t border-slate-800/60">
                        <div class="flex justify-between text-[8px] font-bold">
                            <span class="text-sky-400 tracking-wider">OUTPUT LEVEL</span>
                            <span id="ar-level-disp" class="font-mono text-sky-300 font-bold">${lvlPct}%</span>
                        </div>
                        <input type="range" id="ar-slider-level" min="0" max="1" step="0.01" value="${(m.level ?? 1.0).toFixed(2)}" class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500">
                    </div>
                </div>

                <div class="text-[7.5px] text-slate-500 px-1 italic">
                    * Gate入力がHighの間は1.0Vまで充電しホールドします。Gate Lowで指数減衰します。
                </div>
            </div>
        `;
    },
    bindEvents: (m, ctx, cb) => {
        const attSlider = document.getElementById('ar-slider-attack');
        const attDisp = document.getElementById('ar-att-disp');
        const relSlider = document.getElementById('ar-slider-release');
        const relDisp = document.getElementById('ar-rel-disp');
        const levelSlider = document.getElementById('ar-slider-level');
        const levelDisp = document.getElementById('ar-level-disp');

        if (attSlider) {
            attSlider.addEventListener('input', (e) => {
                const norm = parseFloat(e.target.value);
                const sec = 0.005 * Math.pow(400.0, norm);
                m.attack = Math.max(0.005, Math.min(2.0, sec));
                if (attDisp) attDisp.textContent = AR.formatTime(m.attack);
                cb();
            });
        }

        if (relSlider) {
            relSlider.addEventListener('input', (e) => {
                const norm = parseFloat(e.target.value);
                const sec = 0.005 * Math.pow(600.0, norm);
                m.release = Math.max(0.005, Math.min(3.0, sec));
                if (relDisp) relDisp.textContent = AR.formatTime(m.release);
                cb();
            });
        }

        if (levelSlider) {
            levelSlider.addEventListener('input', (e) => {
                m.level = parseFloat(e.target.value);
                if (levelDisp) levelDisp.textContent = `${Math.round(m.level * 100)}%`;
                cb();
            });
        }
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

