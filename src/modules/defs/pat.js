import { STRUDEL_PRESETS } from '../../core/strudel-parser.js';
import {
    noteToMidiNum,
    midiNumToNote,
    genTokenId as genId,
    walkTokens,
    findTokens,
    parsePatternToTokens,
    tokensToPattern,
    clearTokenModifiers,
    getAdjacentGroup,
    groupTokens,
    moveTokenNode
} from '../../core/pat-tokens.js';

export const PAT = {
    color: 'sky',
    defaults: () => {
        const pattern = 'c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2';
        return {
            type: 'PAT',
            pattern,
            _tokens: parsePatternToTokens(pattern),
            cycleBeats: 4,
            gateLen: 0.8,
            presetName: '16-step',
            _addPitch: 'c2'
        };
    },
    ports: () => ({
        in: [{ port: 'reset_in', pin: 5, color: 'bg-red-500' }],
        out: [
            { port: 'gate_out', pin: 10, color: 'bg-red-500' },
            { port: 'cv_out', pin: 11, color: 'bg-yellow-400' }
        ]
    }),
    renderGrid: () => `
        <div class="flex items-center justify-center w-full h-full pointer-events-none select-none">
            <span class="pat-state-disp text-[17px] font-mono font-bold text-slate-500 tracking-wider">&mdash;</span>
        </div>`,
    updateLive: (cell, data, isP, modal, m) => {
        const stateEl = cell?.querySelector('.pat-state-disp');
        if (stateEl) {
            if (!isP || !data || data.powerOn === false) {
                stateEl.textContent = (!isP || !data) ? '\u2014' : 'OFF';
                stateEl.className = 'pat-state-disp text-[17px] font-mono font-bold text-slate-600 tracking-wider';
            } else {
                const label = data.activeLabel || (data.activeIdx >= 0 ? `STEP ${data.activeIdx + 1}` : '\u2014');
                const isRest = data.isRest || label === '~' || label === '\u2014';
                stateEl.textContent = label;
                stateEl.className = isRest
                    ? 'pat-state-disp text-[17px] font-mono font-bold text-cyan-400/30 tracking-wider'
                    : data.gate
                        ? 'pat-state-disp text-[17px] font-mono font-black text-yellow-300 tracking-wider drop-shadow-[0_0_8px_rgba(250,204,21,0.85)]'
                        : 'pat-state-disp text-[17px] font-mono font-bold text-cyan-300 tracking-wider';
            }
        }

        // Highlight active playing token in modal (only when playing and not editing)
        if (modal) {
            const isEditing = m?._isEditing === true;
            const activeTokenId = (isP && !isEditing && data?.activeTokenId) ? data.activeTokenId : null;
            const isGate = isP && !isEditing && !!data?.gate;
            modal.querySelectorAll('.pat-tok').forEach(tok => {
                const isActive = activeTokenId && tok.dataset.id === activeTokenId;
                if (isActive) {
                    if (isGate) {
                        tok.classList.remove('border-slate-800', 'border-cyan-400', 'bg-slate-900/90');
                        tok.classList.add('border-yellow-300', 'bg-yellow-400/30', 'scale-105', 'shadow-[0_0_10px_rgba(253,224,71,0.85)]');
                    } else {
                        tok.classList.remove('border-slate-800', 'border-yellow-300', 'bg-yellow-400/30', 'scale-105', 'shadow-[0_0_10px_rgba(253,224,71,0.85)]');
                        tok.classList.add('border-cyan-400', 'bg-cyan-950/60');
                    }
                } else {
                    tok.classList.remove(
                        'border-cyan-400', 'border-yellow-300',
                        'bg-cyan-950/60', 'bg-yellow-400/30',
                        'scale-105', 'shadow-[0_0_10px_rgba(253,224,71,0.85)]'
                    );
                    if (!tok.classList.contains('border-yellow-400')) {
                        tok.classList.add('border-slate-800', 'bg-slate-900/90');
                    }
                }
            });
        }
    },
    renderModal: (m, ctx) => {
        const uid = ctx?.id || m?.id || 'pat';
        const pat = m.pattern || 'c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2';
        const curBar = (m.cycleBeats || 4) / 4;
        const gatePct = Math.round((m.gateLen ?? 0.8) * 100);
        const curAddPitch = (m._addPitch || 'c2').toUpperCase();
        if (m._confirmedPattern === undefined) {
            m._confirmedPattern = pat;
            m._isEditing = false;
        }
        if (!m._tokens) m._tokens = parsePatternToTokens(pat);

        const isBar = (val) => Math.abs(curBar - val) < 0.001 ? 'selected' : '';
        const btnCls = "h-5 px-1 bg-sky-950/80 hover:bg-sky-900 text-sky-300 rounded text-[8px] font-bold border border-sky-700/60 transition";
        const grpCls = "h-5 w-[18px] flex items-center justify-center bg-slate-900 text-slate-500 border border-slate-800 rounded text-[8.5px] font-bold shadow-sm transition active:scale-95 opacity-50 cursor-not-allowed";

        return `
            <div id="pat-modal-root-${uid}" class="space-y-1 p-0.5 select-none touch-none w-full">
                <!-- Row 1: BAR, GATE, MANUAL & PRESET -->
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 gap-1 overflow-x-auto no-scrollbar">
                    <div class="flex items-center gap-1.5 shrink-0">
                        <div class="flex items-center bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 gap-1" title="小節数 (BAR)">
                            <span class="text-[7px] text-slate-400 uppercase font-mono font-bold">BAR</span>
                            <select id="pat-bars-${uid}" class="bg-slate-900 text-cyan-300 font-mono text-[8px] font-bold border border-slate-700 rounded px-1 py-0.5">
                                <option value="0.25" ${isBar(0.25)}>/4</option><option value="0.5" ${isBar(0.5)}>/2</option>
                                <option value="1" ${isBar(1)}>x1</option><option value="2" ${isBar(2)}>x2</option>
                                <option value="4" ${isBar(4)}>x4</option><option value="8" ${isBar(8)}>x8</option>
                            </select>
                        </div>
                        <div class="flex items-center bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 gap-1">
                            <span class="text-[7px] text-slate-400 uppercase font-mono font-bold">GATE</span>
                            <input type="range" id="pat-gate-${uid}" min="10" max="95" step="5" value="${gatePct}" class="w-10 h-1 accent-cyan-400 cursor-pointer">
                            <span id="pat-gate-disp-${uid}" class="text-[7.5px] font-mono font-bold text-cyan-300 min-w-[18px] text-right">${gatePct}%</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <button id="pat-btn-manual-${uid}" class="h-5 px-1.5 flex items-center gap-0.5 text-[7px] font-bold ${m._showManual ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-slate-900 text-slate-400'} rounded border border-slate-700 uppercase">
                            <span class="text-[6px] font-mono">${m._showManual ? '▼' : '▶'}</span><span>MANUAL</span>
                        </button>
                        <button id="pat-btn-presets-${uid}" class="h-5 px-1.5 flex items-center gap-0.5 text-[7px] font-bold ${m._showPresets ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-slate-900 text-slate-400'} rounded border border-slate-700 uppercase">
                            <span class="text-[6px] font-mono">${m._showPresets ? '▼' : '▶'}</span><span>PRESET</span>
                        </button>
                    </div>
                </div>

                <!-- Row 2: Add note, Grouping, Modifiers, Trash & SEND -->
                <div class="flex items-center pb-1 border-b border-slate-800 gap-1 overflow-x-auto no-scrollbar w-full">
                    <div class="flex items-center gap-1 shrink-0">
                        <div id="pat-add-note-${uid}" class="h-5 px-1.5 bg-sky-950/90 hover:bg-sky-900 text-sky-200 rounded border border-sky-600/80 shadow-sm cursor-ns-resize flex items-center gap-0.5" title="スワイプで音程変更 / タップで追加">
                            <span id="pat-add-pitch-${uid}" class="text-[8px] font-mono font-black text-sky-100 pointer-events-none">${curAddPitch}</span>
                            <span class="text-[6px] text-sky-400 pointer-events-none">↕</span>
                        </div>
                        <button id="pat-add-rest-${uid}" class="h-5 px-1.5 bg-sky-950/90 text-sky-300 rounded text-[8px] font-bold border border-sky-600/80" title="休符追加">~</button>
                    </div>
                    <div class="flex items-center gap-0.5 shrink-0">
                        <button id="pat-bracket-${uid}" disabled class="${grpCls}" title="[] グループ">[]</button>
                        <button id="pat-angle-${uid}" disabled class="${grpCls} tracking-tighter" title="<> 交代グループ">&lt;&gt;</button>
                        <button id="pat-choice-${uid}" disabled class="${grpCls} tracking-tighter" title="[|] 選択グループ">[|]</button>
                        <button id="pat-subdiv-${uid}" class="${btnCls}">*n</button>
                        <button id="pat-slowdown-${uid}" class="${btnCls}">/n</button>
                        <button id="pat-repeat-${uid}" class="${btnCls}">!n</button>
                        <button id="pat-prob-${uid}" class="${btnCls} text-[8.5px] font-mono">?</button>
                        <button id="pat-del-${uid}" class="h-5 px-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 rounded border border-red-500/60 flex items-center justify-center shrink-0" title="選択削除 / 修飾子削除 / グループ解除">
                            <svg class="w-2.5 h-2.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                    </div>
                    <div class="flex-1 min-w-[4px]"></div>
                    <button id="pat-revert-${uid}" class="h-5 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded border border-slate-700 flex items-center justify-center shrink-0" title="編集破棄 / 前に戻す (確定状態に復帰)">
                        <svg class="w-2.5 h-2.5 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
                    </button>
                    <button id="pat-send-${uid}" class="h-5 px-2 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/70 rounded flex items-center justify-center font-mono text-[9px] font-bold shadow-sm transition active:scale-95 shrink-0" title="パターンを反映">SEND</button>
                </div>

                <!-- Row 3: Token Strip -->
                <div class="relative w-full min-w-0">
                    <div id="pat-container-${uid}" class="relative w-full bg-slate-950 border border-slate-800 rounded p-[1px] overflow-hidden shadow-inner">
                        <button id="pat-scroll-left-${uid}" class="absolute left-0 top-0 bottom-0 w-2 z-10 bg-slate-950/80 text-slate-400 hover:text-cyan-300 text-[6px] font-bold flex items-center justify-center backdrop-blur-[1px]">◀</button>
                        <div id="pat-strip-${uid}" class="flex items-center gap-[1px] overflow-x-auto min-h-[22px] h-5 py-0 px-2 no-scrollbar"></div>
                        <button id="pat-scroll-right-${uid}" class="absolute right-0 top-0 bottom-0 w-2 z-10 bg-slate-950/80 text-slate-400 hover:text-cyan-300 text-[6px] font-bold flex items-center justify-center backdrop-blur-[1px]">▶</button>
                    </div>
                </div>

                ${m._showManual ? `
                <div class="bg-slate-950 rounded border border-cyan-800/80 p-1.5 text-[8px] font-mono text-slate-300">
                    <div class="grid grid-cols-3 gap-x-1.5 gap-y-0.5 leading-snug text-[7.5px]">
                        <div><strong class="text-purple-300">[A B]</strong>:等分</div>
                        <div><strong class="text-purple-300">&lt;A B&gt;</strong>:周回交代</div>
                        <div><strong class="text-emerald-300">[A|B]</strong>:二者択一</div>
                        <div><strong class="text-sky-300">*N</strong>:細分化</div>
                        <div><strong class="text-sky-300">/N</strong>:伸長</div>
                        <div><strong class="text-sky-300">!N</strong>:複製</div>
                        <div><strong class="text-emerald-300">?</strong>:確率</div>
                        <div><strong class="text-slate-400">~</strong>:休符</div>
                    </div>
                </div>` : ''}

                ${m._showPresets ? `
                <div class="grid grid-cols-4 sm:grid-cols-6 gap-1 pt-1 border-t border-slate-800">
                    ${STRUDEL_PRESETS.map((p) => `
                        <button class="pat-preset-btn h-5 px-1 bg-slate-800/90 hover:bg-cyan-950/80 border border-slate-700 rounded flex items-center justify-center truncate" data-pattern="${p.pattern}">
                            <span class="text-[7px] font-bold text-cyan-300 truncate pointer-events-none">${p.name}</span>
                        </button>
                    `).join('')}
                </div>` : ''}
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const uid = ctx?.id || m?.id || 'pat';
        const root = document.getElementById(`pat-modal-root-${uid}`) || (ctx?.getDialogElement ? ctx.getDialogElement() : null) || document;
        if (!root) return;

        const strip = root.querySelector(`#pat-strip-${uid}`);
        const addPitchDisp = root.querySelector(`#pat-add-pitch-${uid}`);
        let selectedIds = new Set();

        const sync = (triggerCb = false) => {
            m.pattern = tokensToPattern(m._tokens);
            if (triggerCb) {
                m._isEditing = false;
                cb();
            } else {
                m._isEditing = true;
            }
            renderTokens();
        };

        const renderTokens = () => {
            if (!strip) return;

            const renderMods = (n) => {
                const chips = [];
                if (n.subdiv > 1) chips.push(`<span data-mod="subdiv" data-pid="${n.id}" data-val="${n.subdiv}" class="pat-mod text-cyan-300 hover:text-white bg-slate-800/80 border border-slate-700/80 text-[7px] font-mono font-bold px-[2px] rounded cursor-ns-resize">*${n.subdiv}</span>`);
                if (n.slowdown > 1) chips.push(`<span data-mod="slowdown" data-pid="${n.id}" data-val="${n.slowdown}" class="pat-mod text-cyan-300 hover:text-white bg-slate-800/80 border border-slate-700/80 text-[7px] font-mono font-bold px-[2px] rounded cursor-ns-resize">/${n.slowdown}</span>`);
                if (n.repeat > 1) chips.push(`<span data-mod="repeat" data-pid="${n.id}" data-val="${n.repeat}" class="pat-mod text-cyan-300 hover:text-white bg-slate-800/80 border border-slate-700/80 text-[7px] font-mono font-bold px-[2px] rounded cursor-ns-resize">!${n.repeat}</span>`);
                if (n.prob !== undefined && n.prob < 1.0) chips.push(`<span data-mod="prob" data-pid="${n.id}" class="pat-mod text-cyan-300 hover:text-white bg-slate-800/80 border border-slate-700/80 text-[7px] font-mono font-bold px-[2px] rounded cursor-pointer">${n.prob === 0.5 ? '?' : `?${n.prob}`}</span>`);
                return chips.length ? `<div class="flex items-center gap-[1px] ml-0.5">${chips.join('')}</div>` : '';
            };

            const renderNode = (node) => {
                const isSel = selectedIds.has(node.id);
                const border = isSel ? 'border-yellow-400 bg-yellow-400/25 ring-1 ring-yellow-400' : 'border-slate-800 bg-slate-900/90 hover:border-cyan-500/70';
                if (node.type === 'group') {
                    const isA = node.groupType === 'angle', isC = node.groupType === 'choice';
                    return `
                        <div data-id="${node.id}" class="pat-tok pat-grp relative flex items-center gap-[2px] px-[2px] py-[1px] rounded border border-dashed ${border} cursor-pointer shrink-0">
                            <span class="text-[9px] font-mono font-bold ${isC ? 'text-emerald-400' : 'text-sky-400'} pointer-events-none">${isA ? '<' : '['}</span>
                            <div class="flex items-center gap-[1px]">
                                ${(node.children || []).map((c, i) => (isC && i > 0 ? `<span class="text-[8px] font-mono text-emerald-400 pointer-events-none">|</span>` : '') + renderNode(c)).join('')}
                            </div>
                            <span class="text-[9px] font-mono font-bold ${isC ? 'text-emerald-400' : 'text-sky-400'} pointer-events-none">${isA ? '>' : ']'}</span>
                            ${renderMods(node)}
                        </div>`;
                }
                const isR = node.type === 'rest';
                return `
                    <div data-id="${node.id}" class="pat-tok relative flex items-center justify-center min-w-[12px] h-[19px] px-[2px] rounded border ${border} cursor-ns-resize select-none shrink-0 gap-[1px]">
                        <span class="text-[7.5px] font-mono font-bold ${isR ? 'text-slate-600' : 'text-cyan-300'} pointer-events-none">${isR ? '~' : (node.val || 'c2').toUpperCase()}</span>
                        ${renderMods(node)}
                    </div>`;
            };

            strip.innerHTML = m._tokens.map(renderNode).join('');

            // Update Grouping Buttons enable state
            const adj = getAdjacentGroup(m._tokens, selectedIds);
            ['bracket', 'angle', 'choice'].forEach(k => {
                const btn = root.querySelector(`#pat-${k}-${uid}`);
                if (btn) {
                    btn.disabled = !adj;
                    btn.className = `h-5 w-[18px] flex items-center justify-center border rounded text-[8.5px] font-bold shadow-sm transition ${adj ? 'bg-sky-900 text-sky-100 border-sky-400 cursor-pointer' : 'bg-slate-900 text-slate-500 border-slate-800 opacity-50 cursor-not-allowed'}`;
                }
            });
            if (typeof lucide !== 'undefined' && lucide.createIcons) try { lucide.createIcons({ root }); } catch (_) {}
        };

        // Scroll handlers
        root.querySelector(`#pat-scroll-left-${uid}`)?.addEventListener('click', (e) => { e.stopPropagation(); strip?.scrollBy({ left: -60, behavior: 'smooth' }); });
        root.querySelector(`#pat-scroll-right-${uid}`)?.addEventListener('click', (e) => { e.stopPropagation(); strip?.scrollBy({ left: 60, behavior: 'smooth' }); });
        root.querySelector(`#pat-container-${uid}`)?.addEventListener('pointerdown', (e) => {
            if (!e.target.closest('.pat-tok') && selectedIds.size > 0) { selectedIds.clear(); renderTokens(); }
        });

        // Unified Event Delegation on Strip (for both Token Drag/Swipe and Modifier Chips)
        strip?.addEventListener('pointerdown', (e) => {
            const modChip = e.target.closest('.pat-mod');
            if (modChip) {
                e.preventDefault(); e.stopPropagation();
                const pId = modChip.dataset.pid, modType = modChip.dataset.mod;
                const startY = e.clientY, initVal = parseInt(modChip.dataset.val, 10) || 2;
                let moved = false;
                const onM = (me) => {
                    const diff = Math.trunc((startY - me.clientY) / 10);
                    if (Math.abs(diff) >= 1) {
                        moved = true;
                        walkTokens(m._tokens, n => {
                            if (n.id === pId) {
                                const target = initVal + diff;
                                if (target < 2) delete n[modType];
                                else n[modType] = Math.min(32, target);
                            }
                            return n;
                        });
                        sync(false);
                    }
                };
                const onU = () => {
                    window.removeEventListener('pointermove', onM); window.removeEventListener('pointerup', onU);
                    if (!moved) { walkTokens(m._tokens, n => { if (n.id === pId) delete n[modType]; return n; }); sync(false); }
                };
                window.addEventListener('pointermove', onM); window.addEventListener('pointerup', onU);
                return;
            }

            const tokEl = e.target.closest('.pat-tok');
            if (!tokEl) return;
            e.preventDefault(); e.stopPropagation();
            const id = tokEl.dataset.id;
            const startX = e.clientX, startY = e.clientY;
            let isDrag = false, isSwipe = false, lastStep = 0, targetEl = null, dropPos = 'after';

            const timer = setTimeout(() => {
                if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
                renderTokens();
            }, 300);

            const clearLine = () => strip.querySelectorAll('.pat-tok').forEach(el => el.classList.remove('border-l-2', 'border-r-2', 'border-white', 'ring-2', 'ring-white', 'bg-white/10'));

            const onMove = (me) => {
                const dx = me.clientX - startX, dy = startY - me.clientY;
                if (!isSwipe && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
                    clearTimeout(timer); isDrag = true;
                    tokEl.style.transform = `translateX(${dx}px) scale(1.05)`;
                    tokEl.style.pointerEvents = 'none';
                    const elBelow = document.elementFromPoint(me.clientX, me.clientY);
                    tokEl.style.pointerEvents = '';
                    const target = elBelow?.closest?.('.pat-tok');
                    clearLine();
                    if (target && target !== tokEl && !tokEl.contains(target)) {
                        targetEl = target;
                        const rect = target.getBoundingClientRect();
                        const relX = (me.clientX - rect.left) / rect.width;
                        dropPos = relX < 0.5 ? 'before' : 'after';
                        target.classList.add(dropPos === 'before' ? 'border-l-2' : 'border-r-2', 'border-white');
                    } else targetEl = null;
                    return;
                }
                if (!isDrag && Math.abs(dy) >= 6) {
                    clearTimeout(timer); isSwipe = true;
                    if (!selectedIds.has(id)) { selectedIds.clear(); selectedIds.add(id); renderTokens(); }
                    const step = Math.trunc(dy / 8);
                    if (step !== lastStep) {
                        const delta = step - lastStep;
                        walkTokens(m._tokens, n => {
                            if (selectedIds.has(n.id) && n.type === 'note') n.val = midiNumToNote(noteToMidiNum(n.val) + delta);
                            return n;
                        });
                        lastStep = step;
                        sync(false);
                    }
                }
            };

            const onUp = () => {
                window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
                clearTimeout(timer); tokEl.style.transform = ''; clearLine();
                if (targetEl && targetEl.dataset.id !== id) {
                    m._tokens = moveTokenNode(m._tokens, id, targetEl.dataset.id, dropPos);
                    selectedIds.clear(); selectedIds.add(id);
                    sync(false); return;
                }
                if (!isDrag && !isSwipe) {
                    if (selectedIds.has(id) && selectedIds.size === 1) selectedIds.clear();
                    else { selectedIds.clear(); selectedIds.add(id); }
                    renderTokens();
                }
            };
            window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
        });

        // Add Note & Rest
        let boxStartY = 0, boxMoved = false, boxLast = 0;
        root.querySelector(`#pat-add-note-${uid}`)?.addEventListener('pointerdown', (e) => {
            e.preventDefault(); boxStartY = e.clientY; boxMoved = false; boxLast = 0;
            const onM = (me) => {
                const step = Math.trunc((boxStartY - me.clientY) / 8);
                if (Math.abs(step) >= 1) {
                    boxMoved = true;
                    if (step !== boxLast) {
                        m._addPitch = midiNumToNote(noteToMidiNum(m._addPitch || 'c2') + (step - boxLast));
                        if (addPitchDisp) addPitchDisp.textContent = m._addPitch.toUpperCase();
                        boxLast = step;
                    }
                }
            };
            const onU = () => {
                window.removeEventListener('pointermove', onM); window.removeEventListener('pointerup', onU);
                if (!boxMoved) {
                    const sel = findTokens(m._tokens, n => selectedIds.has(n.id));
                    const p = (m._addPitch || 'c2').toLowerCase();
                    if (sel.length) sel.forEach(n => { n.type = 'note'; n.val = p; });
                    else { m._tokens.push({ id: genId(), type: 'note', val: p }); selectedIds.clear(); if (strip) strip.scrollLeft = strip.scrollWidth; }
                    sync(false);
                }
            };
            window.addEventListener('pointermove', onM); window.addEventListener('pointerup', onU);
        });

        root.querySelector(`#pat-add-rest-${uid}`)?.addEventListener('click', () => {
            const sel = findTokens(m._tokens, n => selectedIds.has(n.id));
            if (sel.length) sel.forEach(n => { n.type = 'rest'; n.val = '~'; });
            else { m._tokens.push({ id: genId(), type: 'rest', val: '~' }); selectedIds.clear(); if (strip) strip.scrollLeft = strip.scrollWidth; }
            sync(false);
        });

        // Grouping & Modifiers
        ['bracket', 'angle', 'choice'].forEach(k => {
            root.querySelector(`#pat-${k}-${uid}`)?.addEventListener('click', () => {
                const g = groupTokens(m._tokens, selectedIds, k);
                if (g) { selectedIds.clear(); selectedIds.add(g.id); sync(false); }
            });
        });

        const cycle = (k, max = 4) => {
            walkTokens(m._tokens, n => {
                if (selectedIds.has(n.id)) {
                    n[k] = ((n[k] || 1) >= max) ? 1 : (n[k] || 1) + 1;
                    if (k === 'subdiv' && n.subdiv > 1) delete n.slowdown;
                    if (k === 'slowdown' && n.slowdown > 1) delete n.subdiv;
                    if (n[k] <= 1) delete n[k];
                }
                return n;
            });
            sync(false);
        };
        root.querySelector(`#pat-subdiv-${uid}`)?.addEventListener('click', () => cycle('subdiv'));
        root.querySelector(`#pat-slowdown-${uid}`)?.addEventListener('click', () => cycle('slowdown'));
        root.querySelector(`#pat-repeat-${uid}`)?.addEventListener('click', () => cycle('repeat'));
        root.querySelector(`#pat-prob-${uid}`)?.addEventListener('click', () => {
            walkTokens(m._tokens, n => {
                if (selectedIds.has(n.id)) {
                    const cur = n.prob ?? 1.0;
                    n.prob = cur >= 1.0 ? 0.5 : (Math.abs(cur - 0.5) < 0.05 ? 0.8 : (Math.abs(cur - 0.8) < 0.05 ? 0.2 : undefined));
                    if (n.prob === undefined) delete n.prob;
                }
                return n;
            });
            sync(false);
        });

        // Delete button
        root.querySelector(`#pat-del-${uid}`)?.addEventListener('click', () => {
            if (!selectedIds.size) return;
            let ungrouped = false;
            m._tokens = walkTokens(m._tokens, n => (selectedIds.has(n.id) && n.type === 'group' && n.children) ? ((ungrouped = true), n.children) : n);
            if (ungrouped) { selectedIds.clear(); sync(false); return; }

            let modCleared = false;
            walkTokens(m._tokens, n => { if (selectedIds.has(n.id) && clearTokenModifiers(n)) modCleared = true; return n; });
            if (modCleared) { sync(false); return; }

            m._tokens = walkTokens(m._tokens, n => selectedIds.has(n.id) ? null : n);
            if (!m._tokens.length) m._tokens = [{ id: genId(), type: 'rest', val: '~' }];
            selectedIds.clear();
            sync(false);
        });

        // Revert (編集破棄・前に戻す) button
        root.querySelector(`#pat-revert-${uid}`)?.addEventListener('click', () => {
            const revertPat = m._confirmedPattern || m.pattern || 'c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2';
            m._tokens = parsePatternToTokens(revertPat);
            m.pattern = revertPat;
            m._isEditing = false;
            selectedIds.clear();
            sync(false);
            if (ctx?.showToast) ctx.showToast('編集を破棄して前に戻しました');
        });

        // Dialog close / cancel cleanup: revert unconfirmed edits
        m._onCloseDialog = () => {
            if (m._confirmedPattern && m.pattern !== m._confirmedPattern) {
                m.pattern = m._confirmedPattern;
                m._tokens = parsePatternToTokens(m._confirmedPattern);
                cb();
            }
            delete m._confirmedPattern;
            delete m._onCloseDialog;
        };

        // SEND, Manual, Presets, Bars, Gate
        root.querySelector(`#pat-send-${uid}`)?.addEventListener('click', () => {
            selectedIds.clear();
            m._confirmedPattern = tokensToPattern(m._tokens);
            sync(true);
            if (ctx?.showToast) ctx.showToast('SEND: 反映しました');
        });
        root.querySelector(`#pat-btn-manual-${uid}`)?.addEventListener('click', () => { m._showManual = !m._showManual; ctx.reRenderModal(); });
        root.querySelector(`#pat-btn-presets-${uid}`)?.addEventListener('click', () => { m._showPresets = !m._showPresets; ctx.reRenderModal(); });
        root.querySelectorAll('.pat-preset-btn').forEach(btn => btn.addEventListener('click', () => {
            if (btn.dataset.pattern) { m._tokens = parsePatternToTokens(btn.dataset.pattern); selectedIds.clear(); sync(false); }
        }));
        root.querySelector(`#pat-bars-${uid}`)?.addEventListener('change', (e) => { m.cycleBeats = (parseFloat(e.target.value) || 1) * 4; cb(); });
        root.querySelector(`#pat-gate-${uid}`)?.addEventListener('input', (e) => {
            const v = parseInt(e.target.value, 10);
            m.gateLen = v / 100.0;
            const disp = root.querySelector(`#pat-gate-disp-${uid}`);
            if (disp) disp.textContent = `${v}%`;
            cb();
        });

        renderTokens();
    }
};

export const patDefs = { PAT };
