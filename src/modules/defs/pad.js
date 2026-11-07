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

    // 2. Center crosshair (2-division grid: 1 line per axis at center)
    // Only rendered for Bipolar axis ('bi'), hidden in Unipolar ('uni') to eliminate edge color fringes
    const isBrightBg = lightPct > 45;
    const gridLineColor = isBrightBg ? 'rgba(0, 0, 0, 0.25)' : (isModal ? '#1e293b' : 'rgba(255, 255, 255, 0.15)');
    const gridLineWidth = isModal ? 1.0 : 0.8;

    if (polX === 'bi' || polY === 'bi') {
        ctx2d.save();
        ctx2d.strokeStyle = gridLineColor;
        ctx2d.lineWidth = gridLineWidth;
        ctx2d.beginPath();

        if (polX === 'bi') {
            const midX = w / 2;
            ctx2d.moveTo(midX, 0);
            ctx2d.lineTo(midX, h);
        }
        if (polY === 'bi') {
            const midY = h / 2;
            ctx2d.moveTo(0, midY);
            ctx2d.lineTo(w, midY);
        }

        ctx2d.stroke();
        ctx2d.restore();
    }

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

function getPadPatchFlags(m, patchState = null) {
    const patched = patchState || (typeof window !== 'undefined' && window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(m.id) : null);
    return {
        hasX: Boolean(patched && (patched.has('x_cv') || patched.has('cv_x') || patched.has('PIN8') || patched.has('PIN8_out'))),
        hasY: Boolean(patched && (patched.has('y_cv') || patched.has('cv_y') || patched.has('PIN9') || patched.has('PIN9_out')))
    };
}

function renderPadCanvasIfDirty(cvs, state, isModal, hasX, hasY, polX, polY) {
    if (!cvs) return false;
    const isDown = Boolean(state.isDown);
    const x = state.x ?? 0.5;
    const y = state.y ?? 0.5;
    const hue = state.hue ?? 0.5;
    const sat = state.sat ?? 1.0;
    const bright = state.bright ?? 0.0;
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
        drawPadCanvas(cvs.getContext('2d'), cvs.width, cvs.height, state, isModal, hasX, hasY, polX, polY);
        cvs._lastRenderState = { isDown, x, y, hue, sat, bright, hasX, hasY, polX, polY };
    }
    return isDirty;
}

function updateModalPadStats(root, polX, polY, normX, normY, data = null) {
    if (!root) return;
    const xEl = root.querySelector('#pad-stat-x');
    const yEl = root.querySelector('#pad-stat-y');
    const valX = data?.valX ?? (polX === 'uni' ? (normX * 2.0) : ((normX * 2.0) - 1.0));
    const valY = data?.valY ?? (polY === 'uni' ? (normY * 2.0) : ((normY * 2.0) - 1.0));
    if (xEl) xEl.textContent = (polX === 'bi' && valX >= 0 ? '+' : '') + valX.toFixed(2);
    if (yEl) yEl.textContent = (polY === 'bi' && valY >= 0 ? '+' : '') + valY.toFixed(2);
}

function bindPadSurface(el, edgePad, canInteract, onPadEvent) {
    if (!el) return;
    let activeTouchId = null;
    let activePointerId = null;
    let lastTouchEndTime = 0;

    const sendPad = (type, clientX, clientY) => {
        const rect = el.getBoundingClientRect();
        const normX = Math.max(0, Math.min(1, (clientX - (rect.left + edgePad)) / Math.max(1, rect.width - edgePad * 2)));
        const normY = Math.max(0, Math.min(1, 1.0 - (clientY - (rect.top + edgePad)) / Math.max(1, rect.height - edgePad * 2)));
        onPadEvent(type, normX, normY);
    };

    // 1. Direct hardware-level Touch Events with passive: false for 0ms mobile latency
    el.addEventListener('touchstart', (e) => {
        if (canInteract && !canInteract(e, true)) return;
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        const touch = e.changedTouches[0];
        if (!touch) return;
        activeTouchId = touch.identifier;
        sendPad('PAD_DOWN', touch.clientX, touch.clientY);
    }, { passive: false });

    el.addEventListener('touchmove', (e) => {
        if (canInteract && !canInteract(e, false)) return;
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

    const handleTouchEnd = (e) => {
        if (canInteract && !canInteract(e, false)) return;
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

    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // 2. Desktop Mouse / Pointer Events fallback (Touch pointers bypassed to prevent double triggers)
    el.addEventListener('pointerdown', (e) => {
        if (canInteract && !canInteract(e, true)) return;
        if (e.pointerType === 'touch' || (Date.now() - lastTouchEndTime < 400)) return;
        activePointerId = e.pointerId;
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
        sendPad('PAD_DOWN', e.clientX, e.clientY);
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
    });

    el.addEventListener('pointermove', (e) => {
        if (canInteract && !canInteract(e, false)) return;
        if (e.pointerType === 'touch' || activePointerId === null || e.pointerId !== activePointerId) return;
        sendPad('PAD_MOVE', e.clientX, e.clientY);
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
    });

    const handlePointerEnd = (e) => {
        if (canInteract && !canInteract(e, false)) return;
        if (e.pointerType === 'touch') return;
        if (activePointerId !== null && e.pointerId === activePointerId) {
            sendPad('PAD_UP', e.clientX, e.clientY);
            activePointerId = null;
            try { el.releasePointerCapture(e.pointerId); } catch (_) {}
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();
        }
    };

    el.addEventListener('pointerup', handlePointerEnd);
    el.addEventListener('pointercancel', handlePointerEnd);
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
        <div class="flex flex-col gap-1.5 p-0.5 select-none w-[160px] mx-auto">
            <!-- Row 1: Title Setting Input -->
            <div class="flex items-center justify-between gap-1 pb-1 border-b border-slate-800">
                <span class="text-[7.5px] font-bold text-cyan-400/90 font-mono tracking-wider uppercase">NAME</span>
                <input type="text" id="pad-modal-name-input" class="bg-slate-950/90 border border-slate-700/80 hover:border-cyan-400 focus:border-cyan-400 text-cyan-300 focus:ring-cyan-400/50 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold focus:outline-none focus:ring-1 h-[20px] flex-1 text-center select-text cursor-text leading-none shadow-inner ml-2" value="${m.name || 'PAD'}" placeholder="PAD" maxlength="10" title="PADの名前を編集">
            </div>

            <!-- 2. Pad Canvas with Polarity Buttons (Centered with ~5px margin on left and right) -->
            <div class="relative w-[150px] h-[150px] mx-auto select-none shrink-0">
                <!-- Inner Touch Area (Canvas) -->
                <div class="relative w-full h-full bg-black rounded border border-slate-700/80 overflow-hidden shadow-inner select-none touch-none overscroll-contain" id="pad-modal-touch-area" style="opacity: ${m.opacity ?? 0.8};">
                    <canvas id="pad-modal-canvas" class="w-full h-full block cursor-crosshair" width="400" height="400"></canvas>
                    <div class="absolute top-1 left-1.5 flex items-center gap-1.5 font-mono text-[8px] select-none pointer-events-none drop-shadow z-10">
                        <span class="text-slate-400 font-sans font-bold text-[7.5px]">X</span><span id="pad-stat-x" class="text-cyan-300 font-bold">${dispInitX}</span>
                        <span class="text-slate-400 font-sans font-bold text-[7.5px]">Y</span><span id="pad-stat-y" class="text-cyan-300 font-bold">${dispInitY}</span>
                    </div>

                    <!-- Y-Axis Polarity Option Buttons (Inside Canvas at left edge, pointing Right ▶) -->
                    <button class="pad-pol-toggle-y absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-[9px] leading-none transition-all cursor-pointer select-none rounded hover:bg-slate-800/80 z-20 ${polY === 'bi' ? 'text-amber-400 font-bold drop-shadow-[0_0_6px_rgba(245,158,11,0.8)] scale-110' : 'text-slate-600 hover:text-slate-300'}" data-val="bi" title="Y軸 0点: 中央 (BI -1~1V)">▶</button>
                    <button class="pad-pol-toggle-y absolute left-1 bottom-1 w-4 h-4 flex items-center justify-center text-[9px] leading-none transition-all cursor-pointer select-none rounded hover:bg-slate-800/80 z-20 ${polY === 'uni' ? 'text-amber-400 font-bold drop-shadow-[0_0_6px_rgba(245,158,11,0.8)] scale-110' : 'text-slate-600 hover:text-slate-300'}" data-val="uni" title="Y軸 0点: 下端 (UNI 0~2V)">▶</button>

                    <!-- X-Axis Polarity Option Buttons (Inside Canvas at bottom edge, pointing Up ▲) -->
                    <button class="pad-pol-toggle-x absolute left-6 bottom-1 w-4 h-4 flex items-center justify-center text-[9px] leading-none transition-all cursor-pointer select-none rounded hover:bg-slate-800/80 z-20 ${polX === 'uni' ? 'text-amber-400 font-bold drop-shadow-[0_0_6px_rgba(245,158,11,0.8)] scale-110' : 'text-slate-600 hover:text-slate-300'}" data-val="uni" title="X軸 0点: 左端 (UNI 0~2V)">▲</button>
                    <button class="pad-pol-toggle-x absolute left-1/2 -translate-x-1/2 bottom-1 w-4 h-4 flex items-center justify-center text-[9px] leading-none transition-all cursor-pointer select-none rounded hover:bg-slate-800/80 z-20 ${polX === 'bi' ? 'text-amber-400 font-bold drop-shadow-[0_0_6px_rgba(245,158,11,0.8)] scale-110' : 'text-slate-600 hover:text-slate-300'}" data-val="bi" title="X軸 0点: 中央 (BI -1~1V)">▲</button>
                </div>
            </div>

            <!-- 2. カラー設定 (パッドの下に1行で配置) -->
            <div class="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800 select-none">
                <div class="flex flex-col gap-0.5">
                    <div class="flex items-center justify-between text-[7px] font-mono leading-none">
                        <span class="text-slate-400 font-bold">HUE</span>
                        <span id="pad-hue-slider-disp" class="text-cyan-300 font-bold cursor-ew-resize">${(m.hue ?? 0.5).toFixed(2)}</span>
                    </div>
                    <input type="range" id="pad-hue-slider" min="0" max="1" step="0.01" value="${m.hue ?? 0.5}" class="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer">
                </div>
                <div class="flex flex-col gap-0.5">
                    <div class="flex items-center justify-between text-[7px] font-mono leading-none">
                        <span class="text-slate-400 font-bold">SAT</span>
                        <span id="pad-sat-slider-disp" class="text-cyan-300 font-bold cursor-ew-resize">${(m.sat ?? 1.0).toFixed(2)}</span>
                    </div>
                    <input type="range" id="pad-sat-slider" min="0" max="1" step="0.01" value="${m.sat ?? 1.0}" class="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer">
                </div>
                <div class="flex flex-col gap-0.5">
                    <div class="flex items-center justify-between text-[7px] font-mono leading-none">
                        <span class="text-slate-400 font-bold">BRT</span>
                        <span id="pad-bright-slider-disp" class="text-cyan-300 font-bold cursor-ew-resize">${(m.bright ?? 0.0).toFixed(2)}</span>
                    </div>
                    <input type="range" id="pad-bright-slider" min="0" max="1" step="0.01" value="${m.bright ?? 0.0}" class="w-full accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer">
                </div>
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;

        // 0. Title Name Input
        const nameInput = root.querySelector('#pad-modal-name-input');
        if (nameInput) {
            ['pointerdown', 'mousedown', 'keydown'].forEach(ev => nameInput.addEventListener(ev, (e) => e.stopPropagation()));
            nameInput.addEventListener('input', (e) => {
                const val = e.target.value;
                m.name = val;
                const ui = ctx?.ui || ctx || window.__GS_APP__;
                if (ui?.synth) {
                    ui.synth.updateModule(`${ui.currentPageId}/${m.id}`, m, ui.getPatchState(m.id));
                }
                ui?.renderCell?.(m.row * (ui.COLS || 4) + m.col);
                onChange?.();
            });
            nameInput.addEventListener('blur', (e) => {
                if (!e.target.value.trim()) {
                    e.target.value = 'PAD';
                    m.name = 'PAD';
                    const ui = ctx?.ui || ctx || window.__GS_APP__;
                    if (ui?.synth) {
                        ui.synth.updateModule(`${ui.currentPageId}/${m.id}`, m, ui.getPatchState(m.id));
                    }
                    ui?.renderCell?.(m.row * (ui.COLS || 4) + m.col);
                    onChange?.();
                }
            });
        }

        // Axis Polarity Option Buttons (X: ▲, Y: ▶)
        const bindPol = (sel, key) => {
            root.querySelectorAll(sel).forEach(btn => {
                ['pointerdown', 'mousedown', 'touchstart'].forEach(ev => {
                    btn.addEventListener(ev, (e) => e.stopPropagation());
                });
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const targetVal = btn.dataset.val;
                    if (targetVal && m[key] !== targetVal) {
                        m[key] = targetVal;
                        ctx.reRenderModal();
                        onChange();
                    }
                });
            });
        };
        bindPol('.pad-pol-toggle-x', 'polX');
        bindPol('.pad-pol-toggle-y', 'polY');

        // HUE / SAT / BRIGHTNESS Sliders
        UIHelpers.bindSlider('pad-hue-slider', v => v.toFixed(2), v => { m.hue = v; onChange(); }, 1, 0.0, 1.0);
        UIHelpers.bindSlider('pad-sat-slider', v => v.toFixed(2), v => { m.sat = v; onChange(); }, 1, 0.0, 1.0);
        UIHelpers.bindSlider('pad-bright-slider', v => v.toFixed(2), v => { m.bright = v; onChange(); }, 1, 0.0, 1.0);

        // Touch Pad interactions in Modal
        const touchArea = root.querySelector('#pad-modal-touch-area');
        bindPadSurface(touchArea, 8, null, (type, normX, normY) => {
            ctx?.sendControl?.({ type, x: normX, y: normY });
            const modalCvs = root.querySelector('#pad-modal-canvas');
            if (!modalCvs) return;
            const { hasX, hasY } = getPadPatchFlags(m);
            const polX = m.polX || 'bi';
            const polY = m.polY || 'bi';
            const state = { x: normX, y: normY, isDown: type !== 'PAD_UP', hue: m.hue ?? 0.5, sat: m.sat ?? 1.0, bright: m.bright ?? 0.0 };
            renderPadCanvasIfDirty(modalCvs, state, true, hasX, hasY, polX, polY);
            updateModalPadStats(root, polX, polY, normX, normY);
        });
    },
    // Bind cell-level pad touch events directly on the grid
    bindGridEvents: (cell, m, ui) => {
        const padBox = cell.querySelector('.pad-grid-container');
        if (!padBox || padBox._padBound) return;
        padBox._padBound = true;

        bindPadSurface(
            padBox,
            6,
            (e, isStart) => Boolean(ui?.isPerformanceMode || window.__GS_APP__?.isPerformanceMode) && !(isStart && e.target.closest('.port')),
            (type, normX, normY) => {
                ui?.synth?.sendControlEvent(m.id, { type, x: normX, y: normY });
                const cvs = padBox.querySelector('.pad-grid-canvas');
                if (!cvs) return;
                const { hasX, hasY } = getPadPatchFlags(m);
                const state = { x: normX, y: normY, isDown: type !== 'PAD_UP', hue: m.hue ?? 0.5, sat: m.sat ?? 1.0, bright: m.bright ?? 0.0 };
                renderPadCanvasIfDirty(cvs, state, false, hasX, hasY, m.polX || 'bi', m.polY || 'bi');
            }
        );
    },
    updateLive: (cell, data, isPlaying, targetModal, m, patchState = null) => {
        if (!m) return;
        const state = data || { x: 0.5, y: 0.5, isDown: false, hue: m.hue ?? 0.5, sat: m.sat ?? 1.0, bright: m.bright ?? 0.0 };
        if (state.sat === undefined) state.sat = m.sat ?? 1.0;
        if (state.hue === undefined) state.hue = m.hue ?? 0.5;
        if (state.bright === undefined) state.bright = m.bright ?? 0.0;

        const polX = m.polX || 'bi';
        const polY = m.polY || 'bi';
        const { hasX, hasY } = getPadPatchFlags(m, patchState);

        // 1. Render on Cell Canvas with Dirty caching
        renderPadCanvasIfDirty(cell?.querySelector('.pad-grid-canvas'), state, false, hasX, hasY, polX, polY);

        // 2. Render on Modal Canvas & Stats if open with Dirty caching
        const modalCvs = targetModal?.querySelector('#pad-modal-canvas');
        if (renderPadCanvasIfDirty(modalCvs, state, true, hasX, hasY, polX, polY)) {
            updateModalPadStats(targetModal, polX, polY, state.x ?? 0.5, state.y ?? 0.5, data);
        }
    }
};

export const padDefs = {
    PAD
};
