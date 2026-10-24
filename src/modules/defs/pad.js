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

    // Background fill
    ctx2d.fillStyle = '#050811';
    ctx2d.fillRect(0, 0, w, h);

    // Grid crosshairs
    ctx2d.strokeStyle = isModal ? '#1e293b' : '#0f172a';
    ctx2d.lineWidth = isModal ? 1.0 : 0.6;

    // Sub-divisions
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

    // Main Center axes
    ctx2d.strokeStyle = isModal ? '#334155' : '#1e293b';
    ctx2d.lineWidth = isModal ? 1.2 : 0.8;
    ctx2d.beginPath();
    ctx2d.moveTo(0, h / 2); ctx2d.lineTo(w, h / 2);
    ctx2d.moveTo(w / 2, 0); ctx2d.lineTo(w / 2, h);
    ctx2d.stroke();

    const xNorm = state?.x ?? 0.5;
    // Y: 0.0 at bottom, 1.0 at top
    const yNorm = state?.y ?? 0.5;
    const px = Math.max(0, Math.min(w, xNorm * w));
    const py = Math.max(0, Math.min(h, (1.0 - yNorm) * h));

    const isDown = Boolean(state?.isDown);
    const pressure = state?.pressure ?? (isDown ? 0.6 : 0.0);
    const hueVal = ((state?.hue ?? 0.5) % 1.0 + 1.0) % 1.0;
    const brightVal = Math.max(0.0, Math.min(1.0, state?.bright ?? 0.8));

    const hueDeg = Math.round(hueVal * 360);
    const litPct = Math.round(brightVal * 55 + 20); // 20% - 75% lightness

    const baseColor = `hsl(${hueDeg}, 100%, ${litPct}%)`;
    const glowColor = `hsla(${hueDeg}, 100%, ${litPct}%, ${isDown ? (0.6 + pressure * 0.4).toFixed(2) : '0.25'})`;
    const ringColor = `hsla(${hueDeg}, 100%, 75%, ${isDown ? (0.5 + pressure * 0.5).toFixed(2) : '0.15'})`;

    // Glow point
    const baseRadius = isModal ? (isDown ? 16 + pressure * 28 : 10) : (isDown ? 8 + pressure * 14 : 5);
    const glowRadius = baseRadius * 2.5;

    // Radial gradient glow
    const grad = ctx2d.createRadialGradient(px, py, 1, px, py, glowRadius);
    grad.addColorStop(0, glowColor);
    grad.addColorStop(0.5, `hsla(${hueDeg}, 100%, ${litPct}%, ${isDown ? '0.25' : '0.05'})`);
    grad.addColorStop(1, 'transparent');

    ctx2d.fillStyle = grad;
    ctx2d.beginPath();
    ctx2d.arc(px, py, glowRadius, 0, Math.PI * 2);
    ctx2d.fill();

    // Core point
    ctx2d.fillStyle = isDown ? '#ffffff' : baseColor;
    ctx2d.beginPath();
    ctx2d.arc(px, py, isModal ? (isDown ? 4 : 2.5) : (isDown ? 2.5 : 1.5), 0, Math.PI * 2);
    ctx2d.fill();

    // Outer touch ripple/ring
    if (isDown) {
        ctx2d.strokeStyle = ringColor;
        ctx2d.lineWidth = isModal ? 2.0 : 1.2;
        ctx2d.beginPath();
        ctx2d.arc(px, py, baseRadius, 0, Math.PI * 2);
        ctx2d.stroke();
    }
}

export const PAD = {
    color: 'amber',
    defaults: () => ({ type: 'PAD', hue: 0.5, bright: 0.8 }),
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
        <div class="absolute inset-0.5 bg-slate-950 rounded-sm border border-slate-800/90 overflow-hidden z-0 pointer-events-auto pad-grid-container">
            <canvas class="pad-grid-canvas w-full h-full block" width="100" height="100"></canvas>
            <div class="absolute top-1 left-1.5 text-[8px] font-mono font-bold text-slate-400 pointer-events-none tracking-wider opacity-60">XY PAD</div>
        </div>`,
    renderModal: (m) => `
        <div class="space-y-3 p-1">
            <div class="grid grid-cols-2 gap-3 pb-2 border-b border-slate-800">
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-[9px] font-bold">
                        <span class="text-slate-400 uppercase tracking-wider">HUE (COLOR)</span>
                        <span id="pad-hue-disp" class="font-mono text-cyan-300 font-bold cursor-ew-resize select-none">${(m.hue ?? 0.5).toFixed(2)}</span>
                    </div>
                    <input type="range" id="pad-hue-slider" min="0" max="1" step="0.01" value="${m.hue ?? 0.5}" class="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer">
                </div>
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-[9px] font-bold">
                        <span class="text-slate-400 uppercase tracking-wider">BRIGHTNESS</span>
                        <span id="pad-bright-disp" class="font-mono text-cyan-300 font-bold cursor-ew-resize select-none">${(m.bright ?? 0.8).toFixed(2)}</span>
                    </div>
                    <input type="range" id="pad-bright-slider" min="0" max="1" step="0.01" value="${m.bright ?? 0.8}" class="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer">
                </div>
            </div>

            <div class="relative w-full h-52 bg-slate-950 rounded-lg border border-slate-700/80 overflow-hidden shadow-inner select-none touch-none" id="pad-modal-touch-area">
                <canvas id="pad-modal-canvas" class="w-full h-full block cursor-crosshair" width="400" height="260"></canvas>
                <div class="absolute top-2 left-2 text-[10px] font-mono font-semibold text-slate-500 pointer-events-none select-none">
                    TOUCH &amp; DRAG PAD
                </div>
                <div id="pad-modal-gate-badge" class="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    GATE OFF
                </div>
            </div>

            <div class="grid grid-cols-4 gap-2 pt-1 text-center font-mono text-[9px] select-none">
                <div class="bg-slate-950 border border-slate-800 rounded p-1.5 flex flex-col items-center">
                    <span class="text-slate-500 text-[8px] font-sans font-bold">X (CV)</span>
                    <span id="pad-stat-x" class="text-cyan-300 font-bold mt-0.5">0.50</span>
                </div>
                <div class="bg-slate-950 border border-slate-800 rounded p-1.5 flex flex-col items-center">
                    <span class="text-slate-500 text-[8px] font-sans font-bold">Y (CV)</span>
                    <span id="pad-stat-y" class="text-cyan-300 font-bold mt-0.5">0.50</span>
                </div>
                <div class="bg-slate-950 border border-slate-800 rounded p-1.5 flex flex-col items-center">
                    <span class="text-slate-500 text-[8px] font-sans font-bold">PRESSURE</span>
                    <span id="pad-stat-press" class="text-amber-400 font-bold mt-0.5">0.00</span>
                </div>
                <div class="bg-slate-950 border border-slate-800 rounded p-1.5 flex flex-col items-center">
                    <span class="text-slate-500 text-[8px] font-sans font-bold">TRIGGER</span>
                    <span id="pad-stat-trig" class="text-red-400 font-bold mt-0.5">IDLE</span>
                </div>
            </div>
        </div>`,
    bindEvents: (m, ctx, onChange) => {
        // Sliders
        UIHelpers.bindSlider('pad-hue-slider', v => v.toFixed(2), v => {
            m.hue = v;
            onChange();
        }, 2, 0.0, 1.0);
        UIHelpers.bindScrubber('pad-hue-disp', 'pad-hue-slider', v => v.toFixed(2), v => {
            m.hue = v;
            onChange();
        }, 2, 0.0, 1.0);

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
        };

        touchArea.onpointermove = (e) => {
            if (activePointerId === null || e.pointerId !== activePointerId) return;
            sendPad('PAD_MOVE', e);
        };

        const handlePointerEnd = (e) => {
            if (activePointerId !== null && e.pointerId === activePointerId) {
                sendPad('PAD_UP', e);
                activePointerId = null;
                try { touchArea.releasePointerCapture(e.pointerId); } catch (err) {}
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
        const state = data || { x: 0.5, y: 0.5, pressure: 0.0, isDown: false, hue: m.hue ?? 0.5, bright: m.bright ?? 0.8 };

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

            // Update stats
            const xEl = targetModal.querySelector('#pad-stat-x');
            const yEl = targetModal.querySelector('#pad-stat-y');
            const pressEl = targetModal.querySelector('#pad-stat-press');
            const trigEl = targetModal.querySelector('#pad-stat-trig');
            const gateBadge = targetModal.querySelector('#pad-modal-gate-badge');

            if (xEl) xEl.textContent = (state.x ?? 0.5).toFixed(2);
            if (yEl) yEl.textContent = (state.y ?? 0.5).toFixed(2);
            if (pressEl) pressEl.textContent = (state.pressure ?? 0.0).toFixed(2);
            if (gateBadge) {
                if (state.isDown) {
                    gateBadge.className = 'absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-red-600 text-white border border-red-400 shadow';
                    gateBadge.textContent = 'GATE ON';
                } else {
                    gateBadge.className = 'absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700';
                    gateBadge.textContent = 'GATE OFF';
                }
            }
            if (trigEl) {
                trigEl.textContent = state.isDown ? 'PULSE' : 'IDLE';
                trigEl.className = state.isDown ? 'text-red-400 font-bold mt-0.5 animate-pulse' : 'text-slate-500 font-bold mt-0.5';
            }
        }
    }
};

export const padDefs = {
    PAD
};
