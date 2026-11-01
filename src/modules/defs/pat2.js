import { STRUDEL_PRESETS } from '../../core/strudel-parser.js';

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
    if (!noteStr) return null;
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
    const semi = ((m % 12) + 12) % 12;
    return `${SEMITONE_NOTES[semi]}${oct}`;
}

let nextTokenId = 1;
function genId() {
    return 't_' + (nextTokenId++);
}

/**
 * Parse mini-notation into a structured AST of tokens.
 */
export function parsePatternToTokens(str) {
    if (!str || typeof str !== 'string') return [];
    const s = str.trim();
    if (!s) return [];

    let i = 0;
    const len = s.length;

    function parseTokensList(endChars = '') {
        const list = [];
        while (i < len) {
            while (i < len && /\s/.test(s[i])) i++;
            if (i >= len) break;
            if (endChars && endChars.includes(s[i])) {
                break;
            }

            if (s[i] === '[' || s[i] === '<') {
                const isAngle = s[i] === '<';
                const closeChar = isAngle ? '>' : ']';
                i++; // skip opening
                const children = parseTokensList(closeChar);
                if (i < len && s[i] === closeChar) i++; // skip closing

                const groupNode = {
                    id: genId(),
                    type: 'group',
                    groupType: isAngle ? 'angle' : 'bracket',
                    children
                };
                parseModifiers(groupNode);
                list.push(groupNode);
            } else if (s[i] === ']' || s[i] === '>') {
                i++;
            } else {
                let atomStr = '';
                while (i < len && !/\s/.test(s[i]) && s[i] !== '[' && s[i] !== ']' && s[i] !== '<' && s[i] !== '>') {
                    atomStr += s[i];
                    i++;
                }

                if (atomStr) {
                    const node = parseAtomicToken(atomStr);
                    list.push(node);
                }
            }
        }
        return list;
    }

    function parseModifiers(node) {
        while (i < len) {
            if (s[i] === '!' && /\d/.test(s[i + 1])) {
                i++;
                let num = '';
                while (i < len && /\d/.test(s[i])) { num += s[i]; i++; }
                node.repeat = parseInt(num, 10);
            } else if (s[i] === '*' && /\d/.test(s[i + 1])) {
                i++;
                let num = '';
                while (i < len && /\d/.test(s[i])) { num += s[i]; i++; }
                node.subdiv = parseInt(num, 10);
            } else if (s[i] === '?' && /[\d.]/.test(s[i + 1])) {
                i++;
                let p = '';
                while (i < len && /[\d.]/.test(s[i])) { p += s[i]; i++; }
                node.prob = parseFloat(p);
            } else {
                break;
            }
        }
    }

    function parseAtomicToken(raw) {
        let base = raw;
        let repeat, subdiv, prob;

        const probMatch = base.match(/\?([0-9.]+)$/);
        if (probMatch) {
            prob = parseFloat(probMatch[1]);
            base = base.slice(0, probMatch.index);
        }

        const repMatch = base.match(/!(\d+)$/);
        if (repMatch) {
            repeat = parseInt(repMatch[1], 10);
            base = base.slice(0, repMatch.index);
        }

        const multMatch = base.match(/\*(\d+)$/);
        if (multMatch) {
            subdiv = parseInt(multMatch[1], 10);
            base = base.slice(0, multMatch.index);
        }

        const isRest = base === '~' || base === '-' || base === '_' || !base;
        return {
            id: genId(),
            type: isRest ? 'rest' : 'note',
            val: isRest ? '~' : base.toLowerCase(),
            repeat,
            subdiv,
            prob
        };
    }

    return parseTokensList();
}

/**
 * Re-serialize AST tokens back into canonical Strudel pattern string.
 */
export function tokensToPattern(tokens) {
    if (!tokens || !tokens.length) return '~';

    function serializeNode(n) {
        let res = '';
        if (n.type === 'group') {
            const open = n.groupType === 'angle' ? '<' : '[';
            const close = n.groupType === 'angle' ? '>' : ']';
            const childStr = (n.children || []).map(serializeNode).join(' ');
            res = `${open}${childStr}${close}`;
        } else if (n.type === 'rest') {
            res = '~';
        } else {
            res = n.val || 'c2';
        }

        if (n.subdiv && n.subdiv > 1) res += `*${n.subdiv}`;
        if (n.repeat && n.repeat > 1) res += `!${n.repeat}`;
        if (n.prob !== undefined && n.prob < 1.0) res += `?${Number(n.prob).toFixed(2).replace(/\.?0+$/, '')}`;

        return res;
    }

    return tokens.map(serializeNode).join(' ');
}

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

        const activeIdx = isP ? (data?.activeIdx ?? -1) : -1;
        if (modal) {
            modal.querySelectorAll('[data-pat2-step]').forEach(el => {
                const idx = parseInt(el.dataset.pat2Step, 10);
                const isActive = idx === activeIdx;
                el.classList.toggle('ring-1', isActive);
                el.classList.toggle('ring-yellow-400', isActive);
                el.classList.toggle('bg-yellow-400/30', isActive);
            });
        }
    },
    renderModal: (m, ctx) => {
        const uid = ctx?.id || m?.id || 'pat2';
        const pat = m.pattern || 'c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2 c2';
        const gatePct = Math.round((m.gateLen ?? 0.8) * 100);
        const showPresets = m._showPresets === true;
        const curAddPitch = (m._addPitch || 'c2').toUpperCase();

        if (!m._tokens || m._lastPatStr !== pat) {
            m._tokens = parsePatternToTokens(pat);
            m._lastPatStr = pat;
        }

        return `
            <div id="pat2-modal-root-${uid}" class="space-y-1 p-0.5 select-none touch-none w-full">
                <!-- Top Toolbar: PRESET, GATE slider, +NOTE, +REST -->
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 gap-1.5">
                    <button id="pat2-toggle-presets-${uid}" class="flex items-center gap-0.5 text-[7px] font-bold text-slate-400 hover:text-cyan-300 uppercase tracking-wider transition bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                        <span class="text-[6px] font-mono text-cyan-400">${showPresets ? '▼' : '▶'}</span>
                        <span>PRESET</span>
                    </button>

                    <!-- Middle: GATE Slider -->
                    <div class="flex-1 flex items-center min-w-0 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 gap-1.5">
                        <span class="text-[7px] text-slate-400 uppercase font-mono shrink-0">GATE</span>
                        <input type="range" id="pat2-gate-slider-${uid}" min="10" max="95" step="5" value="${gatePct}" class="flex-1 w-full h-1 accent-cyan-400 cursor-pointer touch-none">
                        <span id="pat2-gate-disp-${uid}" class="text-[7.5px] font-mono font-bold text-cyan-300 min-w-[20px] text-right shrink-0">${gatePct}%</span>
                    </div>

                    <!-- Right Action: +NOTE (slide-adjustable pitch) and +REST -->
                    <div class="flex items-center gap-1 shrink-0">
                        <div id="pat2-add-note-box-${uid}" class="h-5 px-1.5 bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 rounded border border-cyan-500/70 shadow-sm transition cursor-ns-resize flex items-center gap-1 touch-none" title="上下スワイプで音程変更 / タップで追加">
                            <span class="text-[7px] text-cyan-400 font-bold pointer-events-none">+</span>
                            <span id="pat2-add-pitch-disp-${uid}" class="text-[8px] font-mono font-black text-cyan-100 pointer-events-none">${curAddPitch}</span>
                            <span class="text-[6px] text-cyan-400/80 pointer-events-none">↕</span>
                        </div>
                        <button id="pat2-add-rest-${uid}" class="h-5 px-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[7.5px] font-bold border border-slate-700 shadow-sm transition active:scale-95 flex items-center gap-0.5" title="休符を追加">
                            <span>+~</span>
                        </button>
                    </div>
                </div>

                <!-- Presets Grid (Collapsible) -->
                ${showPresets ? `
                <div class="grid grid-cols-4 sm:grid-cols-6 gap-1 pt-0.5 border-b border-slate-800/80 pb-1">
                    ${STRUDEL_PRESETS.map((p) => `
                        <button class="pat2-preset-btn h-5 px-1 bg-slate-800/90 hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-500/80 rounded flex items-center justify-center transition group truncate" data-pattern="${p.pattern}">
                            <span class="text-[7px] font-bold text-cyan-300 group-hover:text-white truncate pointer-events-none">${p.name}</span>
                        </button>
                    `).join('')}
                </div>
                ` : ''}

                <!-- Token Strip: Ultra-compact, 2px margin/padding, 16 steps fit at once -->
                <div class="relative w-full bg-slate-950 border border-slate-800 rounded p-[2px] overflow-hidden shadow-inner">
                    <div id="pat2-token-strip-${uid}" class="flex items-center gap-[2px] overflow-x-auto min-h-[26px] h-6 py-0 px-[2px] scrollbar-thin scrollbar-thumb-slate-700 select-none">
                        <!-- Populated dynamically via renderTokens -->
                    </div>
                </div>

                <!-- Compact Inspector / Action Bar (Without count & group button) -->
                <div id="pat2-inspector-${uid}" class="bg-slate-950/90 rounded border border-slate-800 px-1.5 py-0.5 flex items-center justify-between gap-1 shadow-sm">
                    <!-- Left: Current Pitch Display (without token count) -->
                    <div class="flex items-center gap-1 min-w-0 shrink-0">
                        <span id="pat2-pitch-disp-${uid}" class="text-[9.5px] font-mono font-black text-cyan-300">--</span>
                        <span class="text-[6.5px] font-mono text-slate-500 hidden sm:inline">(ドラッグで重ねてグループ化 / ↕スワイプで音程)</span>
                    </div>

                    <!-- Right: Modifiers (*n, !n), Rest (~), Delete -->
                    <div class="flex items-center gap-1 shrink-0">
                        <button id="pat2-ungroup-btn-${uid}" class="h-4 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded text-[7px] font-bold border border-slate-800 shadow-sm transition active:scale-95" title="グループ解除">
                            UNGROUP
                        </button>
                        <button id="pat2-subdiv-btn-${uid}" class="h-4 px-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[7px] font-bold border border-amber-500/50 transition" title="細分化 (*2, *3, *4)">
                            *n
                        </button>
                        <button id="pat2-repeat-btn-${uid}" class="h-4 px-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[7px] font-bold border border-amber-500/50 transition" title="複製 (!2, !3, !4)">
                            !n
                        </button>
                        <button id="pat2-toggle-rest-btn-${uid}" class="h-4 px-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[7px] font-bold border border-cyan-500/50 transition" title="音符/休符(~)切替">
                            ~
                        </button>
                        <button id="pat2-del-btn-${uid}" class="h-4 px-1.5 bg-red-950/80 hover:bg-red-900 text-red-300 rounded text-[7px] font-bold border border-red-500/60 transition" title="選択削除">
                            DEL
                        </button>
                    </div>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const uid = ctx?.id || m?.id || 'pat2';
        const root = document.getElementById(`pat2-modal-root-${uid}`) || (ctx?.getDialogElement ? ctx.getDialogElement() : null) || document;
        if (!root) return;

        const tokenStrip = document.getElementById(`pat2-token-strip-${uid}`);
        const pitchDisp = document.getElementById(`pat2-pitch-disp-${uid}`);
        const ungroupBtn = document.getElementById(`pat2-ungroup-btn-${uid}`);
        const subdivBtn = document.getElementById(`pat2-subdiv-btn-${uid}`);
        const repeatBtn = document.getElementById(`pat2-repeat-btn-${uid}`);
        const toggleRestBtn = document.getElementById(`pat2-toggle-rest-btn-${uid}`);
        const delBtn = document.getElementById(`pat2-del-btn-${uid}`);
        const addNoteBox = document.getElementById(`pat2-add-note-box-${uid}`);
        const addPitchDisp = document.getElementById(`pat2-add-pitch-disp-${uid}`);
        const addRestBtn = document.getElementById(`pat2-add-rest-${uid}`);
        const gateSlider = document.getElementById(`pat2-gate-slider-${uid}`);
        const gateDisp = document.getElementById(`pat2-gate-disp-${uid}`);
        const togglePresets = document.getElementById(`pat2-toggle-presets-${uid}`);

        let selectedIds = new Set();
        let stepCounter = 0;

        // Render HTML for tokens with tight 2px spacing
        const renderTokens = () => {
            if (!tokenStrip) return;
            stepCounter = 0;

            function renderNode(node, depth = 0) {
                const isSelected = selectedIds.has(node.id);
                const borderCls = isSelected
                    ? 'border-yellow-400 bg-yellow-400/25 shadow-sm ring-1 ring-yellow-400'
                    : 'border-slate-800 bg-slate-900/90 hover:border-cyan-500/70';

                if (node.type === 'group') {
                    const isAngle = node.groupType === 'angle';
                    const label = isAngle ? '<>' : '[]';
                    return `
                        <div data-node-id="${node.id}" class="pat2-node-token pat2-group-box relative flex items-center gap-[1px] px-[2px] py-[1px] rounded border border-dashed ${borderCls} cursor-pointer transition shrink-0">
                            <span class="text-[5.5px] font-mono text-purple-400 font-bold absolute -top-1.5 left-0.5 bg-slate-950 px-0.5 rounded leading-none pointer-events-none">${label}</span>
                            <div class="flex items-center gap-[1px]">
                                ${(node.children || []).map(c => renderNode(c, depth + 1)).join('')}
                            </div>
                            ${renderBadge(node)}
                        </div>`;
                }

                const isRest = node.type === 'rest';
                const noteVal = (node.val || 'c2').toUpperCase();
                const stepIdx = stepCounter++;
                return `
                    <div data-node-id="${node.id}" data-pat2-step="${stepIdx}" class="pat2-node-token relative flex items-center justify-center min-w-[15px] h-5 px-[2px] rounded border ${borderCls} cursor-ns-resize transition select-none group touch-none shrink-0">
                        <span class="pat2-node-val text-[8px] font-mono font-bold ${isRest ? 'text-slate-600' : 'text-cyan-300 group-hover:text-white'} leading-none pointer-events-none">${isRest ? '~' : noteVal}</span>
                        ${renderBadge(node)}
                    </div>`;
            }

            function renderBadge(node) {
                const badges = [];
                if (node.subdiv && node.subdiv > 1) badges.push(`*${node.subdiv}`);
                if (node.repeat && node.repeat > 1) badges.push(`!${node.repeat}`);
                if (!badges.length) return '';
                return `<div class="absolute -top-1 -right-0.5 bg-amber-500 text-slate-950 text-[5px] font-mono font-black px-0.5 rounded-full shadow pointer-events-none leading-tight">${badges.join(' ')}</div>`;
            }

            tokenStrip.innerHTML = m._tokens.map(t => renderNode(t)).join('');
            bindTokenEvents();
            updateInspector();
        };

        const syncPattern = () => {
            const newPat = tokensToPattern(m._tokens);
            m.pattern = newPat;
            m._lastPatStr = newPat;
            cb();
        };

        const getSelectedNodes = () => {
            const list = [];
            function traverse(nodes) {
                nodes.forEach(n => {
                    if (selectedIds.has(n.id)) list.push(n);
                    if (n.children) traverse(n.children);
                });
            }
            traverse(m._tokens);
            return list;
        };

        const updateInspector = () => {
            const selected = getSelectedNodes();
            if (selected.length === 0) {
                if (pitchDisp) pitchDisp.textContent = '--';
                return;
            }

            if (selected.length === 1) {
                const n = selected[0];
                if (n.type === 'note') {
                    const midi = noteToMidiNum(n.val) ?? 48;
                    const noteStr = midiNumToNote(midi).toUpperCase();
                    if (pitchDisp) pitchDisp.textContent = noteStr;
                } else {
                    if (pitchDisp) pitchDisp.textContent = n.type === 'rest' ? '~' : 'GRP';
                }
            } else {
                const firstNote = selected.find(n => n.type === 'note');
                if (firstNote) {
                    const midi = noteToMidiNum(firstNote.val) ?? 48;
                    const noteStr = midiNumToNote(midi).toUpperCase();
                    if (pitchDisp) pitchDisp.textContent = `${noteStr} (±)`;
                } else {
                    if (pitchDisp) pitchDisp.textContent = 'MULTI';
                }
            }
        };

        const shiftSelectedPitch = (delta) => {
            const selected = getSelectedNodes();
            let changed = false;
            selected.forEach(n => {
                if (n.type === 'note') {
                    const curMidi = noteToMidiNum(n.val) ?? 48;
                    const newMidi = Math.max(12, Math.min(108, curMidi + delta));
                    n.val = midiNumToNote(newMidi);
                    changed = true;
                }
            });
            if (changed) {
                renderTokens();
                syncPattern();
            }
        };

        // Automatic Drag-and-drop grouping (merges source note into target)
        const mergeTokens = (sourceId, targetId) => {
            if (!sourceId || !targetId || sourceId === targetId) return;

            let sourceNode = null;
            function extractSource(list) {
                for (let i = 0; i < list.length; i++) {
                    if (list[i].id === sourceId) {
                        sourceNode = list.splice(i, 1)[0];
                        return true;
                    }
                    if (list[i].children && extractSource(list[i].children)) return true;
                }
                return false;
            }
            extractSource(m._tokens);
            if (!sourceNode) return;

            function insertIntoTarget(list) {
                for (let i = 0; i < list.length; i++) {
                    if (list[i].id === targetId) {
                        if (list[i].type === 'group') {
                            list[i].children = list[i].children || [];
                            list[i].children.push(sourceNode);
                        } else {
                            const origTarget = list[i];
                            const newGroup = {
                                id: genId(),
                                type: 'group',
                                groupType: 'bracket',
                                children: [origTarget, sourceNode]
                            };
                            list[i] = newGroup;
                        }
                        return true;
                    }
                    if (list[i].children && insertIntoTarget(list[i].children)) return true;
                }
                return false;
            }
            insertIntoTarget(m._tokens);

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

                const onPointerDown = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startX = e.clientX;
                    startY = e.clientY;
                    isDraggingSwipe = false;
                    isHorizontalDrag = false;
                    lastDiff = 0;
                    targetOverEl = null;

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

                    const onPointerMove = (me) => {
                        const dx = me.clientX - startX;
                        const dy = startY - me.clientY;

                        // Check horizontal drag for grouping
                        if (!isDraggingSwipe && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
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
                                    targetOverEl.classList.remove('ring-2', 'ring-purple-400');
                                }
                                targetOverEl = targetNode;
                                targetOverEl.classList.add('ring-2', 'ring-purple-400');
                            } else if (targetOverEl) {
                                targetOverEl.classList.remove('ring-2', 'ring-purple-400');
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

                        if (targetOverEl) {
                            targetOverEl.classList.remove('ring-2', 'ring-purple-400');
                            const targetId = targetOverEl.dataset.nodeId;
                            targetOverEl = null;
                            if (targetId && targetId !== id) {
                                mergeTokens(id, targetId);
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
                    // Tap: add note with current _addPitch
                    const newNode = { id: genId(), type: 'note', val: (m._addPitch || 'c2').toLowerCase() };
                    m._tokens.push(newNode);
                    selectedIds.clear();
                    selectedIds.add(newNode.id);
                    renderTokens();
                    syncPattern();
                }
            };

            window.addEventListener('pointermove', onBoxMove, { passive: false });
            window.addEventListener('pointerup', onBoxUp);
            window.addEventListener('pointercancel', onBoxUp);
        });

        // Add Rest button
        addRestBtn?.addEventListener('click', () => {
            const newNode = { id: genId(), type: 'rest', val: '~' };
            m._tokens.push(newNode);
            selectedIds.clear();
            selectedIds.add(newNode.id);
            renderTokens();
            syncPattern();
        });

        // Ungroup: in-place unwrap
        ungroupBtn?.addEventListener('click', () => {
            let changed = false;

            function unwrapList(list) {
                const res = [];
                list.forEach(node => {
                    if (selectedIds.has(node.id) && node.type === 'group' && node.children) {
                        res.push(...node.children);
                        changed = true;
                    } else {
                        if (node.children) {
                            node.children = unwrapList(node.children);
                        }
                        res.push(node);
                    }
                });
                return res;
            }

            m._tokens = unwrapList(m._tokens);
            if (changed) {
                selectedIds.clear();
                renderTokens();
                syncPattern();
            }
        });

        // Modifier: cycle subdiv *1 -> *2 -> *3 -> *4 -> *1
        subdivBtn?.addEventListener('click', () => {
            const selected = getSelectedNodes();
            selected.forEach(n => {
                const cur = n.subdiv || 1;
                n.subdiv = cur >= 4 ? 1 : cur + 1;
            });
            renderTokens();
            syncPattern();
        });

        // Modifier: cycle repeat !1 -> !2 -> !3 -> !4 -> !1
        repeatBtn?.addEventListener('click', () => {
            const selected = getSelectedNodes();
            selected.forEach(n => {
                const cur = n.repeat || 1;
                n.repeat = cur >= 4 ? 1 : cur + 1;
            });
            renderTokens();
            syncPattern();
        });

        // Toggle Rest / Note
        toggleRestBtn?.addEventListener('click', () => {
            const selected = getSelectedNodes();
            selected.forEach(n => {
                if (n.type === 'note') {
                    n.type = 'rest';
                    n.val = '~';
                } else if (n.type === 'rest') {
                    n.type = 'note';
                    n.val = (m._addPitch || 'c2').toLowerCase();
                }
            });
            renderTokens();
            syncPattern();
        });

        // Delete selected tokens
        delBtn?.addEventListener('click', () => {
            if (selectedIds.size === 0) return;
            function filterOut(list) {
                return list.filter(n => {
                    if (selectedIds.has(n.id)) return false;
                    if (n.children) n.children = filterOut(n.children);
                    return true;
                });
            }
            m._tokens = filterOut(m._tokens);
            if (m._tokens.length === 0) {
                m._tokens = [{ id: genId(), type: 'rest', val: '~' }];
            }
            selectedIds.clear();
            renderTokens();
            syncPattern();
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
                    m.pattern = patStr;
                    m._tokens = parsePatternToTokens(patStr);
                    m._lastPatStr = patStr;
                    selectedIds.clear();
                    renderTokens();
                    syncPattern();
                }
            });
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
