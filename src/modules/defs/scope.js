import { UIHelpers } from '../../ui/helpers.js?v=351';

const bindStepPair = (downId, upId, steps, m, prop, defVal, ctx, cb) => {
    const step = (dir) => {
        const cur = m[prop] || defVal;
        const idx = steps.findIndex(v => v >= cur - 0.0001);
        const nextIdx = idx + dir;
        if (idx >= 0 && nextIdx >= 0 && nextIdx < steps.length) {
            m[prop] = steps[nextIdx];
            ctx.reRenderModal();
            cb();
        }
    };
    document.getElementById(downId)?.addEventListener('click', () => step(-1));
    document.getElementById(upId)?.addEventListener('click', () => step(1));
};

const renderDualCanvases = (cell, modal, cellSel, modalSel, drawFn) => {
    const cvs = cell.querySelector(cellSel);
    if (cvs) drawFn(cvs.getContext('2d'), cvs.width, cvs.height, false);
    const modalCvs = modal?.querySelector(modalSel);
    if (modalCvs) drawFn(modalCvs.getContext('2d'), modalCvs.width, modalCvs.height, true);
};

// -------------------------------------------------------------
// 1. Single-Channel Oscilloscope Canvas
// -------------------------------------------------------------
const drawScopeCanvas = (ctx2d, w, h, data, m, isModal = false) => {
    ctx2d.clearRect(0, 0, w, h);

    UIHelpers.drawGraticule(ctx2d, w, h, { isModal, cols: 10, rows: 8 });

    const vR = m.vRange || 2.0;
    const b1 = data?.buf1, trg = data?.trigBuf;
    if (!b1) return;
    const len = b1.length;

    // Trigger offset search (auto trigger on rising zero-crossing or pulse edge)
    let startIdx = 0;
    if ((m.trigMode || 'auto') === 'auto' && trg) {
        let minVal = 0, maxVal = 0;
        const searchLimit = Math.min(trg.length - 2, 256);
        for (let i = 0; i < searchLimit; i++) {
            if (trg[i] < minVal) minVal = trg[i];
            if (trg[i] > maxVal) maxVal = trg[i];
        }
        const thresh = (minVal >= -0.05 && maxVal > 0.2) ? (minVal + maxVal) * 0.5 : 0;
        for (let i = 0; i < searchLimit; i++) {
            if (trg[i] < thresh && trg[i + 1] >= thresh) { startIdx = i; break; }
        }
    }
    const drawPts = len - startIdx;
    const sW = w / Math.max(1, drawPts - 1);

    // Single-trace waveform (Cyan)
    ctx2d.lineWidth = isModal ? 1.8 : 1.4;
    ctx2d.strokeStyle = '#22d3ee';
    ctx2d.beginPath();
    for (let i = 0; i < drawPts; i++) {
        const idx = startIdx + i;
        const y = Math.max(1, Math.min(h - 1, (h / 2) - ((b1[idx] / vR) * (h * 0.44))));
        i === 0 ? ctx2d.moveTo(i * sW, y) : ctx2d.lineTo(i * sW, y);
    }
    ctx2d.stroke();
};

export const SCOPE = {
    color: 'cyan',
    defaults: () => ({ type: 'SCOPE', timeSpan: 0.1, vRange: 2.0, trigMode: 'auto', opacity: 0.8 }),
    ports: () => ({
        in: [
            { port: 'cv_in', pin: 5, color: 'bg-yellow-400' },
            { port: 'trig_in', pin: 6, color: 'bg-orange-500' }
        ],
        out: []
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    T_STEPS: [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0],
    V_STEPS: [0.5, 1.0, 2.0, 5.0, 10.0],
    formatTime: (v) => v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(1)}s`,
    renderGrid: (m) => `
        <div class="absolute inset-0.5 bg-slate-950 rounded-sm border border-slate-800/90 overflow-hidden z-0 pointer-events-none scope-grid-container" style="opacity: ${m?.opacity ?? 0.8};">
            <canvas class="scope-canvas w-full h-full block" width="100" height="100"></canvas>
        </div>`,
    updateLive: (cell, data, isP, modal, m) => {
        if (!data || !m) return;
        renderDualCanvases(cell, modal, '.scope-canvas', '#scope-modal-canvas', (c, w, h, isM) => drawScopeCanvas(c, w, h, data, m, isM));
    },
    renderModal: (m) => {
        const curT = m.timeSpan || 0.1;
        const curV = m.vRange || 2.0;
        const curTrig = m.trigMode || 'auto';

        return `
            <div class="space-y-1.5">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 select-none">
                    <div class="flex items-center gap-1 font-mono text-[9px] text-cyan-400 font-bold">
                        <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span>1-CH SCOPE
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
                <div class="h-[108px] bg-slate-950 p-1 rounded-lg border border-slate-800 select-none shadow-sm overflow-hidden" style="opacity: ${m?.opacity ?? 0.8};">
                    <canvas id="scope-modal-canvas" class="w-full h-full block rounded bg-slate-950" width="360" height="106"></canvas>
                </div>
                <div class="flex items-center justify-between text-[8px] text-slate-400 select-none pt-0.5">
                    <span class="text-[8px] text-slate-400 font-mono">INPUT: PIN5 (WAVE)</span>
                    <button id="scope-trig-toggle" class="h-4 px-2 rounded text-[8px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${curTrig === 'auto' ? 'bg-amber-950 text-amber-300 border-amber-600/70 shadow-sm shadow-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}">
                        TRIG: ${curTrig.toUpperCase()} (PIN6)
                    </button>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        bindStepPair('scope-t-down', 'scope-t-up', SCOPE.T_STEPS, m, 'timeSpan', 0.1, ctx, cb);
        bindStepPair('scope-v-down', 'scope-v-up', SCOPE.V_STEPS, m, 'vRange', 2.0, ctx, cb);
        document.getElementById('scope-trig-toggle')?.addEventListener('click', () => {
            m.trigMode = (m.trigMode || 'auto') === 'auto' ? 'free' : 'auto';
            ctx.reRenderModal();
            cb();
        });
    }
};

// -------------------------------------------------------------
// 2. Lissajous XY Scope Canvas & Module
// -------------------------------------------------------------
const drawLissajousCanvas = (ctx2d, w, h, data, m, isModal = false) => {
    ctx2d.clearRect(0, 0, w, h);

    UIHelpers.drawGraticule(ctx2d, w, h, { isModal, cols: 8, rows: 8 });

    const vR = m.vRange || 2.0;
    const b1 = data?.buf1, b2 = data?.buf2;
    if (!b1) return;
    const len = b1.length;

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
};

export const LISS = {
    color: 'emerald',
    defaults: () => ({ type: 'LISS', vRange: 2.0, opacity: 0.8 }),
    ports: () => ({
        in: [
            { port: 'cv_in_x', pin: 5, color: 'bg-yellow-400' },
            { port: 'cv_in_y', pin: 6, color: 'bg-yellow-400' }
        ],
        out: []
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    V_STEPS: [0.5, 1.0, 2.0, 5.0, 10.0],
    renderGrid: (m) => `
        <div class="absolute inset-0.5 bg-slate-950 rounded-sm border border-slate-800/90 overflow-hidden z-0 pointer-events-none liss-grid-container" style="opacity: ${m?.opacity ?? 0.8};">
            <canvas class="liss-canvas w-full h-full block" width="100" height="100"></canvas>
        </div>`,
    updateLive: (cell, data, isP, modal, m) => {
        if (!data || !m) return;
        renderDualCanvases(cell, modal, '.liss-canvas', '#liss-modal-canvas', (c, w, h, isM) => drawLissajousCanvas(c, w, h, data, m, isM));
    },
    renderModal: (m) => {
        const curV = m.vRange || 2.0;
        return `
            <div class="space-y-1.5">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 select-none">
                    <div class="flex items-center gap-1 font-mono text-[9px] text-emerald-400 font-bold">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>LISSAJOUS (X-Y)
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] text-slate-400 font-bold uppercase tracking-tight">V/DIV:</span>
                        <button id="liss-v-down" class="h-4 w-4 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center justify-center leading-none active:bg-slate-700">−</button>
                        <span id="liss-v-disp" class="font-mono text-[9px] font-bold text-emerald-300 w-8 text-center">${curV.toFixed(1)}V</span>
                        <button id="liss-v-up" class="h-4 w-4 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center justify-center leading-none active:bg-slate-700">＋</button>
                    </div>
                </div>
                <div class="h-[108px] bg-slate-950 p-1 rounded-lg border border-slate-800 select-none shadow-sm overflow-hidden" style="opacity: ${m?.opacity ?? 0.8};">
                    <canvas id="liss-modal-canvas" class="w-full h-full block rounded bg-slate-950" width="360" height="106"></canvas>
                </div>
                <div class="flex items-center justify-between text-[8px] text-slate-400 select-none pt-0.5">
                    <span class="font-mono text-emerald-400">CV_IN_X: PIN5</span>
                    <span class="font-mono text-emerald-400">CV_IN_Y: PIN6</span>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        bindStepPair('liss-v-down', 'liss-v-up', LISS.V_STEPS, m, 'vRange', 2.0, ctx, cb);
    }
};

// -------------------------------------------------------------
// 3. Spectrum Analyzer Module (SPEC)
// -------------------------------------------------------------
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

const drawSpectrumCanvas = (ctx, w, h, historyBands, mode, view, isModal) => {
    ctx.clearRect(0, 0, w, h);

    if (!historyBands || historyBands.length === 0) return;
    const n = historyBands[0].length;
    const bandsPerOct = 12;

    // --- 1. 2D FLAT VIEW (MODAL or PANEL when view === '2d') ---
    if (isModal || view === '2d') {
        const bands = historyBands[0];
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 0.6;
        const gridY = [h * 0.25, h * 0.5, h * 0.75];
        gridY.forEach(y => {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        });

        const gap = 1.0;
        const barW = (w - gap * (n - 1)) / n;

        if (isModal) {
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
                    const x = mode === 'bar' ? (b < n ? b * (barW + gap) + barW / 2 : w - 1) : ((b / (n - 1)) * w);
                    ctx.save();
                    ctx.strokeStyle = item.isA4 ? 'rgba(45, 212, 191, 0.85)' : 'rgba(148, 163, 184, 0.45)';
                    ctx.lineWidth = item.isA4 ? 1.2 : 0.8;
                    ctx.setLineDash(item.isA4 ? [3, 2] : [2, 2]);
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, h);
                    ctx.stroke();

                    ctx.font = 'bold 8.5px ui-monospace, monospace';
                    ctx.fillStyle = item.isA4 ? '#2dd4bf' : '#cbd5e1';
                    ctx.textAlign = 'center';
                    const clampedX = Math.max(10, Math.min(w - 10, x));
                    ctx.fillText(item.l, clampedX, 10);
                    ctx.restore();
                }
            });
        }

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
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        return;
    }

    // --- 2. PANEL (3D AXONOMETRIC CENTER-ORIGIN PARALLEL PROJECTION) ---
    // Universal 3D Axis-Vector Model centered at (cx, cy):
    // Coordinates are normalized [-1, 1] relative to center (0, 0, 0)
    // Suitable for both Spectrum Analyzer and future 3D Lissajous
    const totalSlices = historyBands.length; // 5 lines
    const rad30 = Math.PI / 6; // 30 degrees
    const cos30 = Math.cos(rad30); // ~0.866
    const sin30 = Math.sin(rad30); // 0.500

    // Center of Panel (0, 0, 0) in screen coordinates
    const cx = 60;
    const cy = 60;

    // True Isometric Cube (2x2x2) in [-1, 1]^3 space: Lx = Ly = Lz = L
    // Max Y displacement is 2L (at corners (+1, -1, -1) and (-1, +1, +1))
    // With L = 30px, corners touch/slightly reach canvas boundaries Y in [0, 120]
    const L = 30;
    const Lx = L; // X axis (frequency): right-down 30°
    const Ly = L; // Y axis (time-series): right-up 30°
    const Lz = L; // Z axis (amplitude): vertical up

    // 3D Axis Vectors in screen space
    const Vx = { x:  Lx * cos30, y:  Lx * sin30 };
    const Vy = { x:  Ly * cos30, y: -Ly * sin30 };
    const Vz = { x:  0,          y: -Lz };

    // Direct 3D Projector from normalized space to screen (px, py)
    const project3D = (nx, ny, nz) => ({
        x: cx + nx * Vx.x + ny * Vy.x + nz * Vz.x,
        y: cy + nx * Vx.y + ny * Vy.y + nz * Vz.y
    });

    // Spectrum Mapping onto normalized [-1, 1] space:
    // Frequency u [0, 1] -> nx in [-1, 1]
    // Time-series v [0, 1] (0=front, 1=back) -> ny in [-1, 1]
    // Amplitude val [0, 1] -> nz in [-1, 1] (0 sits on bottom floor nz=-1, 1 rises to top ceiling nz=1)
    const projectSpec = (u, v, val = 0) => {
        const nx = 2 * u - 1;
        const ny = 2 * v - 1;
        const nz = 2 * val - 1;
        return project3D(nx, ny, nz);
    };

    // A. Draw floor bounding side rails (Left: u=0, Right: u=1, for v from 0 to 1)
    ctx.save();
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
    ctx.lineWidth = 0.6;
    // Left boundary rail
    const p00 = projectSpec(0, 0, 0);
    const p01 = projectSpec(0, 1, 0);
    ctx.beginPath();
    ctx.moveTo(p00.x, p00.y);
    ctx.lineTo(p01.x, p01.y);
    ctx.stroke();

    // Right boundary rail
    const p10 = projectSpec(1, 0, 0);
    const p11 = projectSpec(1, 1, 0);
    ctx.beginPath();
    ctx.moveTo(p10.x, p10.y);
    ctx.lineTo(p11.x, p11.y);
    ctx.stroke();
    ctx.restore();

    // B. Render 5 time-series slices from back (k = 4, v = 1) to front (k = 0, v = 0)
    for (let k = totalSlices - 1; k >= 0; k--) {
        const bands = historyBands[k];
        const vRatio = k / (totalSlices - 1); // 0 (front) to 1 (back)
        const depthRatio = 1 - vRatio;        // 1 (front) to 0 (back)

        // Always draw the 0-point baseline (oblique 30° line from left to right)
        const pStart = projectSpec(0, vRatio, 0);
        const pEnd = projectSpec(1, vRatio, 0);

        ctx.save();
        ctx.strokeStyle = k === 0 
            ? 'rgba(45, 212, 191, 0.95)' 
            : `rgba(45, 212, 191, ${(0.18 + depthRatio * 0.35).toFixed(2)})`;
        ctx.lineWidth = k === 0 ? 1.0 : 0.6;
        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.stroke();
        ctx.restore();

        if (!bands) continue;

        const strokeColor = k === 0 
            ? '#2dd4bf' 
            : `rgba(45, 212, 191, ${(0.3 + depthRatio * 0.55).toFixed(2)})`;

        if (mode === 'bar') {
            for (let i = 0; i < n; i++) {
                const val = Math.max(0, Math.min(1, bands[i]));
                if (val < 0.005) continue; // keep 0 baseline line visible

                const u = i / (n - 1);
                const uNext = Math.min(1, (i + 0.8) / (n - 1));
                const pBase = projectSpec(u, vRatio, 0);
                const pTop = projectSpec(u, vRatio, val);
                const pBaseNext = projectSpec(uNext, vRatio, 0);
                const pTopNext = projectSpec(uNext, vRatio, val);

                // Occlusion polygon
                ctx.fillStyle = '#020617';
                ctx.beginPath();
                ctx.moveTo(pBase.x, pBase.y);
                ctx.lineTo(pTop.x, pTop.y);
                ctx.lineTo(pTopNext.x, pTopNext.y);
                ctx.lineTo(pBaseNext.x, pBaseNext.y);
                ctx.closePath();
                ctx.fill();

                // Axonometric bar gradient
                const grad = ctx.createLinearGradient(pBase.x, pBase.y, pTop.x, pTop.y);
                if (k === 0) {
                    grad.addColorStop(0, '#0d9488');
                    grad.addColorStop(0.7, '#2dd4bf');
                    grad.addColorStop(1, '#facc15');
                } else {
                    grad.addColorStop(0, `rgba(13, 148, 136, ${(0.3 + depthRatio * 0.5).toFixed(2)})`);
                    grad.addColorStop(1, `rgba(45, 212, 191, ${(0.4 + depthRatio * 0.5).toFixed(2)})`);
                }
                ctx.fillStyle = grad;
                ctx.fill();
            }
        } else {
            // CURVE mode
            let hasSignal = false;
            const pts = [];
            for (let i = 0; i < n; i++) {
                const val = Math.max(0, Math.min(1, bands[i]));
                if (val > 0.008) hasSignal = true;
                const u = i / (n - 1);
                pts.push(projectSpec(u, vRatio, val));
            }

            if (hasSignal) {
                // Occlusion & Area fill
                ctx.beginPath();
                ctx.moveTo(pStart.x, pStart.y);
                ctx.lineTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) {
                    const midX = (pts[i - 1].x + pts[i].x) / 2;
                    const midY = (pts[i - 1].y + pts[i].y) / 2;
                    ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
                }
                ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
                ctx.lineTo(pEnd.x, pEnd.y);
                ctx.closePath();

                const pMaxTop = projectSpec(0.5, vRatio, 1.0);
                const grad = ctx.createLinearGradient(pStart.x, pStart.y, pMaxTop.x, pMaxTop.y);
                if (k === 0) {
                    grad.addColorStop(0, '#020617');
                    grad.addColorStop(0.4, 'rgba(13, 148, 136, 0.25)');
                    grad.addColorStop(1, 'rgba(45, 212, 191, 0.55)');
                } else {
                    grad.addColorStop(0, '#020617');
                    grad.addColorStop(1, `rgba(45, 212, 191, ${(0.12 + depthRatio * 0.15).toFixed(2)})`);
                }
                ctx.fillStyle = grad;
                ctx.fill();

                // Ridge line stroke
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length; i++) {
                    const midX = (pts[i - 1].x + pts[i].x) / 2;
                    const midY = (pts[i - 1].y + pts[i].y) / 2;
                    ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
                }
                ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = k === 0 ? 1.4 : 0.8;
                ctx.stroke();
            }
        }
    }
};

export const SPEC = {
    color: 'teal',
    defaults: () => ({ type: 'SPEC', mode: 'bar', view: '3d', smooth: 0.75 }),
    ports: () => ({
        in: [{ port: 'wave_in', pin: 5, color: 'bg-blue-500' }],
        out: []
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: () => `
        <div class="absolute inset-0.5 bg-slate-950 rounded-sm border border-slate-800/90 overflow-hidden z-0 pointer-events-none">
            <canvas class="spec-canvas w-full h-full block" width="120" height="120"></canvas>
        </div>`,
    updateLive: (cell, data, isP, modal, m) => {
        if (!data?.freqs) return;
        const { bands } = extractBands(data.freqs, 96, data.sampleRate || 48000);
        const mode = m.mode || 'bar';
        const view = m.view || '3d';

        // Maintain 5-slice history buffer on the module instance
        if (!m._historyBands) {
            m._historyBands = [];
            for (let i = 0; i < 5; i++) {
                m._historyBands.push(new Float32Array(bands.length));
            }
        }

        // Subsample history frames to make waterfall progression visible and smooth
        m._frameCounter = (m._frameCounter || 0) + 1;
        if (m._frameCounter % 2 === 0) {
            m._historyBands.pop();
            m._historyBands.unshift(new Float32Array(bands));
        } else {
            // Update latest frame directly
            m._historyBands[0].set(bands);
        }

        renderDualCanvases(cell, modal, '.spec-canvas', '#spec-modal-canvas', (c, w, h, isM) => drawSpectrumCanvas(c, w, h, m._historyBands, mode, view, isM));
    },
    renderModal: (m) => {
        const curMode = m.mode || 'bar';
        const curView = m.view || '3d';
        return `
            <div class="space-y-1.5">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 select-none">
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] text-slate-400 font-bold uppercase tracking-tight">STYLE:</span>
                        <button id="spec-mode-bar" class="h-4 px-1.5 rounded text-[8px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${curMode === 'bar' ? 'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}">BAR</button>
                        <button id="spec-mode-curve" class="h-4 px-1.5 rounded text-[8px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${curMode === 'curve' ? 'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}">CURVE</button>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] text-slate-400 font-bold uppercase tracking-tight">VIEW:</span>
                        <button id="spec-view-2d" class="h-4 px-1.5 rounded text-[8px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${curView === '2d' ? 'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}">2D</button>
                        <button id="spec-view-3d" class="h-4 px-1.5 rounded text-[8px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${curView === '3d' ? 'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}">3D</button>
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
        document.getElementById('spec-view-2d')?.addEventListener('click', () => {
            m.view = '2d';
            ctx.reRenderModal();
            cb();
        });
        document.getElementById('spec-view-3d')?.addEventListener('click', () => {
            m.view = '3d';
            ctx.reRenderModal();
            cb();
        });
    }
};

export const scopeDefs = {
    SCOPE,
    LISS,
    SPEC
};
