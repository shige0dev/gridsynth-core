import { UIHelpers } from '../../ui/helpers.js?v=292';

const drawScopeCanvas = (ctx2d, w, h, data, m, isModal = false) => {
    ctx2d.clearRect(0, 0, w, h);

    // Graticule grid
    if (isModal) {
        ctx2d.strokeStyle = '#1e293b';
        ctx2d.lineWidth = 0.5;
        // 8 horizontal divisions
        for (let i = 1; i < 8; i++) {
            const y = (h / 8) * i;
            ctx2d.beginPath();
            ctx2d.moveTo(0, y);
            ctx2d.lineTo(w, y);
            ctx2d.stroke();
        }
        // 10 vertical divisions
        for (let i = 1; i < 10; i++) {
            const x = (w / 10) * i;
            ctx2d.beginPath();
            ctx2d.moveTo(x, 0);
            ctx2d.lineTo(x, h);
            ctx2d.stroke();
        }
    }

    // Center crosshair axes
    ctx2d.strokeStyle = isModal ? '#334155' : '#1e293b';
    ctx2d.lineWidth = isModal ? 1.0 : 0.8;
    ctx2d.beginPath();
    ctx2d.moveTo(0, h / 2); ctx2d.lineTo(w, h / 2);
    ctx2d.moveTo(w / 2, 0); ctx2d.lineTo(w / 2, h);
    ctx2d.stroke();

    const vR = m.vRange || 5.0;
    const b1 = data.buf1, b2 = data.buf2, trg = data.trigBuf;
    if (!b1) return;
    const len = b1.length;

    if (m.displayMode === 'xy') {
        // Lissajous XY Mode (X = in1, Y = in2)
        ctx2d.lineWidth = isModal ? 1.8 : 1.4;
        ctx2d.strokeStyle = '#10b981';
        ctx2d.beginPath();
        let lastX = w / 2, lastY = h / 2;
        for (let i = 0; i < len; i++) {
            const x = Math.max(1, Math.min(w - 1, (w / 2) + ((b1[i] / vR) * (w * 0.44))));
            const y = Math.max(1, Math.min(h - 1, (h / 2) - (((b2 ? b2[i] : 0) / vR) * (h * 0.44))));
            if (i === 0) ctx2d.moveTo(x, y);
            else ctx2d.lineTo(x, y);
            if (i === len - 1) {
                lastX = x;
                lastY = y;
            }
        }
        ctx2d.stroke();

        // High-luminance phosphor beam spot
        ctx2d.save();
        ctx2d.shadowColor = '#00ffaa';
        ctx2d.shadowBlur = isModal ? 8 : 6;
        ctx2d.fillStyle = '#ffffff';
        ctx2d.beginPath();
        ctx2d.arc(lastX, lastY, isModal ? 2.2 : 1.4, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.restore();
    } else {
        // Dual Trace Time Domain Mode
        let startIdx = 0;
        if ((m.trigMode || 'auto') === 'auto' && trg) {
            for (let i = 0; i < Math.min(trg.length - 2, 128); i++) {
                if (trg[i] < 0 && trg[i + 1] >= 0) { startIdx = i; break; }
            }
        }
        const drawPts = len - startIdx;
        const sW = w / Math.max(1, drawPts - 1);
        const sp = m.ySpread ?? 0.2;

        // Upper terminal (in2 / b2 - Purple) - shifts UP
        if (b2) {
            ctx2d.lineWidth = isModal ? 1.6 : 1.2;
            ctx2d.strokeStyle = '#c084fc';
            ctx2d.beginPath();
            for (let i = 0; i < drawPts; i++) {
                const idx = startIdx + i;
                const y = Math.max(1, Math.min(h - 1, (h / 2) - (((b2[idx] / vR) + sp) * (h * 0.44))));
                i === 0 ? ctx2d.moveTo(i * sW, y) : ctx2d.lineTo(i * sW, y);
            }
            ctx2d.stroke();
        }

        // Lower terminal (in1 / b1 - Cyan) - shifts DOWN
        ctx2d.lineWidth = isModal ? 1.8 : 1.4;
        ctx2d.strokeStyle = '#22d3ee';
        ctx2d.beginPath();
        for (let i = 0; i < drawPts; i++) {
            const idx = startIdx + i;
            const y = Math.max(1, Math.min(h - 1, (h / 2) - (((b1[idx] / vR) - sp) * (h * 0.44))));
            i === 0 ? ctx2d.moveTo(i * sW, y) : ctx2d.lineTo(i * sW, y);
        }
        ctx2d.stroke();
    }
};

export const SCOPE = {
    color: 'cyan',
    defaults: () => ({ type: 'SCOPE', timeSpan: 0.05, vRange: 5.0, trigMode: 'auto', displayMode: 'time', ySpread: 0.2 }),
    ports: () => ({
        in: [
            { port: 'wave_in1', pin: 4, color: 'bg-yellow-400' },
            { port: 'trig_in', pin: 5, color: 'bg-orange-500' },
            { port: 'wave_in2', pin: 3, color: 'bg-yellow-400' }
        ],
        out: []
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    T_STEPS: [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0],
    formatTime: (v) => v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(1)}s`,
    renderGrid: (m) => `
        <div class="absolute inset-0.5 bg-slate-950 rounded-sm border border-slate-800/90 overflow-hidden z-0 pointer-events-none">
            <canvas class="scope-canvas w-full h-full block" width="100" height="100"></canvas>
        </div>`,
    updateLive: (cell, data, isP, modal, m) => {
        if (!data || !m) return;
        const cvs = cell.querySelector('.scope-canvas');
        if (cvs) {
            const ctx = cvs.getContext('2d');
            drawScopeCanvas(ctx, cvs.width, cvs.height, data, m, false);
        }
        const modalCvs = modal?.querySelector('#scope-modal-canvas');
        if (modalCvs) {
            const mCtx = modalCvs.getContext('2d');
            drawScopeCanvas(mCtx, modalCvs.width, modalCvs.height, data, m, true);
        }
    },
    renderModal: (m) => {
        const curT = m.timeSpan || 0.05;
        const curV = m.vRange || 5.0;
        const curTrig = m.trigMode || 'auto';
        const curDisp = m.displayMode || 'time';
        const curYSp = m.ySpread ?? 0.2;

        return `
            <div class="space-y-1.5">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 select-none">
                    <div class="flex items-center gap-1">
                        <button id="scope-mode-time" class="h-4 px-1.5 rounded text-[8px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${curDisp === 'time' ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm shadow-cyan-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}">TIME</button>
                        <button id="scope-mode-xy" class="h-4 px-1.5 rounded text-[8px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${curDisp === 'xy' ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}">X-Y</button>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="flex items-center gap-1">
                            <span class="text-[8px] text-slate-400 font-bold uppercase tracking-tight">V/DIV:</span>
                            <button id="scope-v-down" class="h-4 w-4 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center justify-center leading-none active:bg-slate-700">−</button>
                            <span id="scope-v-disp" class="font-mono text-[9px] font-bold text-cyan-300 w-8 text-center">${curV.toFixed(1)}V</span>
                            <button id="scope-v-up" class="h-4 w-4 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center justify-center leading-none active:bg-slate-700">＋</button>
                        </div>
                        <div class="flex items-center gap-1">
                            <span class="text-[8px] text-slate-400 font-bold uppercase tracking-tight">T/DIV:</span>
                            <button id="scope-t-down" class="h-4 w-4 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center justify-center leading-none active:bg-slate-700">−</button>
                            <span id="scope-t-disp" class="font-mono text-[9px] font-bold text-cyan-300 w-11 text-center">${SCOPE.formatTime(curT)}</span>
                            <button id="scope-t-up" class="h-4 w-4 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center justify-center leading-none active:bg-slate-700">＋</button>
                        </div>
                    </div>
                </div>
                <div class="h-[108px] bg-slate-950 p-1 rounded-lg border border-slate-800 select-none shadow-sm overflow-hidden">
                    <canvas id="scope-modal-canvas" class="w-full h-full block rounded bg-slate-950" width="360" height="106"></canvas>
                </div>
                <div class="flex items-center justify-between text-[8px] text-slate-400 select-none pt-0.5">
                    <div class="flex items-center gap-2">
                        <span class="inline-flex items-center gap-1 font-mono text-[8px] text-cyan-400 font-bold">
                            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span>CH1
                        </span>
                        <span class="inline-flex items-center gap-1 font-mono text-[8px] text-purple-400 font-bold">
                            <span class="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"></span>CH2
                        </span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button id="scope-trig-toggle" class="h-4 px-1.5 rounded text-[8px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${curTrig === 'auto' ? 'bg-amber-950 text-amber-300 border-amber-600/70 shadow-sm shadow-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}">
                            TRIG: ${curTrig.toUpperCase()}
                        </button>
                        <button id="scope-sp-toggle" class="h-4 px-1.5 rounded text-[8px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${curYSp > 0 ? 'bg-slate-800 text-cyan-300 border-cyan-700/60' : 'bg-slate-800 text-slate-400 border-slate-700'}">
                            SEP: ${curYSp > 0 ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const tSteps = SCOPE.T_STEPS;
        const vSteps = [0.5, 1.0, 2.0, 5.0, 10.0];

        document.getElementById('scope-mode-time')?.addEventListener('click', () => {
            m.displayMode = 'time';
            ctx.reRenderModal();
            cb();
        });
        document.getElementById('scope-mode-xy')?.addEventListener('click', () => {
            m.displayMode = 'xy';
            ctx.reRenderModal();
            cb();
        });

        document.getElementById('scope-t-down')?.addEventListener('click', () => {
            const cur = m.timeSpan || 0.05;
            let idx = tSteps.findIndex(v => v >= cur - 0.0001);
            if (idx > 0) {
                m.timeSpan = tSteps[idx - 1];
                ctx.reRenderModal();
                cb();
            }
        });
        document.getElementById('scope-t-up')?.addEventListener('click', () => {
            const cur = m.timeSpan || 0.05;
            let idx = tSteps.findIndex(v => v >= cur - 0.0001);
            if (idx >= 0 && idx < tSteps.length - 1) {
                m.timeSpan = tSteps[idx + 1];
                ctx.reRenderModal();
                cb();
            }
        });

        document.getElementById('scope-v-down')?.addEventListener('click', () => {
            const cur = m.vRange || 5.0;
            let idx = vSteps.findIndex(v => v >= cur - 0.001);
            if (idx > 0) {
                m.vRange = vSteps[idx - 1];
                ctx.reRenderModal();
                cb();
            }
        });
        document.getElementById('scope-v-up')?.addEventListener('click', () => {
            const cur = m.vRange || 5.0;
            let idx = vSteps.findIndex(v => v >= cur - 0.001);
            if (idx >= 0 && idx < vSteps.length - 1) {
                m.vRange = vSteps[idx + 1];
                ctx.reRenderModal();
                cb();
            }
        });

        document.getElementById('scope-trig-toggle')?.addEventListener('click', () => {
            m.trigMode = (m.trigMode || 'auto') === 'auto' ? 'free' : 'auto';
            ctx.reRenderModal();
            cb();
        });

        document.getElementById('scope-sp-toggle')?.addEventListener('click', () => {
            m.ySpread = (m.ySpread ?? 0.2) > 0 ? 0.0 : 0.2;
            ctx.reRenderModal();
            cb();
        });
    }
};

export const MON = {
    color: 'slate',
    defaults: () => ({ type: 'MON' }),
    ports: () => ({
        in: [
            { port: 'cv_in1', color: 'bg-yellow-400' },
            { port: 'cv_in2', color: 'bg-yellow-400' },
            { port: 'cv_in3', color: 'bg-yellow-400' },
            { port: 'cv_in4', color: 'bg-yellow-400' }
        ],
        out: []
    }),
    renderGrid: () => `<div class="flex items-center justify-center w-full h-full pointer-events-none">${UIHelpers.renderPanelBars(Array.from({ length: 4 }, (_, i) => ({ pct: 0, innerCls: `mon-bar-${i+1}` })), { gapCls: 'gap-1', theme: 'cv' })}</div>`,
    updateLive: (cell, data) => {
        if (!data || !data.values) return;
        data.values.forEach((v, i) => {
            const b = cell.querySelector(`.mon-bar-${i+1}`);
            if (b) b.style.height = `${Math.max(0, Math.min(100, (v + 1) * 50))}%`;
        });
    },
    renderModal: () => `<div class="text-[9px] text-slate-400 p-2 text-center">4チャンネル CV/オーディオ信号リアルタイムモニター</div>`
};

const extractBands = (freqs, numBands = 96, sampleRate = 48000) => {
    const fftSize = freqs.length * 2;
    const bands = new Float32Array(numBands);
    let peakVal = 0, peakFreq = 0;

    const bandsPerOct = 12;
    const f0 = 55;

    for (let b = 0; b < numBands; b++) {
        const fCenter = f0 * Math.pow(2, b / bandsPerOct);
        const kCenterFloat = fCenter * fftSize / sampleRate;
        const k0 = Math.max(0, Math.min(freqs.length - 1, Math.floor(kCenterFloat)));
        const k1 = Math.min(freqs.length - 1, k0 + 1);
        const t = kCenterFloat - k0;
        const val = (1 - t) * freqs[k0] + t * freqs[k1];
        const v = Math.max(0, Math.min(1.0, val / 255.0));
        bands[b] = Math.pow(v, 1.4);

        if (val > peakVal) {
            peakVal = val;
            peakFreq = (kCenterFloat * sampleRate) / fftSize;
        }
    }

    return { bands, peakVal, peakFreq };
};

const findGlobalPeak = (freqs, sampleRate = 48000, fMin = 40, fMax = 14000) => {
    const fftSize = freqs.length * 2;
    const kMin = Math.max(1, Math.floor(fMin * fftSize / sampleRate));
    const kMax = Math.min(freqs.length - 1, Math.ceil(fMax * fftSize / sampleRate));
    let max = 0, maxK = 0;
    for (let k = kMin; k <= kMax; k++) {
        if (freqs[k] > max) {
            max = freqs[k];
            maxK = k;
        }
    }
    return { peakVal: max, peakFreq: (maxK * sampleRate) / fftSize };
};

const drawSpectrumCanvas = (ctx, w, h, bands, mode, isModal) => {
    ctx.clearRect(0, 0, w, h);

    const n = bands.length;
    const bandsPerOct = 12;

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.6;
    const gridY = [h * 0.25, h * 0.5, h * 0.75];
    gridY.forEach(y => {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    });

    const gap = isModal ? 1.0 : 0.3;
    const barW = (w - gap * (n - 1)) / n;

    const octFreqs = [
        { f: 55, l: '55' },
        { f: 110, l: '110' },
        { f: 220, l: '220' },
        { f: 440, l: '440', isA4: true },
        { f: 880, l: '880' },
        { f: 1760, l: '1.7k' },
        { f: 3520, l: '3.5k' },
        { f: 7040, l: '7k' },
        { f: 14080, l: '14k' }
    ];

    octFreqs.forEach(item => {
        const b = bandsPerOct * Math.log2(item.f / 55);
        if (b >= 0 && b <= n) {
            let x;
            if (mode === 'bar') {
                x = b < n ? b * (barW + gap) + barW / 2 : w - 1;
            } else {
                x = (b / (n - 1)) * w;
            }

            ctx.save();
            if (item.isA4) {
                ctx.strokeStyle = 'rgba(45, 212, 191, 0.85)';
                ctx.lineWidth = 1.2;
                ctx.setLineDash([3, 2]);
            } else {
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
                ctx.lineWidth = 0.8;
                ctx.setLineDash([2, 2]);
            }

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();

            if (isModal) {
                ctx.font = 'bold 8.5px ui-monospace, monospace';
                ctx.fillStyle = item.isA4 ? '#2dd4bf' : '#cbd5e1';
                ctx.textAlign = 'center';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 1;
                const clampedX = Math.max(10, Math.min(w - 10, x));
                ctx.fillText(item.l, clampedX, 10);
            }
            ctx.restore();
        }
    });

    if (mode === 'bar') {
        for (let i = 0; i < n; i++) {
            const v = Math.max(0, Math.min(1, bands[i]));
            const barH = Math.max(1, v * (h - 4));
            const x = i * (barW + gap);
            const y = h - barH;

            const grad = ctx.createLinearGradient(0, h, 0, 0);
            grad.addColorStop(0, '#0d9488');
            grad.addColorStop(0.65, '#2dd4bf');
            grad.addColorStop(1, '#facc15');

            ctx.fillStyle = grad;
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function' && barW >= 2) {
                ctx.roundRect(x, y, barW, barH, [1, 1, 0, 0]);
            } else {
                ctx.rect(x, y, barW, barH);
            }
            ctx.fill();
        }
    } else {
        const pts = [];
        for (let i = 0; i < n; i++) {
            const x = (i / (n - 1)) * w;
            const v = Math.max(0, Math.min(1, bands[i]));
            const y = h - (v * (h - 6)) - 2;
            pts.push({ x, y });
        }

        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(45, 212, 191, 0.45)');
        grad.addColorStop(0.7, 'rgba(13, 148, 136, 0.15)');
        grad.addColorStop(1, 'rgba(13, 148, 136, 0.0)');

        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            const midX = (pts[i - 1].x + pts[i].x) / 2;
            const midY = (pts[i - 1].y + pts[i].y) / 2;
            ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            const midX = (pts[i - 1].x + pts[i].x) / 2;
            const midY = (pts[i - 1].y + pts[i].y) / 2;
            ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = isModal ? 2 : 1.5;
        ctx.stroke();
    }
};

export const SPEC = {
    color: 'teal',
    defaults: () => ({ type: 'SPEC', mode: 'bar', speed: 'med', smooth: 0.75 }),
    ports: () => ({
        in: [{ port: 'wave_in', pin: 4, color: 'bg-blue-500' }],
        out: []
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => `
        <div class="absolute inset-0.5 bg-slate-950 rounded-sm border border-slate-800/90 overflow-hidden z-0 pointer-events-none">
            <canvas class="spec-canvas w-full h-full block" width="120" height="120"></canvas>
        </div>`,
    updateLive: (cell, data, isP, modal, m) => {
        if (!data?.freqs) return;
        const freqs = data.freqs;
        const sampleRate = data.sampleRate || 48000;
        const mode = m.mode || 'bar';

        const cvs = cell.querySelector('.spec-canvas');
        if (cvs) {
            const cellRes = extractBands(freqs, 96, sampleRate);
            const ctx = cvs.getContext('2d');
            drawSpectrumCanvas(ctx, cvs.width, cvs.height, cellRes.bands, mode, false);
        }

        const modalCvs = modal?.querySelector('#spec-modal-canvas');
        if (modalCvs) {
            const modalRes = extractBands(freqs, 96, sampleRate);
            const mCtx = modalCvs.getContext('2d');
            drawSpectrumCanvas(mCtx, modalCvs.width, modalCvs.height, modalRes.bands, mode, true);
        }
    },
    renderModal: (m) => {
        const curMode = m.mode || 'bar';
        const curSpeed = m.speed || 'med';
        return `
            <div class="space-y-1.5">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 select-none">
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] text-slate-400 font-bold uppercase tracking-tight">MODE:</span>
                        <button id="spec-mode-bar" class="h-4 px-1.5 rounded text-[8px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${curMode === 'bar' ? 'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}">BAR</button>
                        <button id="spec-mode-curve" class="h-4 px-1.5 rounded text-[8px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${curMode === 'curve' ? 'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}">CURVE</button>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] text-slate-400 font-bold uppercase tracking-tight">SPEED:</span>
                        ${['fast', 'med', 'slow'].map(sp => `
                            <button class="spec-speed-btn h-4 px-1.5 rounded text-[7.5px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${curSpeed === sp ? 'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}" data-speed="${sp}">${sp.toUpperCase()}</button>
                        `).join('')}
                    </div>
                </div>

                <div class="h-[108px] bg-slate-950 p-1 rounded-lg border border-slate-800 select-none shadow-sm overflow-hidden">
                    <canvas id="spec-modal-canvas" class="w-full h-full block rounded bg-slate-950" width="360" height="106"></canvas>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        document.getElementById('spec-mode-bar')?.addEventListener('click', () => {
            m.mode = 'bar';
            ctx.reRenderModal();
            cb();
        });
        document.getElementById('spec-mode-curve')?.addEventListener('click', () => {
            m.mode = 'curve';
            ctx.reRenderModal();
            cb();
        });
        document.querySelectorAll('.spec-speed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sp = e.currentTarget.dataset.speed;
                m.speed = sp;
                m.smooth = sp === 'fast' ? 0.4 : (sp === 'slow' ? 0.90 : 0.75);
                ctx.reRenderModal();
                cb();
            });
        });
    }
};

export const scopeDefs = {
    SCOPE,
    MON,
    SPEC
};
