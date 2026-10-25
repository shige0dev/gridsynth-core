import { UIHelpers } from '../../ui/helpers.js?v=352';
import { JsonIoDialog } from '../../ui/json-io-dialog.js?v=352';
import { parseNoteToCv as parseCommonNoteToCv } from '../../core/musical.js?v=365';

export const parseNoteToCv = (val) => parseCommonNoteToCv(val, 1, 0, 2.0);

export function extractSeqPayload(parsed, targetType) {
    if (!parsed) return null;
    if (Array.isArray(parsed)) {
        return { steps: parsed };
    }
    if (typeof parsed !== 'object') return null;

    if (Array.isArray(parsed.steps)) return parsed;
    if (Array.isArray(parsed.pattern)) return { steps: parsed.pattern, ...parsed };
    if (Array.isArray(parsed.notes)) return { steps: parsed.notes, ...parsed };

    for (const val of Object.values(parsed)) {
        if (val && typeof val === 'object') {
            if (Array.isArray(val.steps) && (!val.type || val.type === targetType)) {
                return val;
            }
        }
    }

    if (parsed.pages && typeof parsed.pages === 'object') {
        for (const p of Object.values(parsed.pages)) {
            if (p?.modules && typeof p.modules === 'object') {
                for (const mod of Object.values(p.modules)) {
                    if (mod && mod.type === targetType && Array.isArray(mod.steps)) {
                        return mod;
                    }
                }
            }
        }
    }

    return null;
}

export function normalizeImportSteps(rawSteps, maxSteps = 16) {
    if (!Array.isArray(rawSteps) || rawSteps.length === 0) {
        return Array.from({ length: maxSteps }, (_, i) => ({
            cv: i === 0 ? 0 : 0.25,
            active: true,
            cvActive: true,
            gate: true
        }));
    }

    const restRegex = /^(rest|r|-|\.|off|pause)$/i;

    let parsed = rawSteps.map((item) => {
        if (typeof item === 'number') {
            if (item < 0) {
                return { cv: 0, active: true, cvActive: false, gate: false };
            }
            return {
                cv: Math.max(0, Math.min(2.0, item)),
                active: true,
                cvActive: true,
                gate: true
            };
        }

        if (item === null || item === false) {
            return { cv: 0, active: true, cvActive: false, gate: false };
        }

        if (typeof item === 'string') {
            const s = item.trim();
            if (!s || restRegex.test(s)) {
                return { cv: 0, active: true, cvActive: false, gate: false };
            }
            const cv = parseNoteToCv(s);
            return { cv, active: true, cvActive: true, gate: true };
        }

        if (typeof item === 'object') {
            const isRest = item.rest === true || item.pause === true ||
                (typeof item.note === 'string' && restRegex.test(item.note.trim()));

            let cv = 0.25;
            if (item.cv !== undefined) {
                cv = parseNoteToCv(item.cv);
            } else if (item.note !== undefined) {
                cv = parseNoteToCv(item.note);
            } else if (item.pitch !== undefined) {
                cv = parseNoteToCv(item.pitch);
            }

            const active = item.active !== false;
            const gate = isRest ? false : (item.gate !== false);
            const cvActive = isRest ? false : (item.cvActive !== false);

            return {
                cv,
                active,
                cvActive,
                gate
            };
        }

        return { cv: 0.25, active: true, cvActive: true, gate: true };
    });

    if (parsed.length < maxSteps) {
        if (parsed.length > 0 && maxSteps % parsed.length === 0) {
            const times = maxSteps / parsed.length;
            const looped = [];
            for (let t = 0; t < times; t++) {
                looped.push(...parsed.map(s => ({ ...s })));
            }
            parsed = looped;
        } else {
            while (parsed.length < maxSteps) {
                parsed.push({ cv: 0.25, active: true, cvActive: true, gate: true });
            }
        }
    } else if (parsed.length > maxSteps) {
        parsed = parsed.slice(0, maxSteps);
    }

    return parsed;
}

export function openSeqExport(m, ctx, cb, maxSteps = 16) {
    const steps = (m.steps || []).slice(0, maxSteps).map((st, i) => {
        const val = typeof st === 'number' ? st : (st?.cv ?? 0);
        const isAct = typeof st === 'object' ? (st.active !== false) : true;
        const isCvAct = typeof st === 'object' ? (st.cvActive !== false) : true;
        const isGateAct = typeof st === 'object' ? (st.gate !== false) : true;
        return {
            step: i + 1,
            note: isAct ? (isGateAct ? UIHelpers.cvToNoteName(val) : 'REST') : 'SKIP',
            cv: Number(val.toFixed(4)),
            gate: isGateAct,
            active: isAct,
            cvActive: isCvAct
        };
    });

    const exportObj = {
        type: m.type || (maxSteps === 8 ? 'SEQ8' : 'SEQ16'),
        quantize: m.quantize !== false,
        steps
    };
    const jsonStr = JSON.stringify(exportObj, null, 2);

    JsonIoDialog.openExport({
        title: `${m.type || 'SEQ'} PATTERN EXPORT (${m.id || m.type})`,
        icon: 'upload',
        jsonStr,
        infoBadges: [
            `STEPS: ${steps.length}`,
            `ACTIVE: ${steps.filter(s => s.active && s.gate).length} ON`,
            `QLZ: ${m.quantize !== false ? 'ON' : 'OFF'}`
        ],
        copyToast: 'シーケンスパターンのJSONをクリップボードにコピーしました',
        showToast: (msg) => ctx.showToast?.(msg),
        leftActionHtml: `
            <button id="seq-switch-import-btn" class="h-6 px-2.5 bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-[9px] rounded-lg transition border border-slate-700 flex items-center gap-1 cursor-pointer">
                <i data-lucide="download" class="w-3 h-3 pointer-events-none"></i>IMPORT
            </button>
        `,
        onBindFooter: (footer) => {
            footer.querySelector('#seq-switch-import-btn')?.addEventListener('click', () => {
                openSeqImport(m, ctx, cb, maxSteps);
            });
        }
    });
}

export function openSeqImport(m, ctx, cb, maxSteps = 16) {
    JsonIoDialog.openImport({
        title: `${m.type || 'SEQ'} PATTERN IMPORT (${m.id || m.type})`,
        icon: 'download',
        placeholder: 'ここにシーケンスパターンの JSON を貼り付けてください...\n\n【対応フォーマット例】\n・音名配列: ["C1", "-", "E1", "G1", ...]\n・数値配列: [0.42, 0.0, 0.58, ...]\n・詳細オブジェクト: { "steps": [{ "note": "C1", "gate": true }, ...] }',
        showToast: (msg) => ctx.showToast?.(msg),
        actions: [
            {
                id: 'json-seq-switch-export-btn',
                label: 'VIEW EXPORT',
                icon: 'upload',
                cls: 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700',
                onClick: () => {
                    openSeqExport(m, ctx, cb, maxSteps);
                }
            },
            {
                id: 'json-seq-import-btn',
                label: `LOAD (${m.type || 'SEQ'} に適用)`,
                icon: 'check',
                cls: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30',
                onClick: (rawText, modal) => {
                    const res = JsonIoDialog.parseJsonText(rawText);
                    if (res.empty) {
                        ctx.showToast?.('JSONテキストが空です');
                        return;
                    }
                    if (res.syntaxError) {
                        const info = res.info;
                        alert(`【JSON構文エラー】\n${info.line}行目・${info.col}文字目付近に文法ミス（カンマや括弧の過不足など）があります。\n\n詳細: ${info.message}\n\n${info.snippet}`);
                        return;
                    }
                    const payload = extractSeqPayload(res.data, m.type || (maxSteps === 8 ? 'SEQ8' : 'SEQ16'));
                    if (!payload || !payload.steps || !Array.isArray(payload.steps)) {
                        alert('【インポートエラー】\n有効なシーケンスパターン（steps配列、数値配列、音名配列）が見つかりません。');
                        return;
                    }

                    if (typeof payload.quantize === 'boolean') {
                        m.quantize = payload.quantize;
                    }

                    const normalizedSteps = normalizeImportSteps(payload.steps, maxSteps);
                    m.steps = normalizedSteps;

                    modal.classList.add('hidden');
                    ctx.reRenderModal();
                    cb?.();
                    ctx.showToast?.(`${m.id || m.type} にパターン (${normalizedSteps.length}ステップ) を読み込みました ✅`);
                }
            }
        ]
    });
}

const renderSeqStepButtons = (idx, isAct, isCvAct, isGateAct, isSeq16 = false) => `
    <div class="flex flex-col gap-0.5 w-full mt-0.5 shrink-0">
        <button data-act="gate" data-step="${idx}" class="text-[6.5px] font-bold py-0.5 rounded border transition-colors shrink-0 ${!isAct ? 'bg-slate-950 text-slate-600 border-slate-800' : (isGateAct ? 'bg-sky-950 text-sky-300 border-sky-500/80' : 'bg-slate-950 text-slate-600 border-slate-800')}" title="GATE">GATE</button>
        <button data-act="cvActive" data-step="${idx}" class="text-[7px] font-bold py-0.5 rounded border transition-colors shrink-0 ${!isAct ? 'bg-slate-950 text-slate-600 border-slate-800' : (isCvAct ? 'bg-cyan-950 text-cyan-300 border-cyan-500/80' : 'bg-slate-950 text-slate-600 border-slate-800')}" title="CV">CV</button>
        <button data-act="active" data-step="${idx}" class="text-[6.5px] font-bold py-0.5 rounded border transition-colors shrink-0 ${isAct ? 'bg-blue-950 text-blue-300 border-blue-500/80' : 'bg-slate-950 text-slate-500 border-slate-800'}" title="STEP ACTIVE">${isSeq16 ? (idx + 1) : 'STEP'}</button>
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
            { port: 'gate_out', color: 'bg-red-500' }
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
                <div class="flex items-center gap-1">
                    <button id="seq8-json-export-btn" class="h-4 px-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 rounded text-[7.5px] font-bold cursor-pointer transition shadow-sm flex items-center gap-0.5 shrink-0" title="シーケンスパターンをJSONとしてエクスポート">
                        <i data-lucide="upload" class="w-2.5 h-2.5 pointer-events-none"></i>
                        <span>EXP</span>
                    </button>
                    <button id="seq8-json-import-btn" class="h-4 px-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 rounded text-[7.5px] font-bold cursor-pointer transition shadow-sm flex items-center gap-0.5 shrink-0" title="JSONテキストからパターンをインポート">
                        <i data-lucide="download" class="w-2.5 h-2.5 pointer-events-none"></i>
                        <span>IMP</span>
                    </button>
                    <button id="seq-qlz-btn" class="h-4 px-1.5 rounded text-[7.5px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${m.quantize!==false?'bg-cyan-600 text-white border-cyan-500':'bg-slate-800 text-slate-400 border-slate-700'}">QLZ: ${m.quantize!==false?'ON':'OFF'}</button>
                </div>
            </div>
            <div class="flex items-center justify-between py-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1 overflow-x-auto">
                ${(m.steps||[]).map((st, i) => {
                    const val = typeof st === 'number' ? st : (st?.cv ?? 0);
                    const isAct = typeof st === 'object' ? (st.active !== false) : true;
                    const isCvAct = typeof st === 'object' ? (st.cvActive !== false) : true;
                    const isGateAct = typeof st === 'object' ? (st.gate !== false) : true;
                    return `
                    <div data-step-col="${i}" class="flex flex-col items-center gap-1 flex-1 min-w-[34px] p-1 rounded-lg border transition-all shrink-0 ${isAct ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-950/80 border-slate-800/40 opacity-40 grayscale'}">
                        <span id="seq-slider-${i}-disp" class="text-[8.5px] ${isAct ? 'text-cyan-300' : 'text-slate-500'} font-mono font-bold cursor-ns-resize touch-none select-none hover:bg-slate-800/80 px-1 py-0.5 rounded transition-colors shrink-0" title="上下ドラッグで微調整">${m.quantize!==false?UIHelpers.cvToNoteName(val):val.toFixed(2)}</span>
                        <div class="h-12 min-h-[48px] flex items-center justify-center my-0.5 shrink-0">
                            <input type="range" data-seq-slider="${i}" id="seq-slider-${i}" min="0" max="2.0" step="${m.quantize!==false?0.083333:0.01}" value="${val}" class="native-vslider ${isAct ? 'accent-blue-500' : 'accent-slate-600'} shrink-0">
                        </div>
                        ${renderSeqStepButtons(i, isAct, isCvAct, isGateAct, false)}
                    </div>`;
                }).join('')}
            </div>
        </div>`,
    bindEvents: (m, ctx, cb) => {
        const root = document.getElementById('seq-modal-root');
        if (!root) return;
        if (typeof lucide !== 'undefined') {
            try { lucide.createIcons({ root }); } catch (_) {}
        }
        root.querySelector('#seq8-json-export-btn')?.addEventListener('click', () => {
            openSeqExport(m, ctx, cb, 8);
        });
        root.querySelector('#seq8-json-import-btn')?.addEventListener('click', () => {
            openSeqImport(m, ctx, cb, 8);
        });
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
            { port: 'gate_out', color: 'bg-red-500' }
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
                heightCls: 'h-6',
                gapCls: 'gap-px',
                containerCls: 'w-[52px]',
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
            <div class="flex items-center justify-between py-1 px-1 bg-slate-950/60 rounded-xl border border-slate-800/80 gap-1 overflow-x-auto">
                ${slice.map((st, i) => {
                    const idx = startIdx + i;
                    const val = typeof st === 'number' ? st : (st?.cv ?? 0);
                    const isAct = typeof st === 'object' ? (st.active !== false) : true;
                    const isCvAct = typeof st === 'object' ? (st.cvActive !== false) : true;
                    const isGateAct = typeof st === 'object' ? (st.gate !== false) : true;
                    return `
                    <div data-step-col="${idx}" class="flex flex-col items-center gap-0.5 flex-1 min-w-[34px] p-1 rounded-lg border transition-all shrink-0 ${isAct ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-950/80 border-slate-800/40 opacity-40 grayscale'}">
                        <span id="seq16-slider-${idx}-disp" class="text-[8px] ${isAct ? 'text-cyan-300' : 'text-slate-500'} font-mono font-bold cursor-ns-resize touch-none select-none hover:bg-slate-800/80 px-0.5 py-0.5 rounded transition-colors shrink-0" title="上下ドラッグで微調整">${m.quantize!==false?UIHelpers.cvToNoteName(val):val.toFixed(2)}</span>
                        <div class="h-12 min-h-[48px] flex items-center justify-center my-0.5 shrink-0">
                            <input type="range" data-seq-slider="${idx}" id="seq16-slider-${idx}" min="0" max="2.0" step="${m.quantize!==false?0.083333:0.01}" value="${val}" class="native-vslider ${isAct ? 'accent-blue-500' : 'accent-slate-600'} shrink-0">
                        </div>
                        ${renderSeqStepButtons(idx, isAct, isCvAct, isGateAct, true)}
                    </div>`;
                }).join('')}
            </div>
        `;
        return `
            <div id="seq16-modal-root" class="space-y-1">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] text-slate-400 uppercase font-semibold">16-STEP SEQUENCER</span>
                    <div class="flex items-center gap-1">
                        <button id="seq16-json-export-btn" class="h-4 px-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 rounded text-[7.5px] font-bold cursor-pointer transition shadow-sm flex items-center gap-0.5 shrink-0" title="シーケンスパターンをJSONとしてエクスポート">
                            <i data-lucide="upload" class="w-2.5 h-2.5 pointer-events-none"></i>
                            <span>EXP</span>
                        </button>
                        <button id="seq16-json-import-btn" class="h-4 px-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 rounded text-[7.5px] font-bold cursor-pointer transition shadow-sm flex items-center gap-0.5 shrink-0" title="JSONテキストからパターンをインポート">
                            <i data-lucide="download" class="w-2.5 h-2.5 pointer-events-none"></i>
                            <span>IMP</span>
                        </button>
                        <button id="seq16-qlz-btn" class="h-4 px-1.5 rounded text-[7.5px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${m.quantize!==false?'bg-cyan-600 text-white border-cyan-500':'bg-slate-800 text-slate-400 border-slate-700'}">QLZ: ${m.quantize!==false?'ON':'OFF'}</button>
                    </div>
                </div>
                ${renderStepRow(steps.slice(0, 8), 0)}
                ${renderStepRow(steps.slice(8, 16), 8)}
            </div>
        `;
    },
    bindEvents: (m, ctx, cb) => {
        const root = document.getElementById('seq16-modal-root');
        if (!root) return;
        if (typeof lucide !== 'undefined') {
            try { lucide.createIcons({ root }); } catch (_) {}
        }
        root.querySelector('#seq16-json-export-btn')?.addEventListener('click', () => {
            openSeqExport(m, ctx, cb, 16);
        });
        root.querySelector('#seq16-json-import-btn')?.addEventListener('click', () => {
            openSeqImport(m, ctx, cb, 16);
        });
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
