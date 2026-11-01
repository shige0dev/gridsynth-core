import { STRUDEL_PRESETS } from '../../core/strudel-parser.js';
import {
    noteToMidiNum,
    midiNumToNote,
    genTokenId as genId,
    walkTokens,
    findTokens,
    parsePatternToTokens,
    tokensToPattern
} from '../../core/pat-tokens.js';

export { parsePatternToTokens, tokensToPattern };

export const PAT2 = {
    color: 'sky',
    defaults: () => ({
        type: 'PAT2',
        pattern: 'c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2',
        cycleBeats: 4,
        gateLen: 0.8,
        presetName: '16-step',
        _addPitch: 'c2'
    }),
    ports: () => ({
        in: [
            { port: 'reset_in', pin: 5, color: 'bg-red-500' }
        ],
        out: [
            { port: 'gate_out', pin: 10, color: 'bg-red-500' },
            { port: 'cv_out', pin: 11, color: 'bg-yellow-400' }
        ]
    }),
    renderGrid: (m) => {
        return `
            <div class="flex items-center justify-center w-full h-full pointer-events-none select-none">
                <span class="pat2-state-disp text-[17px] font-mono font-bold text-slate-500 tracking-wider">&mdash;</span>
            </div>`;
    },
    updateLive: (cell, data, isP, modal, m) => {
        const stateEl = cell?.querySelector('.pat2-state-disp');
        if (stateEl) {
            if (!isP || !data) {
                stateEl.textContent = '\u2014';
                stateEl.className = 'pat2-state-disp text-[17px] font-mono font-bold text-slate-600 tracking-wider';
            } else if (data.powerOn === false) {
                stateEl.textContent = 'OFF';
                stateEl.className = 'pat2-state-disp text-[17px] font-mono font-bold text-slate-600 tracking-wider';
            } else {
                const label = data.activeLabel || (data.activeIdx >= 0 ? `STEP ${data.activeIdx + 1}` : '\u2014');
                const isGateOn = !!data.gate;
                const isRest = data.isRest || label === '~' || label === '\u2014';
                stateEl.textContent = label;
                if (isRest) {
                    stateEl.className = 'pat2-state-disp text-[17px] font-mono font-bold text-cyan-400/30 tracking-wider';
                } else if (isGateOn) {
                    stateEl.className = 'pat2-state-disp text-[17px] font-mono font-black text-yellow-300 tracking-wider drop-shadow-[0_0_8px_rgba(250,204,21,0.85)]';
                } else {
                    stateEl.className = 'pat2-state-disp text-[17px] font-mono font-bold text-cyan-300 tracking-wider';
                }
            }
        }
    },
    renderModal: (m, ctx) => {
        const uid = ctx?.id || m?.id || 'pat2';
        const pat = m.pattern || 'c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2';
        const curCycle = m.cycleBeats || 4;
        const curBar = curCycle / 4;
        const gatePct = Math.round((m.gateLen ?? 0.8) * 100);
        const showPresets = m._showPresets === true;
        const showManual = m._showManual === true;
        const curAddPitch = (m._addPitch || 'c2').toUpperCase();

        if (m._committedPattern === undefined) {
            m._committedPattern = pat;
        }

        // Initialize tokens if missing or if no uncommitted draft exists and pattern changed externally
        if (!m._tokens || (!m._draftPattern && m._lastPatStr !== pat)) {
            m._tokens = parsePatternToTokens(pat);
            m._lastPatStr = pat;
        }

        // Helper to check selection for bar dropdown
        const isBarSelected = (val) => Math.abs(curBar - val) < 0.001;

        return `
            <div id="pat2-modal-root-${uid}" class="space-y-1 p-0.5 select-none touch-none w-full">
                <!-- 1st Row: BAR selector, GATE slider, and on the right: MANUAL button + PRESET button -->
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 gap-1 overflow-x-auto no-scrollbar">
                    <div class="flex items-center gap-1.5 shrink-0">
                        <!-- BAR selector (multiplication and division without brackets) -->
                        <div class="flex items-center bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 gap-1 shrink-0" title="繰り返し単位（小節数 BAR）: /4, /2, x1, x2, x4, x8">
                            <span class="text-[7px] text-slate-400 uppercase font-mono font-bold shrink-0">BAR</span>
                            <select id="pat2-bars-select-${uid}" class="bg-slate-900 text-cyan-300 font-mono text-[8px] font-bold border border-slate-700 rounded px-1 py-0.5 focus:outline-none cursor-pointer">
                                <option value="0.25" ${isBarSelected(0.25) ? 'selected' : ''}>/4</option>
                                <option value="0.5" ${isBarSelected(0.5) ? 'selected' : ''}>/2</option>
                                <option value="1" ${isBarSelected(1) ? 'selected' : ''}>x1</option>
                                <option value="2" ${isBarSelected(2) ? 'selected' : ''}>x2</option>
                                <option value="4" ${isBarSelected(4) ? 'selected' : ''}>x4</option>
                                <option value="8" ${isBarSelected(8) ? 'selected' : ''}>x8</option>
                            </select>
                        </div>
                        <!-- GATE slider -->
                        <div class="flex items-center bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 gap-1 shrink-0">
                            <span class="text-[7px] text-slate-400 uppercase font-mono font-bold shrink-0">GATE</span>
                            <input type="range" id="pat2-gate-slider-${uid}" min="10" max="95" step="5" value="${gatePct}" class="w-10 h-1 accent-cyan-400 cursor-pointer touch-none">
                            <span id="pat2-gate-disp-${uid}" class="text-[7.5px] font-mono font-bold text-cyan-300 min-w-[18px] text-right shrink-0">${gatePct}%</span>
                        </div>
                    </div>

                    <!-- Right of Row 1: MANUAL toggle button and PRESET toggle button -->
                    <div class="flex items-center gap-1 shrink-0">
                        <button id="pat2-toggle-manual-${uid}" class="h-5 px-1.5 flex items-center gap-0.5 text-[7px] font-bold ${showManual ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-slate-900 text-slate-400 hover:text-cyan-300 border-slate-700'} rounded border shadow-sm transition uppercase tracking-wider shrink-0 cursor-pointer" title="マニュアル解説を開閉">
                            <span class="text-[6px] font-mono">${showManual ? '▼' : '▶'}</span>
                            <span>MANUAL</span>
                        </button>
                        <button id="pat2-toggle-presets-${uid}" class="h-5 px-1.5 flex items-center gap-0.5 text-[7px] font-bold ${showPresets ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-slate-900 text-slate-400 hover:text-cyan-300 border-slate-700'} rounded border shadow-sm transition uppercase tracking-wider shrink-0 cursor-pointer" title="プリセット一覧を開閉">
                            <span class="text-[6px] font-mono">${showPresets ? '▼' : '▶'}</span>
                            <span>PRESET</span>
                        </button>
                    </div>
                </div>

                <!-- 2nd Row: Left-aligned editing tools, flex-1 spacer, Trash Delete, spacer, and right-aligned SEND (↵) button -->
                <div class="flex items-center pb-1 border-b border-slate-800 gap-1 overflow-x-auto no-scrollbar w-full">
                    <!-- Left: Fast Note / Rest Appender (Clean Blue theme) -->
                    <div class="flex items-center gap-1 shrink-0">
                        <div id="pat2-add-note-box-${uid}" class="h-5 px-1.5 bg-sky-950/90 hover:bg-sky-900 text-sky-200 rounded border border-sky-600/80 shadow-sm transition cursor-ns-resize flex items-center gap-0.5 touch-none" title="上下スワイプで音程変更 / タップで末尾に追加">
                            <span id="pat2-add-pitch-disp-${uid}" class="text-[8px] font-mono font-black text-sky-100 pointer-events-none">${curAddPitch}</span>
                            <span class="text-[6px] text-sky-400 pointer-events-none">↕</span>
                        </div>
                        <button id="pat2-add-rest-${uid}" class="h-5 px-1.5 bg-sky-950/90 hover:bg-sky-900 text-sky-300 hover:text-white rounded text-[8px] font-bold border border-sky-600/80 shadow-sm transition active:scale-95 flex items-center justify-center font-mono" title="休符を末尾に追加">
                            <span>~</span>
                        </button>
                    </div>

                    <!-- Middle: Grouping Buttons ([] / <> / [|]), Ungroup, Modifiers (*n, /n, !n, ?), all left-aligned -->
                    <div class="flex items-center gap-0.5 shrink-0">
                        <button id="pat2-bracket-btn-${uid}" disabled class="h-5 w-[18px] flex items-center justify-center bg-slate-900 text-slate-500 border border-slate-800 rounded text-[7.5px] font-bold shadow-sm transition active:scale-95 opacity-50 cursor-not-allowed" title="横並び選択した項目を [] 分割グループにまとめる">
                            []
                        </button>
                        <button id="pat2-angle-btn-${uid}" disabled class="h-5 w-[18px] flex items-center justify-center bg-slate-900 text-slate-500 border border-slate-800 rounded text-[7.5px] font-bold shadow-sm transition active:scale-95 opacity-50 cursor-not-allowed tracking-tighter" title="横並び選択した項目を <> 周期交代グループにまとめる">
                            &lt;&gt;
                        </button>
                        <button id="pat2-choice-btn-${uid}" disabled class="h-5 w-[18px] flex items-center justify-center bg-slate-900 text-slate-500 border border-slate-800 rounded text-[7.5px] font-bold shadow-sm transition active:scale-95 opacity-50 cursor-not-allowed tracking-tighter" title="横並び選択した項目を [ | ] ランダム選択グループにまとめる">
                            [|]
                        </button>
                        <button id="pat2-ungroup-btn-${uid}" class="h-5 px-1 bg-sky-950/80 hover:bg-sky-900 text-sky-300 rounded text-[7px] font-bold border border-sky-700/60 shadow-sm transition active:scale-95" title="グループ解除">
                            UNGRP
                        </button>
                        <button id="pat2-subdiv-btn-${uid}" class="h-5 px-1 bg-sky-950/80 hover:bg-sky-900 text-sky-300 rounded text-[7px] font-bold border border-sky-700/60 transition" title="細分化 (*2, *3, *4)">
                            *n
                        </button>
                        <button id="pat2-slowdown-btn-${uid}" class="h-5 px-1 bg-sky-950/80 hover:bg-sky-900 text-sky-300 rounded text-[7px] font-bold border border-sky-700/60 transition" title="スローダウン・ゲート伸長 (/2, /3, /4)">
                            /n
                        </button>
                        <button id="pat2-repeat-btn-${uid}" class="h-5 px-1 bg-sky-950/80 hover:bg-sky-900 text-sky-300 rounded text-[7px] font-bold border border-sky-700/60 transition" title="複製 (!2, !3, !4)">
                            !n
                        </button>
                        <button id="pat2-prob-btn-${uid}" class="h-5 px-1 bg-sky-950/80 hover:bg-sky-900 text-sky-300 rounded text-[7px] font-bold border border-sky-700/60 transition" title="発音確率 (?, ?0.8, ?0.2)">
                            ?
                        </button>
                        <button id="pat2-del-btn-${uid}" class="h-5 px-1 bg-red-950/80 hover:bg-red-900 text-red-300 rounded border border-red-500/60 transition flex items-center justify-center active:scale-95" title="選択削除">
                            <i data-lucide="trash-2" class="w-2.5 h-2.5 pointer-events-none"></i>
                        </button>
                    </div>

                    <!-- Flexible Space between Trash and SEND -->
                    <div class="flex-1 min-w-[4px]"></div>

                    <!-- Right End: SEND Button (↵ return mark only) -->
                    <button id="pat2-send-btn-${uid}" class="w-5 h-5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 hover:text-white border border-cyan-500/70 rounded flex items-center justify-center shadow-sm transition active:scale-95 shrink-0 cursor-pointer font-mono text-[11px] font-bold" title="パターンをシンセへ反映 (SEND / Enter)">
                        <span>↵</span>
                    </button>
                </div>

                <!-- 3rd Row: Token Strip Container with Scroll Left [ ◀ ] and Scroll Right [ ▶ ] Buttons -->
                <div class="flex items-center gap-0.5 w-full min-w-0">
                    <!-- Scroll Left Button -->
                    <button id="pat2-scroll-left-${uid}" class="w-4 h-6 shrink-0 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded text-[7.5px] font-bold border border-slate-800 flex items-center justify-center transition cursor-pointer select-none active:bg-cyan-950/80 active:text-cyan-200 touch-none" title="左へスクロール">
                        ◀
                    </button>
                    <div id="pat2-token-container-${uid}" class="relative flex-1 bg-slate-950 border border-slate-800 rounded p-[2px] overflow-hidden shadow-inner cursor-default min-w-0">
                        <div id="pat2-token-strip-${uid}" class="flex items-center gap-[2px] overflow-x-auto min-h-[26px] h-6 py-0 px-[2px] no-scrollbar select-none">
                            <!-- Populated dynamically via renderTokens -->
                        </div>
                    </div>
                    <!-- Scroll Right Button -->
                    <button id="pat2-scroll-right-${uid}" class="w-4 h-6 shrink-0 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 rounded text-[7.5px] font-bold border border-slate-800 flex items-center justify-center transition cursor-pointer select-none active:bg-cyan-950/80 active:text-cyan-200 touch-none" title="右へスクロール">
                        ▶
                    </button>
                </div>

                <!-- Collapsible Manual (150% text size, placed at the bottom when toggled) -->
                ${showManual ? `
                <div class="bg-slate-950 rounded border border-cyan-800/80 p-1.5 text-[10px] font-mono text-slate-300 space-y-1 shadow-inner">
                    <div class="text-[10.5px] font-bold text-cyan-300 flex items-center gap-1 border-b border-slate-800 pb-0.5">
                        <span class="text-cyan-400">📖</span>
                        <span>PAT2 MINI-NOTATION GUIDE</span>
                    </div>
                    <div class="grid grid-cols-2 gap-x-2 gap-y-0.5 leading-snug">
                        <div><strong class="text-purple-300 font-bold">[A B]</strong> : 1拍・1枠の等分</div>
                        <div><strong class="text-purple-300 font-bold">&lt;A B&gt;</strong> : サイクル毎の交代</div>
                        <div><strong class="text-emerald-300 font-bold">[A|B]</strong> : 確率による二者択一</div>
                        <div><strong class="text-amber-300 font-bold">*N</strong> : N倍に細分化 (連打)</div>
                        <div><strong class="text-amber-300 font-bold">/N</strong> : N倍に伸長 (ゲート延長)</div>
                        <div><strong class="text-amber-300 font-bold">!N</strong> : N回連続リピート</div>
                        <div><strong class="text-emerald-300 font-bold">?</strong> : 発音確率 (?, ?0.8, ?0.2)</div>
                        <div><strong class="text-slate-400 font-bold">~</strong> : 休符</div>
                    </div>
                    <div class="text-[9px] text-slate-400 pt-0.5 border-t border-slate-800/80">
                        ※トークン選択中に上部の <span class="text-sky-300 font-bold">↕上下スワイプ</span> で音程変更、<span class="text-sky-300 font-bold">↔ドラッグ</span> で位置入替が可能です。
                    </div>
                </div>
                ` : ''}

                <!-- Presets Grid (Collapsible at the bottom) -->
                ${showPresets ? `
                <div class="grid grid-cols-4 sm:grid-cols-6 gap-1 pt-1 border-t border-slate-800 pb-0.5">
                    ${STRUDEL_PRESETS.map((p) => `
                        <button class="pat2-preset-btn h-5 px-1 bg-slate-800/90 hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-500/80 rounded flex items-center justify-center transition group truncate" data-pattern="${p.pattern}">
                            <span class="text-[7px] font-bold text-cyan-300 group-hover:text-white truncate pointer-events-none">${p.name}</span>
                        </button>
                    `).join('')}
                </div>
                ` : ''}
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const uid = ctx?.id || m?.id || 'pat2';
        const root = document.getElementById(`pat2-modal-root-${uid}`) || (ctx?.getDialogElement ? ctx.getDialogElement() : null) || document;
        if (!root) return;

        const tokenStrip = document.getElementById(`pat2-token-strip-${uid}`);
        const tokenContainer = document.getElementById(`pat2-token-container-${uid}`);
        const bracketBtn = document.getElementById(`pat2-bracket-btn-${uid}`);
        const angleBtn = document.getElementById(`pat2-angle-btn-${uid}`);
        const choiceBtn = document.getElementById(`pat2-choice-btn-${uid}`);
        const ungroupBtn = document.getElementById(`pat2-ungroup-btn-${uid}`);
        const subdivBtn = document.getElementById(`pat2-subdiv-btn-${uid}`);
        const slowdownBtn = document.getElementById(`pat2-slowdown-btn-${uid}`);
        const repeatBtn = document.getElementById(`pat2-repeat-btn-${uid}`);
        const probBtn = document.getElementById(`pat2-prob-btn-${uid}`);
        const delBtn = document.getElementById(`pat2-del-btn-${uid}`);
        const addNoteBox = document.getElementById(`pat2-add-note-box-${uid}`);
        const addPitchDisp = document.getElementById(`pat2-add-pitch-disp-${uid}`);
        const addRestBtn = document.getElementById(`pat2-add-rest-${uid}`);
        const barsSelect = document.getElementById(`pat2-bars-select-${uid}`);
        const gateSlider = document.getElementById(`pat2-gate-slider-${uid}`);
        const gateDisp = document.getElementById(`pat2-gate-disp-${uid}`);
        const toggleManual = document.getElementById(`pat2-toggle-manual-${uid}`);
        const togglePresets = document.getElementById(`pat2-toggle-presets-${uid}`);
        const sendBtn = document.getElementById(`pat2-send-btn-${uid}`);
        const scrollLeftBtn = document.getElementById(`pat2-scroll-left-${uid}`);
        const scrollRightBtn = document.getElementById(`pat2-scroll-right-${uid}`);

        // Horizontal scroll button handlers for tokenStrip
        scrollLeftBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (tokenStrip) tokenStrip.scrollBy({ left: -60, behavior: 'smooth' });
        });
        scrollRightBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (tokenStrip) tokenStrip.scrollBy({ left: 60, behavior: 'smooth' });
        });

        // Save original committed pattern on dialog open for reverting if dismissed without SEND
        if (m._committedPattern === undefined) {
            m._committedPattern = m.pattern || 'c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2';
        }

        // On dialog dismiss/close without SEND: reset m._tokens & pattern back to committed state
        m._onCloseDialog = () => {
            if (m._committedPattern !== undefined) {
                if (m.pattern !== m._committedPattern) {
                    m.pattern = m._committedPattern;
                    cb();
                }
                m._tokens = parsePatternToTokens(m._committedPattern);
                m._lastPatStr = m._committedPattern;
                m._draftPattern = null;
            }
            delete m._committedPattern;
            delete m._draftPattern;
        };

        let selectedIds = new Set();

        // Render Lucide icons for Trash
        const refreshIcons = () => {
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                try { lucide.createIcons({ root }); } catch (_) {}
            }
        };

        // Click outside of any token inside container clears selection
        tokenContainer?.addEventListener('pointerdown', (e) => {
            if (!e.target.closest('.pat2-node-token')) {
                if (selectedIds.size > 0) {
                    selectedIds.clear();
                    renderTokens();
                }
            }
        });

        // Render HTML for tokens with tight 2px spacing
        const renderTokens = () => {
            if (!tokenStrip) return;
            const isDirty = (tokensToPattern(m._tokens)) !== (m._committedPattern || '');

            function renderNode(node, depth = 0) {
                const isSelected = selectedIds.has(node.id);
                const borderCls = isSelected
                    ? 'border-yellow-400 bg-yellow-400/25 shadow-sm ring-1 ring-yellow-400'
                    : isDirty
                        ? 'border-amber-800/80 bg-amber-950/40 hover:border-amber-400/80'
                        : 'border-slate-800 bg-slate-900/90 hover:border-cyan-500/70';

                if (node.type === 'group') {
                    const isAngle = node.groupType === 'angle';
                    const isChoice = node.groupType === 'choice';
                    const openSym = isAngle ? '<' : '[';
                    const closeSym = isAngle ? '>' : ']';
                    const symColor = isChoice ? 'text-emerald-400' : (isDirty ? 'text-amber-400' : 'text-sky-400');
                    return `
                        <div data-node-id="${node.id}" class="pat2-node-token pat2-group-box relative flex items-center gap-[1px] px-[2px] py-[1px] rounded border border-dashed ${borderCls} cursor-pointer transition shrink-0">
                            <span class="text-[9px] font-mono font-bold ${symColor} select-none pointer-events-none px-[1px] leading-none">${openSym}</span>
                            <div class="flex items-center gap-[1px]">
                                ${(node.children || []).map((c, i) => {
                                    const sep = (isChoice && i > 0) ? `<span class="text-[8px] font-mono font-bold text-emerald-400/90 pointer-events-none px-[1px]">|</span>` : '';
                                    return sep + renderNode(c, depth + 1);
                                }).join('')}
                            </div>
                            <span class="text-[9px] font-mono font-bold ${symColor} select-none pointer-events-none px-[1px] leading-none">${closeSym}</span>
                            ${renderBadge(node)}
                        </div>`;
                }

                const isRest = node.type === 'rest';
                const noteVal = (node.val || 'c2').toUpperCase();
                const noteTextColor = isRest
                    ? (isDirty ? 'text-amber-700/60' : 'text-slate-600')
                    : (isDirty ? 'text-amber-300 group-hover:text-white' : 'text-cyan-300 group-hover:text-white');

                return `
                    <div data-node-id="${node.id}" class="pat2-node-token relative flex items-center justify-center min-w-[15px] h-5 px-[2px] rounded border ${borderCls} cursor-ns-resize transition select-none group touch-none shrink-0">
                        <span class="pat2-node-val text-[8px] font-mono font-bold ${noteTextColor} leading-none pointer-events-none">${isRest ? '~' : noteVal}</span>
                        ${renderBadge(node)}
                    </div>`;
            }

            function renderBadge(node) {
                const badges = [];
                if (node.subdiv && node.subdiv > 1) badges.push(`*${node.subdiv}`);
                if (node.slowdown && node.slowdown > 1) badges.push(`/${node.slowdown}`);
                if (node.repeat && node.repeat > 1) badges.push(`!${node.repeat}`);
                if (node.prob !== undefined && node.prob < 1.0) {
                    badges.push(node.prob === 0.5 ? '?' : `?${node.prob}`);
                }
                if (!badges.length) return '';
                return `<div class="absolute -top-1 -right-0.5 bg-amber-500 text-slate-950 text-[5px] font-mono font-black px-0.5 rounded-full shadow pointer-events-none leading-tight whitespace-nowrap">${badges.join(' ')}</div>`;
            }

            tokenStrip.innerHTML = m._tokens.map(t => renderNode(t)).join('');
            bindTokenEvents();
            updateInspector();
            updateSendBtnState();
            refreshIcons();
        };

        const updateSendBtnState = () => {
            if (!sendBtn) return;
            const draftPat = tokensToPattern(m._tokens);
            const isDirty = draftPat !== (m._committedPattern || '');
            if (isDirty) {
                sendBtn.disabled = false;
                sendBtn.className = 'w-5 h-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 border border-cyan-300 font-black rounded flex items-center justify-center shadow-md shadow-cyan-500/40 transition active:scale-95 shrink-0 cursor-pointer font-mono text-[10px] animate-pulse';
            } else {
                sendBtn.disabled = false;
                sendBtn.className = 'w-5 h-5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-700 rounded flex items-center justify-center shadow-sm transition active:scale-95 shrink-0 cursor-pointer font-mono text-[10px] font-bold';
            }
        };

        const syncPattern = () => {
            const newPat = tokensToPattern(m._tokens);
            m._draftPattern = newPat;
            m._lastPatStr = newPat;
            updateSendBtnState();
            renderTokens();
        };

        const doSend = () => {
            const finalPat = tokensToPattern(m._tokens);
            m.pattern = finalPat;
            m._committedPattern = finalPat;
            m._draftPattern = null;
            m._lastPatStr = finalPat;
            updateSendBtnState();
            renderTokens();
            cb();
            if (ctx?.showToast) ctx.showToast('SEND: パターンを反映しました');
        };

        sendBtn?.addEventListener('click', doSend);

        const getSelectedNodes = () => findTokens(m._tokens, n => selectedIds.has(n.id));

        // Check if selected tokens form a contiguous slice within the same parent list
        const getAdjacentSelectedGroup = () => {
            if (selectedIds.size < 2) return null;

            let result = null;
            function searchList(list) {
                const indices = [];
                for (let i = 0; i < list.length; i++) {
                    if (selectedIds.has(list[i].id)) indices.push(i);
                }
                if (indices.length === selectedIds.size) {
                    // Check if strictly contiguous: indices[j] === indices[0] + j
                    let contiguous = true;
                    for (let j = 0; j < indices.length; j++) {
                        if (indices[j] !== indices[0] + j) {
                            contiguous = false;
                            break;
                        }
                    }
                    if (contiguous) {
                        result = { list, start: indices[0], end: indices[indices.length - 1] };
                        return true;
                    }
                }
                for (let node of list) {
                    if (node.children && searchList(node.children)) return true;
                }
                return false;
            }
            searchList(m._tokens);
            return result;
        };

        const updateInspector = () => {
            const adjGroup = getAdjacentSelectedGroup();
            const setGrpBtn = (btn, extraCls = '') => {
                if (!btn) return;
                btn.disabled = !adjGroup;
                const stateCls = adjGroup
                    ? 'bg-sky-900 hover:bg-sky-800 text-sky-100 border-sky-400 cursor-pointer'
                    : 'bg-slate-900 text-slate-500 border-slate-800 opacity-50 cursor-not-allowed';
                btn.className = `h-5 w-[18px] flex items-center justify-center ${stateCls} border rounded text-[7.5px] font-bold shadow-sm transition active:scale-95 ${extraCls}`;
            };
            setGrpBtn(bracketBtn, '');
            setGrpBtn(angleBtn, 'tracking-tighter');
            setGrpBtn(choiceBtn, 'tracking-tighter text-emerald-300');
        };

        const shiftSelectedPitch = (delta) => {
            let changed = false;
            walkTokens(m._tokens, n => {
                if (selectedIds.has(n.id) && n.type === 'note') {
                    const curMidi = noteToMidiNum(n.val) ?? 48;
                    n.val = midiNumToNote(Math.max(12, Math.min(108, curMidi + delta)));
                    changed = true;
                }
                return n;
            });
            if (changed) {
                renderTokens();
                syncPattern();
            }
        };

        // Move / Reorder (drop between/near tokens or groups)
        const moveTokens = (sourceId, targetId, insertPos = 'after', isInsideGroup = false) => {
            if (!sourceId || !targetId || sourceId === targetId) return;

            let sourceNode = null;
            m._tokens = walkTokens(m._tokens, n => {
                if (n.id === sourceId) { sourceNode = n; return null; }
                return n;
            });
            if (!sourceNode) return;

            function insertNear(list) {
                for (let i = 0; i < list.length; i++) {
                    if (list[i].id === targetId) {
                        if (isInsideGroup && list[i].type === 'group') {
                            list[i].children = list[i].children || [];
                            insertPos === 'before' ? list[i].children.unshift(sourceNode) : list[i].children.push(sourceNode);
                        } else {
                            list.splice(insertPos === 'before' ? i : i + 1, 0, sourceNode);
                        }
                        return true;
                    }
                    if (list[i].children && insertNear(list[i].children)) return true;
                }
                return false;
            }
            insertNear(m._tokens);

            selectedIds.clear();
            renderTokens();
            syncPattern();
        };

        const bindTokenEvents = () => {
            tokenStrip.querySelectorAll('.pat2-node-token').forEach(el => {
                const id = el.dataset.nodeId;
                let pressTimer = null;
                let startX = 0, startY = 0;
                let isDraggingSwipe = false;
                let isHorizontalDrag = false;
                let lastDiff = 0;
                let targetOverEl = null;
                let dropMode = 'after'; // 'before' | 'after'
                let isInsideGroup = false;

                const onPointerDown = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startX = e.clientX;
                    startY = e.clientY;
                    isDraggingSwipe = false;
                    isHorizontalDrag = false;
                    lastDiff = 0;
                    targetOverEl = null;
                    dropMode = 'after';
                    isInsideGroup = false;

                    // Long press detection (300ms) for multi-select
                    pressTimer = setTimeout(() => {
                        pressTimer = null;
                        if (!selectedIds.has(id)) {
                            selectedIds.add(id);
                        } else {
                            selectedIds.delete(id);
                        }
                        renderTokens();
                    }, 300);

                    try { el.setPointerCapture(e.pointerId); } catch (_) {}

                    const clearTargetIndicators = () => {
                        tokenStrip.querySelectorAll('.pat2-node-token').forEach(nodeEl => {
                            nodeEl.classList.remove(
                                'border-l-2', 'border-l-cyan-400',
                                'border-r-2', 'border-r-cyan-400',
                                'ring-2', 'ring-cyan-400', 'bg-cyan-950/40'
                            );
                            if (nodeEl !== el) {
                                nodeEl.style.transform = '';
                                nodeEl.style.transition = 'transform 0.12s ease';
                            }
                        });
                    };

                    const updateGapDisplacement = (targetNode, dropMode, isInsideGroup) => {
                        const allTokens = Array.from(tokenStrip.querySelectorAll('.pat2-node-token'));
                        if (!targetNode || isInsideGroup) {
                            allTokens.forEach(n => {
                                if (n !== el) n.style.transform = '';
                            });
                            return;
                        }

                        const targetIdx = allTokens.indexOf(targetNode);
                        if (targetIdx < 0) return;

                        // Calculate split point: tokens at or after this index will shift right
                        const splitIdx = dropMode === 'before' ? targetIdx : targetIdx + 1;
                        const shiftPx = 16; // Visual gap width in px

                        allTokens.forEach((n, idx) => {
                            if (n === el) return; // The dragged token handles its own transform
                            if (idx >= splitIdx) {
                                n.style.transform = `translateX(${shiftPx}px)`;
                            } else {
                                n.style.transform = '';
                            }
                        });
                    };

                    const onPointerMove = (me) => {
                        const dx = me.clientX - startX;
                        const dy = startY - me.clientY;

                        // Check horizontal drag for moving/reordering between tokens
                        if (!isDraggingSwipe && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
                            if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
                            isHorizontalDrag = true;
                            el.style.transform = `translateX(${dx}px) scale(1.05)`;
                            el.style.zIndex = '50';
                            el.style.opacity = '0.85';

                            // Find element underneath
                            const elemBelow = document.elementFromPoint(me.clientX, me.clientY);
                            const targetNode = elemBelow?.closest?.('.pat2-node-token');
                            if (targetNode && targetNode !== el) {
                                if (targetOverEl && targetOverEl !== targetNode) {
                                    clearTargetIndicators();
                                }
                                targetOverEl = targetNode;

                                const rect = targetNode.getBoundingClientRect();
                                const relX = (me.clientX - rect.left) / Math.max(1, rect.width);
                                clearTargetIndicators();

                                const isGroupNode = targetNode.classList.contains('pat2-group-box');
                                if (isGroupNode) {
                                    // Group target: detect outside (before/after) vs inside group
                                    if (relX < 0.22) {
                                        // Outside group: before []/<>
                                        dropMode = 'before';
                                        isInsideGroup = false;
                                        targetNode.classList.add('border-l-2', 'border-l-cyan-400');
                                    } else if (relX > 0.78) {
                                        // Outside group: after []/<>
                                        dropMode = 'after';
                                        isInsideGroup = false;
                                        targetNode.classList.add('border-r-2', 'border-r-cyan-400');
                                    } else {
                                        // Inside group
                                        isInsideGroup = true;
                                        dropMode = relX < 0.5 ? 'before' : 'after';
                                        targetNode.classList.add('ring-2', 'ring-cyan-400', 'bg-cyan-950/40');
                                    }
                                } else {
                                    // Regular token: determine whether inserting before or after target
                                    isInsideGroup = false;
                                    if (relX < 0.5) {
                                        dropMode = 'before';
                                        targetNode.classList.add('border-l-2', 'border-l-cyan-400');
                                    } else {
                                        dropMode = 'after';
                                        targetNode.classList.add('border-r-2', 'border-r-cyan-400');
                                    }
                                }
                                updateGapDisplacement(targetNode, dropMode, isInsideGroup);
                            } else if (targetOverEl) {
                                clearTargetIndicators();
                                updateGapDisplacement(null);
                                targetOverEl = null;
                            }
                            return;
                        }

                        // Check vertical swipe for pitch adjustment
                        if (!isHorizontalDrag && Math.abs(dy) >= 6) {
                            if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
                            isDraggingSwipe = true;
                            if (!selectedIds.has(id) && selectedIds.size === 0) {
                                selectedIds.add(id);
                                renderTokens();
                            }
                            const semitoneSteps = Math.trunc(dy / 8);
                            const diff = semitoneSteps - lastDiff;
                            if (diff !== 0) {
                                shiftSelectedPitch(diff);
                                lastDiff = semitoneSteps;
                            }
                        }
                    };

                    const onPointerUp = (me) => {
                        el.style.transform = '';
                        el.style.zIndex = '';
                        el.style.opacity = '';
                        clearTargetIndicators();
                        updateGapDisplacement(null);

                        if (targetOverEl) {
                            const targetId = targetOverEl.dataset.nodeId;
                            targetOverEl = null;
                            if (targetId && targetId !== id) {
                                moveTokens(id, targetId, dropMode, isInsideGroup);
                                cleanup();
                                return;
                            }
                        }

                        if (pressTimer) {
                            clearTimeout(pressTimer);
                            pressTimer = null;
                            if (selectedIds.has(id) && selectedIds.size === 1) {
                                selectedIds.clear();
                            } else {
                                selectedIds.clear();
                                selectedIds.add(id);
                            }
                            renderTokens();
                        }
                        cleanup();
                    };

                    const cleanup = () => {
                        window.removeEventListener('pointermove', onPointerMove);
                        window.removeEventListener('pointerup', onPointerUp);
                        window.removeEventListener('pointercancel', onPointerUp);
                        try { el.releasePointerCapture(e.pointerId); } catch (_) {}
                    };

                    window.addEventListener('pointermove', onPointerMove, { passive: false });
                    window.addEventListener('pointerup', onPointerUp);
                    window.addEventListener('pointercancel', onPointerUp);
                };

                el.addEventListener('pointerdown', onPointerDown);
            });
        };

        // +NOTE button: Swipe up/down on the button to change pitch, tap to add
        let addBoxStartY = 0;
        let addBoxMoved = false;
        let addBoxDiff = 0;
        addNoteBox?.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            addBoxStartY = e.clientY;
            addBoxMoved = false;
            addBoxDiff = 0;

            const onBoxMove = (me) => {
                const dy = addBoxStartY - me.clientY;
                if (Math.abs(dy) >= 6) {
                    addBoxMoved = true;
                    const semitoneSteps = Math.trunc(dy / 8);
                    const diff = semitoneSteps - addBoxDiff;
                    if (diff !== 0) {
                        const curMidi = noteToMidiNum(m._addPitch || 'c2') ?? 48;
                        const newMidi = Math.max(12, Math.min(108, curMidi + diff));
                        m._addPitch = midiNumToNote(newMidi);
                        if (addPitchDisp) addPitchDisp.textContent = m._addPitch.toUpperCase();
                        addBoxDiff = semitoneSteps;
                    }
                }
            };

            const onBoxUp = () => {
                window.removeEventListener('pointermove', onBoxMove);
                window.removeEventListener('pointerup', onBoxUp);
                window.removeEventListener('pointercancel', onBoxUp);
                if (!addBoxMoved) {
                    const selected = getSelectedNodes();
                    const newPitch = (m._addPitch || 'c2').toLowerCase();
                    if (selected.length > 0) {
                        // Replace pitch / type of all selected tokens in-place
                        selected.forEach(n => {
                            n.type = 'note';
                            n.val = newPitch;
                        });
                        renderTokens();
                        syncPattern();
                    } else {
                        // No selection: append to end without highlighting
                        const newNode = { id: genId(), type: 'note', val: newPitch };
                        m._tokens.push(newNode);
                        selectedIds.clear();
                        renderTokens();
                        syncPattern();
                        if (tokenStrip) tokenStrip.scrollLeft = tokenStrip.scrollWidth;
                    }
                }
            };

            window.addEventListener('pointermove', onBoxMove, { passive: false });
            window.addEventListener('pointerup', onBoxUp);
            window.addEventListener('pointercancel', onBoxUp);
        });

        // Add / Replace Rest button
        addRestBtn?.addEventListener('click', () => {
            const selected = getSelectedNodes();
            if (selected.length > 0) {
                // Replace selected tokens into rest in-place
                selected.forEach(n => {
                    n.type = 'rest';
                    n.val = '~';
                });
                renderTokens();
                syncPattern();
            } else {
                // No selection: append rest to end
                const newNode = { id: genId(), type: 'rest', val: '~' };
                m._tokens.push(newNode);
                selectedIds.clear();
                renderTokens();
                syncPattern();
                if (tokenStrip) tokenStrip.scrollLeft = tokenStrip.scrollWidth;
            }
        });

        // Helper: Create group ([ ] or < >) from adjacent selection
        const groupAdjacent = (groupType) => {
            const adj = getAdjacentSelectedGroup();
            if (!adj) return;
            const { list, start, end } = adj;
            const newGroup = {
                id: genId(),
                type: 'group',
                groupType,
                children: list.slice(start, end + 1)
            };
            list.splice(start, end - start + 1, newGroup);
            selectedIds.clear();
            selectedIds.add(newGroup.id);
            renderTokens();
            syncPattern();
        };

        // Group into [ ] (subdivision group)
        bracketBtn?.addEventListener('click', () => groupAdjacent('bracket'));

        // Group into < > (cycle group)
        angleBtn?.addEventListener('click', () => groupAdjacent('angle'));

        // Group into [ | ] (choice group)
        choiceBtn?.addEventListener('click', () => groupAdjacent('choice'));

        // Ungroup: in-place unwrap
        ungroupBtn?.addEventListener('click', () => {
            let changed = false;
            m._tokens = walkTokens(m._tokens, node => {
                if (selectedIds.has(node.id) && node.type === 'group' && node.children) {
                    changed = true;
                    return node.children;
                }
                return node;
            });
            if (changed) {
                selectedIds.clear();
                renderTokens();
                syncPattern();
            }
        });

        // Modifier: cycle subdiv *1 -> *2 -> *3 -> *4 -> *1
        subdivBtn?.addEventListener('click', () => {
            walkTokens(m._tokens, n => {
                if (selectedIds.has(n.id)) {
                    n.subdiv = ((n.subdiv || 1) >= 4) ? 1 : (n.subdiv || 1) + 1;
                    if (n.subdiv > 1) n.slowdown = 1; // Mutually exclusive with slowdown
                }
                return n;
            });
            renderTokens();
            syncPattern();
        });

        // Modifier: cycle slowdown /1 -> /2 -> /3 -> /4 -> /1
        slowdownBtn?.addEventListener('click', () => {
            walkTokens(m._tokens, n => {
                if (selectedIds.has(n.id)) {
                    n.slowdown = ((n.slowdown || 1) >= 4) ? 1 : (n.slowdown || 1) + 1;
                    if (n.slowdown > 1) n.subdiv = 1; // Mutually exclusive with subdiv
                }
                return n;
            });
            renderTokens();
            syncPattern();
        });

        // Modifier: cycle repeat !1 -> !2 -> !3 -> !4 -> !1
        repeatBtn?.addEventListener('click', () => {
            walkTokens(m._tokens, n => {
                if (selectedIds.has(n.id)) n.repeat = ((n.repeat || 1) >= 4) ? 1 : (n.repeat || 1) + 1;
                return n;
            });
            renderTokens();
            syncPattern();
        });

        // Modifier: cycle prob 1.0 -> 0.5 (?) -> 0.8 (?0.8) -> 0.2 (?0.2) -> 1.0
        probBtn?.addEventListener('click', () => {
            walkTokens(m._tokens, n => {
                if (selectedIds.has(n.id)) {
                    const cur = n.prob !== undefined ? n.prob : 1.0;
                    if (cur >= 1.0) n.prob = 0.5;
                    else if (Math.abs(cur - 0.5) < 0.05) n.prob = 0.8;
                    else if (Math.abs(cur - 0.8) < 0.05) n.prob = 0.2;
                    else delete n.prob;
                }
                return n;
            });
            renderTokens();
            syncPattern();
        });

        // Delete selected tokens (Trash)
        delBtn?.addEventListener('click', () => {
            if (selectedIds.size === 0) return;
            m._tokens = walkTokens(m._tokens, n => selectedIds.has(n.id) ? null : n);
            if (m._tokens.length === 0) {
                m._tokens = [{ id: genId(), type: 'rest', val: '~' }];
            }
            selectedIds.clear();
            renderTokens();
            syncPattern();
        });

        // Toggle Manual Explanation (150% size collapsible at bottom)
        toggleManual?.addEventListener('click', () => {
            m._showManual = !m._showManual;
            ctx.reRenderModal();
        });

        // Presets
        togglePresets?.addEventListener('click', () => {
            m._showPresets = !m._showPresets;
            ctx.reRenderModal();
        });

        root.querySelectorAll('.pat2-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const patStr = btn.dataset.pattern;
                if (patStr) {
                    m._tokens = parsePatternToTokens(patStr);
                    m._lastPatStr = patStr;
                    selectedIds.clear();
                    renderTokens();
                    syncPattern();
                }
            });
        });

        // Bars selector (cycleBeats = bars * 4)
        barsSelect?.addEventListener('change', (e) => {
            const b = parseFloat(e.target.value) || 1;
            m.cycleBeats = b * 4;
            cb();
        });

        // Gate slider
        gateSlider?.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            m.gateLen = val / 100.0;
            if (gateDisp) gateDisp.textContent = `${val}%`;
            cb();
        });

        // Initial render
        renderTokens();
    }
};

export const pat2Defs = {
    PAT2
};
