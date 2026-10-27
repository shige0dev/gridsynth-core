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
    const zeroLineColor = isBrightBg ? 'rgba(0, 0, 0, 0.65)' : (isModal ? '#64748b' : 'rgba(255, 255, 255, 0.45)');
    const zeroLineWidth = isModal ? 1.5 : 1.0;

    // Subgrid lines (4x4 divisions)
    UIHelpers.drawGraticule(ctx2d, w, h, {
        isModal,
        cols: 4,
        rows: 4,
        gridColor: gridLineColor,
        showSubgrid: true,
        showAxisX: false,
        showAxisY: false
    });

    // Zero reference lines (0V position: Center for BI, Left / Bottom edge for UNI)
    ctx2d.save();
    ctx2d.strokeStyle = zeroLineColor;
    ctx2d.lineWidth = zeroLineWidth;
    ctx2d.beginPath();

    // X Zero Line (vertical line at 0V)
    const zeroX = polX === 'uni' ? (zeroLineWidth / 2) : (w / 2);
    ctx2d.moveTo(zeroX, 0);
    ctx2d.lineTo(zeroX, h);

    // Y Zero Line (horizontal line at 0V)
    const zeroY = polY === 'uni' ? (h - zeroLineWidth / 2) : (h / 2);
    ctx2d.moveTo(0, zeroY);
    ctx2d.lineTo(w, zeroY);

    ctx2d.stroke();
    ctx2d.restore();

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
            { port: 'hue_cv', pin: 5, color: 'bg-yellow-400', extraClass: 'pad-chassis-port' },
            { port: 'bright_cv', pin: 6, color: 'bg-yellow-400', extraClass: 'pad-chassis-port' }
        ],
        out: [
            { port: 'x_cv', pin: 8, color: 'bg-yellow-400', extraClass: 'pad-chassis-port' },
            { port: 'y_cv', pin: 9, color: 'bg-yellow-400', extraClass: 'pad-chassis-port' },
            { port: 'gate_out', pin: 10, color: 'bg-red-500', extraClass: 'pad-chassis-port' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => `
        <div class="absolute inset-0.5 bg-black rounded-sm border border-slate-800/90 overflow-hidden z-0 pointer-events-auto touch-none select-none pad-grid-container" style="opacity: ${m?.opacity ?? 0.8}; touch-action: none;">
            <canvas class="pad-grid-canvas w-full h-full block touch-none select-none" style="touch-action: none;" width="100" height="100"></canvas>
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

            <div class="relative w-[calc(100%-48px)] max-w-[320px] aspect-square mx-auto mb-7 select-none">
                <!-- Inner Touch Area (Canvas) - Centered in dialog -->
                <div class="relative w-full h-full bg-black rounded-none border border-slate-700/80 overflow-hidden shadow-inner select-none touch-none overscroll-contain" id="pad-modal-touch-area" style="opacity: ${m.opacity ?? 0.8};">
                    <canvas id="pad-modal-canvas" class="w-full h-full block cursor-crosshair" width="400" height="400"></canvas>
                    <div class="absolute top-2 left-2 flex items-center gap-2.5 font-mono text-[9px] select-none pointer-events-none drop-shadow">
                        <span class="text-slate-400 text-[8px] font-sans font-bold">X</span><span id="pad-stat-x" class="text-cyan-300 font-bold">${dispInitX}</span>
                        <span class="text-slate-400 text-[8px] font-sans font-bold">Y</span><span id="pad-stat-y" class="text-cyan-300 font-bold">${dispInitY}</span>
                    </div>
                </div>

                <!-- Y-Axis Polarity Option Buttons (Left of Canvas, pointing Right ▶) -->
                <!-- Center (BI: 0V at Center Line) -->
                <button class="pad-pol-toggle-y absolute -left-6 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[10px] leading-none transition-all cursor-pointer select-none rounded hover:bg-slate-800/60 ${polY === 'bi' ? 'text-amber-400 font-bold drop-shadow-[0_0_6px_rgba(245,158,11,0.8)] scale-110' : 'text-slate-600 hover:text-slate-300'}" data-val="bi" title="Y軸 0点: 中央 (BI -1~1V)">▶</button>
                <!-- Bottom (UNI: 0V at Bottom Edge) -->
                <button class="pad-pol-toggle-y absolute -left-6 bottom-0 translate-y-1/2 w-5 h-5 flex items-center justify-center text-[10px] leading-none transition-all cursor-pointer select-none rounded hover:bg-slate-800/60 ${polY === 'uni' ? 'text-amber-400 font-bold drop-shadow-[0_0_6px_rgba(245,158,11,0.8)] scale-110' : 'text-slate-600 hover:text-slate-300'}" data-val="uni" title="Y軸 0点: 下端 (UNI 0~2V)">▶</button>

                <!-- X-Axis Polarity Option Buttons (Below Canvas, pointing Up ▲) -->
                <!-- Left (UNI: 0V at Left Edge) -->
                <button class="pad-pol-toggle-x absolute left-0 -translate-x-1/2 -bottom-6 w-5 h-5 flex items-center justify-center text-[10px] leading-none transition-all cursor-pointer select-none rounded hover:bg-slate-800/60 ${polX === 'uni' ? 'text-amber-400 font-bold drop-shadow-[0_0_6px_rgba(245,158,11,0.8)] scale-110' : 'text-slate-600 hover:text-slate-300'}" data-val="uni" title="X軸 0点: 左端 (UNI 0~2V)">▲</button>
                <!-- Center (BI: 0V at Center Line) -->
                <button class="pad-pol-toggle-x absolute left-1/2 -translate-x-1/2 -bottom-6 w-5 h-5 flex items-center justify-center text-[10px] leading-none transition-all cursor-pointer select-none rounded hover:bg-slate-800/60 ${polX === 'bi' ? 'text-amber-400 font-bold drop-shadow-[0_0_6px_rgba(245,158,11,0.8)] scale-110' : 'text-slate-600 hover:text-slate-300'}" data-val="bi" title="X軸 0点: 中央 (BI -1~1V)">▲</button>
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        // Axis Polarity Option Buttons (X: ▲, Y: ▶)
        document.querySelectorAll('.pad-pol-toggle-x').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetVal = btn.dataset.val;
                if (targetVal && m.polX !== targetVal) {
                    m.polX = targetVal;
                    ctx.reRenderModal();
                    onChange();
                }
            });
        });

        document.querySelectorAll('.pad-pol-toggle-y').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetVal = btn.dataset.val;
                if (targetVal && m.polY !== targetVal) {
                    m.polY = targetVal;
                    ctx.reRenderModal();
                    onChange();
                }
            });
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
        let activeTouchId = null;
        let lastTouchEndTime = 0;

        const calcModalNormCoords = (clientX, clientY) => {
            const rect = touchArea.getBoundingClientRect();
            const edgePad = 8;
            const normX = Math.max(0, Math.min(1, (clientX - (rect.left + edgePad)) / Math.max(1, rect.width - edgePad * 2)));
            const normY = Math.max(0, Math.min(1, 1.0 - (clientY - (rect.top + edgePad)) / Math.max(1, rect.height - edgePad * 2)));
            return { normX, normY };
        };

        const renderOptimisticModal = (normX, normY, isDown) => {
            const modalCvs = document.getElementById('pad-modal-canvas');
            if (!modalCvs) return;
            const patched = window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(m.id) : null;
            const hasX = Boolean(patched && (patched.has('x_cv') || patched.has('cv_x') || patched.has('PIN8') || patched.has('PIN8_out')));
            const hasY = Boolean(patched && (patched.has('y_cv') || patched.has('cv_y') || patched.has('PIN9') || patched.has('PIN9_out')));
            const polX = m.polX || 'bi';
            const polY = m.polY || 'bi';
            const state = {
                x: normX,
                y: normY,
                isDown,
                hue: m.hue ?? 0.5,
                sat: m.sat ?? 1.0,
                bright: m.bright ?? 0.0
            };
            const mCtx = modalCvs.getContext('2d');
            drawPadCanvas(mCtx, modalCvs.width, modalCvs.height, state, true, hasX, hasY, polX, polY);
            modalCvs._lastRenderState = { ...state, hasX, hasY, polX, polY };

            // Update stats (X, Y)
            const xEl = document.getElementById('pad-stat-x');
            const yEl = document.getElementById('pad-stat-y');
            const valX = polX === 'uni' ? (normX * 2.0) : ((normX * 2.0) - 1.0);
            const valY = polY === 'uni' ? (normY * 2.0) : ((normY * 2.0) - 1.0);
            if (xEl) xEl.textContent = (polX === 'bi' && valX >= 0 ? '+' : '') + valX.toFixed(2);
            if (yEl) yEl.textContent = (polY === 'bi' && valY >= 0 ? '+' : '') + valY.toFixed(2);
        };

        const sendPad = (type, clientX, clientY) => {
            const { normX, normY } = calcModalNormCoords(clientX, clientY);
            ctx?.sendControl?.({
                type,
                x: normX,
                y: normY
            });
            renderOptimisticModal(normX, normY, type !== 'PAD_UP');
        };

        // Hardware Touch Events for Modal (0ms touch latency on mobile)
        touchArea.addEventListener('touchstart', (e) => {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            const touch = e.changedTouches[0];
            if (!touch) return;
            activeTouchId = touch.identifier;
            sendPad('PAD_DOWN', touch.clientX, touch.clientY);
        }, { passive: false });

        touchArea.addEventListener('touchmove', (e) => {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            if (activeTouchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === activeTouchId) {
                    sendPad('PAD_MOVE', t.clientX, t.clientY);
                    break;
                }
            }
        }, { passive: false });

        const handleModalTouchEnd = (e) => {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            if (activeTouchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === activeTouchId) {
                    sendPad('PAD_UP', t.clientX, t.clientY);
                    activeTouchId = null;
                    lastTouchEndTime = Date.now();
                    break;
                }
            }
        };

        touchArea.addEventListener('touchend', handleModalTouchEnd, { passive: false });
        touchArea.addEventListener('touchcancel', handleModalTouchEnd, { passive: false });

        // Desktop Pointer Events for Modal
        touchArea.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch' || (Date.now() - lastTouchEndTime < 400)) return;
            activePointerId = e.pointerId;
            try { touchArea.setPointerCapture(e.pointerId); } catch (err) {}
            sendPad('PAD_DOWN', e.clientX, e.clientY);
            e.stopPropagation();
        });

        touchArea.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'touch') return;
            if (activePointerId === null || e.pointerId !== activePointerId) return;
            sendPad('PAD_MOVE', e.clientX, e.clientY);
            e.stopPropagation();
        });

        const handleModalPointerEnd = (e) => {
            if (e.pointerType === 'touch') return;
            if (activePointerId !== null && e.pointerId === activePointerId) {
                sendPad('PAD_UP', e.clientX, e.clientY);
                activePointerId = null;
                try { touchArea.releasePointerCapture(e.pointerId); } catch (err) {}
                e.stopPropagation();
            }
        };

        touchArea.addEventListener('pointerup', handleModalPointerEnd);
        touchArea.addEventListener('pointercancel', handleModalPointerEnd);
    },
    // Bind cell-level pad touch events directly on the grid
    bindGridEvents: (cell, m, ui) => {
        const padBox = cell.querySelector('.pad-grid-container');
        if (!padBox || padBox._padBound) return;
        padBox._padBound = true;

        let activeTouchId = null;
        let activePointerId = null;
        let lastTouchEndTime = 0;

        const calcGridNormCoords = (clientX, clientY) => {
            const rect = padBox.getBoundingClientRect();
            // Pad tolerance: ensures 0.0 and 1.0 are fully reached on all edges
            const edgePadX = 6;
            const edgePadY = 6;
            const normX = Math.max(0, Math.min(1, (clientX - (rect.left + edgePadX)) / Math.max(1, rect.width - edgePadX * 2)));
            const normY = Math.max(0, Math.min(1, 1.0 - (clientY - (rect.top + edgePadY)) / Math.max(1, rect.height - edgePadY * 2)));
            return { normX, normY };
        };

        const renderOptimisticGrid = (normX, normY, isDown) => {
            const cvs = padBox.querySelector('.pad-grid-canvas');
            if (!cvs) return;
            const patched = window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(m.id) : null;
            const hasX = Boolean(patched && (patched.has('x_cv') || patched.has('cv_x') || patched.has('PIN8') || patched.has('PIN8_out')));
            const hasY = Boolean(patched && (patched.has('y_cv') || patched.has('cv_y') || patched.has('PIN9') || patched.has('PIN9_out')));
            const polX = m.polX || 'bi';
            const polY = m.polY || 'bi';
            const state = {
                x: normX,
                y: normY,
                isDown,
                hue: m.hue ?? 0.5,
                sat: m.sat ?? 1.0,
                bright: m.bright ?? 0.0
            };
            const ctx = cvs.getContext('2d');
            drawPadCanvas(ctx, cvs.width, cvs.height, state, false, hasX, hasY, polX, polY);
            cvs._lastRenderState = { ...state, hasX, hasY, polX, polY };
        };

        const sendGridPad = (type, clientX, clientY) => {
            const { normX, normY } = calcGridNormCoords(clientX, clientY);
            ui?.synth?.sendControlEvent(m.id, {
                type,
                x: normX,
                y: normY
            });
            renderOptimisticGrid(normX, normY, type !== 'PAD_UP');
        };

        // 1. Direct hardware-level Touch Events with passive: false for 0ms mobile latency
        padBox.addEventListener('touchstart', (e) => {
            // If user clicked a pin port, do not capture
            if (e.target.closest('.port')) return;
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();

            const touch = e.changedTouches[0];
            if (!touch) return;
            activeTouchId = touch.identifier;
            sendGridPad('PAD_DOWN', touch.clientX, touch.clientY);
        }, { passive: false });

        padBox.addEventListener('touchmove', (e) => {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();

            if (activeTouchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === activeTouchId) {
                    sendGridPad('PAD_MOVE', t.clientX, t.clientY);
                    break;
                }
            }
        }, { passive: false });

        const handleGridTouchEnd = (e) => {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();

            if (activeTouchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (t.identifier === activeTouchId) {
                    sendGridPad('PAD_UP', t.clientX, t.clientY);
                    activeTouchId = null;
                    lastTouchEndTime = Date.now();
                    break;
                }
            }
        };

        padBox.addEventListener('touchend', handleGridTouchEnd, { passive: false });
        padBox.addEventListener('touchcancel', handleGridTouchEnd, { passive: false });

        // 2. Desktop Mouse / Pointer Events fallback (Touch pointers bypassed to prevent double triggers)
        padBox.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.port')) return;
            if (e.pointerType === 'touch' || (Date.now() - lastTouchEndTime < 400)) return;
            activePointerId = e.pointerId;
            try { padBox.setPointerCapture(e.pointerId); } catch (err) {}
            sendGridPad('PAD_DOWN', e.clientX, e.clientY);
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();
        });

        padBox.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'touch') return;
            if (activePointerId === null || e.pointerId !== activePointerId) return;
            sendGridPad('PAD_MOVE', e.clientX, e.clientY);
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();
        });

        const handleGridPointerEnd = (e) => {
            if (e.pointerType === 'touch') return;
            if (activePointerId !== null && e.pointerId === activePointerId) {
                sendGridPad('PAD_UP', e.clientX, e.clientY);
                activePointerId = null;
                try { padBox.releasePointerCapture(e.pointerId); } catch (err) {}
                e.stopPropagation();
                if (e.cancelable) e.preventDefault();
            }
        };

        padBox.addEventListener('pointerup', handleGridPointerEnd);
        padBox.addEventListener('pointercancel', handleGridPointerEnd);
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
        const hasX = Boolean(patched && (patched.has('x_cv') || patched.has('cv_x') || patched.has('PIN8') || patched.has('PIN8_out')));
        const hasY = Boolean(patched && (patched.has('y_cv') || patched.has('cv_y') || patched.has('PIN9') || patched.has('PIN9_out')));

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
