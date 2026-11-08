// src/modules/defs/clk.js
import { UIHelpers } from '../../ui/helpers.js';
import { parseClockRate } from '../../core/signals.js';

export const CLK = {
    color: 'rose',
    RATES: ['/16', '/8', '/7', '/6', '/5', '/4', '/3', '/2', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'x16'],
    defaults: () => ({ type: 'CLK', div: 'x2', pulseWidthMs: 15, limitPct: 90 }),
    ports: () => ({
        in: [
            { port: 'reset_in', pin: 5, color: 'bg-red-500' }
        ],
        out: [{ port: 'gate_out', pin: 10, color: 'bg-red-500' }]
    }),
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

