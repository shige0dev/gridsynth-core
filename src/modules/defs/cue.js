// src/modules/defs/cue.js
import { UIHelpers } from '../../ui/helpers.js?v=216';

export const CUE = {
    color: 'amber',
    defaults: () => ({
        type: 'CUE',
        start: 0.0,
        end: 1.0,
        speedCv: 0.0
    }),
    ports: () => ({
        in: [
            { port: 'trig_in', color: 'bg-rose-500' }
        ],
        out: [
            { port: 'trig_out', color: 'bg-red-500' },
            { port: 'start_cv', color: 'bg-yellow-400' },
            { port: 'end_cv', color: 'bg-yellow-400' },
            { port: 'speed_cv', color: 'bg-yellow-400' }
        ]
    }),
    renderGrid: (m) => {
        const startPct = Math.max(5, Math.min(100, Math.round((m.start ?? 0.0) * 100)));
        const endPct = Math.max(5, Math.min(100, Math.round((m.end ?? 1.0) * 100)));
        const spdPct = Math.max(5, Math.min(100, Math.round((((m.speedCv ?? 0.0) + 4.0) / 8.0) * 100)));
        return `<div class="flex items-center justify-center w-full h-full pointer-events-none">${UIHelpers.renderPanelBars([
            { pct: startPct, innerCls: 'cue-bar-start', attrs: 'data-cue-bar="start"', width: 'w-2' },
            { pct: endPct, innerCls: 'cue-bar-end', attrs: 'data-cue-bar="end"', width: 'w-2' },
            { pct: spdPct, innerCls: 'cue-bar-spd', attrs: 'data-cue-bar="spd"', width: 'w-2' }
        ], { gapCls: 'gap-1.5', theme: 'cv' })}</div>`;
    },
    renderModal: (m, ctx) => {
        const isRev = (m.start ?? 0.0) > (m.end ?? 1.0);
        const spdSign = (m.speedCv ?? 0.0) >= 0 ? '+' : '';
        const spdDisp = `${spdSign}${(m.speedCv ?? 0.0).toFixed(1)}V`;

        return `
            <div class="space-y-2 p-1 text-slate-200">
                <!-- Trigger Button and Direction Indicator -->
                <div class="flex items-center justify-between px-1 py-1 bg-slate-950/70 rounded-lg border border-slate-800">
                    <button id="cue-manual-trig-btn" class="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[9px] transition flex items-center gap-1 shadow-sm">
                        <i data-lucide="play-circle" class="w-3 h-3"></i>
                        <span>FIRE CUE</span>
                    </button>
                    <div class="flex items-center gap-1 text-[8px] font-mono font-bold">
                        <span class="text-slate-400">DIR:</span>
                        <span class="${isRev ? 'text-rose-400' : 'text-emerald-400'}">${isRev ? 'REVERSE ◀' : 'FORWARD ▶'}</span>
                    </div>
                </div>

                <!-- Sliders: START, END, SPEED CV (Standard GridSynth VSlider Rule) -->
                <div class="flex items-center justify-around py-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1">
                    ${UIHelpers.createVSliderHTML('cue-slider-start', 'START', 0.0, 1.0, 0.01, m.start ?? 0.0, 'start', 'amber', false, `${Math.round((m.start ?? 0) * 100)}%`, 1)}
                    ${UIHelpers.createVSliderHTML('cue-slider-end', 'END', 0.0, 1.0, 0.01, m.end ?? 1.0, 'end', 'amber', false, `${Math.round((m.end ?? 1) * 100)}%`, 1)}
                    ${UIHelpers.createVSliderHTML('cue-slider-speed', 'SPEED CV', -4.0, 4.0, 0.1, m.speedCv ?? 0.0, 'spd', 'amber', false, spdDisp, 1)}
                </div>

                <div class="text-[7.5px] text-slate-500 px-1 text-center italic">
                    * トリガー入力時に3系統CVを一括ラッチ送出＆1msパルスを出力
                </div>
            </div>
        `;
    },
    bindEvents: (m, ctx, cb) => {
        const fullId = `${ctx.currentPageId || '0'}/${m.id}`;
        const inst = ctx.synth?.modules?.[fullId] || ctx.synth?.modules?.[m.id];

        // Manual Trigger
        const trigBtn = document.getElementById('cue-manual-trig-btn');
        if (trigBtn) {
            trigBtn.addEventListener('click', () => {
                inst?.trigger?.();
            });
        }

        const onSliderChange = () => {
            inst?.update?.(ctx.synth.ctx, inst, m);
            cb();
        };

        UIHelpers.bindSlider('cue-slider-start', v => `${Math.round(v * 100)}%`, v => { m.start = v; onSliderChange(); }, 1, 0.0, 1.0);
        UIHelpers.bindScrubber('cue-slider-start-disp', 'cue-slider-start', v => `${Math.round(v * 100)}%`, v => { m.start = v; onSliderChange(); }, 1, 0.0, 1.0);

        UIHelpers.bindSlider('cue-slider-end', v => `${Math.round(v * 100)}%`, v => { m.end = v; onSliderChange(); }, 1, 0.0, 1.0);
        UIHelpers.bindScrubber('cue-slider-end-disp', 'cue-slider-end', v => `${Math.round(v * 100)}%`, v => { m.end = v; onSliderChange(); }, 1, 0.0, 1.0);

        UIHelpers.bindSlider('cue-slider-speed', v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}V`, v => { m.speedCv = v; onSliderChange(); }, 1, -4.0, 4.0);
        UIHelpers.bindScrubber('cue-slider-speed-disp', 'cue-slider-speed', v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}V`, v => { m.speedCv = v; onSliderChange(); }, 1, -4.0, 4.0);
    },
    updateLive: (cell, data) => {
        const triggered = Boolean(data?.triggered);
        const now = performance.now();
        if (!cell._cueState) cell._cueState = { flashUntil: 0 };
        if (triggered) {
            cell._cueState.flashUntil = now + 60;
        }

        const isActive = (now < cell._cueState.flashUntil);
        cell.querySelectorAll('[data-cue-bar]').forEach(bar => {
            bar.classList.toggle('bar-active', isActive);
        });
    }
};

export const cueDefs = { CUE };
