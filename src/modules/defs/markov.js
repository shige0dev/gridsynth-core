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
        weights: [0, 0, 0, 0]
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
        const weights = m?.weights || [0, 0, 0, 0];
        const patched = ctx?.patched;
        return {
            in: [
                { port: 'gate_in', pin: 3, color: 'bg-rose-500' },
                { port: 'trans_in', pin: 4, color: 'bg-slate-400' }
            ],
            out: [
                { port: 'trans_out1', pin: 6, color: (weights[0] > 0) ? (patched?.has('trans_out1') ? 'bg-slate-400' : 'bg-slate-600') : 'bg-slate-700' },
                { port: 'trans_out2', pin: 7, color: (weights[1] > 0) ? (patched?.has('trans_out2') ? 'bg-slate-400' : 'bg-slate-600') : 'bg-slate-700' },
                { port: 'trans_out3', pin: 8, color: (weights[2] > 0) ? (patched?.has('trans_out3') ? 'bg-slate-400' : 'bg-slate-600') : 'bg-slate-700' },
                { port: 'trans_out4', pin: 9, color: (weights[3] > 0) ? (patched?.has('trans_out4') ? 'bg-slate-400' : 'bg-slate-600') : 'bg-slate-700' },
                { port: 'trig_out', pin: 10, color: 'bg-rose-500' },
                { port: 'gate_out', pin: 11, color: 'bg-rose-500' },
                { port: 'cv_out', pin: 12, color: 'bg-yellow-400' }
            ]
        };
    },
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m, ctx) => {
        const isQ = m.quantize !== false;
        const rootM = m.rootMidi ?? 60;
        const noteStr = isQ ? UIHelpers.midiToNoteName(rootM) : (m.stateVal ?? 1.0).toFixed(2) + 'V';
        const isOn = (m.state || 0) === 1;
        const holdC = m.holdClocks ?? 1;
        const isPatched = ctx?.patched && ctx.patched.size > 0;

        const boxCls = isOn
            ? 'markov-active bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-300 border-[#fde047] text-slate-950 scale-105 shadow-[0_0_10px_2px_rgba(251,191,36,0.95),0_0_20px_4px_rgba(245,158,11,0.7),inset_0_0_6px_rgba(253,224,71,0.6)] ring-1 ring-yellow-200/90'
            : (isPatched
                ? 'markov-idle bg-transparent border-slate-500/60 text-slate-300 shadow-none ring-0'
                : 'markov-idle bg-transparent border-slate-700/60 text-slate-500 shadow-none ring-0');
        const pitchCls = isOn ? 'text-slate-950 font-black' : (isPatched ? 'text-slate-200 font-bold' : 'text-slate-500 font-medium');
        const holdCls = isOn ? 'text-amber-950 font-black' : (isPatched ? 'text-slate-400 font-bold' : 'text-slate-600 font-medium');

        return `
            <div class="relative flex items-center justify-center w-full h-full pointer-events-none">
                <div class="markov-state-box w-9 h-9 rounded-md border flex flex-col items-center justify-center leading-none select-none transition-all duration-75 ${boxCls}">
                    <span class="markov-pitch-val font-mono text-[10px] leading-tight ${pitchCls}">${noteStr}</span>
                    <span class="markov-hold-val font-mono text-[7.5px] leading-none mt-0.5 ${holdCls}">x${holdC}</span>
                </div>
            </div>`;
    },
    renderModal: (m, ctx) => {
        const isQ = m.quantize !== false;
        const rootM = m.rootMidi ?? 60;
        const noteStr = UIHelpers.midiToNoteName(rootM);
        const isInit = !!m.initOn;
        const holdC = m.holdClocks ?? 1;

        const wStay = m.stayWeight ?? 10;
        const weights = m.weights || [0, 0, 0, 0];

        let totalW = Math.max(0, wStay);
        for (let i = 0; i < 4; i++) {
            totalW += Math.max(0, weights[i] || 0);
        }
        if (totalW === 0) totalW = 1;

        const pctStay = Math.round((wStay / totalW) * 100);
        const pcts = [];
        for (let i = 0; i < 4; i++) {
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

                        <div class="w-[1px] h-14 bg-slate-800/80 self-center mx-0.5"></div>

                        <!-- Stay Slider -->
                        <div class="flex flex-col items-center gap-1 flex-1 min-w-0 shrink-0">
                            <span class="text-[8px] font-bold text-slate-300 uppercase tracking-tight truncate w-full text-center shrink-0">STAY</span>
                            <span id="markov-p-stay" class="text-[9px] text-amber-300 font-mono font-bold cursor-ns-resize touch-none select-none hover:bg-slate-800/80 px-0.5 py-0.5 rounded transition-colors leading-tight shrink-0" title="上下ドラッグで微調整">${pctStay}%</span>
                            <div class="h-12 min-h-[48px] flex items-center justify-center my-0.5 shrink-0">
                                <input type="range" id="markov-w-stay" min="0" max="100" step="1" value="${wStay}" class="native-vslider accent-amber-500 shrink-0">
                            </div>
                            <span class="text-[7.5px] font-mono text-slate-400 truncate shrink-0">自己</span>
                        </div>

                        <!-- Output 1..4 Sliders (OUT 1 to OUT 4 from left to right, matching bottom PIN5..PIN8) -->
                        ${[0, 1, 2, 3].map(idx => `
                            <div class="flex flex-col items-center gap-1 flex-1 min-w-0 shrink-0">
                                <span class="text-[8px] font-bold text-slate-300 uppercase tracking-tight truncate w-full text-center shrink-0">OUT ${idx + 1}</span>
                                <span id="markov-p-${idx}" class="text-[9px] text-amber-300 font-bold font-mono cursor-ns-resize touch-none select-none hover:bg-slate-800/80 px-0.5 py-0.5 rounded transition-colors leading-tight shrink-0" title="上下ドラッグで微調整">${pcts[idx]}%</span>
                                <div class="h-12 min-h-[48px] flex items-center justify-center my-0.5 shrink-0">
                                    <input type="range" id="markov-w-${idx}" min="0" max="100" step="1" value="${weights[idx] ?? 0}" class="native-vslider accent-amber-500 markov-w-slider shrink-0" data-idx="${idx}">
                                </div>
                                <span class="text-[7.5px] font-mono text-slate-400 truncate shrink-0">CH ${idx + 1}</span>
                            </div>`
                        ).join('')}
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
            const weights = m.weights || [0, 0, 0, 0];
            let totalW = Math.max(0, wStay);
            for (let i = 0; i < 4; i++) {
                totalW += Math.max(0, weights[i] || 0);
            }
            if (totalW === 0) totalW = 1;

            const pStayEl = document.getElementById('markov-p-stay');
            if (pStayEl) pStayEl.textContent = `${Math.round((wStay / totalW) * 100)}%`;

            for (let i = 0; i < 4; i++) {
                const pEl = document.getElementById(`markov-p-${i}`);
                if (pEl) {
                    pEl.textContent = `${Math.round(((weights[i] || 0) / totalW) * 100)}%`;
                }
            }
        };

        document.getElementById('markov-w-stay')?.addEventListener('input', (e) => {
            m.stayWeight = parseFloat(e.target.value) || 0;
            updatePcts();
            cb();
        });
        UIHelpers.bindScrubber('markov-p-stay', 'markov-w-stay', null, (val) => {
            m.stayWeight = Math.round(val);
            updatePcts();
            cb();
        }, 1, 0, 100);

        document.querySelectorAll('.markov-w-slider').forEach(sl => {
            sl.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.idx, 10);
                if (!m.weights) m.weights = [0, 0, 0, 0];
                m.weights[idx] = parseFloat(e.target.value) || 0;
                updatePcts();
                cb();
            });
        });
        [0, 1, 2, 3].forEach(idx => {
            UIHelpers.bindScrubber(`markov-p-${idx}`, `markov-w-${idx}`, null, (val) => {
                if (!m.weights) m.weights = [0, 0, 0, 0];
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
            if (isOn) {
                box.className = 'markov-state-box w-9 h-9 rounded-md border flex flex-col items-center justify-center leading-none select-none transition-all duration-75 markov-active bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-300 border-[#fde047] text-slate-950 scale-105 shadow-[0_0_10px_2px_rgba(251,191,36,0.95),0_0_20px_4px_rgba(245,158,11,0.7),inset_0_0_6px_rgba(253,224,71,0.6)] ring-1 ring-yellow-200/90';
                if (pitchEl) pitchEl.className = 'markov-pitch-val font-mono text-[10px] leading-tight text-slate-950 font-black';
                if (holdEl) holdEl.className = 'markov-hold-val font-mono text-[7.5px] leading-none mt-0.5 text-amber-950 font-black';
            } else {
                box.className = 'markov-state-box w-9 h-9 rounded-md border flex flex-col items-center justify-center leading-none select-none transition-all duration-75 markov-idle bg-transparent border-amber-500/45 text-slate-300 shadow-none ring-0';
                if (pitchEl) pitchEl.className = 'markov-pitch-val font-mono text-[10px] leading-tight text-slate-200 font-bold';
                if (holdEl) holdEl.className = 'markov-hold-val font-mono text-[7.5px] leading-none mt-0.5 text-amber-400/80 font-bold';
            }
            if (holdEl && m?.holdClocks !== undefined) {
                holdEl.textContent = `x${m.holdClocks ?? 1}`;
            }
        }
    }
};

export const markovDefs = {
    MARKOV
};

