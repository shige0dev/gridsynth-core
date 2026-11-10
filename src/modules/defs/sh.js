// src/modules/defs/sh.js
import { UIHelpers } from '../../ui/helpers.js';

export const SWITCH = {
    color: 'amber',
    defaults: () => ({ type: 'SWITCH', state: true }),
    ports: () => ({
        in: [{ port: 'cv_in', pin: 5, color: 'bg-yellow-400' }],
        out: [{ port: 'cv_out', pin: 10, color: 'bg-yellow-400' }]
    }),
    UI_STATES: {
        true:  { btnCls: 'bg-amber-500 text-slate-950 border-amber-300 font-bold', btnText: 'ON (PASSING)' },
        false: { btnCls: 'bg-slate-950 text-slate-500 border-slate-800 font-bold',  btnText: 'OFF (MUTED)' }
    },
    renderGrid: (m) => {
        const isOn = m.state !== false;
        return `
            <div class="relative flex items-center justify-center w-full h-full pointer-events-none select-none">
                <div class="relative flex flex-col items-center">
                    ${UIHelpers.renderPanelBars([
                        { pct: isOn ? 100 : 0, width: 'w-4', innerCls: 'switch-bar transition-all duration-100', color: 'bg-gradient-to-t from-amber-600 to-yellow-400' }
                    ], { heightCls: 'h-7', noWrapper: true })}
                    <div class="absolute top-full mt-[2px] text-[7.5px] font-mono font-bold leading-none tracking-tight text-center max-w-[64px] ${isOn ? 'text-cyan-300' : 'text-slate-600'}">
                        ${isOn ? 'ON' : 'OFF'}
                    </div>
                </div>
            </div>`;
    },
    renderModal: (m, ctx) => {
        const isOn = m.state !== false;
        const st = SWITCH.UI_STATES[isOn];
        return `
            <div class="flex flex-col items-center gap-2.5 p-1 select-none">
                <div class="flex items-center justify-center bg-slate-950/80 p-3 rounded-xl border border-slate-800 w-full">
                    <div class="w-8 h-12 rounded-sm p-[2px] flex flex-col justify-end border ${isOn ? 'border-amber-400/80 shadow-md shadow-amber-500/20' : 'border-slate-700'} bg-slate-950">
                        <div class="w-full ${isOn ? 'bg-gradient-to-t from-amber-600 to-yellow-400' : 'bg-transparent'} rounded-xs transition-all duration-100" style="height: ${isOn ? '100%' : '0%'};"></div>
                    </div>
                </div>
                <button id="toggle-switch-btn" class="w-full py-2 rounded-lg font-bold text-[10px] tracking-wider font-mono border transition-all active:scale-95 cursor-pointer shadow-sm ${st.btnCls}">${st.btnText}</button>
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
export const THROUGH = SWITCH;

export const SH = {
    color: 'fuchsia',
    defaults: () => ({ type: 'SH', glide: 0.0, scale: 1.0, polarity: 'unipolar' }),
    ports: () => ({
        in: [
            { port: 'cv_in', color: 'bg-yellow-400' },
            { port: 'trig_in', color: 'bg-red-500' }
        ],
        out: [{ port: 'cv_out', color: 'bg-yellow-400' }]
    }),
    schema: {
        color: 'fuchsia',
        groups: [{ key: 'polarity', label: 'Internal Source', cols: 2, options: [{ val: 'unipolar', label: 'UNI (0〜1V)' }, { val: 'bipolar', label: 'BI (±1V)' }] }],
        sliders: [
            { key: 'glide', label: 'GLIDE', min: 0.0, max: 0.5, step: 0.01, default: 0.0, unit: 's', color: 'fuchsia', format: v => v <= 0.001 ? 'OFF' : Math.round(v * 1000) + 'ms' },
            { key: 'scale', label: 'SCALE', min: -3.0, max: 3.0, step: 0.05, default: 1.0, unit: 'x', color: 'fuchsia', format: v => (v >= 0 ? '+' : '') + v.toFixed(2) }
        ]
    },
    renderGrid: () => `<div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-cyan-400"><span class="text-[8px] font-bold uppercase">S&amp;H</span><span class="sh-disp-val text-[14px] text-cyan-300 font-mono font-bold">+0.00</span></div>`,
    updateLive: (cell, data) => {
        const d = cell.querySelector('.sh-disp-val');
        if (d && data?.values) d.textContent = (data.values[0] >= 0 ? '+' : '') + Number(data.values[0] || 0).toFixed(2);
    },
    renderModal: (m, ctx) => `
        <div class="flex items-center justify-between pb-1 border-b border-slate-800 px-1">
            <span class="text-[8px] font-mono text-fuchsia-300 font-bold">${(ctx.patched?.has('cv_in') || ctx.patched?.has('sig_in')) ? 'EXT SIGNAL' : 'INTERNAL NOISE'}</span>
            <button id="sh-trig-btn" class="h-4 px-1.5 rounded text-[7.5px] font-bold border leading-none inline-flex items-center justify-center bg-fuchsia-600 text-white border-fuchsia-400">TRIG</button>
        </div>${UIHelpers.renderSchemaModal(m, ctx, SH.schema)}`,
    bindEvents: (m, ctx, cb) => {
        UIHelpers.bindSchemaEvents(m, ctx, SH.schema, cb);
        document.getElementById('sh-trig-btn')?.addEventListener('click', () => ctx.triggerManualSample?.());
    }
};

