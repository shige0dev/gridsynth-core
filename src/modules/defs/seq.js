import { UIHelpers } from '../../ui/helpers.js';

const renderSeqStepButtons = (idx, isAct, isCvAct, isGateAct, isSeq16 = false) => `
    <div class="flex flex-col gap-0.5 w-full mt-0.5">
        <button data-act="gate" data-step="${idx}" class="text-[6.5px] font-bold py-0.5 rounded border transition-colors ${!isAct ? 'bg-slate-950 text-slate-600 border-slate-800' : (isGateAct ? 'bg-sky-950 text-sky-300 border-sky-500/80' : 'bg-slate-950 text-slate-600 border-slate-800')}" title="GATE">GATE</button>
        <button data-act="cvActive" data-step="${idx}" class="text-[7px] font-bold py-0.5 rounded border transition-colors ${!isAct ? 'bg-slate-950 text-slate-600 border-slate-800' : (isCvAct ? 'bg-cyan-950 text-cyan-300 border-cyan-500/80' : 'bg-slate-950 text-slate-600 border-slate-800')}" title="CV">CV</button>
        <button data-act="active" data-step="${idx}" class="text-[6.5px] font-bold py-0.5 rounded border transition-colors ${isAct ? 'bg-blue-950 text-blue-300 border-blue-500/80' : 'bg-slate-950 text-slate-500 border-slate-800'}" title="STEP ACTIVE">${isSeq16 ? (idx + 1) : 'STEP'}</button>
    </div>
`;

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
    updateLive: (cell, data, isP, modal, m) => {
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
                        <input type="range" data-seq-slider="${i}" id="seq-slider-${i}" min="0" max="2.0" step="${m.quantize!==false?0.083333:0.01}" value="${val}" class="native-vslider ${isAct ? 'accent-blue-500' : 'accent-slate-600'} !h-12">
                        ${renderSeqStepButtons(i, isAct, isCvAct, isGateAct, false)}
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
                        ${renderSeqStepButtons(idx, isAct, isCvAct, isGateAct, true)}
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

export const seqDefs = {
    SEQ8,
    SEQ16
};
