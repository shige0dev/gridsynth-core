import { UIHelpers } from '../../ui/helpers.js';
import { parseClockRate } from '../../core/utils.js';

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
            <div class="grid grid-cols-${valKeys.length} gap-1.5 pt-0.5">
                ${valKeys.map(k => {
                    const port = k.toLowerCase();
                    const p = ctx.patched?.has('CV_in' + k) || ctx.patched?.has('cv_in' + port) || ctx.patched?.has(port);
                    return `
                        <button id="math-val-${port}" class="py-1 px-1.5 rounded border text-[9px] font-mono font-bold flex items-center justify-between ${p ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-800 border-purple-500/60 text-purple-200 active:bg-purple-900'}">
                            <span class="text-[7.5px] text-slate-400">${valKeys.length > 1 ? k.toUpperCase() : 'CONSTANT ' + k.toUpperCase()}</span>
                            <span>${p ? 'EXT' : fmt(m[`val${k}`] ?? (k === 'B' ? 1.0 : 0.0))}</span>
                        </button>`;
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
    valKeys.forEach(k => {
        const port = k.toLowerCase();
        const isPatched = ctx.patched?.has('CV_in' + k) || ctx.patched?.has('cv_in' + port) || ctx.patched?.has(port);
        const btn = document.getElementById(`math-val-${port}`);
        if (btn && !isPatched) {
            btn.addEventListener('click', async () => {
                const res = await ctx.prompt(`CONSTANT ${k.toUpperCase()}`, String(m[`val${k}`] ?? (k === 'B' ? 1.0 : 0.0)));
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
        if (m.period === undefined) {
            m.period = m.rate ? (1.0 / Math.max(0.001, m.rate)) : 0.5;
        }
        if (m.rate === undefined) {
            m.rate = m.period ? (1.0 / Math.max(0.001, m.period)) : 2.0;
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
                min: 0.01, max: 60.0, step: 0.001, default: 0.5,
                unit: 's',
                power: 3.0,
                getVal: (mod) => {
                    if (mod.period !== undefined) return mod.period;
                    if (mod.rate) return 1.0 / Math.max(0.001, mod.rate);
                    return 0.5;
                },
                setVal: (mod, v) => {
                    const sec = Math.max(0.01, Math.min(60.0, v));
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
    ports: () => ({ in: [], out: [{ port: 'gate_out', color: 'bg-red-500' }] }),
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

export const MATH1 = {
    color: 'purple',
    MODES: ['ABS', 'FLOOR', 'CEIL', 'ROUND', 'INT'],
    defaults: () => ({ type: 'MATH1', mode: 'ABS', valA: 0.0 }),
    ports: () => ({
        in: [{ port: 'CV_inA', color: 'bg-yellow-400' }],
        out: [{ port: 'CV_OUT', color: 'bg-yellow-400' }]
    }),
    renderGrid: renderMathGridUI,
    updateLive: updateMathLiveUI,
    renderModal: (m, ctx) => renderMathModalUI(m, ctx, [{ label: 'Functions (A)', cols: 5, modes: MATH1.MODES }], ['A']),
    bindEvents: (m, ctx, cb) => bindMathEventsUI(m, ctx, cb, ['A'])
};

export const MATH2 = {
    color: 'purple',
    ARITHMETIC_MODES: ['ADD', 'DIFF', 'MULTI', 'MOD', 'A^B', 'MIN', 'MAX'],
    COMPARISON_MODES: ['<', '<=', '==', '>=', '>'],
    defaults: () => ({ type: 'MATH2', mode: 'ADD', valA: 0.0, valB: 1.0 }),
    ports: () => ({
        in: [
            { port: 'CV_inA', color: 'bg-yellow-400' },
            { port: 'CV_inB', color: 'bg-yellow-400' }
        ],
        out: [{ port: 'CV_OUT', color: 'bg-yellow-400' }]
    }),
    renderGrid: renderMathGridUI,
    updateLive: updateMathLiveUI,
    renderModal: (m, ctx) => renderMathModalUI(m, ctx, [
        { label: 'Arithmetic', cols: 4, modes: MATH2.ARITHMETIC_MODES },
        { label: 'Comparison (A vs B)', cols: 5, modes: MATH2.COMPARISON_MODES }
    ], ['A', 'B']),
    bindEvents: (m, ctx, cb) => bindMathEventsUI(m, ctx, cb, ['A', 'B'])
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
    MATH1,
    MATH2,
    SH
};
