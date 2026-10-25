import { UIHelpers } from '../../ui/helpers.js';
import { parseClockRate } from '../../core/utils.js';

const MATH_PRESETS = [
    { label: 'A (THRU)', expr: 'A', desc: '数値モニタ/スルー' },
    { label: 'A * B + C', expr: 'A * B + C', desc: 'スケール&オフセット' },
    { label: 'A + B', expr: 'A + B', desc: '加算 (Sum)' },
    { label: 'A - B', expr: 'A - B', desc: '減算 (Diff)' },
    { label: 'A * B', expr: 'A * B', desc: '乗算 / 変調' },
    { label: 'abs(A)', expr: 'abs(A)', desc: '全波整流 / 絶対値' },
    { label: 'min(A, B)', expr: 'min(A, B)', desc: '最小値 / アナログOR' },
    { label: 'max(A, B)', expr: 'max(A, B)', desc: '最大値 / アナログAND' },
    { label: 'clamp(A, B, C)', expr: 'clamp(A, B, C)', desc: 'リミッター (B〜C)' },
    { label: 'A % B', expr: 'A % B', desc: '剰余 / 周期フォールド' },
    { label: 'A > B', expr: 'A > B', desc: '比較コンパレータ' }
];

const renderMathModalUI = (m, ctx) => {
    const curExpr = m.expr || m.mode || 'A';
    const escExpr = curExpr.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fmt = v => (v >= 0 ? '+' : '') + Number(v || 0).toFixed(2);

    return `
        <div class="space-y-2 p-0.5">
            <!-- 1. Expression Display Screen -->
            <div class="bg-slate-950/90 border border-purple-500/50 rounded-lg p-1.5 flex items-center justify-between gap-1 shadow-inner">
                <div class="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
                    <span class="text-[7.5px] font-bold uppercase text-purple-400 font-mono tracking-wider shrink-0">EXPR:</span>
                    <span id="math-expr-disp" class="font-mono text-cyan-300 font-bold text-[10.5px] truncate select-all" title="${escExpr}">${escExpr}</span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    <button id="math-btn-backspace" class="h-5 px-1.5 rounded text-[8px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition" title="1文字削除">⌫</button>
                    <button id="math-btn-clear" class="h-5 px-1.5 rounded text-[8px] font-mono font-bold bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 active:scale-95 transition" title="Aにリセット">CLR</button>
                </div>
            </div>

            <!-- 2. Constant Sliders (Val A, Val B, Val C) - Disabled when patched -->
            <div class="grid grid-cols-3 gap-1">
                ${['A', 'B', 'C'].map(k => {
                    const port = k.toLowerCase();
                    const isPatched = ctx.patched?.has('CV_in' + k) || ctx.patched?.has('cv_in' + port) || ctx.patched?.has(port);
                    const val = m[`val${k}`] ?? (k === 'B' ? 1.0 : 0.0);
                    if (isPatched) {
                        return `
                            <div class="flex flex-col gap-0.5 bg-slate-950/40 p-1 rounded-md border border-slate-800 opacity-50 cursor-not-allowed select-none">
                                <div class="flex items-center justify-between">
                                    <span class="text-[7.5px] font-bold text-slate-500 font-mono">${k}</span>
                                    <span class="text-[6.5px] font-mono px-1 rounded bg-slate-800/80 text-emerald-400 font-bold">CABLED</span>
                                </div>
                                <div class="text-[8px] font-mono text-slate-500 text-center py-0.5 font-bold">EXT CV</div>
                            </div>`;
                    }
                    return `
                        <div class="flex flex-col gap-0.5 bg-slate-950/70 p-1 rounded-md border border-purple-500/40 shadow-sm">
                            <div class="flex items-center justify-between">
                                <span class="text-[7.5px] font-bold text-purple-300 font-mono">VAL ${k}</span>
                                <button id="math-val-${port}-btn" class="text-[7.5px] font-mono text-cyan-300 hover:text-cyan-100 font-bold bg-slate-800/80 px-1 rounded border border-slate-700/60 transition" title="タップで数値直接入力">${fmt(val)}</button>
                            </div>
                            <input id="math-val-${port}-slider" type="range" min="-5.0" max="5.0" step="0.05" value="${val}" class="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-500">
                        </div>`;
                }).join('')}
            </div>

            <!-- 3. Function Tokens (MATH1 & MATH2 features) -->
            <div class="space-y-1">
                <div class="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Tokens</span>
                    <span class="text-[6.5px] text-slate-500 font-normal">タップで式に追加</span>
                </div>
                <!-- Inputs & Numbers -->
                <div class="grid grid-cols-8 gap-0.5">
                    ${['A', 'B', 'C', '(', ')', '0.5', '1.0', '2.0'].map(t => `
                        <button class="math-token-btn h-4 rounded text-[7.5px] font-mono font-bold border border-slate-700 bg-slate-800/90 hover:bg-purple-900/60 text-purple-200 active:scale-95 transition" data-token="${t}">${t}</button>
                    `).join('')}
                </div>
                <!-- Operators -->
                <div class="grid grid-cols-6 gap-0.5">
                    ${['+', '-', '*', '/', '%', '^'].map(t => `
                        <button class="math-token-btn h-4 rounded text-[8px] font-mono font-bold border border-slate-700 bg-slate-800 hover:bg-purple-900/60 text-amber-300 active:scale-95 transition" data-token="${t}">${t}</button>
                    `).join('')}
                </div>
                <!-- Functions (MATH1 & MATH2) -->
                <div class="grid grid-cols-4 gap-0.5">
                    ${['abs', 'floor', 'ceil', 'round', 'int', 'min', 'max', 'clamp'].map(t => `
                        <button class="math-token-btn h-4 rounded text-[7.5px] font-mono font-bold border border-slate-700 bg-slate-800 hover:bg-purple-900/60 text-cyan-300 active:scale-95 transition" data-token="${t}">${t}</button>
                    `).join('')}
                </div>
                <!-- Comparisons (MATH2) -->
                <div class="grid grid-cols-5 gap-0.5">
                    ${['<', '<=', '==', '>=', '>'].map(t => `
                        <button class="math-token-btn h-4 rounded text-[7.5px] font-mono font-bold border border-slate-700 bg-slate-800 hover:bg-purple-900/60 text-emerald-300 active:scale-95 transition" data-token="${t}">${t === '<' ? '&lt;' : (t === '<=' ? '&lt;=' : t)}</button>
                    `).join('')}
                </div>
            </div>

            <!-- 4. Common Function Examples (Presets) -->
            <div class="space-y-1 pt-0.5">
                <div class="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Presets (よくある関数例)</span>
                    <span class="text-[6.5px] text-slate-500 font-normal">ワンタップ即時反映</span>
                </div>
                <div class="grid grid-cols-3 gap-0.5">
                    ${MATH_PRESETS.map(p => {
                        const isSel = (m.expr || m.mode || 'A') === p.expr;
                        return `
                            <button class="math-preset-btn h-5 rounded text-[7.5px] font-mono font-bold border leading-none px-1 inline-flex items-center justify-center transition truncate ${isSel ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/40' : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700'}" data-expr="${p.expr}" title="${p.desc}">${p.label}</button>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>`;
};

const bindMathEventsUI = (m, ctx, cb) => {
    // 1. Presets buttons
    document.querySelectorAll('.math-preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const expr = e.currentTarget.dataset.expr;
            m.expr = expr;
            m.mode = expr;
            ctx.reRenderModal();
            cb();
        });
    });

    // 2. Token buttons
    document.querySelectorAll('.math-token-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const token = e.currentTarget.dataset.token;
            let cur = (m.expr || 'A').trim();
            if (cur === 'A' && ['abs', 'floor', 'ceil', 'round', 'int', 'min', 'max', 'clamp', 'B', 'C'].includes(token)) {
                cur = '';
            }
            if (['abs', 'floor', 'ceil', 'round', 'int', 'min', 'max', 'clamp'].includes(token)) {
                m.expr = (cur ? cur + ' ' : '') + token + '(';
            } else if (['+', '-', '*', '/', '%', '^', '<', '<=', '==', '>=', '>'].includes(token)) {
                m.expr = cur + ' ' + token + ' ';
            } else {
                m.expr = (cur ? cur + (cur.endsWith('(') || cur.endsWith(' ') ? '' : ' ') : '') + token;
            }
            m.mode = m.expr;
            ctx.reRenderModal();
            cb();
        });
    });

    // 3. Backspace button
    document.getElementById('math-btn-backspace')?.addEventListener('click', () => {
        let cur = (m.expr || 'A').trim();
        if (cur.length > 1) {
            m.expr = cur.slice(0, -1).trim();
            if (!m.expr) m.expr = 'A';
        } else {
            m.expr = 'A';
        }
        m.mode = m.expr;
        ctx.reRenderModal();
        cb();
    });

    // 4. Clear button
    document.getElementById('math-btn-clear')?.addEventListener('click', () => {
        m.expr = 'A';
        m.mode = 'A';
        ctx.reRenderModal();
        cb();
    });

    // 5. Sliders and Prompts for A, B, C
    ['a', 'b', 'c'].forEach(port => {
        const k = port.toUpperCase();
        const slider = document.getElementById(`math-val-${port}-slider`);
        if (slider) {
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value) || 0;
                m[`val${k}`] = val;
                const disp = document.getElementById(`math-val-${port}-btn`);
                if (disp) disp.textContent = (val >= 0 ? '+' : '') + val.toFixed(2);
                cb();
            });
        }
        const btn = document.getElementById(`math-val-${port}-btn`);
        if (btn) {
            btn.addEventListener('click', async () => {
                const cur = String(m[`val${k}`] ?? (k === 'B' ? 1.0 : 0.0));
                const res = await ctx.prompt(`CONSTANT ${k}`, cur);
                if (res !== null && res !== '') {
                    const num = parseFloat(res);
                    if (!isNaN(num)) {
                        m[`val${k}`] = num;
                        ctx.reRenderModal();
                        cb();
                    }
                }
            });
        }
    });
};

const renderMathGridUI = (m) => {
    const expr = m.expr || m.mode || 'A';
    const escExpr = expr.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
        <div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-cyan-400 w-full px-1">
            <span class="math-expr-title text-[8px] font-mono font-bold uppercase text-purple-400 tracking-tight truncate max-w-[56px] text-center" title="${escExpr}">${escExpr}</span>
            <span class="math-disp-val text-[12px] font-mono font-bold text-cyan-300 tracking-tight">+0.00</span>
        </div>`;
};

const updateMathLiveUI = (cell, data) => {
    const d = cell.querySelector('.math-disp-val');
    if (d && data?.values) d.textContent = (data.values[0] >= 0 ? '+' : '') + Number(data.values[0] || 0).toFixed(2);
};

export const LFO = {
    color: 'indigo',
    DIVISIONS: ['4/1', '2/1', '1/1', '1/2', '1/4', '1/8', '1/16', '1/32', '1/4T', '1/8T', '1/4D', '1/8D'],
    defaults: () => ({
        type: 'LFO',
        waveType: 'sine',
        polarity: 'bipolar',
        syncMode: 'free',
        division: '1/4',
        period: 0.5,
        rate: 2.0,
        depth: 1.0,
        phase: 0,
        duty: 0.5
    }),
    onNormalize: (m) => {
        if (m.period === undefined && m.rate !== undefined) {
            m.period = 1.0 / Math.max(0.001, m.rate);
        } else if (m.period !== undefined) {
            m.rate = 1.0 / Math.max(0.001, m.period);
        } else {
            m.period = 0.5;
            m.rate = 2.0;
        }
    },
    ports: () => ({
        in: [
            { port: 'trig_in', color: 'bg-orange-500' },
            { port: 'cv_in', color: 'bg-yellow-400' }
        ],
        out: [{ port: 'cv_out', color: 'bg-yellow-400' }]
    }),
    formatTime: (sec) => {
        const s = Math.max(0.001, Number(sec) || 0.001);
        if (s >= 10.0) {
            return `${s.toFixed(1)}s`;
        }
        if (s >= 1.0) {
            return `${s.toFixed(2)}s`;
        }
        const ms = s * 1000;
        const hz = 1.0 / s;
        const hzStr = hz >= 10 ? Math.round(hz) : hz.toFixed(1);
        if (ms < 10) {
            return `${ms.toFixed(1)}ms (${hzStr}Hz)`;
        }
        return `${Math.round(ms)}ms (${hzStr}Hz)`;
    },
    renderGrid: (m) => {
        const isSync = m.syncMode === 'sync';
        const sp = m.polarity === 'unipolar' ? 'UNI' : 'BI';
        const period = m.period ?? (m.rate ? (1.0 / Math.max(0.001, m.rate)) : 0.5);
        let rateDisp = '';
        if (isSync) {
            rateDisp = m.division || '1/4';
        } else if (period >= 1.0) {
            rateDisp = period >= 10 ? `${Math.round(period)}s` : `${period.toFixed(1)}s`;
        } else {
            rateDisp = `${Math.round(period * 1000)}ms`;
        }
        const subDisp = isSync
            ? `φ:${Math.round(m.phase || 0)}°`
            : (period < 1.0 ? `${(1.0 / period).toFixed(period <= 0.1 ? 0 : 1)}Hz` : `φ:${Math.round(m.phase || 0)}°`);
        return `<div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-indigo-300">
            <span class="text-[8px] font-bold uppercase text-indigo-400">${(m.waveType || 'sin').substring(0,3)} (${sp})</span>
            <span class="text-[13px] font-mono font-bold text-white tracking-tight">${rateDisp}</span>
            <span class="text-[7.5px] font-mono text-indigo-400/80">${subDisp}</span>
        </div>`;
    },
    schema: {
        color: 'indigo',
        header: {
            groups: [
                {
                    key: 'syncMode',
                    reRender: true,
                    options: [
                        { val: 'free', label: 'FREE (Time)' },
                        { val: 'sync', label: 'SYNC (BPM)' }
                    ]
                },
                {
                    key: 'polarity',
                    options: [
                        { val: 'bipolar', label: 'BI (±)' },
                        { val: 'unipolar', label: 'UNI (+)' }
                    ]
                }
            ]
        },
        groups: [
            {
                key: 'waveType',
                label: 'Waveform',
                cols: 5,
                options: [
                    { val: 'sine', label: 'SIN' },
                    { val: 'triangle', label: 'TRI' },
                    { val: 'sawtooth', label: 'SAW' },
                    { val: 'ramp', label: 'RAMP' },
                    { val: 'square', label: 'SQR' }
                ]
            }
        ],
        sliders: (m) => {
            const isSync = m.syncMode === 'sync';
            const divs = LFO.DIVISIONS;
            const rateSlider = isSync ? {
                key: 'division',
                label: 'BEAT',
                min: 0, max: divs.length - 1, step: 1, default: 4,
                unit: 'DIV',
                getVal: (mod) => {
                    const idx = divs.indexOf(mod.division || '1/4');
                    return idx === -1 ? 4 : idx;
                },
                setVal: (mod, v) => {
                    mod.division = divs[Math.round(v)] || '1/4';
                },
                format: (v) => divs[Math.round(v)] || '1/4'
            } : {
                key: 'period',
                label: 'TIME',
                min: 0.01, max: 120.0, step: 0.001, default: 0.5,
                unit: 's',
                power: 3.0,
                getVal: (mod) => {
                    if (mod.period !== undefined) return mod.period;
                    if (mod.rate) return 1.0 / Math.max(0.001, mod.rate);
                    return 0.5;
                },
                setVal: (mod, v) => {
                    const sec = Math.max(0.01, Math.min(120.0, v));
                    mod.period = sec;
                    mod.rate = 1.0 / sec;
                },
                format: (v) => LFO.formatTime(v)
            };
            return [
                rateSlider,
                { key: 'phase', label: 'PHASE', min: 0, max: 360, step: 1, default: 0, unit: 'deg', format: (v) => `${Math.round(v)}°` },
                { key: 'depth', label: 'DEPTH', min: 0, max: 5.0, step: 0.05, default: 1.0, unit: 'cv', format: (v) => Number(v).toFixed(2) },
                { key: 'duty', label: 'DUTY', min: 0.05, max: 0.95, step: 0.01, default: 0.5, unit: '%', format: (v) => `${Math.round(v * 100)}%` }
            ];
        }
    }
};

export const CLK = {
    color: 'rose',
    RATES: ['/16', '/8', '/7', '/6', '/5', '/4', '/3', '/2', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'x16'],
    defaults: () => ({ type: 'CLK', div: 'x2', pulseWidthMs: 15, limitPct: 90 }),
    ports: () => ({ in: [{ port: 'power_in', color: 'bg-red-500' }], out: [{ port: 'gate_out', color: 'bg-red-500' }] }),
    renderGrid: (m, ctx) => {
        const bpm = ctx?.bpm || 120, mult = parseClockRate(m.div || 'x2');
        const intMs = Math.round((60.0 / bpm / mult) * 1000);
        const limPct = m.limitPct ?? 90;
        const maxMs = Math.max(1, Math.round(intMs * (limPct / 100)));
        const curP = m.pulseWidthMs ?? 15;
        const effMs = Math.min(curP, maxMs);
        return `<div class="flex flex-col items-center justify-center leading-tight gap-0.5 pointer-events-none text-cyan-400"><span class="text-[15px] font-mono font-bold">${m.div || 'x2'}</span><span class="text-[10px] font-mono font-semibold">${effMs}ms</span></div>`;
    },
    renderModal: (m, ctx) => {
        const bpm = ctx?.bpm || 120, mult = parseClockRate(m.div || 'x2'), intMs = Math.round((60.0 / bpm / mult) * 1000);
        const limPct = m.limitPct ?? 90;
        const maxAllowedMs = Math.max(1, Math.round(intMs * (limPct / 100)));
        const curPulse = m.pulseWidthMs ?? 15;
        const isClamped = curPulse > maxAllowedMs;
        const effectiveMs = isClamped ? maxAllowedMs : curPulse;

        const rates = CLK.RATES;
        let rateIdx = rates.indexOf(m.div || 'x2');
        if (rateIdx === -1) {
            let closestIdx = 8, minDiff = Infinity;
            rates.forEach((r, idx) => {
                const diff = Math.abs(parseClockRate(r) - mult);
                if (diff < minDiff) { minDiff = diff; closestIdx = idx; }
            });
            rateIdx = closestIdx;
        }
        const curRateStr = rates[rateIdx];

        return `
            <div class="flex flex-col gap-1.5 p-1">
                <div id="clk-banner" class="w-full py-1 rounded text-center text-[9.5px] font-mono font-bold border transition-colors ${isClamped ? 'bg-amber-950/80 text-amber-300 border-amber-500/70' : 'bg-rose-950/80 text-rose-300 border-rose-500/70'}">
                    GATE: ${effectiveMs}ms / ${intMs}ms
                </div>
                <div class="flex items-center justify-around bg-slate-950/60 p-1.5 rounded-xl border border-slate-800 gap-1">
                    ${UIHelpers.createVSliderHTML('clk-gate', 'PULSE', 2, 1500, 1, curPulse, 'ms', 'rose', false, `${curPulse}ms`)}
                    ${UIHelpers.createVSliderHTML('clk-limit', 'LIMIT', 10, 90, 1, Math.min(90, limPct), '%', 'amber', false, `${Math.min(90, limPct)}%`)}
                    ${UIHelpers.createVSliderHTML('clk-rate', 'RATE', 0, rates.length - 1, 1, rateIdx, 'rate', 'rose', false, curRateStr)}
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const rates = CLK.RATES;
        const updateBanner = () => {
            const bpm = ctx?.bpm || 120;
            const mult = parseClockRate(m.div || 'x2');
            const intMs = Math.round((60.0 / bpm / mult) * 1000);
            const limPct = Math.min(90, m.limitPct ?? 90);
            const maxAllowedMs = Math.max(1, Math.round(intMs * (limPct / 100)));
            const curPulse = m.pulseWidthMs ?? 15;
            const isClamped = curPulse > maxAllowedMs;
            const effMs = isClamped ? maxAllowedMs : curPulse;

            const banner = document.getElementById('clk-banner');
            if (banner) {
                banner.className = `w-full py-1 rounded text-center text-[9.5px] font-mono font-bold border transition-colors ${
                    isClamped ? 'bg-amber-950/80 text-amber-300 border-amber-500/70' : 'bg-rose-950/80 text-rose-300 border-rose-500/70'
                }`;
                banner.textContent = `GATE: ${effMs}ms / ${intMs}ms`;
            }
        };

        UIHelpers.bindSlider('clk-gate', v => `${Math.round(v)}ms`, v => {
            m.pulseWidthMs = Math.round(v);
            updateBanner();
            cb();
        }, 1, 2, 1500);
        UIHelpers.bindSlider('clk-limit', v => `${Math.round(v)}%`, v => {
            m.limitPct = Math.min(90, Math.round(v));
            updateBanner();
            cb();
        }, 1, 10, 90);
        UIHelpers.bindSlider('clk-rate', v => {
            const idx = Math.min(rates.length - 1, Math.max(0, Math.round(v)));
            return rates[idx];
        }, v => {
            const idx = Math.min(rates.length - 1, Math.max(0, Math.round(v)));
            m.div = rates[idx];
            updateBanner();
            cb();
        }, 1, 0, rates.length - 1);
    }
};

export const THROUGH = {
    color: 'amber',
    defaults: () => ({ type: 'THROUGH', state: true }),
    ports: () => ({
        in: [{ port: 'wave_in', color: 'bg-blue-500' }],
        out: [{ port: 'wave_out', color: 'bg-blue-500' }]
    }),
    UI_STATES: {
        true:  { badgeCls: 'bg-amber-500/20 text-amber-300', badgeLabel: 'THRU', btnCls: 'bg-amber-500 text-slate-950 border-amber-300', btnText: 'PASSING (THRU)' },
        false: { badgeCls: 'bg-slate-950 text-slate-600',       badgeLabel: 'MUTE', btnCls: 'bg-black text-slate-500 border-slate-800',       btnText: 'MUTED (OFF)' }
    },
    renderGrid: (m) => {
        const st = THROUGH.UI_STATES[m.state !== false];
        return `<div class="flex items-center justify-center w-full h-full pointer-events-none"><div class="w-7 h-5 rounded border border-slate-600 flex items-center justify-center ${st.badgeCls} font-bold text-[8px] tracking-tight">${st.badgeLabel}</div></div>`;
    },
    renderModal: (m, ctx) => {
        const st = THROUGH.UI_STATES[m.state !== false];
        return `<div class="flex flex-col items-center p-2"><button id="toggle-switch-btn" class="w-full py-2 rounded-lg font-bold text-xs border ${st.btnCls}">${st.btnText}</button></div>`;
    },
    bindEvents: (m, ctx, cb) => { document.getElementById('toggle-switch-btn')?.addEventListener('click', () => { m.state = !m.state; ctx.reRenderModal(); cb(); }); }
};

export const MATH = {
    color: 'purple',
    defaults: () => ({ type: 'MATH', expr: 'A', valA: 0.0, valB: 1.0, valC: 0.0 }),
    ports: () => ({
        in: [
            { port: 'CV_inA', pin: 4, alias: 'a', color: 'bg-yellow-400' },
            { port: 'CV_inB', pin: 5, alias: 'b', color: 'bg-yellow-400' },
            { port: 'CV_inC', pin: 6, alias: 'c', color: 'bg-yellow-400' }
        ],
        out: [{ port: 'CV_OUT', pin: 9, alias: 'out', color: 'bg-yellow-400' }]
    }),
    renderGrid: renderMathGridUI,
    updateLive: updateMathLiveUI,
    renderModal: renderMathModalUI,
    bindEvents: bindMathEventsUI
};

export const MATH1 = {
    ...MATH,
    defaults: () => ({ type: 'MATH1', expr: 'A', valA: 0.0, valB: 1.0, valC: 0.0 })
};

export const MATH2 = {
    ...MATH,
    defaults: () => ({ type: 'MATH2', expr: 'A + B', valA: 0.0, valB: 1.0, valC: 0.0 })
};

export const SH = {
    color: 'fuchsia',
    defaults: () => ({ type: 'SH', glide: 0.0, scale: 1.0, polarity: 'unipolar' }),
    ports: () => ({
        in: [
            { port: 'sig_in', color: 'bg-yellow-400' },
            { port: 'trig_in', color: 'bg-orange-500' }
        ],
        out: [{ port: 'cv_out', color: 'bg-yellow-400' }]
    }),
    schema: {
        color: 'fuchsia',
        groups: [{ key: 'polarity', label: 'Internal Source', cols: 2, options: [{ val: 'unipolar', label: 'UNI (0〜1V)' }, { val: 'bipolar', label: 'BI (±1V)' }] }],
        sliders: [
            { key: 'glide', label: 'GLIDE', min: 0.0, max: 0.5, step: 0.01, default: 0.0, unit: 's', color: 'fuchsia', format: v => v<=0.001?'OFF':Math.round(v*1000)+'ms' },
            { key: 'scale', label: 'SCALE', min: -3.0, max: 3.0, step: 0.05, default: 1.0, unit: 'x', color: 'fuchsia', format: v => (v>=0?'+':'')+v.toFixed(2) }
        ]
    },
    renderGrid: (m) => `<div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-cyan-400"><span class="text-[8px] font-bold uppercase">S&amp;H</span><span class="sh-disp-val text-[14px] text-cyan-300 font-mono font-bold">+0.00</span></div>`,
    updateLive: (cell, data) => { const d = cell.querySelector('.sh-disp-val'); if (d && data?.values) d.textContent = (data.values[0]>=0?'+':'') + Number(data.values[0]||0).toFixed(2); },
    renderModal: (m, ctx) => `
        <div class="flex items-center justify-between pb-1 border-b border-slate-800 px-1">
            <span class="text-[8px] font-mono text-fuchsia-300 font-bold">${ctx.patched?.has('sig_in')?'EXT SIGNAL':'INTERNAL NOISE'}</span>
            <button id="sh-trig-btn" class="h-4 px-1.5 rounded text-[7.5px] font-bold border leading-none inline-flex items-center justify-center bg-fuchsia-600 text-white border-fuchsia-400">TRIG</button>
        </div>${UIHelpers.renderSchemaModal(m, ctx, SH.schema)}`,
    bindEvents: (m, ctx, cb) => {
        UIHelpers.bindSchemaEvents(m, ctx, SH.schema, cb);
        document.getElementById('sh-trig-btn')?.addEventListener('click', () => ctx.triggerManualSample?.());
    }
};

export const modDefs = {
    LFO,
    CLK,
    THROUGH,
    MATH,
    MATH1,
    MATH2,
    SH
};
