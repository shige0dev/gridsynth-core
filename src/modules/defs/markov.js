import { UIHelpers } from '../../ui/helpers.js?v=351';

export const MARKOV = {
    color: 'amber',
    defaults: () => ({
        type: 'MARKOV',
        state: 0,
        initOn: false,
        stateVal: 1.0,
        rootMidi: 36,
        quantize: true,
        holdClocks: 1,
        stayWeight: 10,
        weights: [0, 0, 0]
    }),
    onClone: (copy) => {
        copy.initOn = false;
        copy.state = 0;
    },
    onNormalize: (m) => {
        m.state = m.initOn ? 1 : 0;
    },
    onExport: (clean, orig) => {
        clean.state = orig.initOn ? 1 : 0;
    },
    ports: (m, ctx) => {
        const weights = m?.weights || [0, 0, 0];
        const patched = ctx?.patched;
        const getTransColor = (idx, port) => {
            const w = weights[idx] || 0;
            if (w <= 0) return 'bg-slate-700';
            const isConnected = patched?.has(port);
            return isConnected ? 'bg-slate-400' : 'bg-purple-500';
        };
        return {
            in: [
                { port: 'gate_in', pin: 4, color: 'bg-rose-500' },
                { port: 'trans_in', pin: 5, color: 'bg-slate-400' }
            ],
            out: [
                { port: 'trans_out1', pin: 6, color: getTransColor(0, 'trans_out1') },
                { port: 'trans_out2', pin: 7, color: getTransColor(1, 'trans_out2') },
                { port: 'trans_out3', pin: 8, color: getTransColor(2, 'trans_out3') },
                { port: 'startgate_out', pin: 9, color: 'bg-rose-500' },
                { port: 'gate_out', pin: 10, color: 'bg-rose-500' },
                { port: 'longgate_out', pin: 11, color: 'bg-rose-500' },
                { port: 'cv_out', pin: 12, color: 'bg-yellow-400' }
            ]
        };
    },
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m, ctx) => {
        const isQ = m.quantize !== false;
        const rootM = m.rootMidi ?? 36;
        const noteStr = isQ ? UIHelpers.midiToNoteName(rootM) : (m.stateVal ?? 1.0).toFixed(2) + 'V';
        const isOn = (m.state || 0) === 1;
        const holdC = m.holdClocks ?? 1;
        const isPatched = ctx?.patched && ctx.patched.size > 0;

        const boxCls = isOn
            ? 'markov-active bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-300 border-[#fde047] text-slate-950 shadow-[0_0_10px_2px_rgba(251,191,36,0.95),0_0_20px_4px_rgba(245,158,11,0.7),inset_0_0_6px_rgba(253,224,71,0.6)]'
            : (isPatched
                ? 'markov-idle bg-transparent border-slate-500/60 text-slate-300 shadow-none'
                : 'markov-idle bg-transparent border-slate-700/60 text-slate-500 shadow-none');
        const pitchCls = isOn ? 'text-slate-950 font-bold' : (isPatched ? 'text-slate-200 font-bold' : 'text-slate-500 font-bold');
        const holdCls = isOn ? 'text-amber-950 font-bold' : (isPatched ? 'text-slate-400 font-bold' : 'text-slate-600 font-bold');

        return `
            <div class="relative flex items-center justify-center w-full h-full pointer-events-none">
                <div class="markov-state-box w-9 h-9 rounded-md border flex flex-col items-center justify-center leading-none select-none transition-colors duration-75 ${boxCls}">
                    <span class="markov-pitch-val font-mono text-[10px] leading-tight ${pitchCls}">${noteStr}</span>
                    <span class="markov-hold-val font-mono text-[10px] leading-tight mt-0.5 ${holdCls}">${holdC}</span>
                </div>
            </div>`;
    },
    renderModal: (m, ctx) => {
        const isQ = m.quantize !== false;
        const rootM = m.rootMidi ?? 36;
        const noteStr = UIHelpers.midiToNoteName(rootM);
        const isInit = !!m.initOn;
        const holdC = m.holdClocks ?? 1;

        const wStay = m.stayWeight ?? 10;
        const weights = m.weights || [0, 0, 0];

        let totalW = Math.max(0, wStay);
        for (let i = 0; i < 3; i++) {
            totalW += Math.max(0, weights[i] || 0);
        }
        if (totalW === 0) totalW = 1;

        const pctStay = Math.round((wStay / totalW) * 100);
        const pcts = [];
        for (let i = 0; i < 3; i++) {
            pcts.push(Math.round(((weights[i] || 0) / totalW) * 100));
        }

        return `
            <div class="space-y-1.5">
                <!-- Top Buttons: RESET & QLZ -->
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <button id="markov-init-btn" class="h-4 px-1.5 rounded text-[7.5px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${isInit ? 'bg-amber-700 text-white border-amber-400 shadow-sm' : 'bg-slate-800 text-slate-400 border-slate-700'}">RESET: ${isInit ? 'ON' : 'OFF'}</button>
                    <button id="markov-qlz-btn" class="h-4 px-1.5 rounded text-[7.5px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${isQ ? 'bg-amber-600 text-white border-amber-400' : 'bg-slate-800 text-slate-400 border-slate-700'}">QLZ: ${isQ ? 'ON' : 'OFF'}</button>
                </div>

                <!-- Hold Clocks Stepper Row (Dropped below buttons) -->
                <div class="flex items-center justify-between px-2 py-1 bg-slate-950/60 rounded-lg border border-slate-800/80">
                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider">HOLD CLOCKS</span>
                    <div class="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 shadow-inner">
                        <button id="markov-hold-dec" class="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 flex items-center justify-center leading-none select-none cursor-pointer">−</button>
                        <span id="markov-hold-val" class="w-4 text-center text-[9.5px] font-mono font-bold text-amber-400 select-none">${holdC}</span>
                        <button id="markov-hold-inc" class="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 flex items-center justify-center leading-none select-none cursor-pointer">＋</button>
                        <span class="text-[7.5px] font-mono text-slate-500 uppercase ml-0.5">CLK</span>
                    </div>
                </div>

                <!-- CV Out & Transition Weights Unified Row -->
                <div class="bg-slate-950/40 p-2 rounded-xl border border-slate-800 space-y-1.5">
                    <div class="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider pb-0.5 border-b border-slate-800/80">
                        <span>CV OUT & TRANSITION WEIGHTS</span>
                    </div>

                    <div class="flex items-center justify-around gap-1 pt-1">
                        <!-- Output CV / Pitch (Far Left) -->
                        ${isQ
                            ? UIHelpers.createVSliderHTML('markov-pitch', 'PITCH', 24, 84, 1, rootM, 'note', 'yellow', false, noteStr)
                            : UIHelpers.createVSliderHTML('markov-val', 'VOLTAGE', 0.0, 5.0, 0.05, m.stateVal ?? 1.0, 'V', 'amber', false, (m.stateVal ?? 1.0).toFixed(2) + 'V')
                        }

                        <div class="w-[1px] h-28 bg-slate-800/80 self-center mx-0.5"></div>

                        <!-- Stay Slider -->
                        ${UIHelpers.createVSliderHTML('markov-w-stay', 'STAY', 0, 100, 1, wStay, '自己', 'amber', false, `${pctStay}%`)}

                        <!-- Output 1..3 Sliders (OUT 1 to OUT 3 from left to right, matching bottom PIN6..PIN8) -->
                        ${[0, 1, 2].map(idx => UIHelpers.createVSliderHTML(`markov-w-${idx}`, `OUT ${idx + 1}`, 0, 100, 1, weights[idx] ?? 0, `CH ${idx + 1}`, 'amber', false, `${pcts[idx]}%`)).join('')}
                    </div>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const isQ = m.quantize !== false;

        document.getElementById('markov-init-btn')?.addEventListener('click', () => {
            m.initOn = !m.initOn;
            m.state = m.initOn ? 1 : 0;
            ctx.reRenderModal();
            cb();
        });

        document.getElementById('markov-hold-dec')?.addEventListener('click', () => {
            const cur = m.holdClocks ?? 1;
            if (cur > 1) {
                m.holdClocks = cur - 1;
                const el = document.getElementById('markov-hold-val');
                if (el) el.textContent = m.holdClocks;
                cb();
            }
        });

        document.getElementById('markov-hold-inc')?.addEventListener('click', () => {
            const cur = m.holdClocks ?? 1;
            if (cur < 32) {
                m.holdClocks = cur + 1;
                const el = document.getElementById('markov-hold-val');
                if (el) el.textContent = m.holdClocks;
                cb();
            }
        });

        document.getElementById('markov-qlz-btn')?.addEventListener('click', () => {
            m.quantize = !isQ;
            ctx.reRenderModal();
            cb();
        });

        if (isQ) {
            UIHelpers.bindSlider('markov-pitch', v => UIHelpers.midiToNoteName(Math.round(v)), v => {
                m.rootMidi = Math.round(v);
                m.stateVal = (m.rootMidi - 24) / 12.0;
                cb();
            }, 1, 24, 84);
        } else {
            UIHelpers.bindSlider('markov-val', v => v.toFixed(2) + 'V', v => {
                m.stateVal = v;
                cb();
            }, 1, 0.0, 5.0);
        }

        const updatePcts = () => {
            const wStay = m.stayWeight ?? 10;
            const weights = m.weights || [0, 0, 0];
            let totalW = Math.max(0, wStay);
            for (let i = 0; i < 3; i++) {
                totalW += Math.max(0, weights[i] || 0);
            }
            if (totalW === 0) totalW = 1;

            const pStayEl = document.getElementById('markov-w-stay-disp');
            if (pStayEl) pStayEl.textContent = `${Math.round((wStay / totalW) * 100)}%`;

            for (let i = 0; i < 3; i++) {
                const pEl = document.getElementById(`markov-w-${i}-disp`);
                if (pEl) {
                    pEl.textContent = `${Math.round(((weights[i] || 0) / totalW) * 100)}%`;
                }
            }
        };

        UIHelpers.bindSlider('markov-w-stay', () => { updatePcts(); return document.getElementById('markov-w-stay-disp')?.textContent || `${pctStay}%`; }, (val) => {
            m.stayWeight = Math.round(val);
            updatePcts();
            cb();
        }, 1, 0, 100);

        [0, 1, 2].forEach(idx => {
            UIHelpers.bindSlider(`markov-w-${idx}`, () => { updatePcts(); return document.getElementById(`markov-w-${idx}-disp`)?.textContent || `${pcts[idx]}%`; }, (val) => {
                if (!m.weights) m.weights = [0, 0, 0];
                m.weights[idx] = Math.round(val);
                updatePcts();
                cb();
            }, 1, 0, 100);
        });
    },
    updateLive: (cell, readData, isPlaying, modalEl, m) => {
        const isOn = (readData?.state || 0) === 1;
        const box = cell?.querySelector('.markov-state-box');
        if (box) {
            const pitchEl = box.querySelector('.markov-pitch-val');
            const holdEl = box.querySelector('.markov-hold-val');
            if (isOn && isPlaying) {
                box.className = 'markov-state-box w-9 h-9 rounded-md border flex flex-col items-center justify-center leading-none select-none transition-colors duration-75 markov-active bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-300 border-[#fde047] text-slate-950 shadow-[0_0_10px_2px_rgba(251,191,36,0.95),0_0_20px_4px_rgba(245,158,11,0.7),inset_0_0_6px_rgba(253,224,71,0.6)]';
                if (pitchEl) pitchEl.className = 'markov-pitch-val font-mono text-[10px] leading-tight text-slate-950 font-bold';
                if (holdEl) {
                    holdEl.className = 'markov-hold-val font-mono text-[10px] leading-tight mt-0.5 text-amber-950 font-bold';
                    holdEl.textContent = readData?.remaining ?? (m.holdClocks ?? 1);
                }
            } else {
                box.className = 'markov-state-box w-9 h-9 rounded-md border flex flex-col items-center justify-center leading-none select-none transition-colors duration-75 markov-idle bg-transparent border-amber-500/45 text-slate-300 shadow-none';
                if (pitchEl) pitchEl.className = 'markov-pitch-val font-mono text-[10px] leading-tight text-slate-200 font-bold';
                if (holdEl) {
                    holdEl.className = 'markov-hold-val font-mono text-[10px] leading-tight mt-0.5 text-amber-400/80 font-bold';
                    holdEl.textContent = m?.holdClocks ?? 1;
                }
            }
        }
    }
};

export const markovDefs = {
    MARKOV
};

