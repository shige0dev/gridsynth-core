import { UIHelpers } from '../../ui/helpers.js';

export const GATE4 = {
    color: 'orange',
    defaults: () => ({ type: 'GATE4', steps: 4, mode: 'up' }),
    ports: (m) => ({
        in: [{ port: 'gate_in', pin: 4, color: 'bg-rose-500' }],
        out: [1, 2, 3, 4].map(idx => ({
            port: `gate_out${idx}`,
            pin: 5 + idx, // PIN 6, 7, 8, 9 along bottom edge
            color: 'bg-orange-500',
            dimmed: idx > (m.steps ?? 4)
        }))
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const curSteps = m.steps ?? 4;
        return `<div class="flex items-center justify-center w-full h-full pointer-events-none">${UIHelpers.renderPanelBars(
            [1, 2, 3, 4].map(idx => {
                const isDis = idx > curSteps;
                return {
                    pct: isDis ? 0 : 100,
                    innerCls: `gate4-bar-${idx - 1} ${isDis ? 'opacity-20' : ''}`,
                    outerCls: isDis ? 'opacity-25' : '',
                    attrs: `data-gate4-bar="${idx - 1}"`,
                    width: 'w-2',
                    color: 'bg-gradient-to-t from-orange-600 to-amber-400'
                };
            }),
            { gapCls: 'gap-1.5' }
        )}</div>`;
    },
    renderModal: (m, ctx) => {
        const curSteps = m.steps ?? 4;
        const curMode = m.mode || 'up';
        const modes = [
            { val: 'up', label: 'UP' },
            { val: 'down', label: 'DOWN' },
            { val: 'updown', label: 'UP/DOWN' },
            { val: 'random', label: 'RANDOM' }
        ];

        return `
            <div class="space-y-2 p-1">
                <div>
                    <label class="block text-[8px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Active Steps (2-4)</label>
                    <div class="grid grid-cols-3 gap-1">
                        ${[2, 3, 4].map(st => `
                            <button class="gate4-steps-btn py-1 rounded text-[8.5px] font-bold border transition-all ${curSteps === st ? 'bg-orange-600 text-white border-orange-400 shadow-sm shadow-orange-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="${st}">${st} STEPS</button>
                        `).join('')}
                    </div>
                </div>
                <div>
                    <label class="block text-[8px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Direction Mode</label>
                    <div class="grid grid-cols-4 gap-1">
                        ${modes.map(md => `
                            <button class="gate4-mode-btn py-1 rounded text-[8px] font-bold border transition-all ${curMode === md.val ? 'bg-orange-600 text-white border-orange-400 shadow-sm shadow-orange-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="${md.val}">${md.label}</button>
                        `).join('')}
                    </div>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        UIHelpers.bindButtonGroup('.gate4-steps-btn', 'bg-orange-600 text-white border-orange-400 shadow-sm shadow-orange-500/50', 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800', val => {
            m.steps = parseInt(val, 10);
            ctx.reRenderModal();
            cb();
        });
        UIHelpers.bindButtonGroup('.gate4-mode-btn', 'bg-orange-600 text-white border-orange-400 shadow-sm shadow-orange-500/50', 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800', val => {
            m.mode = val;
            ctx.reRenderModal();
            cb();
        });
    },
    updateLive: (cell, data, isPlaying, modalEl, m) => {
        if (!data || data.step === undefined) return;
        const cur = data.step;
        const curSteps = m.steps ?? 4;
        cell?.querySelectorAll('[data-gate4-bar]').forEach((bar, idx) => {
            const isDis = (idx + 1) > curSteps;
            const isAct = (idx === cur) && !isDis && isPlaying;
            bar.classList.toggle('bar-active', isAct);
        });
    }
};

export const ARP = {
    color: 'purple',
    defaults: () => ({ type: 'ARP', mode: 'up' }),
    ports: (m, ctx) => ({
        in: [
            { port: 'clk_in', pin: 0, alias: 'trig_in', color: 'bg-red-500' },
            { port: 'cv_in4', pin: 1, color: 'bg-yellow-400', dimmed: !ctx?.patched?.has('cv_in4') && !ctx?.patched?.has('in_4') && !ctx?.patched?.has('in4') },
            { port: 'cv_in3', pin: 2, color: 'bg-yellow-400', dimmed: !ctx?.patched?.has('cv_in3') && !ctx?.patched?.has('in_3') && !ctx?.patched?.has('in3') },
            { port: 'cv_in2', pin: 3, color: 'bg-yellow-400', dimmed: !ctx?.patched?.has('cv_in2') && !ctx?.patched?.has('in_2') && !ctx?.patched?.has('in2') },
            { port: 'cv_in1', pin: 14, color: 'bg-yellow-400', dimmed: !ctx?.patched?.has('cv_in1') && !ctx?.patched?.has('in_1') && !ctx?.patched?.has('in1') }
        ],
        out: [
            { port: 'cv_out', pin: 9, alias: 'out', color: 'bg-yellow-400' },
            { port: 'gate_out', pin: 10, color: 'bg-red-500' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m, ctx) => {
        const patched = ctx?.patched || new Set();
        return `<div class="flex items-center justify-center w-full h-full pointer-events-none">${UIHelpers.renderPanelBars(
            [1, 2, 3, 4].map(idx => {
                const isP = patched.has(`cv_in${idx}`) || patched.has(`in_${idx}`) || patched.has(`in${idx}`);
                return {
                    pct: isP ? 100 : 0,
                    innerCls: `arp-bar-${idx - 1} ${!isP ? 'opacity-20' : ''}`,
                    outerCls: !isP ? 'opacity-25' : '',
                    attrs: `data-arp-bar="${idx - 1}"`,
                    width: 'w-2',
                    theme: 'cv'
                };
            }),
            { gapCls: 'gap-1.5' }
        )}</div>`;
    },
    renderModal: (m, ctx) => {
        const curMode = m.mode || 'up';
        const patched = ctx?.patched || new Set();
        const activeCount = [1, 2, 3, 4].filter(idx => patched.has(`cv_in${idx}`) || patched.has(`in_${idx}`) || patched.has(`in${idx}`)).length;
        const modes = [
            { val: 'up', label: 'UP' },
            { val: 'down', label: 'DOWN' },
            { val: 'updown', label: 'UP/DOWN' },
            { val: 'random', label: 'RANDOM' }
        ];

        return `
            <div class="space-y-2 p-1">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Active Inputs</span>
                    <span class="text-[8.5px] font-mono font-bold ${activeCount > 0 ? 'text-purple-300' : 'text-slate-500'}">${activeCount} / 4 CONNECTED</span>
                </div>
                <div class="flex items-center justify-around bg-slate-950/80 p-1.5 rounded border border-slate-800">
                    ${[1, 2, 3, 4].map(idx => {
                        const isP = patched.has(`cv_in${idx}`) || patched.has(`in_${idx}`) || patched.has(`in${idx}`);
                        return `
                            <div class="flex flex-col items-center gap-0.5">
                                <span class="text-[6.5px] font-mono text-slate-500">CV ${idx}</span>
                                <span class="px-2 py-0.5 rounded text-[8.5px] font-mono font-bold border ${isP ? 'bg-purple-950 text-purple-300 border-purple-500/60 shadow-sm shadow-purple-500/20' : 'bg-slate-900 text-slate-600 border-slate-800'}">${isP ? 'ON' : 'OFF'}</span>
                            </div>`;
                    }).join('')}
                </div>
                <div>
                    <label class="block text-[8px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Sequence Mode</label>
                    <div class="grid grid-cols-4 gap-1">
                        ${modes.map(md => `
                            <button class="arp-mode-btn py-1 rounded text-[8px] font-bold border transition-all ${curMode === md.val ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="${md.val}">${md.label}</button>
                        `).join('')}
                    </div>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        UIHelpers.bindButtonGroup('.arp-mode-btn', 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50', 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800', val => {
            m.mode = val;
            ctx.reRenderModal();
            cb();
        });
    },
    updateLive: (cell, data, isPlaying, modalEl, m) => {
        if (!data) return;
        const ch = data.activeChannel; // 0..3
        const activeInputs = data.activeInputs || [];
        cell?.querySelectorAll('[data-arp-bar]').forEach((bar, idx) => {
            const isConnected = activeInputs.includes(idx);
            const isAct = (idx === ch) && isConnected && isPlaying;
            bar.classList.toggle('bar-active', isAct);
        });
    }
};

export const FLIP = {
    color: 'orange',
    defaults: () => ({ type: 'FLIP', initState: 0 }),
    ports: () => ({
        in: [{ port: 'gate_in', pin: 4, alias: 'trig_in', color: 'bg-rose-500' }],
        out: [
            { port: 'cv_out1', pin: 8, alias: 'gate_out1', color: 'bg-yellow-400' },
            { port: 'cv_out2', pin: 9, alias: 'gate_out2', color: 'bg-yellow-400' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const st = m.initState ? 1 : 0;
        const b0Act = st === 0;
        const b1Act = st === 1;
        return `<div class="flex items-center justify-center w-full h-full pointer-events-none">${UIHelpers.renderPanelBars([
            { pct: b0Act ? 100 : 0, width: 'w-3.5', innerCls: 'flip-bar-0', attrs: 'data-flip-bar="0"', color: 'bg-gradient-to-t from-amber-600 to-yellow-400' },
            { pct: b1Act ? 100 : 0, width: 'w-3.5', innerCls: 'flip-bar-1', attrs: 'data-flip-bar="1"', color: 'bg-gradient-to-t from-amber-600 to-yellow-400' }
        ], { gapCls: 'gap-2' })}</div>`;
    },
    renderModal: (m) => {
        const initSt = m.initState ? 1 : 0;
        const b0Act = initSt === 0;
        const b1Act = initSt === 1;
        return `
            <div class="space-y-2 p-1 text-slate-200">
                <div class="grid grid-cols-2 gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                    <div id="flip-modal-box-0" class="flex flex-col items-center gap-1.5 py-2 rounded-lg border transition-colors ${b0Act ? 'bg-amber-950/70 border-amber-500/80' : 'bg-slate-900/60 border-slate-800'}">
                        <span class="text-[8px] font-mono font-bold ${b0Act ? 'text-amber-300' : 'text-slate-500'}">OUT 1 (PIN8)</span>
                        <div class="w-5 h-8 rounded-sm p-[1.5px] flex flex-col justify-end border border-slate-600 bg-slate-950/40">
                            <div id="flip-modal-bar-0" class="w-full ${b0Act ? 'bg-gradient-to-t from-amber-600 to-yellow-400 shadow-md shadow-amber-500/40' : 'bg-transparent'} rounded-xs transition-all duration-150" style="height: ${b0Act ? '100%' : '0%'};"></div>
                        </div>
                    </div>
                    <div id="flip-modal-box-1" class="flex flex-col items-center gap-1.5 py-2 rounded-lg border transition-colors ${b1Act ? 'bg-amber-950/70 border-amber-500/80' : 'bg-slate-900/60 border-slate-800'}">
                        <span class="text-[8px] font-mono font-bold ${b1Act ? 'text-orange-300' : 'text-slate-500'}">OUT 2 (PIN9)</span>
                        <div class="w-5 h-8 rounded-sm p-[1.5px] flex flex-col justify-end border border-slate-600 bg-slate-950/40">
                            <div id="flip-modal-bar-1" class="w-full ${b1Act ? 'bg-gradient-to-t from-amber-600 to-yellow-400 shadow-md shadow-amber-500/40' : 'bg-transparent'} rounded-xs transition-all duration-150" style="height: ${b1Act ? '100%' : '0%'};"></div>
                        </div>
                    </div>
                </div>
                <div>
                    <label class="block text-[8px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Initial State (Reset)</label>
                    <div class="grid grid-cols-2 gap-1">
                        <button class="flip-init-btn py-1 rounded text-[8px] font-bold border transition-all ${initSt === 0 ? 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/40' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="0">OUT 1 ON</button>
                        <button class="flip-init-btn py-1 rounded text-[8px] font-bold border transition-all ${initSt === 1 ? 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/40' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="1">OUT 2 ON</button>
                    </div>
                </div>
                <button id="flip-toggle-btn" class="w-full py-1.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-bold text-[9px] rounded-lg shadow-sm border border-amber-400/40 transition cursor-pointer">
                    MANUAL TOGGLE (FLIP)
                </button>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        UIHelpers.bindButtonGroup('.flip-init-btn', 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/40', 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800', val => {
            m.initState = parseInt(val, 10) ? 1 : 0;
            ctx.reRenderModal();
            cb();
        });
        document.getElementById('flip-toggle-btn')?.addEventListener('click', () => {
            ctx.triggerManualSample?.();
        });
    },
    updateLive: (cell, data, isPlaying, modalEl, m) => {
        const st = data?.state !== undefined ? data.state : (m?.initState ? 1 : 0);
        const b0Act = st === 0;
        const b1Act = st === 1;

        const bar0 = cell?.querySelector('[data-flip-bar="0"] div');
        const bar1 = cell?.querySelector('[data-flip-bar="1"] div');
        if (bar0) bar0.style.height = b0Act ? '100%' : '0%';
        if (bar1) bar1.style.height = b1Act ? '100%' : '0%';

        if (modalEl) {
            const mBox0 = modalEl.querySelector('#flip-modal-box-0');
            const mBox1 = modalEl.querySelector('#flip-modal-box-1');
            const mBar0 = modalEl.querySelector('#flip-modal-bar-0');
            const mBar1 = modalEl.querySelector('#flip-modal-bar-1');
            const mTitle0 = mBox0?.querySelector('span');
            const mTitle1 = mBox1?.querySelector('span');

            if (mBar0) {
                mBar0.style.height = b0Act ? '100%' : '0%';
                mBar0.className = `w-full ${b0Act ? 'bg-gradient-to-t from-amber-600 to-yellow-400 shadow-md shadow-amber-500/40' : 'bg-transparent'} rounded-xs transition-all duration-150`;
            }
            if (mBar1) {
                mBar1.style.height = b1Act ? '100%' : '0%';
                mBar1.className = `w-full ${b1Act ? 'bg-gradient-to-t from-amber-600 to-yellow-400 shadow-md shadow-amber-500/40' : 'bg-transparent'} rounded-xs transition-all duration-150`;
            }
            if (mBox0) mBox0.className = `flex flex-col items-center gap-1.5 py-2 rounded-lg border transition-colors ${b0Act ? 'bg-amber-950/70 border-amber-500/80' : 'bg-slate-900/60 border-slate-800'}`;
            if (mBox1) mBox1.className = `flex flex-col items-center gap-1.5 py-2 rounded-lg border transition-colors ${b1Act ? 'bg-amber-950/70 border-amber-500/80' : 'bg-slate-900/60 border-slate-800'}`;
            if (mTitle0) mTitle0.className = `text-[8px] font-mono font-bold ${b0Act ? 'text-amber-300' : 'text-slate-500'}`;
            if (mTitle1) mTitle1.className = `text-[8px] font-mono font-bold ${b1Act ? 'text-amber-300' : 'text-slate-500'}`;
        }
    }
};

export const arpDefs = {
    GATE4,
    ARP,
    FLIP,
    FF: FLIP
};
