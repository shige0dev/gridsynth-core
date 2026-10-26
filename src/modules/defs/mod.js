import { UIHelpers } from '../../ui/helpers.js?v=365';
import { parseClockRate } from '../../core/signals.js?v=365';

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
                    const isPatched = ctx.patched?.has('CV_in' + k) || ctx.patched?.has('cv_in' + port) || ctx.patched?.has(port);
                    const val = m[`val${k}`] ?? (k === 'B' ? 1.0 : 0.0);
                    if (isPatched) {
                        return `
                            <div class="flex items-center justify-between bg-slate-950/40 px-2 py-1.5 rounded-lg border border-slate-800 opacity-60 cursor-not-allowed select-none">
                                <span class="text-[8px] font-bold text-slate-500 font-mono">VAL ${k}</span>
                                <span class="text-[7.5px] font-mono px-1.5 py-0.5 rounded bg-slate-800/90 text-emerald-400 font-bold tracking-tight">CABLED (0.00)</span>
                            </div>`;
                    }
                    return `
                        <div class="flex items-center justify-between bg-slate-950/70 px-2 py-1.5 rounded-lg border border-purple-500/40 shadow-sm select-none">
                            <span class="text-[8px] font-bold text-purple-300 font-mono">VAL ${k}</span>
                            <div id="math-val-${port}-box" class="flex items-center gap-1 cursor-ns-resize touch-none hover:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 transition group" title="上下スワイプで増減 / タップで数値入力">
                                <span class="text-[7px] text-slate-500 group-hover:text-purple-300 transition-colors pointer-events-none">↕</span>
                                <span id="math-val-${port}-disp" class="text-[9.5px] font-mono text-cyan-300 group-hover:text-cyan-100 font-bold leading-none pointer-events-none">${fmt(val)}</span>
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
    valKeys.forEach(k => {
        const port = k.toLowerCase();
        const box = document.getElementById(`math-val-${port}-box`);
        const disp = document.getElementById(`math-val-${port}-disp`);
        if (!box) return;

        let isDragging = false;
        let startY = 0;
        let startVal = 0;
        let moved = false;

        const onPointerMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const deltaY = startY - e.clientY;
            if (Math.abs(deltaY) > 3) moved = true;
            // 15pxスワイプで約0.1V増減（感度よく滑らかに加減）
            const deltaVal = deltaY * 0.01;
            const clamped = Math.max(-10.0, Math.min(10.0, Math.round((startVal + deltaVal) * 20) / 20));
            m[`val${k}`] = clamped;
            if (disp) disp.textContent = (clamped >= 0 ? '+' : '') + clamped.toFixed(2);
            cb();
        };

        const onPointerUp = async (e) => {
            if (!isDragging) return;
            isDragging = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            box.classList.remove('ring-1', 'ring-purple-400', 'bg-purple-950/60');
            try { box.releasePointerCapture(e.pointerId); } catch (_) {}

            // スワイプ移動がなく単にタップされた場合は手入力プロンプトを開く
            if (!moved) {
                const cur = String(m[`val${k}`] ?? (k === 'B' ? 1.0 : 0.0));
                const res = await ctx.prompt(`CONSTANT ${k}`, cur);
                if (res !== null && res !== '') {
                    const num = parseFloat(res);
                    if (!isNaN(num)) {
                        m[`val${k}`] = Math.max(-10.0, Math.min(10.0, num));
                        ctx.reRenderModal();
                        cb();
                    }
                }
            }
        };

        box.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            moved = false;
            startY = e.clientY;
            startVal = m[`val${k}`] ?? (k === 'B' ? 1.0 : 0.0);
            box.classList.add('ring-1', 'ring-purple-400', 'bg-purple-950/60');
            try { box.setPointerCapture(e.pointerId); } catch (_) {}
            window.addEventListener('pointermove', onPointerMove, { passive: false });
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);
        });
    });
};

const renderMathGridUI = (m) => {
    const mode = m.mode || (m.type === 'MATH1' ? '-' : 'ADD');
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
        in: [{ port: 'cv_in', alias: 'wave_in', color: 'bg-yellow-400' }],
        out: [{ port: 'cv_out', alias: 'wave_out', color: 'bg-yellow-400' }]
    }),
    UI_STATES: {
        true:  { btnCls: 'bg-amber-500 text-slate-950 border-amber-300', btnText: 'PASSING (THRU)' },
        false: { btnCls: 'bg-black text-slate-500 border-slate-800',       btnText: 'MUTED (OFF)' }
    },
    renderGrid: (m) => {
        const isPass = m.state !== false;
        return `<div class="flex items-center justify-center w-full h-full pointer-events-none">${UIHelpers.renderPanelBars([
            { pct: isPass ? 100 : 0, width: 'w-4', innerCls: 'thru-bar', attrs: 'data-thru-bar="0"', color: 'bg-gradient-to-t from-amber-600 to-yellow-400' }
        ], { noWrapper: true })}</div>`;
    },
    renderModal: (m, ctx) => {
        const isPass = m.state !== false;
        const st = THROUGH.UI_STATES[isPass];
        return `
            <div class="flex flex-col items-center gap-2 p-2">
                <div class="flex items-center justify-center bg-slate-950/80 p-2 rounded-xl border border-slate-800 w-full">
                    <div class="w-6 h-9 rounded-sm p-[1.5px] flex flex-col justify-end border border-slate-600 bg-slate-950/40">
                        <div class="w-full ${isPass ? 'bg-gradient-to-t from-amber-600 to-yellow-400 shadow-md shadow-amber-500/40' : 'bg-transparent'} rounded-xs transition-all duration-150" style="height: ${isPass ? '100%' : '0%'};"></div>
                    </div>
                </div>
                <button id="toggle-switch-btn" class="w-full py-2 rounded-lg font-bold text-xs border transition-colors ${st.btnCls}">${st.btnText}</button>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        document.getElementById('toggle-switch-btn')?.addEventListener('click', () => {
            m.state = !m.state;
            ctx.reRenderModal();
            cb();
        });
    }
};

export const MATH1 = {
    color: 'purple',
    MODES: ['-', 'ABS', 'FLOOR', 'CEIL', 'ROUND', 'INT', 'NOT'],
    defaults: () => ({ type: 'MATH1', mode: '-', valA: 0.0 }),
    ports: () => ({
        in: [{ port: 'CV_inA', pin: 4, alias: 'a', color: 'bg-yellow-400' }],
        out: [{ port: 'CV_OUT', pin: 9, alias: 'out', color: 'bg-yellow-400' }]
    }),
    renderGrid: renderMathGridUI,
    updateLive: updateMathLiveUI,
    renderModal: (m, ctx) => renderMathModalUI(m, ctx, [{ label: 'Functions (A)', cols: 4, modes: MATH1.MODES }], ['A']),
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
            { port: 'CV_inA', pin: 4, alias: 'a', color: 'bg-yellow-400' },
            { port: 'CV_inB', pin: 5, alias: 'b', color: 'bg-yellow-400' }
        ],
        out: [{ port: 'CV_OUT', pin: 9, alias: 'out', color: 'bg-yellow-400' }]
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
