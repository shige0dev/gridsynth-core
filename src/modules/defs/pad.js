// src/modules/defs/pad.js
import { UIHelpers } from '../../ui/helpers.js?v=297';

function calcPressure(e) {
    if (e.pointerType === 'mouse') {
        return e.buttons ? 0.8 : 0.0;
    }
    let area = 0;
    if (typeof e.width === 'number' && typeof e.height === 'number' && (e.width > 1 || e.height > 1)) {
        area = e.width * e.height;
    } else if (typeof e.radiusX === 'number' && typeof e.radiusY === 'number') {
        area = e.radiusX * e.radiusY * 4;
    }
    if (area > 0) {
        // Normal contact area for fingertip: ~100 to ~1600 px^2
        const minA = 120;
        const maxA = 1500;
        const norm = Math.max(0, Math.min(1, (area - minA) / (maxA - minA)));
        return Math.max(0.1, Math.min(1.0, 0.15 + 0.85 * norm));
    }
    if (typeof e.pressure === 'number' && e.pressure > 0) {
        return e.pressure;
    }
    return 0.6;
}

function drawPadCanvas(ctx2d, w, h, state, isModal = false) {
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

    // 2. High-contrast grid crosshairs adaptive to background brightness
    const isBrightBg = lightPct > 45;
    const gridLineColor = isBrightBg ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.15)';
    const axisLineColor = isBrightBg ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.35)';

    ctx2d.lineWidth = isModal ? 1.0 : 0.6;
    ctx2d.strokeStyle = gridLineColor;

    if (isModal) {
        ctx2d.beginPath();
        for (let i = 1; i < 4; i++) {
            const x = (w / 4) * i;
            ctx2d.moveTo(x, 0); ctx2d.lineTo(x, h);
            const y = (h / 4) * i;
            ctx2d.moveTo(0, y); ctx2d.lineTo(w, y);
        }
        ctx2d.stroke();
    }

    // Center axes
    ctx2d.lineWidth = isModal ? 1.2 : 0.8;
    ctx2d.strokeStyle = axisLineColor;
    ctx2d.beginPath();
    ctx2d.moveTo(0, h / 2); ctx2d.lineTo(w, h / 2);
    ctx2d.moveTo(w / 2, 0); ctx2d.lineTo(w / 2, h);
    ctx2d.stroke();

    // 3. Touch Point Marker (X, Y)
    const xNorm = state?.x ?? 0.5;
    const yNorm = state?.y ?? 0.5;
    const px = Math.max(0, Math.min(w, xNorm * w));
    const py = Math.max(0, Math.min(h, (1.0 - yNorm) * h));

    const isDown = Boolean(state?.isDown);
    const pressure = state?.pressure ?? (isDown ? 0.6 : 0.0);

    // High contrast dual-ring marker
    const baseR = isModal ? (isDown ? 14 + pressure * 26 : 8) : (isDown ? 7 + pressure * 14 : 4);

    if (isDown) {
        // Outer touch pressure shadow
        ctx2d.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx2d.lineWidth = isModal ? 3.5 : 2.5;
        ctx2d.beginPath();
        ctx2d.arc(px, py, baseR, 0, Math.PI * 2);
        ctx2d.stroke();

        // Inner crisp white ring
        ctx2d.strokeStyle = '#ffffff';
        ctx2d.lineWidth = isModal ? 2.0 : 1.4;
        ctx2d.beginPath();
        ctx2d.arc(px, py, baseR, 0, Math.PI * 2);
        ctx2d.stroke();

        // Center solid core
        ctx2d.fillStyle = '#ffffff';
        ctx2d.beginPath();
        ctx2d.arc(px, py, isModal ? 3.5 : 2.0, 0, Math.PI * 2);
        ctx2d.fill();

        // Extra outer pulse ring for active touch
        ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx2d.lineWidth = 1.0;
        ctx2d.beginPath();
        ctx2d.arc(px, py, baseR * 1.35, 0, Math.PI * 2);
        ctx2d.stroke();
    } else {
        // Latched last touched position marker (subtle cursor)
        ctx2d.strokeStyle = isBrightBg ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)';
        ctx2d.lineWidth = 1.2;
        ctx2d.beginPath();
        ctx2d.arc(px, py, baseR, 0, Math.PI * 2);
        ctx2d.stroke();

        // Center dot
        ctx2d.fillStyle = isBrightBg ? '#000000' : '#ffffff';
        ctx2d.beginPath();
        ctx2d.arc(px, py, isModal ? 2.0 : 1.2, 0, Math.PI * 2);
        ctx2d.fill();
    }
}

export const PAD = {
    color: 'amber',
    defaults: () => ({ type: 'PAD', hue: 0.5, sat: 1.0, bright: 0.0 }),
    ports: () => ({
        in: [
            { port: 'hue_cv', pin: 2, color: 'bg-yellow-400' },
            { port: 'bright_cv', pin: 3, color: 'bg-yellow-400' }
        ],
        out: [
            { port: 'trig_out', pin: 8, color: 'bg-red-500' },
            { port: 'gate_out', pin: 9, color: 'bg-red-500' },
            { port: 'x_cv', pin: 10, color: 'bg-yellow-400' },
            { port: 'y_cv', pin: 11, color: 'bg-yellow-400' },
            { port: 'pressure_cv', pin: 12, color: 'bg-yellow-400' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: () => `
        <div class="absolute inset-0.5 bg-black rounded-sm border border-slate-800/90 overflow-hidden z-0 pointer-events-auto pad-grid-container">
            <canvas class="pad-grid-canvas w-full h-full block" width="100" height="100"></canvas>
        </div>`,
    renderModal: (m) => `
        <div class="space-y-3 p-1">
            <div class="grid grid-cols-3 gap-2 pb-2 border-b border-slate-800 items-start">
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-[8.5px] font-bold h-4">
                        <span class="text-slate-400 uppercase tracking-wider">SAT</span>
                        <span id="pad-sat-disp" class="font-mono text-cyan-300 font-bold cursor-ew-resize select-none">${(m.sat ?? 1.0).toFixed(2)}</span>
                    </div>
                    <input type="range" id="pad-sat-slider" min="0" max="1" step="0.01" value="${m.sat ?? 1.0}" class="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer">
                </div>
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-[8.5px] font-bold h-4">
                        <span class="text-slate-400 uppercase tracking-wider">HUE</span>
                        <span id="pad-hue-disp" class="font-mono text-cyan-300 font-bold cursor-ew-resize select-none">${(m.hue ?? 0.5).toFixed(2)}</span>
                    </div>
                    <input type="range" id="pad-hue-slider" min="0" max="1" step="0.01" value="${m.hue ?? 0.5}" class="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer">
                </div>
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-[8.5px] font-bold h-4">
                        <span class="text-slate-400 uppercase tracking-wider">BRIGHT</span>
                        <span id="pad-bright-disp" class="font-mono text-cyan-300 font-bold cursor-ew-resize select-none">${(m.bright ?? 0.0).toFixed(2)}</span>
                    </div>
                    <input type="range" id="pad-bright-slider" min="0" max="1" step="0.01" value="${m.bright ?? 0.0}" class="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer">
                </div>
            </div>

            <div class="relative w-full aspect-square bg-black rounded-lg border border-slate-700/80 overflow-hidden shadow-inner select-none touch-none overscroll-contain mx-auto" id="pad-modal-touch-area">
                <canvas id="pad-modal-canvas" class="w-full h-full block cursor-crosshair" width="400" height="400"></canvas>
                <div class="absolute top-2 left-2 text-[10px] font-mono font-semibold text-slate-300 pointer-events-none select-none drop-shadow">
                    TOUCH &amp; DRAG PAD
                </div>
                <div class="absolute bottom-2 left-2 flex items-center gap-1.5 font-mono text-[9px] select-none pointer-events-none">
                    <div class="bg-black/60 backdrop-blur-xs border border-white/20 rounded px-2 py-0.5 flex items-center gap-1 shadow">
                        <span class="text-slate-400 text-[8px] font-sans font-bold">X</span>
                        <span id="pad-stat-x" class="text-cyan-300 font-bold">0.50</span>
                    </div>
                    <div class="bg-black/60 backdrop-blur-xs border border-white/20 rounded px-2 py-0.5 flex items-center gap-1 shadow">
                        <span class="text-slate-400 text-[8px] font-sans font-bold">Y</span>
                        <span id="pad-stat-y" class="text-cyan-300 font-bold">0.50</span>
                    </div>
                    <div class="bg-black/60 backdrop-blur-xs border border-white/20 rounded px-2 py-0.5 flex items-center gap-1 shadow">
                        <span class="text-slate-400 text-[8px] font-sans font-bold">PRES</span>
                        <span id="pad-stat-press" class="text-amber-400 font-bold">0.00</span>
                    </div>
                </div>
            </div>
        </div>`,Target:
    bindEvents: (m, ctx, onChange) => {
        // HUE Slider
        UIHelpers.bindSlider('pad-hue-slider', v => v.toFixed(2), v => {
            m.hue = v;
            onChange();
        }, 2, 0.0, 1.0);
        UIHelpers.bindScrubber('pad-hue-disp', 'pad-hue-slider', v => v.toFixed(2), v => {
            m.hue = v;
            onChange();
        }, 2, 0.0, 1.0);

        // SATURATION Slider (0.0: Monotone / 1.0: Full Color)
        UIHelpers.bindSlider('pad-sat-slider', v => v.toFixed(2), v => {
            m.sat = v;
            onChange();
        }, 2, 0.0, 1.0);
        UIHelpers.bindScrubber('pad-sat-disp', 'pad-sat-slider', v => v.toFixed(2), v => {
            m.sat = v;
            onChange();
        }, 2, 0.0, 1.0);

        // BRIGHTNESS Slider (0.0: Black / 1.0: Full Bright)
        UIHelpers.bindSlider('pad-bright-slider', v => v.toFixed(2), v => {
            m.bright = v;
            onChange();
        }, 2, 0.0, 1.0);
        UIHelpers.bindScrubber('pad-bright-disp', 'pad-bright-slider', v => v.toFixed(2), v => {
            m.bright = v;
            onChange();
        }, 2, 0.0, 1.0);

        // Touch Pad interactions in Modal
        const touchArea = document.getElementById('pad-modal-touch-area');
        if (!touchArea) return;

        let activePointerId = null;

        const sendPad = (type, e) => {
            const rect = touchArea.getBoundingClientRect();
            const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            // Y is 0.0 at bottom, 1.0 at top
            const normY = Math.max(0, Math.min(1, 1.0 - (clientY - rect.top) / rect.height));
            const press = type === 'PAD_UP' ? 0.0 : calcPressure(e);

            ctx?.sendControl?.({
                type,
                x: normX,
                y: normY,
                pressure: press
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
            const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            const normY = Math.max(0, Math.min(1, 1.0 - (clientY - rect.top) / rect.height));
            const press = type === 'PAD_UP' ? 0.0 : calcPressure(e);

            ui?.synth?.sendControlEvent(m.id, {
                type,
                x: normX,
                y: normY,
                pressure: press
            });
        };

        padBox.addEventListener('pointerdown', (e) => {
            // If user clicked a pin port or header, do not capture
            if (e.target.closest('.port-node') || e.target.closest('.module-header')) return;
            activePointerId = e.pointerId;
            try { padBox.setPointerCapture(e.pointerId); } catch (err) {}
            sendGridPad('PAD_DOWN', e);
            e.stopPropagation();
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
    updateLive: (cell, data, isPlaying, targetModal, m) => {
        if (!m) return;
        const state = data || { x: 0.5, y: 0.5, pressure: 0.0, isDown: false, hue: m.hue ?? 0.5, sat: m.sat ?? 1.0, bright: m.bright ?? 0.0 };
        // Ensure module-level settings are preserved if not overridden by data
        if (state.sat === undefined) state.sat = m.sat ?? 1.0;

        // 1. Render on Cell Canvas
        const cvs = cell.querySelector('.pad-grid-canvas');
        if (cvs) {
            const ctx = cvs.getContext('2d');
            drawPadCanvas(ctx, cvs.width, cvs.height, state, false);
        }

        // 2. Render on Modal Canvas & Stats if open
        const modalCvs = targetModal?.querySelector('#pad-modal-canvas');
        if (modalCvs) {
            const mCtx = modalCvs.getContext('2d');
            drawPadCanvas(mCtx, modalCvs.width, modalCvs.height, state, true);

            // Update stats (X, Y, PRES)
            const xEl = targetModal.querySelector('#pad-stat-x');
            const yEl = targetModal.querySelector('#pad-stat-y');
            const pressEl = targetModal.querySelector('#pad-stat-press');

            if (xEl) xEl.textContent = (state.x ?? 0.5).toFixed(2);
            if (yEl) yEl.textContent = (state.y ?? 0.5).toFixed(2);
            if (pressEl) pressEl.textContent = (state.pressure ?? 0.0).toFixed(2);
        }
    }
};

export const padDefs = {
    PAD
};
