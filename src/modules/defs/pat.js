import { STRUDEL_PRESETS, renderPatternHighlightedHTML } from '../../core/strudel-parser.js';

const NOTE_SEMITONES_MAP = {
    'c': 0, 'c#': 1, 'db': 1,
    'd': 2, 'd#': 3, 'eb': 3,
    'e': 4,
    'f': 5, 'f#': 6, 'gb': 6,
    'g': 7, 'g#': 8, 'ab': 8,
    'a': 9, 'a#': 10, 'bb': 10,
    'b': 11
};
const SEMITONE_NOTES = ['c', 'c#', 'd', 'eb', 'e', 'f', 'f#', 'g', 'ab', 'a', 'bb', 'b'];

function noteToMidiNum(noteStr) {
    const match = String(noteStr).trim().toLowerCase().match(/^([a-g][#b]?)(-?\d+)?$/);
    if (!match) return null;
    const semi = NOTE_SEMITONES_MAP[match[1]];
    if (semi === undefined) return null;
    const oct = match[2] !== undefined ? parseInt(match[2], 10) : 2;
    return (oct + 1) * 12 + semi;
}

function midiNumToNote(midi) {
    const m = Math.max(12, Math.min(108, Math.round(midi)));
    const oct = Math.floor(m / 12) - 1;
    const semi = m % 12;
    return `${SEMITONE_NOTES[semi]}${oct}`;
}

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
        in: [
            { port: 'run_in', color: 'bg-emerald-500' },
            { port: 'reset_in', color: 'bg-red-500' }
        ],
        out: [
            { port: 'gate_out', pin: 10, color: 'bg-red-500' },
            { port: 'cv_out', pin: 11, color: 'bg-yellow-400' }
        ]
    }),
    renderGrid: (m) => {
        return `
            <div class="flex items-center justify-center w-full h-full pointer-events-none select-none">
                <span class="pat-state-disp text-[17px] font-mono font-bold text-slate-500 tracking-wider">&mdash;</span>
            </div>`;
    },
    updateLive: (cell, data, isP, modal, m) => {
        const stateEl = cell?.querySelector('.pat-state-disp');
        if (stateEl) {
            if (!isP || !data) {
                stateEl.textContent = '\u2014';
                stateEl.className = 'pat-state-disp text-[17px] font-mono font-bold text-slate-600 tracking-wider';
            } else if (data.powerOn === false) {
                stateEl.textContent = 'OFF';
                stateEl.className = 'pat-state-disp text-[17px] font-mono font-bold text-slate-600 tracking-wider';
            } else {
                const label = data.activeLabel || (data.activeIdx >= 0 ? `STEP ${data.activeIdx + 1}` : '\u2014');
                const isGateOn = !!data.gate;
                const isRest = data.isRest || label === '~' || label === '\u2014';
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
            <div id="pat-modal-root-${uid}" class="space-y-1 p-0.5">
                <!-- Top Row: Left (PRESET & HINT), Middle (GATE Slider to Right), Right Small Actions (↺ & ↵) -->
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 gap-1.5">
                    <!-- Left: PRESET & HINT Toggles -->
                    <div class="flex items-center gap-1 shrink-0">
                        <button id="pat-toggle-presets-${uid}" class="flex items-center gap-0.5 text-[7px] font-bold text-slate-400 hover:text-cyan-300 uppercase tracking-wider transition bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/80">
                            <span class="text-[6px] font-mono text-cyan-400">${showPresets ? '▼' : '▶'}</span>
                            <span>PRESET</span>
                        </button>
                        <button id="pat-toggle-hints-${uid}" class="flex items-center gap-0.5 text-[7px] font-bold text-slate-400 hover:text-cyan-300 uppercase tracking-wider transition bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/80">
                            <span class="text-[6px] font-mono text-cyan-400">${showHints ? '▼' : '▶'}</span>
                            <span>HINT</span>
                        </button>
                    </div>

                    <!-- Middle: GATE (Stretched to right) -->
                    <div class="flex-1 flex items-center min-w-0 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 gap-1.5">
                        <span class="text-[7px] text-slate-400 uppercase font-mono shrink-0">GATE:</span>
                        <input type="range" id="pat-gate-slider-${uid}" min="10" max="95" step="5" value="${gatePct}" class="flex-1 w-full h-1 accent-cyan-400 cursor-pointer touch-none">
                        <span id="pat-gate-disp-${uid}" class="text-[7.5px] font-mono font-bold text-cyan-300 min-w-[20px] text-right shrink-0">${gatePct}%</span>
                    </div>

                    <!-- Right: Small Action Buttons [ ↺ ] and [ ↵ ] -->
                    <div class="flex items-center gap-1 shrink-0">
                        <button id="pat-revert-btn-${uid}" disabled class="w-6 h-5 shrink-0 rounded text-[9.5px] font-bold border transition flex items-center justify-center opacity-40 pointer-events-none bg-slate-900 text-slate-600 border-slate-800 shadow-sm cursor-pointer" title="元の文字列に戻す (REVERT)">
                            ↺
                        </button>
                        <button id="pat-apply-btn-${uid}" class="w-6 h-5 shrink-0 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[10px] font-bold border border-slate-700 transition flex items-center justify-center cursor-pointer shadow-sm" title="流し込み (SEND / Enter)">
                            ↵
                        </button>
                    </div>
                </div>

                <!-- Second Row: Scroll Left [ ◀ ], Maximized Text Display & Input, Scroll Right [ ▶ ] -->
                <div class="flex items-center gap-1 w-full min-w-0">
                    <!-- Scroll Left Button -->
                    <button id="pat-scroll-left-${uid}" class="w-5 h-7 shrink-0 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded text-[8px] font-bold border border-slate-800 flex items-center justify-center transition cursor-pointer select-none active:bg-cyan-950/80 active:text-cyan-200 touch-none" title="左へスクロール">
                        ◀
                    </button>

                    <!-- Real Text Input with Full Width Highlight -->
                    <div class="relative flex-1 flex items-center min-w-0 h-7 bg-slate-950 border border-cyan-500/70 rounded-lg shadow-inner overflow-hidden touch-none">
                        <!-- Real Text Input (receives typing & pointer events) -->
                        <input type="text" id="pat-code-input-${uid}" value="${pat}" placeholder="e.g. [c2 ~ c2 ~] [c2 ~ c2 ~] [c2 ~ c2 ~] [c2 ~ c2 eb2]" class="w-full h-full bg-transparent font-mono text-cyan-300 px-2 py-0 text-[9.5px] font-bold tracking-normal leading-7 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition relative z-10 box-border overflow-hidden touch-none">
                        <!-- Live Highlight Overlay (visible when not editing) -->
                        <div id="pat-highlight-overlay-${uid}" class="absolute inset-0 flex items-center px-2 py-0 font-mono text-[9.5px] font-bold tracking-normal leading-7 bg-slate-950 overflow-hidden whitespace-pre select-none z-20 box-border touch-none">
                            <div id="pat-highlight-content-${uid}" class="text-cyan-300 whitespace-pre touch-none">
                                ${renderPatternHighlightedHTML(pat)}
                            </div>
                        </div>
                    </div>

                    <!-- Scroll Right Button -->
                    <button id="pat-scroll-right-${uid}" class="w-5 h-7 shrink-0 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded text-[8px] font-bold border border-slate-800 flex items-center justify-center transition cursor-pointer select-none active:bg-cyan-950/80 active:text-cyan-200 touch-none" title="右へスクロール">
                        ▶
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

                <!-- Mini Cheat Sheet (2-Line Extended Notation Hints: 4x2 Grid) -->
                ${showHints ? `
                <div class="bg-slate-950/80 p-1.5 rounded border border-slate-800/80 text-[7.5px] font-mono text-slate-300 space-y-1 animate-fadeIn select-none">
                    <div class="grid grid-cols-4 gap-1 text-center">
                        <div><b class="text-cyan-300">~</b> 休符</div>
                        <div><b class="text-cyan-300">[a b]</b> 分割</div>
                        <div><b class="text-cyan-300">&lt;a b&gt;</b> 周期交代</div>
                        <div><b class="text-cyan-300">a!3</b> 複製</div>
                    </div>
                    <div class="grid grid-cols-4 gap-1 pt-0.5 border-t border-slate-800/50 text-center">
                        <div><b class="text-cyan-300">a*4</b> 連打</div>
                        <div><b class="text-cyan-300">a(3,8)</b> ユークリッド</div>
                        <div><b class="text-cyan-300">a?0.7</b> 確率</div>
                        <div><b class="text-cyan-300">a^1</b> オクターブ変更</div>
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
        const scrollLeftBtn = document.getElementById(`pat-scroll-left-${uid}`);
        const scrollRightBtn = document.getElementById(`pat-scroll-right-${uid}`);
        const selectBeats = document.getElementById(`pat-beats-select-${uid}`);
        const gateSlider = document.getElementById(`pat-gate-slider-${uid}`);
        const gateDisp = document.getElementById(`pat-gate-disp-${uid}`);
        const togglePresets = document.getElementById(`pat-toggle-presets-${uid}`);
        const toggleHints = document.getElementById(`pat-toggle-hints-${uid}`);

        let isEditingMode = false;

        const syncScroll = () => {
            if (overlay && input) {
                overlay.scrollLeft = input.scrollLeft;
            }
        };

        const doScroll = (delta) => {
            if (!input) return;
            input.scrollLeft += delta;
            syncScroll();
        };

        const setupScrollBtn = (btn, delta) => {
            if (!btn) return;
            let timer = null;
            let interval = null;

            const startScroll = (e) => {
                e.preventDefault();
                e.stopPropagation();
                doScroll(delta);
                timer = setTimeout(() => {
                    interval = setInterval(() => {
                        doScroll(delta);
                    }, 50);
                }, 250);
            };

            const stopScroll = () => {
                if (timer) { clearTimeout(timer); timer = null; }
                if (interval) { clearInterval(interval); interval = null; }
            };

            btn.addEventListener('pointerdown', startScroll);
            btn.addEventListener('pointerup', stopScroll);
            btn.addEventListener('pointercancel', stopScroll);
            btn.addEventListener('pointerleave', stopScroll);
        };

        setupScrollBtn(scrollLeftBtn, -60);
        setupScrollBtn(scrollRightBtn, 60);

        const setEditing = (editing) => {
            isEditingMode = editing;
            if (overlay) {
                if (editing) {
                    overlay.classList.add('hidden');
                    if (input) input.style.color = '#67e8f9';
                } else {
                    syncScroll();
                    overlay.classList.remove('hidden');
                    if (overlayContent) {
                        overlayContent.innerHTML = renderPatternHighlightedHTML(m.pattern || '');
                        setupPitchDrag();
                    }
                    if (input) input.style.color = 'transparent';
                }
            }
        };

        const setupPitchDrag = () => {
            if (!overlayContent) return;
            overlayContent.querySelectorAll('[data-pat-note]').forEach(el => {
                el.onpointerdown = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const startY = e.clientY;
                    const initialNote = el.dataset.patNote;
                    const initialMidi = noteToMidiNum(initialNote);
                    if (initialMidi === null) return;

                    const pos = parseInt(el.dataset.strPos, 10);
                    if (isNaN(pos)) return;

                    const startPat = m.pattern || '';
                    const noteLen = initialNote.length;
                    const noteSpan = el.querySelector('span') || el;
                    let hasMoved = false;
                    let lastMidi = initialMidi;

                    try {
                        el.setPointerCapture(e.pointerId);
                    } catch (_) {}

                    const onPointerMove = (me) => {
                        me.preventDefault();
                        const dy = startY - me.clientY;
                        if (Math.abs(dy) >= 6) {
                            hasMoved = true;
                            const semitoneDiff = Math.trunc(dy / 10);
                            const curMidi = Math.max(12, Math.min(108, initialMidi + semitoneDiff));
                            if (curMidi !== lastMidi) {
                                lastMidi = curMidi;
                                const newNote = midiNumToNote(curMidi);
                                const updatedPat = startPat.slice(0, pos) + newNote + startPat.slice(pos + noteLen);
                                m.pattern = updatedPat;
                                if (input) input.value = updatedPat;
                                noteSpan.textContent = newNote;
                                noteSpan.className = 'text-yellow-300 font-black drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]';
                                cb();
                            }
                        }
                    };

                    const onPointerUp = () => {
                        window.removeEventListener('pointermove', onPointerMove);
                        window.removeEventListener('pointerup', onPointerUp);
                        window.removeEventListener('pointercancel', onPointerUp);
                        try { el.releasePointerCapture(e.pointerId); } catch (_) {}

                        if (!hasMoved) {
                            setEditing(true);
                            input?.focus();
                        } else {
                            if (overlayContent) {
                                overlayContent.innerHTML = renderPatternHighlightedHTML(m.pattern || '');
                                setupPitchDrag();
                            }
                            updateButtonStates();
                            cb();
                        }
                    };

                    window.addEventListener('pointermove', onPointerMove, { passive: false });
                    window.addEventListener('pointerup', onPointerUp);
                    window.addEventListener('pointercancel', onPointerUp);
                };
            });
        };

        // Click directly on the overlay backdrop to edit the whole pattern
        overlay?.addEventListener('click', (e) => {
            if (!isEditingMode) {
                setEditing(true);
                input?.focus();
            }
        });

        setEditing(false);
        setupPitchDrag();

        input?.addEventListener('scroll', syncScroll);

        const updateButtonStates = () => {
            const currentSaved = m.pattern || '';
            const isDirty = (input?.value ?? '') !== currentSaved;
            if (revertBtn) {
                if (isDirty) {
                    revertBtn.disabled = false;
                    revertBtn.className = 'w-6 h-5 shrink-0 rounded text-[9.5px] font-bold border transition flex items-center justify-center cursor-pointer bg-amber-950/90 hover:bg-amber-900 text-amber-300 border-amber-500/80 shadow-sm';
                } else {
                    revertBtn.disabled = true;
                    revertBtn.className = 'w-6 h-5 shrink-0 rounded text-[9.5px] font-bold border transition flex items-center justify-center opacity-40 pointer-events-none bg-slate-900 text-slate-600 border-slate-800 shadow-sm';
                }
            }
            if (applyBtn) {
                if (isDirty) {
                    applyBtn.className = 'w-6 h-5 shrink-0 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded text-[10px] border border-cyan-300 shadow-md shadow-cyan-500/40 transition flex items-center justify-center cursor-pointer';
                } else {
                    applyBtn.className = 'w-6 h-5 shrink-0 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[10px] font-bold border border-slate-700 transition flex items-center justify-center cursor-pointer shadow-sm';
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

