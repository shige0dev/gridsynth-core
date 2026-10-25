// src/modules/defs/pad.js
import { UIHelpers } from '../../ui/helpers.js?v=351';

function drawPadCanvas(ctx2d, w, h, state, isModal = false, hasX = false, hasY = false, polX = 'bi', polY = 'bi') {
    ctx2d.clearRect(0, 0, w, h);

    const hueVal = ((state?.hue ?? 0.5) % 1.0 + 1.0) % 1.0;
    const satVal = Math.max(0.0, Math.min(1.0, state?.sat ?? 1.0));
    const brightVal = Math.max(0.0, Math.min(1.0, state?.bright ?? 0.0));

    // Full pad surface backlight color calculation
    let bgFill = '#000000';
    let lightPct = 0;

    if (brightVal > 0.001) {
        const hueDeg = Math.round(hueVal * 360);
        const satPct = Math.round(satVal * 100);
        // Lightness: when sat=0 (monotone), ranges from 0% (black) to 100% (pure white).
        // When sat=1 (pure chromatic), ranges from 0% (black) to 50% (maximum color saturation).
        const maxLight = 50 + (1.0 - satVal) * 50;
        lightPct = brightVal * maxLight;
        bgFill = `hsl(${hueDeg}, ${satPct}%, ${lightPct.toFixed(1)}%)`;
    }

    // 1. Draw full-panel surface backlight
    ctx2d.fillStyle = bgFill;
    ctx2d.fillRect(0, 0, w, h);

    // Subtle edge vignette / chassis depth
    if (isModal) {
        const borderGrad = ctx2d.createLinearGradient(0, 0, 0, h);
        borderGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
        borderGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx2d.fillStyle = borderGrad;
        ctx2d.fillRect(0, 0, w, h);
    }

    // 2. High-contrast grid crosshairs adaptive to background brightness (standardized graticule)
    const isBrightBg = lightPct > 45;
    const gridLineColor = isBrightBg ? 'rgba(0, 0, 0, 0.25)' : (isModal ? '#1e293b' : 'rgba(255, 255, 255, 0.15)');
    const axisLineColor = isBrightBg ? 'rgba(0, 0, 0, 0.5)' : (isModal ? '#475569' : 'rgba(255, 255, 255, 0.35)');

    const showAxisX = polX !== 'uni';
    const showAxisY = polY !== 'uni';

    UIHelpers.drawGraticule(ctx2d, w, h, {
        isModal,
        cols: 4,
        rows: 4,
        gridColor: gridLineColor,
        axisColor: axisLineColor,
        axisWidth: isModal ? 1.2 : 0.8,
        gridWidth: isModal ? 1.0 : 0.6,
        showAxisX,
        showAxisY
    });

    // 3. Touch Value Indicator Lines (CVX: Vertical line, CVY: Horizontal line, Both: Crossline)
    // Only rendered when respective CV output port is connected. Dot and circle are removed per specification.
    if (hasX || hasY) {
        const xNorm = state?.x ?? 0.5;
        const yNorm = state?.y ?? 0.5;
        const px = Math.max(0, Math.min(w, xNorm * w));
        const py = Math.max(0, Math.min(h, (1.0 - yNorm) * h));

        const isDown = Boolean(state?.isDown);
        const lineColor = isDown
            ? (isBrightBg ? '#000000' : '#ffffff')
            : (isBrightBg ? 'rgba(0, 0, 0, 0.55)' : 'rgba(255, 255, 255, 0.55)');
        const lineWidth = isModal ? (isDown ? 1.8 : 1.2) : (isDown ? 1.2 : 0.8);
        const shadowColor = isBrightBg ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.7)';
        const shadowWidth = lineWidth + (isModal ? 1.6 : 1.0);

        if (hasX) {
            // Shadow / contrast line for vertical X position
            ctx2d.save();
            ctx2d.strokeStyle = shadowColor;
            ctx2d.lineWidth = shadowWidth;
            ctx2d.beginPath();
            ctx2d.moveTo(px, 0);
            ctx2d.lineTo(px, h);
            ctx2d.stroke();

            // Main vertical line
            ctx2d.strokeStyle = lineColor;
            ctx2d.lineWidth = lineWidth;
            ctx2d.beginPath();
            ctx2d.moveTo(px, 0);
            ctx2d.lineTo(px, h);
            ctx2d.stroke();
            ctx2d.restore();
        }

        if (hasY) {
            // Shadow / contrast line for horizontal Y position
            ctx2d.save();
            ctx2d.strokeStyle = shadowColor;
            ctx2d.lineWidth = shadowWidth;
            ctx2d.beginPath();
            ctx2d.moveTo(0, py);
            ctx2d.lineTo(w, py);
            ctx2d.stroke();

            // Main horizontal line
            ctx2d.strokeStyle = lineColor;
            ctx2d.lineWidth = lineWidth;
            ctx2d.beginPath();
            ctx2d.moveTo(0, py);
            ctx2d.lineTo(w, py);
            ctx2d.stroke();
            ctx2d.restore();
        }
    }
}

export const PAD = {
    color: 'amber',
    defaults: () => ({ type: 'PAD', name: 'PAD', polX: 'bi', polY: 'bi', hue: 0.5, sat: 1.0, bright: 0.0, opacity: 0.8 }),
    ports: () => ({
        in: [
            { port: 'hue_cv', pin: 4, color: 'bg-yellow-400', extraClass: 'pad-chassis-port' },
            { port: 'bright_cv', pin: 5, color: 'bg-yellow-400', extraClass: 'pad-chassis-port' }
        ],
        out: [
            { port: 'gate_out', pin: 9, color: 'bg-red-500', extraClass: 'pad-chassis-port' },
            { port: 'x_cv', pin: 10, color: 'bg-yellow-400', extraClass: 'pad-chassis-port' },
            { port: 'y_cv', pin: 11, color: 'bg-yellow-400', extraClass: 'pad-chassis-port' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => `
        <div class="absolute inset-0.5 bg-black rounded-sm border border-slate-800/90 overflow-hidden z-0 pointer-events-auto pad-grid-container" style="opacity: ${m?.opacity ?? 0.8};">
            <canvas class="pad-grid-canvas w-full h-full block" width="100" height="100"></canvas>
        </div>`,
    renderModal: (m) => {
        const polX = m.polX || 'bi';
        const polY = m.polY || 'bi';
        const initValX = polX === 'uni' ? 1.0 : 0.0;
        const initValY = polY === 'uni' ? 1.0 : 0.0;
        const dispInitX = (polX === 'bi' && initValX >= 0 ? '+' : '') + initValX.toFixed(2);
        const dispInitY = (polY === 'bi' && initValY >= 0 ? '+' : '') + initValY.toFixed(2);

        return `
        <div class="space-y-2 p-1">
            <div class="grid grid-cols-3 gap-2 pb-2 border-b border-slate-800 items-start">
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-[8.5px] font-bold h-4">
                        <span class="text-slate-400 uppercase tracking-wider">SAT</span>
                        <span id="pad-sat-slider-disp" class="font-mono text-cyan-300 font-bold cursor-ew-resize select-none">${(m.sat ?? 1.0).toFixed(2)}</span>
                    </div>
                    <input type="range" id="pad-sat-slider" min="0" max="1" step="0.01" value="${m.sat ?? 1.0}" class="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer">
                </div>
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-[8.5px] font-bold h-4">
                        <span class="text-slate-400 uppercase tracking-wider">HUE</span>
                        <span id="pad-hue-slider-disp" class="font-mono text-cyan-300 font-bold cursor-ew-resize select-none">${(m.hue ?? 0.5).toFixed(2)}</span>
                    </div>
                    <input type="range" id="pad-hue-slider" min="0" max="1" step="0.01" value="${m.hue ?? 0.5}" class="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer">
                </div>
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-[8.5px] font-bold h-4">
                        <span class="text-slate-400 uppercase tracking-wider">BRIGHT</span>
                        <span id="pad-bright-slider-disp" class="font-mono text-cyan-300 font-bold cursor-ew-resize select-none">${(m.bright ?? 0.0).toFixed(2)}</span>
                    </div>
                    <input type="range" id="pad-bright-slider" min="0" max="1" step="0.01" value="${m.bright ?? 0.0}" class="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer">
                </div>
            </div>

            <!-- Axis Polarity Selectors -->
            <div class="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800">
                <div class="flex items-center justify-between bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
                    <span class="text-[8px] font-bold text-slate-400 pl-1">X-AXIS</span>
                    <div class="flex items-center gap-1">
                        <button class="pad-pol-x-btn px-2 py-0.5 rounded text-[8px] font-bold border transition-colors ${polX === 'bi' ? 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/30' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="bi">BI (-1~1)</button>
                        <button class="pad-pol-x-btn px-2 py-0.5 rounded text-[8px] font-bold border transition-colors ${polX === 'uni' ? 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/30' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="uni">UNI (0~2)</button>
                    </div>
                </div>
                <div class="flex items-center justify-between bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80">
                    <span class="text-[8px] font-bold text-slate-400 pl-1">Y-AXIS</span>
                    <div class="flex items-center gap-1">
                        <button class="pad-pol-y-btn px-2 py-0.5 rounded text-[8px] font-bold border transition-colors ${polY === 'bi' ? 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/30' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="bi">BI (-1~1)</button>
                        <button class="pad-pol-y-btn px-2 py-0.5 rounded text-[8px] font-bold border transition-colors ${polY === 'uni' ? 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/30' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="uni">UNI (0~2)</button>
                    </div>
                </div>
            </div>

            <div class="relative w-full aspect-square bg-black rounded-lg border border-slate-700/80 overflow-hidden shadow-inner select-none touch-none overscroll-contain mx-auto" id="pad-modal-touch-area" style="opacity: ${m.opacity ?? 0.8};">
                <canvas id="pad-modal-canvas" class="w-full h-full block cursor-crosshair" width="400" height="400"></canvas>
                <div class="absolute top-2 left-2 flex items-center gap-2.5 font-mono text-[9px] select-none pointer-events-none drop-shadow">
                    <span class="text-slate-400 text-[8px] font-sans font-bold">X</span><span id="pad-stat-x" class="text-cyan-300 font-bold">${dispInitX}</span>
                    <span class="text-slate-400 text-[8px] font-sans font-bold">Y</span><span id="pad-stat-y" class="text-cyan-300 font-bold">${dispInitY}</span>
                </div>
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        // Axis Polarity Selectors
        UIHelpers.bindButtonGroup('.pad-pol-x-btn', 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/30', 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800', val => {
            m.polX = val;
            ctx.reRenderModal();
            onChange();
        });
        UIHelpers.bindButtonGroup('.pad-pol-y-btn', 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/30', 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800', val => {
            m.polY = val;
            ctx.reRenderModal();
            onChange();
        });

        // HUE Slider
        UIHelpers.bindSlider('pad-hue-slider', v => v.toFixed(2), v => {
            m.hue = v;
            onChange();
        }, 1, 0.0, 1.0);

        // SATURATION Slider (0.0: Monotone / 1.0: Full Color)
        UIHelpers.bindSlider('pad-sat-slider', v => v.toFixed(2), v => {
            m.sat = v;
            onChange();
        }, 1, 0.0, 1.0);

        // BRIGHTNESS Slider (0.0: Black / 1.0: Full Bright)
        UIHelpers.bindSlider('pad-bright-slider', v => v.toFixed(2), v => {
            m.bright = v;
            onChange();
        }, 1, 0.0, 1.0);

        // Touch Pad interactions in Modal
        const touchArea = document.getElementById('pad-modal-touch-area');
        if (!touchArea) return;

        let activePointerId = null;

        const sendPad = (type, e) => {
            const rect = touchArea.getBoundingClientRect();
            const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            // Generous edge tolerance so right edge reaches 1.0 and bottom edge reaches 0.0 smoothly
            const edgePad = 8;
            const normX = Math.max(0, Math.min(1, (clientX - (rect.left + edgePad)) / Math.max(1, rect.width - edgePad * 2)));
            // Y is 0.0 at bottom, 1.0 at top
            const normY = Math.max(0, Math.min(1, 1.0 - (clientY - (rect.top + edgePad)) / Math.max(1, rect.height - edgePad * 2)));

            ctx?.sendControl?.({
                type,
                x: normX,
                y: normY
            });
        };

        touchArea.onpointerdown = (e) => {
            activePointerId = e.pointerId;
            try { touchArea.setPointerCapture(e.pointerId); } catch (err) {}
            sendPad('PAD_DOWN', e);
            e.stopPropagation();
        };

        touchArea.onpointermove = (e) => {
            if (activePointerId === null || e.pointerId !== activePointerId) return;
            sendPad('PAD_MOVE', e);
            e.stopPropagation();
        };

        const handlePointerEnd = (e) => {
            if (activePointerId !== null && e.pointerId === activePointerId) {
                sendPad('PAD_UP', e);
                activePointerId = null;
                try { touchArea.releasePointerCapture(e.pointerId); } catch (err) {}
                e.stopPropagation();
            }
        };

        touchArea.onpointerup = handlePointerEnd;
        touchArea.onpointercancel = handlePointerEnd;
    },
    // Bind cell-level pad touch events directly on the grid
    bindGridEvents: (cell, m, ui) => {
        const padBox = cell.querySelector('.pad-grid-container');
        if (!padBox || padBox._padBound) return;
        padBox._padBound = true;

        let activePointerId = null;

        const sendGridPad = (type, e) => {
            const rect = padBox.getBoundingClientRect();
            const clientX = e.clientX;
            const clientY = e.clientY;
            // Pad tolerance: ensures 0.0 and 1.0 are fully reached on all edges
            const edgePadX = 6;
            const edgePadY = 6;
            const normX = Math.max(0, Math.min(1, (clientX - (rect.left + edgePadX)) / Math.max(1, rect.width - edgePadX * 2)));
            const normY = Math.max(0, Math.min(1, 1.0 - (clientY - (rect.top + edgePadY)) / Math.max(1, rect.height - edgePadY * 2)));

            ui?.synth?.sendControlEvent(m.id, {
                type,
                x: normX,
                y: normY
            });
        };

        padBox.addEventListener('pointerdown', (e) => {
            // If user clicked a pin port or header, do not capture
            if (e.target.closest('.port') || e.target.closest('.module-header')) return;
            activePointerId = e.pointerId;
            try { padBox.setPointerCapture(e.pointerId); } catch (err) {}
            sendGridPad('PAD_DOWN', e);
            e.stopPropagation();
            e.preventDefault();
        });

        padBox.addEventListener('pointermove', (e) => {
            if (activePointerId === null || e.pointerId !== activePointerId) return;
            sendGridPad('PAD_MOVE', e);
            e.stopPropagation();
        });

        const handleEnd = (e) => {
            if (activePointerId !== null && e.pointerId === activePointerId) {
                sendGridPad('PAD_UP', e);
                activePointerId = null;
                try { padBox.releasePointerCapture(e.pointerId); } catch (err) {}
                e.stopPropagation();
            }
        };

        padBox.addEventListener('pointerup', handleEnd);
        padBox.addEventListener('pointercancel', handleEnd);
    },
    updateLive: (cell, data, isPlaying, targetModal, m, patchState = null) => {
        if (!m) return;
        const state = data || { x: 0.5, y: 0.5, isDown: false, hue: m.hue ?? 0.5, sat: m.sat ?? 1.0, bright: m.bright ?? 0.0 };
        // Ensure module-level settings are preserved if not overridden by data
        if (state.sat === undefined) state.sat = m.sat ?? 1.0;
        if (state.hue === undefined) state.hue = m.hue ?? 0.5;
        if (state.bright === undefined) state.bright = m.bright ?? 0.0;

        const polX = m.polX || 'bi';
        const polY = m.polY || 'bi';

        const isDown = Boolean(state.isDown);
        const x = state.x ?? 0.5;
        const y = state.y ?? 0.5;
        const hue = state.hue;
        const sat = state.sat;
        const bright = state.bright;

        const patched = patchState || (typeof window !== 'undefined' && window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(m.id) : null);
        const hasX = Boolean(patched && (patched.has('x_cv') || patched.has('cv_x') || patched.has('PIN10') || patched.has('PIN10_out')));
        const hasY = Boolean(patched && (patched.has('y_cv') || patched.has('cv_y') || patched.has('PIN11') || patched.has('PIN11_out')));

        // 1. Render on Cell Canvas with Dirty caching (skips rendering when unchanged)
        const cvs = cell.querySelector('.pad-grid-canvas');
        if (cvs) {
            const last = cvs._lastRenderState;
            const isDirty = !last ||
                last.isDown !== isDown ||
                last.x !== x ||
                last.y !== y ||
                last.hue !== hue ||
                last.sat !== sat ||
                last.bright !== bright ||
                last.hasX !== hasX ||
                last.hasY !== hasY ||
                last.polX !== polX ||
                last.polY !== polY;

            if (isDirty) {
                const ctx = cvs.getContext('2d');
                drawPadCanvas(ctx, cvs.width, cvs.height, state, false, hasX, hasY, polX, polY);
                cvs._lastRenderState = { isDown, x, y, hue, sat, bright, hasX, hasY, polX, polY };
            }
        }

        // 2. Render on Modal Canvas & Stats if open with Dirty caching
        const modalCvs = targetModal?.querySelector('#pad-modal-canvas');
        if (modalCvs) {
            const mLast = modalCvs._lastRenderState;
            const isMDirty = !mLast ||
                mLast.isDown !== isDown ||
                mLast.x !== x ||
                mLast.y !== y ||
                mLast.hue !== hue ||
                mLast.sat !== sat ||
                mLast.bright !== bright ||
                mLast.hasX !== hasX ||
                mLast.hasY !== hasY ||
                mLast.polX !== polX ||
                mLast.polY !== polY;

            if (isMDirty) {
                const mCtx = modalCvs.getContext('2d');
                drawPadCanvas(mCtx, modalCvs.width, modalCvs.height, state, true, hasX, hasY, polX, polY);
                modalCvs._lastRenderState = { isDown, x, y, hue, sat, bright, hasX, hasY, polX, polY };

                // Update stats (X, Y)
                const xEl = targetModal.querySelector('#pad-stat-x');
                const yEl = targetModal.querySelector('#pad-stat-y');

                const valX = data?.valX ?? (polX === 'uni' ? (x * 2.0) : ((x * 2.0) - 1.0));
                const valY = data?.valY ?? (polY === 'uni' ? (y * 2.0) : ((y * 2.0) - 1.0));

                if (xEl) xEl.textContent = (polX === 'bi' && valX >= 0 ? '+' : '') + valX.toFixed(2);
                if (yEl) yEl.textContent = (polY === 'bi' && valY >= 0 ? '+' : '') + valY.toFixed(2);
            }
        }
    }
};

export const padDefs = {
    PAD
};
