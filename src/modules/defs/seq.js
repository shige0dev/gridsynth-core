import { UIHelpers } from '../../ui/helpers.js';
import { CHORD_TYPES, CHORD_VOICINGS, CHORD_ORDER, VOICING_LABELS, VOICING_ORDER } from '../../core/musical.js';

export const SEQ8 = {
    color: 'blue',
    defaults: () => ({
        type: 'SEQ8',
        quantize: true,
        steps: Array.from({ length: 8 }, (_, i) => ({
            cv: i === 0 ? 0 : 0.25,
            active: true,
            cvActive: true,
            gate: true
        }))
    }),
    onNormalize: (m) => {
        if (Array.isArray(m.steps) && typeof m.steps[0] === 'number') {
            m.steps = m.steps.map(cv => ({ cv, active: true, cvActive: true, gate: true }));
        }
    },
    ports: () => ({
        in: [{ port: 'gate_in', color: 'bg-red-500' }],
        out: [
            { port: 'cv_out', color: 'bg-yellow-400' },
            { port: 'gate_out', color: 'bg-orange-500' }
        ]
    }),
    renderGrid: (m) => `<div class="flex items-center justify-center w-full h-full pointer-events-none">
        ${UIHelpers.renderPanelBars(
            (m.steps || []).map((st, i) => {
                const val = typeof st === 'number' ? st : (st?.cv ?? 0);
                const isAct = typeof st === 'object' ? (st.active !== false) : true;
                const h = isAct ? Math.max(6, Math.min(100, Math.round((val / 2.0) * 100))) : 4;
                const barColor = isAct ? 'bg-gradient-to-t from-amber-600 to-yellow-400' : 'bg-slate-800';
                return {
                    pct: h,
                    color: barColor,
                    width: 'flex-1',
                    attrs: `data-step-bar="${i}"`
                };
            }),
            {
                gapCls: 'gap-px',
                containerCls: 'w-[50px]',
                theme: 'cv'
            }
        )}
    </div>`,
    updateLive: (cell, data, isP, modal) => {
        const step = data?.step ?? -1;
        cell.querySelectorAll('[data-step-bar]').forEach((b, i) => {
            const stepIdx = parseInt(b.getAttribute('data-step-bar') ?? i, 10);
            b.classList.toggle('bar-active', isP && stepIdx === step);
        });
        modal?.querySelectorAll('[data-step-col]').forEach((col, i) => {
            const colIdx = parseInt(col.getAttribute('data-step-col') ?? i, 10);
            const cur = isP && colIdx === step;
            col.classList.toggle('border-yellow-400', cur);
            col.classList.toggle('bg-slate-800/90', cur);
            col.classList.toggle('border-slate-800', !cur);
        });
    },
    renderModal: (m) => `
        <div id="seq-modal-root" class="space-y-1.5">
            <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                <span class="text-[8px] text-slate-400 uppercase font-semibold">8-STEP SEQUENCER</span>
                <button id="seq-qlz-btn" class="px-2 py-0.5 rounded text-[8.5px] font-bold border transition-colors ${m.quantize!==false?'bg-cyan-600 text-white border-cyan-500':'bg-slate-800 text-slate-400 border-slate-700'}">QLZ: ${m.quantize!==false?'ON':'OFF'}</button>
            </div>
            <div class="flex items-center justify-between py-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1 overflow-x-auto">
                ${(m.steps||[]).map((st, i) => {
                    const val = typeof st === 'number' ? st : (st?.cv ?? 0);
                    const isAct = typeof st === 'object' ? (st.active !== false) : true;
                    const isCvAct = typeof st === 'object' ? (st.cvActive !== false) : true;
                    const isGateAct = typeof st === 'object' ? (st.gate !== false) : true;
                    return `
                    <div data-step-col="${i}" class="flex flex-col items-center gap-1 flex-1 min-w-[34px] p-1 rounded-lg border transition-all ${isAct ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-950/80 border-slate-800/40 opacity-40 grayscale'}">
                        <span id="seq-slider-${i}-disp" class="text-[8.5px] ${isAct ? 'text-cyan-300' : 'text-slate-500'} font-mono font-bold cursor-ns-resize touch-none select-none hover:bg-slate-800/80 px-1 py-0.5 rounded transition-colors" title="上下ドラッグで微調整">${m.quantize!==false?UIHelpers.cvToNoteName(val):val.toFixed(2)}</span>
                        <input type="range" data-seq-slider="${i}" id="seq-slider-${i}" min="0" max="2.0" step="${m.quantize!==false?0.083333:0.01}" value="${val}" class="native-vslider ${isAct ? 'accent-blue-500' : 'accent-slate-600'} !h-16">
                        <div class="flex flex-col gap-0.5 w-full">
                            <button data-act="gate" data-step="${i}" class="text-[6.5px] font-bold py-0.5 rounded border transition-colors ${!isAct ? 'bg-slate-950 text-slate-600 border-slate-800' : (isGateAct ? 'bg-sky-950 text-sky-300 border-sky-500/80' : 'bg-slate-950 text-slate-600 border-slate-800')}">GATE</button>
                            <button data-act="cvActive" data-step="${i}" class="text-[7px] font-bold py-0.5 rounded border transition-colors ${!isAct ? 'bg-slate-950 text-slate-600 border-slate-800' : (isCvAct ? 'bg-cyan-950 text-cyan-300 border-cyan-500/80' : 'bg-slate-950 text-slate-600 border-slate-800')}">CV</button>
                            <button data-act="active" data-step="${i}" class="text-[6.5px] font-bold py-0.5 rounded border transition-colors ${isAct ? 'bg-blue-950 text-blue-300 border-blue-500/80' : 'bg-slate-950 text-slate-500 border-slate-800'}">STEP</button>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`,
    bindEvents: (m, ctx, cb) => {
        const root = document.getElementById('seq-modal-root');
        if (!root) return;
        root.addEventListener('click', (e) => {
            if (e.target.closest('#seq-qlz-btn')) {
                m.quantize = !(m.quantize !== false);
                ctx.reRenderModal();
                cb();
                return;
            }
            const btn = e.target.closest('[data-act]');
            if (btn) {
                const idx = parseInt(btn.dataset.step), act = btn.dataset.act;
                if (!isNaN(idx) && m.steps[idx]) {
                    m.steps[idx][act] = !(m.steps[idx][act] !== false);
                    ctx.reRenderModal();
                    cb();
                }
            }
        });
        root.addEventListener('input', (e) => {
            const sl = e.target.closest('[data-seq-slider]');
            if (sl) {
                const idx = parseInt(sl.dataset.seqSlider), val = parseFloat(sl.value);
                if (!isNaN(idx) && m.steps[idx]) {
                    m.steps[idx].cv = val;
                    const disp = document.getElementById(`seq-slider-${idx}-disp`);
                    if (disp) disp.textContent = m.quantize !== false ? UIHelpers.cvToNoteName(val) : val.toFixed(2);
                    cb();
                }
            }
        });
        (m.steps || []).forEach((st, i) => {
            UIHelpers.bindScrubber(`seq-slider-${i}-disp`, `seq-slider-${i}`, v => m.quantize !== false ? UIHelpers.cvToNoteName(v) : v.toFixed(2), v => {
                st.cv = v;
                cb();
            });
        });
    }
};

export const SEQ16 = {
    color: 'blue',
    defaults: () => ({
        type: 'SEQ16',
        quantize: true,
        steps: Array.from({ length: 16 }, (_, i) => ({
            cv: i === 0 ? 0 : 0.25,
            active: true,
            cvActive: true,
            gate: true
        }))
    }),
    onNormalize: (m) => {
        if (Array.isArray(m.steps)) {
            if (typeof m.steps[0] === 'number') {
                m.steps = m.steps.map(cv => ({ cv, active: true, cvActive: true, gate: true }));
            }
            while (m.steps.length < 16) {
                m.steps.push({ cv: 0.25, active: true, cvActive: true, gate: true });
            }
        }
    },
    ports: () => ({
        in: [{ port: 'gate_in', color: 'bg-red-500' }],
        out: [
            { port: 'cv_out', color: 'bg-yellow-400' },
            { port: 'gate_out', color: 'bg-orange-500' }
        ]
    }),
    renderGrid: (m) => {
        const steps = m.steps || [];
        const renderRow = (slice, startIdx) => UIHelpers.renderPanelBars(
            slice.map((st, i) => {
                const idx = startIdx + i;
                const val = typeof st === 'number' ? st : (st?.cv ?? 0);
                const isAct = typeof st === 'object' ? (st.active !== false) : true;
                const h = isAct ? Math.max(6, Math.min(100, Math.round((val / 2.0) * 100))) : 4;
                const barColor = isAct ? 'bg-gradient-to-t from-amber-600 to-yellow-400' : 'bg-slate-800';
                return {
                    pct: h,
                    color: barColor,
                    width: 'flex-1',
                    attrs: `data-step-bar="${idx}"`
                };
            }),
            {
                heightCls: 'h-3.5',
                gapCls: 'gap-px',
                containerCls: 'w-[50px]',
                theme: 'cv'
            }
        );
        return `<div class="flex flex-col items-center justify-center w-full h-full pointer-events-none gap-0.5">
            ${renderRow(steps.slice(0, 8), 0)}
            ${renderRow(steps.slice(8, 16), 8)}
        </div>`;
    },
    updateLive: (cell, data, isP, modal) => {
        const step = data?.step ?? -1;
        cell.querySelectorAll('[data-step-bar]').forEach((b) => {
            const stepIdx = parseInt(b.getAttribute('data-step-bar'), 10);
            b.classList.toggle('bar-active', isP && stepIdx === step);
        });
        modal?.querySelectorAll('[data-step-col]').forEach((col) => {
            const colIdx = parseInt(col.getAttribute('data-step-col'), 10);
            const cur = isP && colIdx === step;
            col.classList.toggle('border-yellow-400', cur);
            col.classList.toggle('bg-slate-800/90', cur);
            col.classList.toggle('border-slate-800', !cur);
        });
    },
    renderModal: (m) => {
        const steps = m.steps || [];
        const renderStepRow = (slice, startIdx) => `
            <div class="flex items-center justify-between py-0.5 px-1 bg-slate-950/60 rounded-xl border border-slate-800/80 gap-1 overflow-x-auto">
                ${slice.map((st, i) => {
                    const idx = startIdx + i;
                    const val = typeof st === 'number' ? st : (st?.cv ?? 0);
                    const isAct = typeof st === 'object' ? (st.active !== false) : true;
                    const isCvAct = typeof st === 'object' ? (st.cvActive !== false) : true;
                    const isGateAct = typeof st === 'object' ? (st.gate !== false) : true;
                    return `
                    <div data-step-col="${idx}" class="flex flex-col items-center gap-0.5 flex-1 min-w-[34px] p-0.5 rounded-lg border transition-all ${isAct ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-950/80 border-slate-800/40 opacity-40 grayscale'}">
                        <span id="seq16-slider-${idx}-disp" class="text-[8px] ${isAct ? 'text-cyan-300' : 'text-slate-500'} font-mono font-bold cursor-ns-resize touch-none select-none hover:bg-slate-800/80 px-0.5 py-0.5 rounded transition-colors" title="上下ドラッグで微調整">${m.quantize!==false?UIHelpers.cvToNoteName(val):val.toFixed(2)}</span>
                        <input type="range" data-seq-slider="${idx}" id="seq16-slider-${idx}" min="0" max="2.0" step="${m.quantize!==false?0.083333:0.01}" value="${val}" class="native-vslider ${isAct ? 'accent-blue-500' : 'accent-slate-600'} !h-12">
                        <div class="flex items-center justify-between gap-0.5 w-full mt-0.5">
                            <button data-act="gate" data-step="${idx}" class="flex-1 py-0.5 text-[6.5px] font-bold rounded border transition-colors ${!isAct ? 'bg-slate-950 text-slate-600 border-slate-800' : (isGateAct ? 'bg-sky-950 text-sky-300 border-sky-500/80' : 'bg-slate-950 text-slate-600 border-slate-800')}" title="GATE">G</button>
                            <button data-act="cvActive" data-step="${idx}" class="flex-1 py-0.5 text-[6.5px] font-bold rounded border transition-colors ${!isAct ? 'bg-slate-950 text-slate-600 border-slate-800' : (isCvActive => isCvAct ? 'bg-cyan-950 text-cyan-300 border-cyan-500/80' : 'bg-slate-950 text-slate-600 border-slate-800')(isCvAct)}" title="CV">C</button>
                            <button data-act="active" data-step="${idx}" class="flex-1 py-0.5 text-[6.5px] font-bold rounded border transition-colors ${isAct ? 'bg-blue-950 text-blue-300 border-blue-500/80' : 'bg-slate-950 text-slate-500 border-slate-800'}" title="STEP ACTIVE">${idx + 1}</button>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;
        return `
            <div id="seq16-modal-root" class="space-y-1">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] text-slate-400 uppercase font-semibold">16-STEP SEQUENCER</span>
                    <button id="seq16-qlz-btn" class="px-2 py-0.5 rounded text-[8.5px] font-bold border transition-colors ${m.quantize!==false?'bg-cyan-600 text-white border-cyan-500':'bg-slate-800 text-slate-400 border-slate-700'}">QLZ: ${m.quantize!==false?'ON':'OFF'}</button>
                </div>
                ${renderStepRow(steps.slice(0, 8), 0)}
                ${renderStepRow(steps.slice(8, 16), 8)}
            </div>
        `;
    },
    bindEvents: (m, ctx, cb) => {
        const root = document.getElementById('seq16-modal-root');
        if (!root) return;
        root.addEventListener('click', (e) => {
            if (e.target.closest('#seq16-qlz-btn')) {
                m.quantize = !(m.quantize !== false);
                ctx.reRenderModal();
                cb();
                return;
            }
            const btn = e.target.closest('[data-act]');
            if (btn) {
                const idx = parseInt(btn.dataset.step), act = btn.dataset.act;
                if (!isNaN(idx) && m.steps[idx]) {
                    m.steps[idx][act] = !(m.steps[idx][act] !== false);
                    ctx.reRenderModal();
                    cb();
                }
            }
        });
        root.addEventListener('input', (e) => {
            const sl = e.target.closest('[data-seq-slider]');
            if (sl) {
                const idx = parseInt(sl.dataset.seqSlider), val = parseFloat(sl.value);
                if (!isNaN(idx) && m.steps[idx]) {
                    m.steps[idx].cv = val;
                    const disp = document.getElementById(`seq16-slider-${idx}-disp`);
                    if (disp) disp.textContent = m.quantize !== false ? UIHelpers.cvToNoteName(val) : val.toFixed(2);
                    cb();
                }
            }
        });
        (m.steps || []).forEach((st, i) => {
            UIHelpers.bindScrubber(`seq16-slider-${i}-disp`, `seq16-slider-${i}`, v => m.quantize !== false ? UIHelpers.cvToNoteName(v) : v.toFixed(2), v => {
                st.cv = v;
                cb();
            });
        });
    }
};

export const CHORD = {
    color: 'purple',
    CHORD_TYPES,
    VOICINGS: CHORD_VOICINGS,
    defaults: () => ({ type: 'CHORD', chord: 'min', rootMidi: 48, voicing: 'close' }),
    ports: () => ({
        in: [
            { port: 'cv_in', color: 'bg-yellow-400' },
            { port: 'type_cv', color: 'bg-yellow-400' },
            { port: 'voice_cv', color: 'bg-yellow-400' }
        ],
        out: [
            { port: 'cv_out1', color: 'bg-yellow-400' },
            { port: 'cv_out2', color: 'bg-yellow-400' },
            { port: 'cv_out3', color: 'bg-yellow-400' },
            { port: 'cv_out4', color: 'bg-yellow-400' }
        ]
    }),
    renderGrid: (m, ctx) => {
        const chordKey = m.chord || 'min';
        const info = CHORD_TYPES[chordKey] || CHORD_TYPES['min'];
        const voiceKey = m.voicing || 'close';
        const voiceInfo = VOICING_LABELS[voiceKey] || VOICING_LABELS['close'];
        const isPatched = ctx?.patched?.has('cv_in');
        const rootName = isPatched ? 'EXT' : UIHelpers.cvToNoteName(((m.rootMidi ?? 48) - 24) / 12.0);
        return `
            <div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-purple-300">
                <span class="text-[7.5px] font-bold uppercase tracking-wider text-slate-400">CHORD CV</span>
                <span class="text-[12px] font-mono font-bold text-cyan-300 chord-live-name">${rootName} ${info.label}</span>
                <div class="flex items-center gap-1 text-[7px] font-mono text-purple-400">
                    <span class="chord-live-bin font-bold text-yellow-300/90">${info.binary}</span>
                    <span class="text-slate-500">•</span>
                    <span class="chord-live-voice">${voiceInfo.label}</span>
                </div>
            </div>`;
    },
    renderModal: (m, ctx) => {
        const chords = CHORD_ORDER.map(val => ({ val, ...CHORD_TYPES[val] }));
        const voicings = VOICING_ORDER.map(val => ({ val, ...VOICING_LABELS[val] }));
        const isRootPatched = ctx.patched?.has('cv_in');
        const isTypePatched = ctx.patched?.has('type_cv');
        const isVoicePatched = ctx.patched?.has('voice_cv');
        const curRoot = m.rootMidi ?? 48;
        const rootName = UIHelpers.cvToNoteName((curRoot - 24) / 12.0);

        const curChord = m.chord || 'min';
        const curVoice = m.voicing || 'close';

        return `
            <div class="space-y-1.5">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] text-slate-400 font-semibold uppercase">ROOT NOTE (1V/OCT)</span>
                    <span class="text-[9px] font-mono font-bold text-yellow-300">${isRootPatched ? 'EXT CV (PATCHED)' : rootName}</span>
                </div>
                <div class="flex items-center justify-around py-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1 ${isRootPatched ? 'opacity-30 pointer-events-none' : ''}">
                    ${UIHelpers.createVSliderHTML('chord-root-slider', 'ROOT', 24, 72, 1, curRoot, 'note', 'purple', isRootPatched, rootName)}
                </div>
                <div>
                    <div class="flex items-center justify-between mb-0.5">
                        <label class="block text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Chord Type (0-7V)</label>
                        <span class="text-[8px] font-mono ${isTypePatched ? 'text-yellow-300 font-bold' : 'text-slate-500'}">${isTypePatched ? 'EXT CV (PATCHED)' : '3-BIT BINARY'}</span>
                    </div>
                    <div class="grid grid-cols-4 gap-1">
                        ${chords.map(c => {
                            const isSel = curChord === c.val;
                            return `
                                <button class="chord-type-btn py-1 px-1 rounded flex flex-col items-center justify-center border transition-all ${isSel ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="${c.val}">
                                    <span class="text-[7px] font-mono ${isSel ? 'text-purple-200' : 'text-slate-500'} pointer-events-none">${c.binary}</span>
                                    <span class="text-[8.5px] font-bold pointer-events-none">${c.label}</span>
                                </button>`;
                        }).join('')}
                    </div>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-0.5">
                        <label class="block text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Voicing (0-3V)</label>
                        <span class="text-[8px] font-mono ${isVoicePatched ? 'text-yellow-300 font-bold' : 'text-slate-500'}">${isVoicePatched ? 'EXT CV (PATCHED)' : '2-BIT BINARY'}</span>
                    </div>
                    <div class="grid grid-cols-4 gap-1">
                        ${voicings.map(v => {
                            const isSel = curVoice === v.val;
                            return `
                                <button class="chord-voice-btn py-1 px-1 rounded flex flex-col items-center justify-center border transition-all ${isSel ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="${v.val}">
                                    <span class="text-[7px] font-mono ${isSel ? 'text-purple-200' : 'text-slate-500'} pointer-events-none">${v.binary}</span>
                                    <span class="text-[8px] font-bold pointer-events-none">${v.label}</span>
                                </button>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        UIHelpers.bindButtonGroup('.chord-type-btn', 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50', 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800', val => {
            m.chord = val;
            ctx.reRenderModal();
            cb();
        });
        UIHelpers.bindButtonGroup('.chord-voice-btn', 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50', 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800', val => {
            m.voicing = val;
            ctx.reRenderModal();
            cb();
        });
        if (!ctx.patched?.has('cv_in')) {
            UIHelpers.bindSlider('chord-root-slider', v => UIHelpers.cvToNoteName((Math.round(v) - 24) / 12.0), v => {
                m.rootMidi = Math.round(v);
                cb();
            }, 1, 24, 72);
        }
    },
    updateLive: (cell, data, isPlaying, modalEl, m) => {
        if (!data) return;
        const cIdx = data.activeChordIdx ?? (m.chord ? CHORD_ORDER.indexOf(m.chord) : 0);
        const vIdx = data.activeVoiceIdx ?? (m.voicing ? VOICING_ORDER.indexOf(m.voicing) : 0);
        const cKey = CHORD_ORDER[cIdx] || 'min';
        const vKey = VOICING_ORDER[vIdx] || 'close';
        const cInfo = CHORD_TYPES[cKey];
        const vInfo = VOICING_LABELS[vKey];

        const nameEl = cell?.querySelector('.chord-live-name');
        const binEl = cell?.querySelector('.chord-live-bin');
        const voiceEl = cell?.querySelector('.chord-live-voice');
        if (nameEl && cInfo) {
            const isRootP = cell?.querySelector('.cable-jack[data-port="cv_in"]')?.classList.contains('connected');
            const rootName = isRootP ? 'EXT' : UIHelpers.cvToNoteName(((m.rootMidi ?? 48) - 24) / 12.0);
            nameEl.textContent = `${rootName} ${cInfo.label}`;
        }
        if (binEl && cInfo) binEl.textContent = cInfo.binary;
        if (voiceEl && vInfo) voiceEl.textContent = vInfo.label;

        if (modalEl) {
            modalEl.querySelectorAll('.chord-type-btn').forEach(btn => {
                const isCur = btn.dataset.val === cKey;
                btn.classList.toggle('ring-1', isCur);
                btn.classList.toggle('ring-yellow-400', isCur);
            });
            modalEl.querySelectorAll('.chord-voice-btn').forEach(btn => {
                const isCur = btn.dataset.val === vKey;
                btn.classList.toggle('ring-1', isCur);
                btn.classList.toggle('ring-yellow-400', isCur);
            });
        }
    }
};

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
            { port: 'gate_out', pin: 10, color: 'bg-orange-500' }
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
            { gapCls: 'gap-1.5', theme: 'cv' }
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

export const seqDefs = {
    SEQ8,
    SEQ16,
    CHORD,
    GATE4,
    ARP
};
