import { STRUDEL_PRESETS, renderPatternHighlightedHTML } from '../../core/strudel-parser.js';

export const PAT = {
    color: 'sky',
    defaults: () => ({
        type: 'PAT',
        pattern: 'c2 c2 c2 c2',
        cycleBeats: 4,
        gateLen: 0.8,
        presetName: '4-on-floor'
    }),
    ports: () => ({
        in: [],
        out: [
            { port: 'cv_out', color: 'bg-yellow-400' },
            { port: 'gate_out', color: 'bg-orange-500' }
        ]
    }),
    renderGrid: (m) => {
        return `
            <div class="flex items-center justify-center w-full h-full pointer-events-none select-none">
                <span class="pat-state-disp text-[17px] font-mono font-bold text-slate-500 tracking-wider">—</span>
            </div>`;
    },
    updateLive: (cell, data, isP, modal, m) => {
        const stateEl = cell?.querySelector('.pat-state-disp');
        if (stateEl) {
            if (!isP || !data) {
                stateEl.textContent = '—';
                stateEl.className = 'pat-state-disp text-[17px] font-mono font-bold text-slate-600 tracking-wider';
            } else {
                const label = data.activeLabel || (data.activeIdx >= 0 ? `STEP ${data.activeIdx + 1}` : '—');
                const isGateOn = !!data.gate;
                const isRest = data.isRest || label === '~' || label === '—';
                stateEl.textContent = label;
                if (isRest) {
                    stateEl.className = 'pat-state-disp text-[17px] font-mono font-bold text-cyan-400/30 tracking-wider';
                } else if (isGateOn) {
                    stateEl.className = 'pat-state-disp text-[17px] font-mono font-black text-yellow-300 tracking-wider drop-shadow-[0_0_8px_rgba(250,204,21,0.85)]';
                } else {
                    stateEl.className = 'pat-state-disp text-[17px] font-mono font-bold text-cyan-300 tracking-wider';
                }
            }
        }

        const activeIdx = isP ? (data?.activeIdx ?? -1) : -1;
        if (modal) {
            modal.querySelectorAll('[data-tok-start]').forEach(el => {
                const s = parseInt(el.dataset.tokStart, 10);
                const e = parseInt(el.dataset.tokEnd, 10);
                const isActive = activeIdx >= s && activeIdx <= e;
                el.classList.toggle('pat-tok-active', isActive);
            });
            modal.querySelectorAll('[data-pat-tok]:not([data-tok-start])').forEach(el => {
                const idx = parseInt(el.dataset.patTok, 10);
                el.classList.toggle('pat-tok-active', idx === activeIdx);
            });
        }
    },
    renderModal: (m, ctx) => {
        const uid = ctx?.id || m?.id || 'pat';
        const pat = m.pattern || 'c2 c2 c2 c2';
        const beats = m.cycleBeats || 4;
        const gatePct = Math.round((m.gateLen ?? 0.8) * 100);
        const showPresets = m._showPresets === true;
        const showHints = m._showHints === true;

        return `
            <div id="pat-modal-root-${uid}" class="space-y-1.5 p-0.5">
                <!-- Top Bar: Left Action (Revert), Right Controls (Extended Cycle & Gate) -->
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 gap-2">
                    <div class="flex items-center gap-1">
                        <button id="pat-revert-btn-${uid}" disabled class="h-6 px-1.5 shrink-0 rounded text-[9.5px] font-bold border transition flex items-center justify-center opacity-40 pointer-events-none bg-slate-900 text-slate-600 border-slate-800" title="元の文字列に戻す (REVERT)">
                            ↺ REVERT
                        </button>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="flex items-center gap-1 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
                            <span class="text-[7.5px] text-slate-400 uppercase">CYCLE:</span>
                            <select id="pat-beats-select-${uid}" class="bg-slate-900 text-cyan-300 font-mono text-[8px] font-bold rounded px-1 py-0.5 border border-slate-700">
                                <option value="0.25" ${beats === 0.25 ? 'selected' : ''}>1/16 (1/4 B)</option>
                                <option value="0.5" ${beats === 0.5 ? 'selected' : ''}>1/8 (1/2 B)</option>
                                <option value="1" ${beats === 1 ? 'selected' : ''}>1/4 (1 BEAT)</option>
                                <option value="2" ${beats === 2 ? 'selected' : ''}>1/2 (2 BEATS)</option>
                                <option value="4" ${beats === 4 ? 'selected' : ''}>1 BAR (4 BEATS)</option>
                                <option value="8" ${beats === 8 ? 'selected' : ''}>2 BARS (8 BEATS)</option>
                                <option value="16" ${beats === 16 ? 'selected' : ''}>4 BARS (16 BEATS)</option>
                                <option value="32" ${beats === 32 ? 'selected' : ''}>8 BARS (32 BEATS)</option>
                            </select>
                        </div>
                        <div class="flex items-center gap-1 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
                            <span class="text-[7.5px] text-slate-400 uppercase">GATE:</span>
                            <input type="range" id="pat-gate-slider-${uid}" min="10" max="95" step="5" value="${gatePct}" class="w-14 h-1 accent-cyan-400 cursor-pointer">
                            <span id="pat-gate-disp-${uid}" class="text-[8px] font-mono font-bold text-cyan-300 min-w-[24px] text-right">${gatePct}%</span>
                        </div>
                    </div>
                </div>

                <!-- Pattern Text Input with Return Button on the Right -->
                <div class="flex items-center gap-1 w-full min-w-0">
                    <div class="relative flex-1 flex items-center min-w-0 h-7 bg-slate-950 border border-cyan-500/70 rounded-lg shadow-inner overflow-hidden">
                        <!-- Real Text Input (receives typing & pointer events) -->
                        <input type="text" id="pat-code-input-${uid}" value="${pat}" placeholder="e.g. [c2 ~ c2 ~] [c2 ~ c2 ~] [c2 ~ c2 ~] [c2 ~ c2 eb2]" class="w-full h-full bg-transparent font-mono text-cyan-300 px-2 py-0 text-[9.5px] font-bold tracking-normal leading-7 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition relative z-10 box-border">
                        <!-- Live Highlight Overlay (visible when not editing) -->
                        <div id="pat-highlight-overlay-${uid}" class="absolute inset-0 flex items-center px-2 py-0 font-mono text-[9.5px] font-bold tracking-normal leading-7 bg-slate-950 overflow-x-hidden whitespace-pre pointer-events-none select-none z-20 box-border">
                            <div id="pat-highlight-content-${uid}" class="text-cyan-300 whitespace-pre">
                                ${renderPatternHighlightedHTML(pat)}
                            </div>
                        </div>
                    </div>
                    <!-- Return / Apply Button at Right End of Input Row -->
                    <button id="pat-apply-btn-${uid}" class="w-7 h-7 shrink-0 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-[12px] font-bold border border-slate-700 transition flex items-center justify-center cursor-pointer shadow-sm" title="流し込み (SEND / Enter)">
                        ↵
                    </button>
                </div>

                <!-- Accordion Toggle Headers -->
                <div class="flex items-center justify-between pt-0.5 border-t border-slate-800/80 px-0.5">
                    <button id="pat-toggle-presets-${uid}" class="flex items-center gap-1 text-[7.5px] font-bold text-slate-400 hover:text-cyan-300 uppercase tracking-wider transition">
                        <span class="text-[6.5px] font-mono text-cyan-400">${showPresets ? '▼' : '▶'}</span>
                        <span>PRESETS</span>
                    </button>
                    <button id="pat-toggle-hints-${uid}" class="flex items-center gap-1 text-[7.5px] font-bold text-slate-400 hover:text-cyan-300 uppercase tracking-wider transition">
                        <span class="text-[6.5px] font-mono text-cyan-400">${showHints ? '▼' : '▶'}</span>
                        <span>HINTS</span>
                    </button>
                </div>

                <!-- Presets Grid (Collapsible) -->
                ${showPresets ? `
                <div class="grid grid-cols-4 sm:grid-cols-6 gap-1 pt-0.5 animate-fadeIn">
                    ${STRUDEL_PRESETS.map((p) => `
                        <button class="pat-preset-btn h-6 px-1.5 bg-slate-800/90 hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-500/80 rounded flex items-center justify-center transition group truncate" data-pattern="${p.pattern}" title="${p.name}: ${p.pattern}">
                            <span class="text-[7.5px] font-bold text-cyan-300 group-hover:text-white truncate pointer-events-none">${p.name}</span>
                        </button>
                    `).join('')}
                </div>
                ` : ''}

                <!-- Mini Cheat Sheet (2-Line Extended Notation Hints) -->
                ${showHints ? `
                <div class="bg-slate-950/80 p-1.5 rounded border border-slate-800/80 text-[7px] font-mono text-slate-300 space-y-1 animate-fadeIn select-none">
                    <div class="grid grid-cols-5 gap-1 text-center">
                        <div><b class="text-cyan-300">c2 eb2</b> 音名</div>
                        <div><b class="text-cyan-300">~</b> 休符</div>
                        <div><b class="text-cyan-300">[a b]</b> 分割</div>
                        <div><b class="text-cyan-300">&lt;a b&gt;</b> 周期交代</div>
                        <div><b class="text-cyan-300">a!3</b> 複製</div>
                    </div>
                    <div class="grid grid-cols-5 gap-1 pt-0.5 border-t border-slate-800/50 text-center">
                        <div><b class="text-cyan-300">a*4</b> 連打</div>
                        <div><b class="text-cyan-300">a(3,8)</b> ユークリッド</div>
                        <div><b class="text-cyan-300">a?0.7</b> 確率</div>
                        <div><b class="text-cyan-300">[a,b]</b> 同時発音</div>
                        <div><b class="text-cyan-300">a^1</b> オクターブ</div>
                    </div>
                </div>
                ` : ''}
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const uid = ctx?.id || m?.id || 'pat';
        const root = document.getElementById(`pat-modal-root-${uid}`) || (ctx?.getDialogElement ? ctx.getDialogElement() : null) || document;
        if (!root) return;

        const input = document.getElementById(`pat-code-input-${uid}`) || root.querySelector?.('input[type="text"]');
        const overlay = document.getElementById(`pat-highlight-overlay-${uid}`);
        const overlayContent = document.getElementById(`pat-highlight-content-${uid}`);
        const revertBtn = document.getElementById(`pat-revert-btn-${uid}`);
        const applyBtn = document.getElementById(`pat-apply-btn-${uid}`);
        const selectBeats = document.getElementById(`pat-beats-select-${uid}`);
        const gateSlider = document.getElementById(`pat-gate-slider-${uid}`);
        const gateDisp = document.getElementById(`pat-gate-disp-${uid}`);
        const togglePresets = document.getElementById(`pat-toggle-presets-${uid}`);
        const toggleHints = document.getElementById(`pat-toggle-hints-${uid}`);

        const syncScroll = () => {
            if (overlay && input) {
                overlay.scrollLeft = input.scrollLeft;
            }
        };

        const setEditing = (editing) => {
            if (overlay) {
                if (editing) {
                    overlay.classList.add('hidden');
                    if (input) input.style.color = '#67e8f9';
                } else {
                    syncScroll();
                    overlay.classList.remove('hidden');
                    if (overlayContent) {
                        overlayContent.innerHTML = renderPatternHighlightedHTML(m.pattern || '');
                    }
                    if (input) input.style.color = 'transparent';
                }
            }
        };

        setEditing(false);

        input?.addEventListener('scroll', syncScroll);

        const updateButtonStates = () => {
            const currentSaved = m.pattern || '';
            const isDirty = (input?.value ?? '') !== currentSaved;
            if (revertBtn) {
                if (isDirty) {
                    revertBtn.disabled = false;
                    revertBtn.className = 'w-6 h-6 shrink-0 rounded text-[11px] font-bold border transition flex items-center justify-center cursor-pointer bg-amber-950/90 hover:bg-amber-900 text-amber-300 border-amber-500/80 shadow-sm';
                } else {
                    revertBtn.disabled = true;
                    revertBtn.className = 'w-6 h-6 shrink-0 rounded text-[11px] font-bold border transition flex items-center justify-center opacity-40 pointer-events-none bg-slate-900 text-slate-600 border-slate-800';
                }
            }
            if (applyBtn) {
                if (isDirty) {
                    applyBtn.className = 'w-6 h-6 shrink-0 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded text-[11px] border border-cyan-300 shadow-md shadow-cyan-500/40 transition flex items-center justify-center cursor-pointer';
                } else {
                    applyBtn.className = 'w-6 h-6 shrink-0 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px] font-bold border border-slate-700 transition flex items-center justify-center cursor-pointer';
                }
            }
        };

        const doApply = (val) => {
            const newPat = val !== undefined ? val : (input?.value ?? '');
            m.pattern = newPat;
            if (input) input.value = newPat;
            setEditing(false);
            input?.blur();
            updateButtonStates();
            cb();
        };

        input?.addEventListener('focus', () => {
            setEditing(true);
        });

        input?.addEventListener('input', () => {
            setEditing(true);
            updateButtonStates();
        });

        input?.addEventListener('blur', () => {
            const isDirty = (input?.value ?? '') !== (m.pattern || '');
            if (!isDirty) {
                setEditing(false);
            }
        });

        revertBtn?.addEventListener('click', () => {
            if (input) input.value = m.pattern || '';
            setEditing(false);
            input?.blur();
            updateButtonStates();
        });

        applyBtn?.addEventListener('click', () => {
            doApply();
        });

        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                doApply();
            }
        });

        selectBeats?.addEventListener('change', (e) => {
            m.cycleBeats = parseFloat(e.target.value) || 4;
            ctx.reRenderModal();
            cb();
        });

        gateSlider?.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            m.gateLen = val / 100.0;
            if (gateDisp) gateDisp.textContent = `${val}%`;
            cb();
        });

        // Toggle presets accordion
        togglePresets?.addEventListener('click', () => {
            m._showPresets = !m._showPresets;
            ctx.reRenderModal();
        });

        // Toggle hints accordion
        toggleHints?.addEventListener('click', () => {
            m._showHints = !m._showHints;
            ctx.reRenderModal();
        });

        root.querySelectorAll('.pat-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const patStr = btn.dataset.pattern;
                if (patStr !== undefined) {
                    doApply(patStr);
                }
            });
        });
    }
};

export const patDefs = {
    PAT
};

