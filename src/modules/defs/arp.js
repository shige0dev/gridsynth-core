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

export const FF = {
    color: 'orange',
    defaults: () => ({ type: 'FF', initState: 0 }),
    ports: () => ({
        in: [{ port: 'gate_in', pin: 4, alias: 'trig_in', color: 'bg-rose-500' }],
        out: [
            { port: 'gate_out1', pin: 8, alias: 'out1', color: 'bg-orange-500' },
            { port: 'gate_out2', pin: 9, alias: 'out2', color: 'bg-orange-500' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const st = m.initState ? 1 : 0;
        const b1Act = st === 1;
        const b2Act = st === 0;
        return `
            <div class="flex items-center justify-center gap-1.5 w-full h-full pointer-events-none">
                <div data-ff-out="0" class="w-4 h-6 rounded border flex flex-col items-center justify-center transition-colors ${b1Act ? 'bg-orange-500/30 border-orange-400 text-orange-200 shadow-sm shadow-orange-500/40' : 'bg-slate-950/70 border-slate-700 text-slate-500'}">
                    <span class="text-[6px] font-mono leading-none opacity-80">Q</span>
                    <span data-ff-val="0" class="text-[10px] font-mono font-bold leading-tight">${b1Act ? '1' : '0'}</span>
                </div>
                <div data-ff-out="1" class="w-4 h-6 rounded border flex flex-col items-center justify-center transition-colors ${b2Act ? 'bg-orange-500/30 border-orange-400 text-orange-200 shadow-sm shadow-orange-500/40' : 'bg-slate-950/70 border-slate-700 text-slate-500'}">
                    <span class="text-[6px] font-mono leading-none opacity-80">Q̄</span>
                    <span data-ff-val="1" class="text-[10px] font-mono font-bold leading-tight">${b2Act ? '1' : '0'}</span>
                </div>
            </div>`;
    },
    renderModal: (m) => {
        const initSt = m.initState ? 1 : 0;
        return `
            <div class="space-y-2 p-1 text-slate-200">
                <div class="grid grid-cols-2 gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                    <div id="ff-modal-box-0" class="flex flex-col items-center py-1.5 rounded-lg border transition-colors ${initSt === 1 ? 'bg-orange-950/80 border-orange-500 text-orange-300' : 'bg-slate-900/70 border-slate-800 text-slate-500'}">
                        <span class="text-[7.5px] font-mono font-bold">OUT 1 (Q / PIN8)</span>
                        <span id="ff-modal-val-0" class="text-[16px] font-mono font-bold leading-tight">${initSt === 1 ? '1' : '0'}</span>
                    </div>
                    <div id="ff-modal-box-1" class="flex flex-col items-center py-1.5 rounded-lg border transition-colors ${initSt === 0 ? 'bg-orange-950/80 border-orange-500 text-orange-300' : 'bg-slate-900/70 border-slate-800 text-slate-500'}">
                        <span class="text-[7.5px] font-mono font-bold">OUT 2 (Q̄ / PIN9)</span>
                        <span id="ff-modal-val-1" class="text-[16px] font-mono font-bold leading-tight">${initSt === 0 ? '1' : '0'}</span>
                    </div>
                </div>
                <div>
                    <label class="block text-[8px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Initial State (Reset)</label>
                    <div class="grid grid-cols-2 gap-1">
                        <button class="ff-init-btn py-1 rounded text-[8px] font-bold border transition-all ${initSt === 0 ? 'bg-orange-600 text-white border-orange-400 shadow-sm shadow-orange-500/40' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="0">OUT1=0 / OUT2=1</button>
                        <button class="ff-init-btn py-1 rounded text-[8px] font-bold border transition-all ${initSt === 1 ? 'bg-orange-600 text-white border-orange-400 shadow-sm shadow-orange-500/40' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="1">OUT1=1 / OUT2=0</button>
                    </div>
                </div>
                <button id="ff-toggle-btn" class="w-full py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-[9px] rounded-lg shadow-sm border border-orange-400/40 transition cursor-pointer">
                    MANUAL TOGGLE (FLIP)
                </button>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        UIHelpers.bindButtonGroup('.ff-init-btn', 'bg-orange-600 text-white border-orange-400 shadow-sm shadow-orange-500/40', 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800', val => {
            m.initState = parseInt(val, 10) ? 1 : 0;
            ctx.reRenderModal();
            cb();
        });
        document.getElementById('ff-toggle-btn')?.addEventListener('click', () => {
            ctx.triggerManualSample?.();
        });
    },
    updateLive: (cell, data, isPlaying, modalEl, m) => {
        const st = data?.state !== undefined ? data.state : (m?.initState ? 1 : 0);
        const v0 = st === 1 ? '1' : '0';
        const v1 = st === 0 ? '1' : '0';

        const box0 = cell?.querySelector('[data-ff-out="0"]');
        const box1 = cell?.querySelector('[data-ff-out="1"]');
        const txt0 = cell?.querySelector('[data-ff-val="0"]');
        const txt1 = cell?.querySelector('[data-ff-val="1"]');
        if (txt0 && txt0.textContent !== v0) txt0.textContent = v0;
        if (txt1 && txt1.textContent !== v1) txt1.textContent = v1;
        if (box0) {
            box0.className = `w-4 h-6 rounded border flex flex-col items-center justify-center transition-colors ${st === 1 ? 'bg-orange-500/30 border-orange-400 text-orange-200 shadow-sm shadow-orange-500/40' : 'bg-slate-950/70 border-slate-700 text-slate-500'}`;
        }
        if (box1) {
            box1.className = `w-4 h-6 rounded border flex flex-col items-center justify-center transition-colors ${st === 0 ? 'bg-orange-500/30 border-orange-400 text-orange-200 shadow-sm shadow-orange-500/40' : 'bg-slate-950/70 border-slate-700 text-slate-500'}`;
        }

        if (modalEl) {
            const mBox0 = modalEl.querySelector('#ff-modal-box-0');
            const mBox1 = modalEl.querySelector('#ff-modal-box-1');
            const mVal0 = modalEl.querySelector('#ff-modal-val-0');
            const mVal1 = modalEl.querySelector('#ff-modal-val-1');
            if (mVal0 && mVal0.textContent !== v0) mVal0.textContent = v0;
            if (mVal1 && mVal1.textContent !== v1) mVal1.textContent = v1;
            if (mBox0) mBox0.className = `flex flex-col items-center py-1.5 rounded-lg border transition-colors ${st === 1 ? 'bg-orange-950/80 border-orange-500 text-orange-300' : 'bg-slate-900/70 border-slate-800 text-slate-500'}`;
            if (mBox1) mBox1.className = `flex flex-col items-center py-1.5 rounded-lg border transition-colors ${st === 0 ? 'bg-orange-950/80 border-orange-500 text-orange-300' : 'bg-slate-900/70 border-slate-800 text-slate-500'}`;
        }
    }
};

export const arpDefs = {
    GATE4,
    ARP,
    FF
};
