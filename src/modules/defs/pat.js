import { STRUDEL_PRESETS } from '../../core/strudel-parser.js';
import {
    noteToMidiNum,
    midiNumToNote,
    genTokenId as genId,
    walkTokens,
    findTokens,
    parsePatternToTokens,
    tokensToPattern,
    MODIFIER_KEYS,
    clearTokenModifiers,
    getAdjacentGroup,
    groupTokens,
    moveTokenNode
} from '../../core/pat-tokens.js';

export const PAT = {
    color: 'sky',
    defaults: () => ({
        type: 'PAT',
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
    renderGrid: (m) => `
        <div class="flex items-center justify-center w-full h-full pointer-events-none select-none">
            <span class="pat-state-disp text-[17px] font-mono font-bold text-slate-500 tracking-wider">&mdash;</span>
        </div>`,
    updateLive: (cell, data, isP) => {
        const stateEl = cell?.querySelector('.pat-state-disp');
        if (!stateEl) return;
        if (!isP || !data || data.powerOn === false) {
            stateEl.textContent = (!isP || !data) ? '\u2014' : 'OFF';
            stateEl.className = 'pat-state-disp text-[17px] font-mono font-bold text-slate-600 tracking-wider';
            return;
        }
        const label = data.activeLabel || (data.activeIdx >= 0 ? `STEP ${data.activeIdx + 1}` : '\u2014');
        const isRest = data.isRest || label === '~' || label === '\u2014';
        stateEl.textContent = label;
        if (isRest) {
            stateEl.className = 'pat-state-disp text-[17px] font-mono font-bold text-cyan-400/30 tracking-wider';
        } else if (data.gate) {
            stateEl.className = 'pat-state-disp text-[17px] font-mono font-black text-yellow-300 tracking-wider drop-shadow-[0_0_8px_rgba(250,204,21,0.85)]';
        } else {
            stateEl.className = 'pat-state-disp text-[17px] font-mono font-bold text-cyan-300 tracking-wider';
        }
    },
    renderModal: (m, ctx) => {
        const uid = ctx?.id || m?.id || 'pat';
        const pat = m.pattern || 'c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2';
        const curBar = (m.cycleBeats || 4) / 4;
        const gatePct = Math.round((m.gateLen ?? 0.8) * 100);
        const showPresets = m._showPresets === true;
        const showManual = m._showManual === true;
        const curAddPitch = (m._addPitch || 'c2').toUpperCase();

        if (!m._tokens) {
            m._tokens = parsePatternToTokens(pat);
        }

        const isBarSelected = (val) => Math.abs(curBar - val) < 0.001;

        return `
            <div id="pat-modal-root-${uid}" class="space-y-1 p-0.5 select-none touch-none w-full">
                <!-- 1st Row: BAR selector, GATE slider, MANUAL toggle & PRESET toggle -->
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 gap-1 overflow-x-auto no-scrollbar">
                    <div class="flex items-center gap-1.5 shrink-0">
                        <div class="flex items-center bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 gap-1 shrink-0" title="繰り返し単位（小節数 BAR）">
                            <span class="text-[7px] text-slate-400 uppercase font-mono font-bold shrink-0">BAR</span>
                            <select id="pat-bars-select-${uid}" class="bg-slate-900 text-cyan-300 font-mono text-[8px] font-bold border border-slate-700 rounded px-1 py-0.5 focus:outline-none cursor-pointer">
                                <option value="0.25" ${isBarSelected(0.25) ? 'selected' : ''}>/4</option>
                                <option value="0.5" ${isBarSelected(0.5) ? 'selected' : ''}>/2</option>
                                <option value="1" ${isBarSelected(1) ? 'selected' : ''}>x1</option>
                                <option value="2" ${isBarSelected(2) ? 'selected' : ''}>x2</option>
                                <option value="4" ${isBarSelected(4) ? 'selected' : ''}>x4</option>
                                <option value="8" ${isBarSelected(8) ? 'selected' : ''}>x8</option>
                            </select>
                        </div>
                        <div class="flex items-center bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 gap-1 shrink-0">
                            <span class="text-[7px] text-slate-400 uppercase font-mono font-bold shrink-0">GATE</span>
                            <input type="range" id="pat-gate-slider-${uid}" min="10" max="95" step="5" value="${gatePct}" class="w-10 h-1 accent-cyan-400 cursor-pointer touch-none">
                            <span id="pat-gate-disp-${uid}" class="text-[7.5px] font-mono font-bold text-cyan-300 min-w-[18px] text-right shrink-0">${gatePct}%</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-1 shrink-0">
                        <button id="pat-toggle-manual-${uid}" class="h-5 px-1.5 flex items-center gap-0.5 text-[7px] font-bold ${showManual ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-slate-900 text-slate-400 hover:text-cyan-300 border-slate-700'} rounded border shadow-sm transition uppercase tracking-wider shrink-0 cursor-pointer">
                            <span class="text-[6px] font-mono">${showManual ? '▼' : '▶'}</span>
                            <span>MANUAL</span>
                        </button>
                        <button id="pat-toggle-presets-${uid}" class="h-5 px-1.5 flex items-center gap-0.5 text-[7px] font-bold ${showPresets ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-slate-900 text-slate-400 hover:text-cyan-300 border-slate-700'} rounded border shadow-sm transition uppercase tracking-wider shrink-0 cursor-pointer">
                            <span class="text-[6px] font-mono">${showPresets ? '▼' : '▶'}</span>
                            <span>PRESET</span>
                        </button>
                    </div>
                </div>

                <!-- 2nd Row: Edit Actions, Modifiers, Trash & SEND -->
                <div class="flex items-center pb-1 border-b border-slate-800 gap-1 overflow-x-auto no-scrollbar w-full">
                    <div class="flex items-center gap-1 shrink-0">
                        <div id="pat-add-note-box-${uid}" class="h-5 px-1.5 bg-sky-950/90 hover:bg-sky-900 text-sky-200 rounded border border-sky-600/80 shadow-sm transition cursor-ns-resize flex items-center gap-0.5 touch-none" title="上下スワイプで音程変更 / タップで追加・置換">
                            <span id="pat-add-pitch-disp-${uid}" class="text-[8px] font-mono font-black text-sky-100 pointer-events-none">${curAddPitch}</span>
                            <span class="text-[6px] text-sky-400 pointer-events-none">↕</span>
                        </div>
                        <button id="pat-add-rest-${uid}" class="h-5 px-1.5 bg-sky-950/90 hover:bg-sky-900 text-sky-300 hover:text-white rounded text-[8px] font-bold border border-sky-600/80 shadow-sm transition active:scale-95 flex items-center justify-center font-mono" title="休符を追加・置換">
                            <span>~</span>
                        </button>
                    </div>

                    <div class="flex items-center gap-0.5 shrink-0">
                        <button id="pat-bracket-btn-${uid}" disabled class="h-5 w-[18px] flex items-center justify-center bg-slate-900 text-slate-500 border border-slate-800 rounded text-[8.5px] font-bold shadow-sm transition active:scale-95 opacity-50 cursor-not-allowed" title="横並び選択した項目を [] 分割グループにまとめる">[]</button>
                        <button id="pat-angle-btn-${uid}" disabled class="h-5 w-[18px] flex items-center justify-center bg-slate-900 text-slate-500 border border-slate-800 rounded text-[8.5px] font-bold shadow-sm transition active:scale-95 opacity-50 cursor-not-allowed tracking-tighter" title="横並び選択した項目を <> 周期交代グループにまとめる">&lt;&gt;</button>
                        <button id="pat-choice-btn-${uid}" disabled class="h-5 w-[18px] flex items-center justify-center bg-slate-900 text-slate-500 border border-slate-800 rounded text-[8.5px] font-bold shadow-sm transition active:scale-95 opacity-50 cursor-not-allowed tracking-tighter" title="横並び選択した項目を [ | ] ランダム選択グループにまとめる">[|]</button>
                        <button id="pat-subdiv-btn-${uid}" class="h-5 px-1 bg-sky-950/80 hover:bg-sky-900 text-sky-300 rounded text-[8px] font-bold border border-sky-700/60 transition" title="細分化 (*2, *3, *4)">*n</button>
                        <button id="pat-slowdown-btn-${uid}" class="h-5 px-1 bg-sky-950/80 hover:bg-sky-900 text-sky-300 rounded text-[8px] font-bold border border-sky-700/60 transition" title="スローダウン・ゲート伸長 (/2, /3, /4)">/n</button>
                        <button id="pat-repeat-btn-${uid}" class="h-5 px-1 bg-sky-950/80 hover:bg-sky-900 text-sky-300 rounded text-[8px] font-bold border border-sky-700/60 transition" title="複製 (!2, !3, !4)">!n</button>
                        <button id="pat-prob-btn-${uid}" class="h-5 px-1 bg-sky-950/80 hover:bg-sky-900 text-sky-300 rounded text-[8.5px] font-bold border border-sky-700/60 transition font-mono" title="発音確率 (?, ?0.8, ?0.2)">?</button>
                        <button id="pat-del-btn-${uid}" class="h-5 px-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 rounded border border-red-500/60 transition flex items-center justify-center active:scale-95" title="選択削除 / 修飾子削除 / グループ解除">
                            <i data-lucide="trash-2" class="w-2.5 h-2.5 pointer-events-none"></i>
                        </button>
                    </div>

                    <div class="flex-1 min-w-[4px]"></div>

                    <button id="pat-send-btn-${uid}" class="w-5 h-5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 hover:text-white border border-cyan-500/70 rounded flex items-center justify-center shadow-sm transition active:scale-95 shrink-0 cursor-pointer font-mono text-[11px] font-bold" title="パターンをシンセへ反映 (SEND / Enter)">
                        <span>↵</span>
                    </button>
                </div>

                <!-- 3rd Row: Token Strip Container with overlaid minimal Scroll Buttons -->
                <div class="relative w-full min-w-0">
                    <div id="pat-token-container-${uid}" class="relative w-full bg-slate-950 border border-slate-800 rounded p-[1px] overflow-hidden shadow-inner cursor-default">
                        <button id="pat-scroll-left-${uid}" class="absolute left-0 top-0 bottom-0 w-2.5 z-10 bg-slate-950/70 hover:bg-slate-900 text-slate-400 hover:text-cyan-300 text-[6px] font-bold flex items-center justify-center transition cursor-pointer select-none active:text-cyan-200 touch-none backdrop-blur-[1px]" title="左へスクロール">◀</button>
                        <div id="pat-token-strip-${uid}" class="flex items-center gap-[1px] overflow-x-auto min-h-[22px] h-5 py-0 px-3 no-scrollbar select-none"></div>
                        <button id="pat-scroll-right-${uid}" class="absolute right-0 top-0 bottom-0 w-2.5 z-10 bg-slate-950/70 hover:bg-slate-900 text-slate-400 hover:text-cyan-300 text-[6px] font-bold flex items-center justify-center transition cursor-pointer select-none active:text-cyan-200 touch-none backdrop-blur-[1px]" title="右へスクロール">▶</button>
                    </div>
                </div>

                <!-- Collapsible Manual -->
                ${showManual ? `
                <div class="bg-slate-950 rounded border border-cyan-800/80 p-1.5 text-[8px] font-mono text-slate-300 shadow-inner">
                    <div class="text-[8.5px] font-bold text-cyan-300 flex items-center gap-1 border-b border-slate-800 pb-0.5 mb-1">
                        <span class="text-cyan-400">📖</span>
                        <span>PAT MINI-NOTATION GUIDE</span>
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
                </div>` : ''}

                <!-- Presets Grid -->
                ${showPresets ? `
                <div class="grid grid-cols-4 sm:grid-cols-6 gap-1 pt-1 border-t border-slate-800 pb-0.5">
                    ${STRUDEL_PRESETS.map((p) => `
                        <button class="pat-preset-btn h-5 px-1 bg-slate-800/90 hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-500/80 rounded flex items-center justify-center transition group truncate" data-pattern="${p.pattern}">
                            <span class="text-[7px] font-bold text-cyan-300 group-hover:text-white truncate pointer-events-none">${p.name}</span>
                        </button>
                    `).join('')}
                </div>` : ''}
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const uid = ctx?.id || m?.id || 'pat';
        const root = document.getElementById(`pat-modal-root-${uid}`) || (ctx?.getDialogElement ? ctx.getDialogElement() : null) || document;
        if (!root) return;

        const tokenStrip = root.querySelector(`#pat-token-strip-${uid}`);
        const tokenContainer = root.querySelector(`#pat-token-container-${uid}`);
        const bracketBtn = root.querySelector(`#pat-bracket-btn-${uid}`);
        const angleBtn = root.querySelector(`#pat-angle-btn-${uid}`);
        const choiceBtn = root.querySelector(`#pat-choice-btn-${uid}`);
        const subdivBtn = root.querySelector(`#pat-subdiv-btn-${uid}`);
        const slowdownBtn = root.querySelector(`#pat-slowdown-btn-${uid}`);
        const repeatBtn = root.querySelector(`#pat-repeat-btn-${uid}`);
        const probBtn = root.querySelector(`#pat-prob-btn-${uid}`);
        const delBtn = root.querySelector(`#pat-del-btn-${uid}`);
        const addNoteBox = root.querySelector(`#pat-add-note-box-${uid}`);
        const addPitchDisp = root.querySelector(`#pat-add-pitch-disp-${uid}`);
        const addRestBtn = root.querySelector(`#pat-add-rest-${uid}`);
        const barsSelect = root.querySelector(`#pat-bars-select-${uid}`);
        const gateSlider = root.querySelector(`#pat-gate-slider-${uid}`);
        const gateDisp = root.querySelector(`#pat-gate-disp-${uid}`);
        const toggleManual = root.querySelector(`#pat-toggle-manual-${uid}`);
        const togglePresets = root.querySelector(`#pat-toggle-presets-${uid}`);
        const sendBtn = root.querySelector(`#pat-send-btn-${uid}`);
        const scrollLeftBtn = root.querySelector(`#pat-scroll-left-${uid}`);
        const scrollRightBtn = root.querySelector(`#pat-scroll-right-${uid}`);

        let selectedIds = new Set();

        const syncPattern = (triggerCb = false) => {
            m.pattern = tokensToPattern(m._tokens);
            if (triggerCb) cb();
            renderTokens();
        };

        const updateInspector = () => {
            const adjGroup = getAdjacentGroup(m._tokens, selectedIds);
            const setGrpBtn = (btn, extraCls = '') => {
                if (!btn) return;
                btn.disabled = !adjGroup;
                const stateCls = adjGroup
                    ? 'bg-sky-900 hover:bg-sky-800 text-sky-100 border-sky-400 cursor-pointer'
                    : 'bg-slate-900 text-slate-500 border-slate-800 opacity-50 cursor-not-allowed';
                btn.className = `h-5 w-[18px] flex items-center justify-center ${stateCls} border rounded text-[8.5px] font-bold shadow-sm transition active:scale-95 ${extraCls}`;
            };
            setGrpBtn(bracketBtn, '');
            setGrpBtn(angleBtn, 'tracking-tighter');
            setGrpBtn(choiceBtn, 'tracking-tighter text-emerald-300');
        };

        const renderTokens = () => {
            if (!tokenStrip) return;

            function renderModifiersInline(node) {
                const items = [];
                if (node.subdiv && node.subdiv > 1) {
                    items.push(`<span data-mod="subdiv" data-parent-id="${node.id}" data-val="${node.subdiv}" class="pat-mod-tag bg-amber-500/90 hover:bg-red-500 text-slate-950 hover:text-white text-[7px] font-mono font-black px-1 rounded cursor-ns-resize leading-tight touch-none select-none" title="上下スワイプで変更 / タップで消去">*${node.subdiv}</span>`);
                }
                if (node.slowdown && node.slowdown > 1) {
                    items.push(`<span data-mod="slowdown" data-parent-id="${node.id}" data-val="${node.slowdown}" class="pat-mod-tag bg-cyan-500/90 hover:bg-red-500 text-slate-950 hover:text-white text-[7px] font-mono font-black px-1 rounded cursor-ns-resize leading-tight touch-none select-none" title="上下スワイプで変更 / タップで消去">/${node.slowdown}</span>`);
                }
                if (node.repeat && node.repeat > 1) {
                    items.push(`<span data-mod="repeat" data-parent-id="${node.id}" data-val="${node.repeat}" class="pat-mod-tag bg-emerald-500/90 hover:bg-red-500 text-slate-950 hover:text-white text-[7px] font-mono font-black px-1 rounded cursor-ns-resize leading-tight touch-none select-none" title="上下スワイプで変更 / タップで消去">!${node.repeat}</span>`);
                }
                if (node.prob !== undefined && node.prob < 1.0) {
                    const txt = node.prob === 0.5 ? '?' : `?${node.prob}`;
                    items.push(`<span data-mod="prob" data-parent-id="${node.id}" class="pat-mod-tag bg-purple-500/90 hover:bg-red-500 text-slate-950 hover:text-white text-[7px] font-mono font-black px-1 rounded cursor-pointer leading-tight" title="タップで解除">${txt}</span>`);
                }
                return items.length ? `<div class="flex items-center gap-[1px] ml-0.5 pointer-events-auto">${items.join('')}</div>` : '';
            }

            function renderNode(node, depth = 0) {
                const isSelected = selectedIds.has(node.id);
                const borderCls = isSelected
                    ? 'border-yellow-400 bg-yellow-400/25 shadow-sm ring-1 ring-yellow-400'
                    : 'border-slate-800 bg-slate-900/90 hover:border-cyan-500/70';

                if (node.type === 'group') {
                    const isAngle = node.groupType === 'angle';
                    const isChoice = node.groupType === 'choice';
                    const symColor = isChoice ? 'text-emerald-400' : 'text-sky-400';
                    return `
                        <div data-node-id="${node.id}" class="pat-node-token pat-group-box relative flex items-center gap-[2px] px-[2px] py-[1px] rounded border border-dashed ${borderCls} cursor-pointer transition shrink-0">
                            <span class="text-[9px] font-mono font-bold ${symColor} select-none pointer-events-none px-[1px] leading-none">${isAngle ? '<' : '['}</span>
                            <div class="flex items-center gap-[1px]">
                                ${(node.children || []).map((c, i) => {
                                    const sep = (isChoice && i > 0) ? `<span class="text-[8px] font-mono font-bold text-emerald-400/90 pointer-events-none px-[1px]">|</span>` : '';
                                    return sep + renderNode(c, depth + 1);
                                }).join('')}
                            </div>
                            <span class="text-[9px] font-mono font-bold ${symColor} select-none pointer-events-none px-[1px] leading-none">${isAngle ? '>' : ']'}</span>
                            ${renderModifiersInline(node)}
                        </div>`;
                }

                const isRest = node.type === 'rest';
                const noteVal = (node.val || 'c2').toUpperCase();
                const noteTextColor = isRest ? 'text-slate-600' : 'text-cyan-300 group-hover:text-white';

                return `
                    <div data-node-id="${node.id}" class="pat-node-token relative flex items-center justify-center min-w-[12px] h-[19px] px-[2px] rounded border ${borderCls} cursor-ns-resize transition select-none group touch-none shrink-0 gap-[1px]">
                        <span class="pat-node-val text-[7.5px] font-mono font-bold ${noteTextColor} leading-none pointer-events-none">${isRest ? '~' : noteVal}</span>
                        ${renderModifiersInline(node)}
                    </div>`;
            }

            tokenStrip.innerHTML = m._tokens.map(n => renderNode(n)).join('');
            updateInspector();
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                try { lucide.createIcons({ root }); } catch (_) {}
            }
        };

        // Scroll buttons
        scrollLeftBtn?.addEventListener('click', (e) => { e.stopPropagation(); tokenStrip?.scrollBy({ left: -60, behavior: 'smooth' }); });
        scrollRightBtn?.addEventListener('click', (e) => { e.stopPropagation(); tokenStrip?.scrollBy({ left: 60, behavior: 'smooth' }); });

        // Container background click: clear selection
        tokenContainer?.addEventListener('pointerdown', (e) => {
            if (!e.target.closest('.pat-node-token')) {
                if (selectedIds.size > 0) {
                    selectedIds.clear();
                    renderTokens();
                }
            }
        });

        // Event Delegation: Central PointerDown handler for tokens & modifier tags on tokenStrip
        tokenStrip?.addEventListener('pointerdown', (e) => {
            const modTag = e.target.closest('.pat-mod-tag');
            if (modTag) {
                e.preventDefault();
                e.stopPropagation();
                const pId = modTag.dataset.parentId;
                const modType = modTag.dataset.mod;
                const initialVal = parseInt(modTag.dataset.val, 10) || 2;
                const startY = e.clientY;
                let isSwipe = false;
                let lastDelta = 0;

                const onTagMove = (me) => {
                    const dy = startY - me.clientY;
                    if (Math.abs(dy) >= 6) {
                        isSwipe = true;
                        const stepDiff = Math.trunc(dy / 10);
                        if (stepDiff !== lastDelta) {
                            lastDelta = stepDiff;
                            const targetVal = initialVal + stepDiff;
                            walkTokens(m._tokens, n => {
                                if (n.id === pId) {
                                    if (targetVal < 2) delete n[modType];
                                    else n[modType] = Math.min(32, targetVal);
                                }
                                return n;
                            });
                            syncPattern(false);
                        }
                    }
                };

                const onTagUp = () => {
                    window.removeEventListener('pointermove', onTagMove);
                    window.removeEventListener('pointerup', onTagUp);
                    window.removeEventListener('pointercancel', onTagUp);
                    if (!isSwipe) {
                        walkTokens(m._tokens, n => {
                            if (n.id === pId) delete n[modType];
                            return n;
                        });
                        syncPattern(false);
                    }
                };

                window.addEventListener('pointermove', onTagMove, { passive: false });
                window.addEventListener('pointerup', onTagUp);
                window.addEventListener('pointercancel', onTagUp);
                return;
            }

            const tokenEl = e.target.closest('.pat-node-token');
            if (!tokenEl) return;

            e.preventDefault();
            e.stopPropagation();
            const id = tokenEl.dataset.nodeId;
            const startX = e.clientX, startY = e.clientY;
            let isDraggingSwipe = false;
            let isHorizontalDrag = false;
            let lastDiff = 0;
            let targetOverEl = null;
            let dropMode = 'after';
            let isInsideGroup = false;

            const pressTimer = setTimeout(() => {
                if (selectedIds.has(id)) selectedIds.delete(id);
                else selectedIds.add(id);
                renderTokens();
            }, 300);

            const clearIndicators = () => {
                tokenStrip.querySelectorAll('.pat-node-token').forEach(nodeEl => {
                    nodeEl.classList.remove('border-l-2', 'border-l-white', 'border-r-2', 'border-r-white', 'ring-2', 'ring-white', 'bg-white/10');
                    nodeEl.style.transform = '';
                });
            };

            const onMove = (me) => {
                const dx = me.clientX - startX;
                const dy = startY - me.clientY;

                if (!isDraggingSwipe && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
                    clearTimeout(pressTimer);
                    isHorizontalDrag = true;
                    tokenEl.style.transform = `translateX(${dx}px) scale(1.06)`;
                    tokenEl.style.zIndex = '50';
                    tokenEl.style.opacity = '0.9';

                    tokenEl.style.pointerEvents = 'none';
                    const elemBelow = document.elementFromPoint(me.clientX, me.clientY);
                    tokenEl.style.pointerEvents = '';

                    const targetNode = elemBelow?.closest?.('.pat-node-token');
                    if (targetNode && targetNode !== tokenEl && !tokenEl.contains(targetNode)) {
                        if (targetOverEl && targetOverEl !== targetNode) clearIndicators();
                        targetOverEl = targetNode;
                        const rect = targetNode.getBoundingClientRect();
                        const relX = (me.clientX - rect.left) / Math.max(1, rect.width);
                        clearIndicators();

                        if (targetNode.classList.contains('pat-group-box')) {
                            if (relX < 0.20) { dropMode = 'before'; isInsideGroup = false; targetNode.classList.add('border-l-2', 'border-l-white'); }
                            else if (relX > 0.80) { dropMode = 'after'; isInsideGroup = false; targetNode.classList.add('border-r-2', 'border-r-white'); }
                            else { isInsideGroup = true; dropMode = relX < 0.5 ? 'before' : 'after'; targetNode.classList.add('ring-2', 'ring-white', 'bg-white/10'); }
                        } else {
                            isInsideGroup = false;
                            dropMode = relX < 0.5 ? 'before' : 'after';
                            targetNode.classList.add(dropMode === 'before' ? 'border-l-2' : 'border-r-2', 'border-white');
                        }
                    } else if (targetOverEl) {
                        clearIndicators();
                        targetOverEl = null;
                    }
                    return;
                }

                if (!isHorizontalDrag && Math.abs(dy) >= 6) {
                    clearTimeout(pressTimer);
                    isDraggingSwipe = true;
                    if (!selectedIds.has(id)) {
                        selectedIds.clear();
                        selectedIds.add(id);
                        renderTokens();
                    }
                    const semitoneSteps = Math.trunc(dy / 8);
                    const diff = semitoneSteps - lastDiff;
                    if (diff !== 0) {
                        walkTokens(m._tokens, n => {
                            if (selectedIds.has(n.id) && n.type === 'note') {
                                const curMidi = noteToMidiNum(n.val) ?? 48;
                                n.val = midiNumToNote(curMidi + diff);
                            }
                            return n;
                        });
                        lastDiff = semitoneSteps;
                        syncPattern(false);
                    }
                }
            };

            const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
                clearTimeout(pressTimer);
                tokenEl.style.transform = '';
                tokenEl.style.zIndex = '';
                tokenEl.style.opacity = '';
                clearIndicators();

                if (targetOverEl) {
                    const targetId = targetOverEl.dataset.nodeId;
                    targetOverEl = null;
                    if (targetId && targetId !== id) {
                        m._tokens = moveTokenNode(m._tokens, id, targetId, dropMode, isInsideGroup);
                        selectedIds.clear();
                        selectedIds.add(id);
                        syncPattern(false);
                        return;
                    }
                }

                if (!isHorizontalDrag && !isDraggingSwipe) {
                    if (selectedIds.has(id) && selectedIds.size === 1) selectedIds.clear();
                    else { selectedIds.clear(); selectedIds.add(id); }
                    renderTokens();
                }
            };

            window.addEventListener('pointermove', onMove, { passive: false });
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
        });

        // +NOTE button swipe/tap
        let addBoxStartY = 0, addBoxMoved = false, addBoxDiff = 0;
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
                        m._addPitch = midiNumToNote(curMidi + diff);
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
                    const selected = findTokens(m._tokens, n => selectedIds.has(n.id));
                    const newPitch = (m._addPitch || 'c2').toLowerCase();
                    if (selected.length > 0) {
                        selected.forEach(n => { n.type = 'note'; n.val = newPitch; });
                    } else {
                        m._tokens.push({ id: genId(), type: 'note', val: newPitch });
                        selectedIds.clear();
                        if (tokenStrip) tokenStrip.scrollLeft = tokenStrip.scrollWidth;
                    }
                    syncPattern(false);
                }
            };

            window.addEventListener('pointermove', onBoxMove, { passive: false });
            window.addEventListener('pointerup', onBoxUp);
            window.addEventListener('pointercancel', onBoxUp);
        });

        // Add Rest button
        addRestBtn?.addEventListener('click', () => {
            const selected = findTokens(m._tokens, n => selectedIds.has(n.id));
            if (selected.length > 0) {
                selected.forEach(n => { n.type = 'rest'; n.val = '~'; });
            } else {
                m._tokens.push({ id: genId(), type: 'rest', val: '~' });
                selectedIds.clear();
                if (tokenStrip) tokenStrip.scrollLeft = tokenStrip.scrollWidth;
            }
            syncPattern(false);
        });

        // Grouping buttons
        bracketBtn?.addEventListener('click', () => {
            const grp = groupTokens(m._tokens, selectedIds, 'bracket');
            if (grp) { selectedIds.clear(); selectedIds.add(grp.id); syncPattern(false); }
        });
        angleBtn?.addEventListener('click', () => {
            const grp = groupTokens(m._tokens, selectedIds, 'angle');
            if (grp) { selectedIds.clear(); selectedIds.add(grp.id); syncPattern(false); }
        });
        choiceBtn?.addEventListener('click', () => {
            const grp = groupTokens(m._tokens, selectedIds, 'choice');
            if (grp) { selectedIds.clear(); selectedIds.add(grp.id); syncPattern(false); }
        });

        // Modifier buttons
        const cycleMod = (modKey, maxVal = 4) => {
            walkTokens(m._tokens, n => {
                if (selectedIds.has(n.id)) {
                    n[modKey] = ((n[modKey] || 1) >= maxVal) ? 1 : (n[modKey] || 1) + 1;
                    if (modKey === 'subdiv' && n.subdiv > 1) delete n.slowdown;
                    if (modKey === 'slowdown' && n.slowdown > 1) delete n.subdiv;
                    if (n[modKey] <= 1) delete n[modKey];
                }
                return n;
            });
            syncPattern(false);
        };
        subdivBtn?.addEventListener('click', () => cycleMod('subdiv'));
        slowdownBtn?.addEventListener('click', () => cycleMod('slowdown'));
        repeatBtn?.addEventListener('click', () => cycleMod('repeat'));
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
            syncPattern(false);
        });

        // Delete button
        delBtn?.addEventListener('click', () => {
            if (selectedIds.size === 0) return;
            let ungrouped = false;
            m._tokens = walkTokens(m._tokens, n => {
                if (selectedIds.has(n.id) && n.type === 'group' && n.children) {
                    ungrouped = true;
                    return n.children;
                }
                return n;
            });
            if (ungrouped) { selectedIds.clear(); syncPattern(false); return; }

            let modCleared = false;
            walkTokens(m._tokens, n => {
                if (selectedIds.has(n.id) && clearTokenModifiers(n)) modCleared = true;
                return n;
            });
            if (modCleared) { syncPattern(false); return; }

            m._tokens = walkTokens(m._tokens, n => selectedIds.has(n.id) ? null : n);
            if (m._tokens.length === 0) m._tokens = [{ id: genId(), type: 'rest', val: '~' }];
            selectedIds.clear();
            syncPattern(false);
        });

        // SEND button: send to synth
        sendBtn?.addEventListener('click', () => {
            syncPattern(true);
            if (ctx?.showToast) ctx.showToast('SEND: パターンを反映しました');
        });

        // Toggle Manual & Presets
        toggleManual?.addEventListener('click', () => { m._showManual = !m._showManual; ctx.reRenderModal(); });
        togglePresets?.addEventListener('click', () => { m._showPresets = !m._showPresets; ctx.reRenderModal(); });

        root.querySelectorAll('.pat-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const patStr = btn.dataset.pattern;
                if (patStr) {
                    m._tokens = parsePatternToTokens(patStr);
                    selectedIds.clear();
                    syncPattern(false);
                }
            });
        });

        // Bars & Gate
        barsSelect?.addEventListener('change', (e) => {
            m.cycleBeats = (parseFloat(e.target.value) || 1) * 4;
            cb();
        });
        gateSlider?.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            m.gateLen = val / 100.0;
            if (gateDisp) gateDisp.textContent = `${val}%`;
            cb();
        });

        renderTokens();
    }
};

export const patDefs = {
    PAT
};
