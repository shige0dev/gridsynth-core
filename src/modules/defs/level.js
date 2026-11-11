// src/modules/defs/level.js
import { UIHelpers } from '../../ui/helpers.js?v=351';

const BAND_COLORS = [
    { name: 'LOW', hex: '#06b6d4', bg: 'bg-cyan-500', grad: 'bg-gradient-to-t from-cyan-600 to-cyan-400', tag: 'text-cyan-400' },
    { name: 'L-MID', hex: '#10b981', bg: 'bg-emerald-500', grad: 'bg-gradient-to-t from-emerald-600 to-emerald-400', tag: 'text-emerald-400' },
    { name: 'H-MID', hex: '#f59e0b', bg: 'bg-amber-500', grad: 'bg-gradient-to-t from-amber-600 to-yellow-400', tag: 'text-amber-400' },
    { name: 'HIGH', hex: '#f43f5e', bg: 'bg-rose-500', grad: 'bg-gradient-to-t from-rose-600 to-orange-400', tag: 'text-rose-400' }
];

const freqToX = (freq, w) => {
    const minF = 20, maxF = 20000;
    const logMin = Math.log10(minF), logMax = Math.log10(maxF);
    const logF = Math.log10(Math.max(minF, Math.min(maxF, freq)));
    return ((logF - logMin) / (logMax - logMin)) * w;
};

const extractBands = (freqs, numBands = 48, sampleRate = 48000) => {
    const fftSize = freqs.length * 2;
    const bands = new Float32Array(numBands);
    const bandsPerOct = 6;
    const f0 = 40;

    for (let b = 0; b < numBands; b++) {
        const fCenter = f0 * Math.pow(2, b / bandsPerOct);
        const kCenterFloat = fCenter * fftSize / sampleRate;
        const k0 = Math.max(0, Math.min(freqs.length - 1, Math.floor(kCenterFloat)));
        const k1 = Math.min(freqs.length - 1, k0 + 1);
        const t = kCenterFloat - k0;
        const val = (1 - t) * freqs[k0] + t * freqs[k1];
        bands[b] = Math.pow(Math.max(0, Math.min(1.0, val / 255.0)), 1.3);
    }
    return bands;
};

const drawModalCanvas = (cvs, freqs, levels, m) => {
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);

    // Dark grid background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    [100, 500, 1000, 5000, 10000].forEach(f => {
        const x = freqToX(f, w);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    });

    // Draw active band regions (translucent overlays)
    const bandsCount = m.bandsCount ?? 4;
    const bands = m.bands || [
        { freq: 100,  q: 1.0, sens: 1.8 },
        { freq: 400,  q: 1.2, sens: 2.0 },
        { freq: 2400, q: 1.2, sens: 2.2 },
        { freq: 8000, q: 1.0, sens: 2.5 }
    ];

    for (let i = 0; i < bandsCount; i++) {
        const b = bands[i];
        const col = BAND_COLORS[i];
        const cx = freqToX(b.freq, w);
        const halfSpan = (w * 0.12) / Math.max(0.5, b.q || 1.0);
        const x0 = Math.max(0, cx - halfSpan);
        const x1 = Math.min(w, cx + halfSpan);

        ctx.fillStyle = col.hex + '22';
        ctx.fillRect(x0, 0, x1 - x0, h);

        ctx.strokeStyle = col.hex + '99';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, h);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label at top
        ctx.fillStyle = col.hex;
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`B${i + 1}:${Math.round(b.freq)}Hz`, Math.max(4, cx - 24), 14);
    }

    // Draw Spectrum bars if freqs available
    if (freqs && freqs.length > 0) {
        const specBands = extractBands(freqs, 48);
        const n = specBands.length;
        const barW = (w / n) - 1.5;

        for (let i = 0; i < n; i++) {
            const x = i * (w / n);
            const val = specBands[i];
            const barH = val * (h - 20);
            const y = h - barH;

            const grad = ctx.createLinearGradient(0, y, 0, h);
            grad.addColorStop(0, '#38bdf8');
            grad.addColorStop(0.6, '#0284c7');
            grad.addColorStop(1, '#0f172a');

            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barW, barH);
        }
    }

    // Draw level indicators along bottom of canvas
    if (levels) {
        const meterW = w / 4;
        for (let i = 0; i < bandsCount; i++) {
            const lvl = Math.max(0, Math.min(1.0, levels[i] || 0));
            const col = BAND_COLORS[i];
            const bx = i * meterW + 8;
            const bw = meterW - 16;
            const bh = 5;
            const by = h - 8;

            ctx.fillStyle = '#1e293b';
            ctx.fillRect(bx, by, bw, bh);

            ctx.fillStyle = col.hex;
            ctx.fillRect(bx, by, bw * lvl, bh);
        }
    }
};

export const LEVEL = {
    color: 'amber',
    defaults: () => ({
        type: 'LEVEL',
        bandsCount: 4,
        bands: [
            { freq: 100,  q: 1.0, sens: 1.8, type: 'lowpass' },
            { freq: 400,  q: 1.2, sens: 2.0, type: 'bandpass' },
            { freq: 2400, q: 1.2, sens: 2.2, type: 'bandpass' },
            { freq: 8000, q: 1.0, sens: 2.5, type: 'highpass' }
        ],
        attack: 0.05,
        release: 0.003
    }),
    ports: (m) => {
        const cnt = m.bandsCount ?? 4;
        return {
            in: [
                { port: 'wave_in', pin: 5, color: 'bg-blue-500' }
            ],
            out: [1, 2, 3, 4].map(idx => ({
                port: `cv_out${idx}`,
                pin: 10 + idx, // PIN 11, 12, 13, 14 along right edge
                color: 'bg-yellow-400',
                dimmed: idx > cnt
            }))
        };
    },
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const curCount = m.bandsCount ?? 4;
        const barsData = [1, 2, 3, 4].map(idx => {
            const isDis = idx > curCount;
            const col = BAND_COLORS[idx - 1];
            return {
                pct: isDis ? 0 : 50,
                innerCls: `level-bar-fill-${idx - 1} transition-all duration-75 ${isDis ? 'opacity-15' : ''}`,
                outerCls: `level-bar-bg-${idx - 1} ${isDis ? 'opacity-25' : ''}`,
                attrs: `data-level-bar="${idx - 1}"`,
                width: 'w-2',
                color: col.grad
            };
        });

        return `
            <div class="relative flex items-center justify-center w-full h-full pointer-events-none select-none">
                <!-- Top Text Overlay: Function Name (2px above boundary) -->
                <div class="absolute bottom-full mb-[2px] flex items-center justify-center w-full pointer-events-none">
                    <span class="text-[7.5px] font-mono font-bold leading-none tracking-tight text-center max-w-[64px] text-amber-400 truncate">LEVEL</span>
                </div>

                <!-- 4 Level Bars (Sharp corners, h-7, <= 50px width) -->
                ${UIHelpers.renderPanelBars(barsData, { gapCls: 'gap-1' })}

                <!-- Bottom Text Overlay: Active Bands (2px below boundary) -->
                <div class="absolute top-full mt-[2px] flex items-center justify-center w-full pointer-events-none">
                    <span class="text-[7.5px] font-mono font-bold leading-none tracking-tight text-center max-w-[64px] text-cyan-300 level-band-label">${curCount} BANDS</span>
                </div>
            </div>`;
    },
    updateLive: (cell, data, isPlaying, modalEl, m) => {
        if (!data) return;
        const levels = data.levels || [0, 0, 0, 0];
        const curCount = m?.bandsCount ?? 4;

        // Update Cell Level Bars
        if (cell) {
            cell.querySelectorAll('[data-level-bar]').forEach((barEl, idx) => {
                const fill = barEl.querySelector('.level-bar-fill-' + idx) || barEl;
                const isDis = (idx + 1) > curCount;
                if (isDis) {
                    fill.style.height = '0%';
                } else {
                    const pct = Math.max(0, Math.min(100, Math.round(levels[idx] * 100)));
                    fill.style.height = pct + '%';
                }
            });
        }

        // Update Modal Canvas
        if (modalEl) {
            const cvs = modalEl.querySelector('#level-modal-canvas');
            if (cvs) {
                drawModalCanvas(cvs, data.freqs, levels, m);
            }
        }
    },
    renderModal: (m, ctx) => {
        const curCount = m.bandsCount ?? 4;
        const bands = m.bands || [
            { freq: 100,  q: 1.0, sens: 1.8, type: 'lowpass' },
            { freq: 400,  q: 1.2, sens: 2.0, type: 'bandpass' },
            { freq: 2400, q: 1.2, sens: 2.2, type: 'bandpass' },
            { freq: 8000, q: 1.0, sens: 2.5, type: 'highpass' }
        ];

        return `
            <div class="space-y-2 select-none w-full p-1">
                <!-- Top Header: Bands Count Selector -->
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] text-slate-400 font-bold uppercase tracking-tight">ACTIVE BANDS:</span>
                        ${[1, 2, 3, 4].map(n => `
                            <button class="level-bands-btn h-4 px-2 rounded text-[8px] font-bold border transition-colors ${curCount === n ? 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/40' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="${n}">${n} BAND${n > 1 ? 'S' : ''}</button>
                        `).join('')}
                    </div>
                    <span class="text-[8px] font-mono text-cyan-400 font-bold">4-BAND AUDIO ➔ CV</span>
                </div>

                <!-- Spectrum Visualizer with Sliced Band Regions -->
                <div class="w-full bg-slate-950 p-1 rounded-lg border border-slate-800 select-none shadow-sm overflow-hidden">
                    <canvas id="level-modal-canvas" class="modal-canvas-4x1 rounded bg-slate-950 w-full" width="560" height="140"></canvas>
                </div>

                <!-- Per-Band Frequency & Sensitivity Controls -->
                <div class="grid grid-cols-4 gap-1.5 pt-1">
                    ${[0, 1, 2, 3].map(i => {
                        const b = bands[i] || { freq: 100, sens: 1.8 };
                        const col = BAND_COLORS[i];
                        const isDis = i >= curCount;
                        return `
                            <div class="bg-slate-900/80 p-1.5 rounded border border-slate-800 flex flex-col gap-1 ${isDis ? 'opacity-35 pointer-events-none' : ''}">
                                <div class="flex items-center justify-between">
                                    <span class="text-[8.5px] font-mono font-bold ${col.tag}">BAND ${i + 1} (${col.name})</span>
                                    <span class="text-[8px] font-mono text-slate-400">PIN ${11 + i}</span>
                                </div>
                                <div class="space-y-1">
                                    <div class="flex items-center justify-between text-[7.5px] font-mono text-slate-300">
                                        <span>FREQ</span>
                                        <span id="level-freq-val-${i}" class="text-amber-400 font-bold">${Math.round(b.freq)}Hz</span>
                                    </div>
                                    <input type="range" class="level-freq-slider w-full h-1 bg-slate-800 rounded accent-amber-500 cursor-pointer" data-band="${i}" min="20" max="16000" step="10" value="${b.freq}">
                                </div>
                                <div class="space-y-1">
                                    <div class="flex items-center justify-between text-[7.5px] font-mono text-slate-300">
                                        <span>SENS</span>
                                        <span id="level-sens-val-${i}" class="text-cyan-400 font-bold">${b.sens.toFixed(1)}x</span>
                                    </div>
                                    <input type="range" class="level-sens-slider w-full h-1 bg-slate-800 rounded accent-cyan-500 cursor-pointer" data-band="${i}" min="0.2" max="6.0" step="0.1" value="${b.sens}">
                                </div>
                            </div>`;
                    }).join('')}
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;

        // Band Count Toggle
        UIHelpers.bindButtonGroup('.level-bands-btn', 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/40', 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800', val => {
            m.bandsCount = parseInt(val, 10);
            ctx.reRenderModal();
            cb();
        });

        // Frequency Sliders
        root.querySelectorAll('.level-freq-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const bIdx = parseInt(e.target.dataset.band, 10);
                const val = parseFloat(e.target.value);
                if (m.bands && m.bands[bIdx]) {
                    m.bands[bIdx].freq = val;
                    const valEl = root.querySelector(`#level-freq-val-${bIdx}`);
                    if (valEl) valEl.textContent = `${Math.round(val)}Hz`;
                    cb();
                }
            });
        });

        // Sensitivity Sliders
        root.querySelectorAll('.level-sens-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const bIdx = parseInt(e.target.dataset.band, 10);
                const val = parseFloat(e.target.value);
                if (m.bands && m.bands[bIdx]) {
                    m.bands[bIdx].sens = val;
                    const valEl = root.querySelector(`#level-sens-val-${bIdx}`);
                    if (valEl) valEl.textContent = `${val.toFixed(1)}x`;
                    cb();
                }
            });
        });
    }
};

export const levelDefs = {
    LEVEL
};
