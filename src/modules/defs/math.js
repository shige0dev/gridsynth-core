// src/modules/defs/math.js

const renderMathModalUI = (m, ctx, modeGroups, valKeys) => {
    const curMode = m.mode || modeGroups[0].modes[0];
    const fmt = v => (v >= 0 ? '+' : '') + Number(v || 0).toFixed(2);
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
                            <div class="flex items-center justify-between">
                                <span class="text-[8px] font-bold text-purple-300 font-mono">VAL ${k}</span>
                                <button id="math-val-${port}-btn" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-purple-950/90 border border-purple-500/60 hover:border-purple-400 text-cyan-300 hover:text-cyan-100 font-mono text-[10px] font-bold shadow-sm transition active:scale-95 flex items-center gap-1 cursor-pointer" title="タップして数値キーパッド入力">
                                    <span class="text-[7.5px] text-purple-400">⌨</span>
                                    <span id="math-val-${port}-disp">${fmt(val)}</span>
                                </button>
                            </div>
                            <div class="grid grid-cols-4 gap-0.5">
                                <button class="math-step-btn h-4 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-[6.5px] font-mono font-bold transition active:scale-95" data-key="${k}" data-delta="-1">-1</button>
                                <button class="math-step-btn h-4 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-[6.5px] font-mono font-bold transition active:scale-95" data-key="${k}" data-delta="-0.1">-0.1</button>
                                <button class="math-step-btn h-4 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-[6.5px] font-mono font-bold transition active:scale-95" data-key="${k}" data-delta="0.1">+0.1</button>
                                <button class="math-step-btn h-4 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-[6.5px] font-mono font-bold transition active:scale-95" data-key="${k}" data-delta="1">+1</button>
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

    // Quick Step Buttons (-1, -0.1, +0.1, +1)
    document.querySelectorAll('.math-step-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const k = btn.dataset.key;
            const delta = parseFloat(btn.dataset.delta);
            if (!k || isNaN(delta)) return;
            const cur = Number(m[`val${k}`] ?? (k === 'B' ? 1.0 : 0.0));
            const clamped = Math.max(-100.0, Math.min(100.0, Math.round((cur + delta) * 100) / 100));
            m[`val${k}`] = clamped;
            ctx.reRenderModal();
            cb();
        });
    });

    // Tap to open on-screen Numpad
    valKeys.forEach(k => {
        const port = k.toLowerCase();
        const btn = document.getElementById(`math-val-${port}-btn`);
        if (!btn) return;
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const cur = Number(m[`val${k}`] ?? (k === 'B' ? 1.0 : 0.0));
            const numpadFn = ctx.numpad || ctx.prompt;
            const res = await numpadFn(`CONSTANT ${k}`, cur, -100.0, 100.0);
            if (res !== null && res !== '' && !isNaN(Number(res))) {
                const num = parseFloat(res);
                m[`val${k}`] = Math.max(-100.0, Math.min(100.0, Math.round(num * 100) / 100));
                ctx.reRenderModal();
                cb();
            }
        });
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
    MODES: ['ABS', 'FLOOR', 'CEIL', 'ROUND', 'INT', 'NOT', 'SIN', 'COS', 'TAN', 'LOG', 'EXP'],
    defaults: () => ({ type: 'MATH1', mode: 'ABS', valA: 0.0 }),
    ports: () => ({
        in: [{ port: 'cv_in_a', pin: 5, color: 'bg-yellow-400' }],
        out: [{ port: 'cv_out', pin: 10, color: 'bg-yellow-400' }]
    }),
    renderGrid: renderMathGridUI,
    updateLive: updateMathLiveUI,
    renderModal: (m, ctx) => renderMathModalUI(m, ctx, [
        { label: 'Basic Math (A)', cols: 3, modes: ['ABS', 'FLOOR', 'CEIL', 'ROUND', 'INT', 'NOT'] },
        { label: 'Trig & Exp (A)', cols: 5, modes: ['SIN', 'COS', 'TAN', 'LOG', 'EXP'] }
    ], ['A']),
    bindEvents: (m, ctx, cb) => bindMathEventsUI(m, ctx, cb, ['A'])
};

export const MATH2 = {
    color: 'purple',
    ARITHMETIC_MODES: ['ADD', 'DIFF', 'MULTI', 'MOD', 'A^B', 'MIN', 'MAX'],
    COMPARISON_MODES: ['<', '<=', '==', '>=', '>'],
    LOGIC_MODES: ['AND', 'OR', 'NAND', 'NOR', 'XOR'],
    defaults: () => ({ type: 'MATH2', mode: 'ADD', valA: 0.0, valB: 1.0 }),
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

