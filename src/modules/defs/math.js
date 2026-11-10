// src/modules/defs/math.js

const fmt = (v) => {
    const n = Number(v);
    if (isNaN(n)) return '+0.00';
    return (n >= 0 ? '+' : '') + n.toFixed(2);
};

const renderMathModalUI = (m, ctx, modeGroups, valKeys) => {
    const curMode = m.mode || modeGroups[0].modes[0];
    return `
        <div class="space-y-1.5 p-0.5">
            ${modeGroups.map(g => `
                <div>
                    <div class="text-[7.5px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider">${g.label}</div>
                    <div class="grid grid-cols-${g.cols} gap-0.5">
                        ${g.modes.map(md => `
                            <button class="math-mode-btn h-4 rounded text-[7.5px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${curMode === md ? 'bg-purple-600 text-white border-purple-500 shadow-sm shadow-purple-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}" data-mode="${md}">${md === '<' ? '&lt;' : (md === '<=' ? '&lt;=' : md)}</button>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
            <div class="grid grid-cols-${valKeys.length} gap-1 pt-0.5">
                ${valKeys.map(k => {
                    const port = k.toLowerCase();
                    const isPatched = ctx.patched?.has('cv_in_' + port) || ctx.patched?.has('cv_in' + port) || ctx.patched?.has(port);
                    const val = m[`val${k}`] ?? (k === 'B' ? 1.0 : 0.0);
                    if (isPatched) {
                        return `
                            <div class="flex items-center justify-between bg-slate-950/40 px-2 py-1.5 rounded-lg border border-slate-800 opacity-60 cursor-not-allowed select-none">
                                <span class="text-[8px] font-bold text-slate-500 font-mono">VAL ${k}</span>
                                <span class="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-slate-800/90 text-emerald-400 font-bold tracking-tight">CABLED (0.00)</span>
                            </div>`;
                    }
                    return `
                        <div class="bg-slate-950/80 p-1.5 rounded-lg border border-purple-500/50 shadow-sm select-none space-y-1">
                            <div class="flex items-center justify-between gap-1">
                                <span class="text-[8px] font-bold text-purple-300 font-mono shrink-0 whitespace-nowrap">VAL ${k}</span>
                                <div class="px-1.5 py-0.5 rounded bg-slate-900 border border-purple-500/60 text-cyan-300 font-mono text-[9.5px] font-bold shadow-sm shrink-0 whitespace-nowrap">
                                    <span id="math-val-${port}-disp" class="tabular-nums font-mono">${fmt(val)}</span>
                                </div>
                            </div>
                            <div class="space-y-0.5">
                                <div class="grid grid-cols-3 gap-0.5">
                                    <button class="math-step-btn h-4 rounded bg-slate-900 hover:bg-slate-800 text-rose-300 border border-slate-700/80 text-[6.5px] font-mono font-bold transition active:scale-95 cursor-pointer touch-none select-none" data-key="${k}" data-delta="-1">-1</button>
                                    <button class="math-step-btn h-4 rounded bg-slate-900 hover:bg-slate-800 text-rose-300 border border-slate-700/80 text-[6.5px] font-mono font-bold transition active:scale-95 cursor-pointer touch-none select-none" data-key="${k}" data-delta="-0.1">-0.1</button>
                                    <button class="math-step-btn h-4 rounded bg-slate-900 hover:bg-slate-800 text-rose-300 border border-slate-700/80 text-[6.5px] font-mono font-bold transition active:scale-95 cursor-pointer touch-none select-none" data-key="${k}" data-delta="-0.01">-0.01</button>
                                </div>
                                <div class="grid grid-cols-3 gap-0.5">
                                    <button class="math-step-btn h-4 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 text-[6.5px] font-mono font-bold transition active:scale-95 cursor-pointer touch-none select-none" data-key="${k}" data-delta="1">+1</button>
                                    <button class="math-step-btn h-4 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 text-[6.5px] font-mono font-bold transition active:scale-95 cursor-pointer touch-none select-none" data-key="${k}" data-delta="0.1">+0.1</button>
                                    <button class="math-step-btn h-4 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 text-[6.5px] font-mono font-bold transition active:scale-95 cursor-pointer touch-none select-none" data-key="${k}" data-delta="0.01">+0.01</button>
                                </div>
                            </div>
                        </div>`;
                }).join('')}
            </div>
        </div>`;
};

const bindMathEventsUI = (m, ctx, cb, valKeys) => {
    document.querySelectorAll('.math-mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            m.mode = e.currentTarget.dataset.mode;
            ctx.reRenderModal();
            cb();
        });
    });

    // Quick Step Buttons (-1, -0.1, +0.1, +1) with Hold-to-repeat
    document.querySelectorAll('.math-step-btn').forEach(btn => {
        let holdTimer = null;
        let repeatTimer = null;

        const step = () => {
            const k = btn.dataset.key;
            const delta = parseFloat(btn.dataset.delta);
            if (!k || isNaN(delta)) return;
            const cur = Number(m[`val${k}`] ?? (k === 'B' ? 1.0 : 0.0));
            const clamped = Math.max(-100.0, Math.min(100.0, Math.round((cur + delta) * 100) / 100));
            m[`val${k}`] = clamped;
            const disp = document.getElementById(`math-val-${k.toLowerCase()}-disp`);
            if (disp) disp.textContent = fmt(clamped);
            cb();
        };

        const stopHold = (e) => {
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
            }
            if (repeatTimer) {
                clearInterval(repeatTimer);
                repeatTimer = null;
            }
            if (e && btn.hasPointerCapture && btn.hasPointerCapture(e.pointerId)) {
                try { btn.releasePointerCapture(e.pointerId); } catch (_) {}
            }
        };

        btn.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return; // Primary button only
            e.stopPropagation();
            if (btn.setPointerCapture) {
                try { btn.setPointerCapture(e.pointerId); } catch (_) {}
            }
            stopHold();
            step();
            holdTimer = setTimeout(() => {
                repeatTimer = setInterval(step, 60);
            }, 300);
        });

        btn.addEventListener('pointerup', stopHold);
        btn.addEventListener('pointercancel', stopHold);
        btn.addEventListener('pointerleave', (e) => {
            if (!btn.hasPointerCapture || !btn.hasPointerCapture(e.pointerId)) {
                stopHold(e);
            }
        });
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
};

const renderMathGridUI = (m) => {
    const mode = m.mode || (m.type === 'MATH1' ? 'ABS' : 'ADD');
    const escMode = mode === '<' ? '&lt;' : (mode === '<=' ? '&lt;=' : mode);
    return `
        <div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-cyan-400">
            <span class="text-[9px] font-bold uppercase text-purple-400 tracking-tight">${escMode}</span>
            <span class="math-disp-val text-[12px] font-mono font-bold text-cyan-300 tracking-tight">+0.00</span>
        </div>`;
};

const updateMathLiveUI = (cell, data) => {
    const d = cell.querySelector('.math-disp-val');
    if (d && data?.values) d.textContent = (data.values[0] >= 0 ? '+' : '') + Number(data.values[0] || 0).toFixed(2);
};

export const MATH1 = {
    color: 'purple',
    MODES: ['ABS', 'FLOOR', 'CEIL', 'ROUND', 'INT', 'NOT', 'SIN', 'COS', 'TAN'],
    defaults: () => ({ type: 'MATH1', mode: 'ABS', valA: 0.0 }),
    onNormalize: (m) => {
        if (!m.mode || !MATH1.MODES.includes(m.mode)) m.mode = 'ABS';
        if (m.valA === undefined) m.valA = 0.0;
    },
    ports: () => ({
        in: [{ port: 'cv_in_a', pin: 5, color: 'bg-yellow-400' }],
        out: [{ port: 'cv_out', pin: 10, color: 'bg-yellow-400' }]
    }),
    renderGrid: renderMathGridUI,
    updateLive: updateMathLiveUI,
    renderModal: (m, ctx) => renderMathModalUI(m, ctx, [
        { label: 'Basic Math (A)', cols: 3, modes: ['ABS', 'FLOOR', 'CEIL', 'ROUND', 'INT', 'NOT'] },
        { label: 'Trigonometry (A)', cols: 3, modes: ['SIN', 'COS', 'TAN'] }
    ], ['A']),
    bindEvents: (m, ctx, cb) => bindMathEventsUI(m, ctx, cb, ['A'])
};

export const MATH2 = {
    color: 'purple',
    ARITHMETIC_MODES: ['ADD', 'DIFF', 'MULTI', 'MOD', 'A^B', 'MIN', 'MAX'],
    COMPARISON_MODES: ['<', '<=', '==', '>=', '>'],
    LOGIC_MODES: ['AND', 'OR', 'NAND', 'NOR', 'XOR'],
    defaults: () => ({ type: 'MATH2', mode: 'ADD', valA: 0.0, valB: 1.0 }),
    onNormalize: (m) => {
        if (!m.mode) m.mode = 'ADD';
        if (m.valA === undefined) m.valA = 0.0;
        if (m.valB === undefined) m.valB = 1.0;
    },
    ports: () => ({
        in: [
            { port: 'cv_in_a', pin: 5, color: 'bg-yellow-400' },
            { port: 'cv_in_b', pin: 6, color: 'bg-yellow-400' }
        ],
        out: [{ port: 'cv_out', pin: 10, color: 'bg-yellow-400' }]
    }),
    renderGrid: renderMathGridUI,
    updateLive: updateMathLiveUI,
    renderModal: (m, ctx) => renderMathModalUI(m, ctx, [
        { label: 'Arithmetic', cols: 4, modes: MATH2.ARITHMETIC_MODES },
        { label: 'Comparison (A vs B)', cols: 5, modes: MATH2.COMPARISON_MODES },
        { label: 'Logic (A, B > 0.5)', cols: 5, modes: MATH2.LOGIC_MODES }
    ], ['A', 'B']),
    bindEvents: (m, ctx, cb) => bindMathEventsUI(m, ctx, cb, ['A', 'B'])
};

