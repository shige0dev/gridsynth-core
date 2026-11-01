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

/**
 * Token Tree Node structure:
 * {
 *   id: string,
 *   type: 'note' | 'rest' | 'group',
 *   groupType?: 'bracket' | 'angle', // '[' or '<'
 *   val?: string,                    // 'c2'
 *   children?: TokenNode[],
 *   subdiv?: number,                 // *n
 *   repeat?: number,                 // !n
 *   prob?: number,                   // ?p (0.1〜1.0)
 *   eucK?: number,                   // (k, n)
 *   eucN?: number
 * }
 */

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
            // Skip whitespace
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
                // Unexpected closing, advance
                i++;
            } else {
                // Read atomic token until whitespace, [, ], <, or >
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
            } else if (s[i] === '(') {
                // Euclidean (k, n)
                i++;
                let content = '';
                while (i < len && s[i] !== ')') { content += s[i]; i++; }
                if (i < len && s[i] === ')') i++;
                const parts = content.split(',');
                if (parts.length === 2) {
                    node.eucK = parseInt(parts[0], 10);
                    node.eucN = parseInt(parts[1], 10);
                }
            } else {
                break;
            }
        }
    }

    function parseAtomicToken(raw) {
        let base = raw;
        let repeat, subdiv, prob, eucK, eucN;

        const eucMatch = base.match(/\((\d+)\s*,\s*(\d+)\)$/);
        if (eucMatch) {
            eucK = parseInt(eucMatch[1], 10);
            eucN = parseInt(eucMatch[2], 10);
            base = base.slice(0, eucMatch.index);
        }

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
            prob,
            eucK,
            eucN
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
        if (n.eucK && n.eucN) res += `(${n.eucK},${n.eucN})`;
        if (n.prob !== undefined && n.prob < 1.0) res += `?${Number(n.prob).toFixed(2).replace(/\.?0+$/, '')}`;

        return res;
    }

    return tokens.map(serializeNode).join(' ');
}

export const PAT2 = {
    color: 'sky',
    defaults: () => ({
        type: 'PAT2',
        pattern: 'c2 c2 c2 c2',
        cycleBeats: 4,
        gateLen: 0.8,
        presetName: '4-on-floor'
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
                el.classList.toggle('ring-2', idx === activeIdx);
                el.classList.toggle('ring-yellow-400', idx === activeIdx);
                el.classList.toggle('shadow-[0_0_10px_rgba(250,204,21,0.7)]', idx === activeIdx);
            });
        }
    },
    renderModal: (m, ctx) => {
        const uid = ctx?.id || m?.id || 'pat2';
        const pat = m.pattern || 'c2 c2 c2 c2';
        const gatePct = Math.round((m.gateLen ?? 0.8) * 100);
        const showPresets = m._showPresets === true;
        const showText = m._showText === true;

        if (!m._tokens || m._lastPatStr !== pat) {
            m._tokens = parsePatternToTokens(pat);
            m._lastPatStr = pat;
        }

        return `
            <div id="pat2-modal-root-${uid}" class="space-y-1.5 p-0.5 select-none touch-none">
                <!-- Top Toolbar: PRESET, GATE slider, Quick Action Buttons -->
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 gap-1.5">
                    <div class="flex items-center gap-1 shrink-0">
                        <button id="pat2-toggle-presets-${uid}" class="flex items-center gap-0.5 text-[7.5px] font-bold text-slate-400 hover:text-cyan-300 uppercase tracking-wider transition bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            <span class="text-[6.5px] font-mono text-cyan-400">${showPresets ? '▼' : '▶'}</span>
                            <span>PRESET</span>
                        </button>
                        <button id="pat2-toggle-text-${uid}" class="flex items-center gap-0.5 text-[7.5px] font-bold text-slate-400 hover:text-cyan-300 uppercase tracking-wider transition bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            <span class="text-[6.5px] font-mono text-cyan-400">${showText ? '▼' : '▶'}</span>
                            <span>TEXT</span>
                        </button>
                    </div>

                    <!-- Middle: GATE Slider -->
                    <div class="flex-1 flex items-center min-w-0 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 gap-1.5">
                        <span class="text-[7.5px] text-slate-400 uppercase font-mono shrink-0">GATE</span>
                        <input type="range" id="pat2-gate-slider-${uid}" min="10" max="95" step="5" value="${gatePct}" class="flex-1 w-full h-1 accent-cyan-400 cursor-pointer touch-none">
                        <span id="pat2-gate-disp-${uid}" class="text-[8px] font-mono font-bold text-cyan-300 min-w-[24px] text-right shrink-0">${gatePct}%</span>
                    </div>

                    <!-- Right: Add Note / Rest buttons -->
                    <div class="flex items-center gap-1 shrink-0">
                        <button id="pat2-add-note-${uid}" class="h-5 px-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[8px] font-bold border border-cyan-400 shadow-sm transition active:scale-95 flex items-center gap-0.5">
                            <span>+</span><span>NOTE</span>
                        </button>
                        <button id="pat2-add-rest-${uid}" class="h-5 px-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[8px] font-bold border border-slate-700 shadow-sm transition active:scale-95 flex items-center gap-0.5">
                            <span>+</span><span>REST</span>
                        </button>
                    </div>
                </div>

                <!-- Presets Grid (Collapsible) -->
                ${showPresets ? `
                <div class="grid grid-cols-4 sm:grid-cols-6 gap-1 pt-0.5 border-b border-slate-800/80 pb-1.5">
                    ${STRUDEL_PRESETS.map((p) => `
                        <button class="pat2-preset-btn h-5 px-1 bg-slate-800/90 hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-500/80 rounded flex items-center justify-center transition group truncate" data-pattern="${p.pattern}">
                            <span class="text-[7px] font-bold text-cyan-300 group-hover:text-white truncate pointer-events-none">${p.name}</span>
                        </button>
                    `).join('')}
                </div>
                ` : ''}

                <!-- Token Strip Area (Horizontal Scrollable Strip) -->
                <div class="relative w-full bg-slate-950/80 rounded-xl border border-cyan-500/30 p-2 overflow-hidden shadow-inner">
                    <div id="pat2-token-strip-${uid}" class="flex items-center gap-1.5 overflow-x-auto min-h-[58px] py-1 px-1 scrollbar-thin scrollbar-thumb-slate-700 select-none">
                        <!-- Populated dynamically via renderTokensHTML -->
                    </div>
                </div>

                <!-- Inspector / Multi-Select Action Bar -->
                <div id="pat2-inspector-${uid}" class="bg-slate-950/90 rounded-xl border border-slate-800 p-2 space-y-1.5 shadow-sm">
                    <!-- Top Info of Selection & Pitch controls -->
                    <div class="flex items-center justify-between gap-1.5">
                        <div class="flex items-center gap-1 min-w-0">
                            <span id="pat2-sel-badge-${uid}" class="text-[8px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">NO SELECTION</span>
                            <span id="pat2-pitch-disp-${uid}" class="text-[11px] font-mono font-black text-cyan-300 ml-1">--</span>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <button id="pat2-pitch-down-${uid}" class="h-5 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[9px] font-bold border border-slate-700 active:bg-cyan-900 transition flex items-center justify-center">
                                ▼ -1
                            </button>
                            <button id="pat2-pitch-up-${uid}" class="h-5 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[9px] font-bold border border-slate-700 active:bg-cyan-900 transition flex items-center justify-center">
                                ▲ +1
                            </button>
                            <button id="pat2-oct-down-${uid}" class="h-5 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-[8px] font-mono border border-slate-700 active:bg-cyan-900 transition">
                                -12
                            </button>
                            <button id="pat2-oct-up-${uid}" class="h-5 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-[8px] font-mono border border-slate-700 active:bg-cyan-900 transition">
                                +12
                            </button>
                        </div>
                    </div>

                    <!-- Pitch Slider -->
                    <div class="flex items-center gap-2 bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800/80">
                        <span class="text-[7.5px] font-mono text-slate-400 shrink-0 uppercase">PITCH SLIDER</span>
                        <input type="range" id="pat2-pitch-slider-${uid}" min="24" max="84" step="1" value="48" class="flex-1 h-1.5 accent-cyan-400 cursor-pointer touch-none">
                        <span id="pat2-pitch-slider-disp-${uid}" class="text-[8.5px] font-mono font-bold text-cyan-300 min-w-[28px] text-right shrink-0">C2</span>
                    </div>

                    <!-- Attributes & Grouping Buttons Row -->
                    <div class="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/60">
                        <!-- Grouping buttons -->
                        <div class="flex items-center gap-1">
                            <button id="pat2-group-btn-${uid}" class="h-5 px-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded text-[8px] font-bold border border-purple-500/50 shadow-sm transition active:scale-95 flex items-center gap-0.5">
                                <span>[ ]</span><span>GROUP</span>
                            </button>
                            <button id="pat2-ungroup-btn-${uid}" class="h-5 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded text-[8px] font-bold border border-slate-800 shadow-sm transition active:scale-95 flex items-center gap-0.5">
                                <span>UNGROUP</span>
                            </button>
                        </div>

                        <!-- Modifiers: Repeat !n, Subdiv *n, Rest toggle -->
                        <div class="flex items-center gap-1">
                            <button id="pat2-subdiv-btn-${uid}" class="h-5 px-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[8px] font-bold border border-amber-500/50 transition">
                                SUBDIV *
                            </button>
                            <button id="pat2-repeat-btn-${uid}" class="h-5 px-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-[8px] font-bold border border-amber-500/50 transition">
                                REP !
                            </button>
                            <button id="pat2-toggle-rest-btn-${uid}" class="h-5 px-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[8px] font-bold border border-cyan-500/50 transition">
                                REST (~)
                            </button>
                            <button id="pat2-del-btn-${uid}" class="h-5 px-2 bg-red-950/80 hover:bg-red-900 text-red-300 rounded text-[8px] font-bold border border-red-500/60 transition">
                                DEL
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Text representation (Collapsible) -->
                ${showText ? `
                <div class="flex items-center gap-1 pt-1">
                    <input type="text" id="pat2-raw-input-${uid}" value="${pat}" class="flex-1 h-6 bg-slate-950 border border-slate-700 rounded px-2 font-mono text-[9px] text-cyan-300 focus:outline-none focus:border-cyan-400">
                    <button id="pat2-apply-raw-${uid}" class="h-6 px-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[8.5px] font-bold border border-cyan-400">
                        APPLY
                    </button>
                </div>
                ` : ''}
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const uid = ctx?.id || m?.id || 'pat2';
        const root = document.getElementById(`pat2-modal-root-${uid}`) || (ctx?.getDialogElement ? ctx.getDialogElement() : null) || document;
        if (!root) return;

        const tokenStrip = document.getElementById(`pat2-token-strip-${uid}`);
        const selBadge = document.getElementById(`pat2-sel-badge-${uid}`);
        const pitchDisp = document.getElementById(`pat2-pitch-disp-${uid}`);
        const pitchSlider = document.getElementById(`pat2-pitch-slider-${uid}`);
        const pitchSliderDisp = document.getElementById(`pat2-pitch-slider-disp-${uid}`);
        const pitchDownBtn = document.getElementById(`pat2-pitch-down-${uid}`);
        const pitchUpBtn = document.getElementById(`pat2-pitch-up-${uid}`);
        const octDownBtn = document.getElementById(`pat2-oct-down-${uid}`);
        const octUpBtn = document.getElementById(`pat2-oct-up-${uid}`);
        const groupBtn = document.getElementById(`pat2-group-btn-${uid}`);
        const ungroupBtn = document.getElementById(`pat2-ungroup-btn-${uid}`);
        const subdivBtn = document.getElementById(`pat2-subdiv-btn-${uid}`);
        const repeatBtn = document.getElementById(`pat2-repeat-btn-${uid}`);
        const toggleRestBtn = document.getElementById(`pat2-toggle-rest-btn-${uid}`);
        const delBtn = document.getElementById(`pat2-del-btn-${uid}`);
        const addNoteBtn = document.getElementById(`pat2-add-note-${uid}`);
        const addRestBtn = document.getElementById(`pat2-add-rest-${uid}`);
        const gateSlider = document.getElementById(`pat2-gate-slider-${uid}`);
        const gateDisp = document.getElementById(`pat2-gate-disp-${uid}`);
        const togglePresets = document.getElementById(`pat2-toggle-presets-${uid}`);
        const toggleText = document.getElementById(`pat2-toggle-text-${uid}`);
        const rawInput = document.getElementById(`pat2-raw-input-${uid}`);
        const applyRawBtn = document.getElementById(`pat2-apply-raw-${uid}`);

        let selectedIds = new Set();
        let stepCounter = 0;

        // Render HTML for tokens
        const renderTokens = () => {
            if (!tokenStrip) return;
            stepCounter = 0;

            function renderNode(node, depth = 0) {
                const isSelected = selectedIds.has(node.id);
                const borderCls = isSelected
                    ? 'border-yellow-400 bg-yellow-400/20 shadow-md shadow-yellow-500/30 ring-1 ring-yellow-400'
                    : 'border-slate-700 bg-slate-900/90 hover:border-cyan-500/70';

                if (node.type === 'group') {
                    const isAngle = node.groupType === 'angle';
                    const label = isAngle ? '< CYCLE >' : '[ SUBDIV ]';
                    return `
                        <div data-node-id="${node.id}" class="pat2-node-token pat2-group-box relative flex items-center gap-1 px-2 py-1 rounded-xl border ${borderCls} cursor-pointer transition">
                            <span class="text-[6.5px] font-mono text-purple-400 font-bold absolute -top-2 left-2 bg-slate-950 px-1 rounded border border-purple-500/40">${label}</span>
                            <div class="flex items-center gap-1 pt-1 pb-0.5">
                                ${(node.children || []).map(c => renderNode(c, depth + 1)).join('')}
                            </div>
                            ${renderBadge(node)}
                        </div>`;
                }

                const isRest = node.type === 'rest';
                const noteVal = (node.val || 'c2').toUpperCase();
                const stepIdx = stepCounter++;
                return `
                    <div data-node-id="${node.id}" data-pat2-step="${stepIdx}" class="pat2-node-token relative flex flex-col items-center justify-center min-w-[38px] h-11 px-2 rounded-xl border ${borderCls} cursor-ns-resize transition select-none group touch-none">
                        <span class="pat2-node-val text-[11px] font-mono font-black ${isRest ? 'text-slate-500' : 'text-cyan-300 group-hover:text-white'} leading-none">${isRest ? '~' : noteVal}</span>
                        <span class="text-[6.5px] font-mono text-slate-500 mt-1 leading-none">↕ SWIPE</span>
                        ${renderBadge(node)}
                    </div>`;
            }

            function renderBadge(node) {
                const badges = [];
                if (node.subdiv && node.subdiv > 1) badges.push(`*${node.subdiv}`);
                if (node.repeat && node.repeat > 1) badges.push(`!${node.repeat}`);
                if (node.prob !== undefined && node.prob < 1.0) badges.push(`?${Math.round(node.prob * 100)}%`);
                if (!badges.length) return '';
                return `<div class="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 text-[6.5px] font-mono font-black px-1 rounded-full shadow pointer-events-none">${badges.join(' ')}</div>`;
            }

            tokenStrip.innerHTML = m._tokens.map(t => renderNode(t)).join('');
            bindTokenEvents();
            updateInspector();
        };

        const syncPattern = () => {
            const newPat = tokensToPattern(m._tokens);
            m.pattern = newPat;
            m._lastPatStr = newPat;
            if (rawInput) rawInput.value = newPat;
            cb();
        };

        // Find all selected nodes in the AST tree
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
                if (selBadge) {
                    selBadge.textContent = 'NO SELECTION';
                    selBadge.className = 'text-[8px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold';
                }
                if (pitchDisp) pitchDisp.textContent = '--';
                if (pitchSliderDisp) pitchSliderDisp.textContent = '--';
                return;
            }

            if (selected.length === 1) {
                const n = selected[0];
                if (selBadge) {
                    selBadge.textContent = n.type === 'group' ? 'GROUP SELECTED' : '1 TOKEN';
                    selBadge.className = 'text-[8px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold';
                }
                if (n.type === 'note') {
                    const midi = noteToMidiNum(n.val) ?? 48;
                    const noteStr = midiNumToNote(midi).toUpperCase();
                    if (pitchDisp) pitchDisp.textContent = noteStr;
                    if (pitchSlider) pitchSlider.value = midi;
                    if (pitchSliderDisp) pitchSliderDisp.textContent = noteStr;
                } else {
                    if (pitchDisp) pitchDisp.textContent = n.type === 'rest' ? 'REST (~)' : 'GRP';
                    if (pitchSliderDisp) pitchSliderDisp.textContent = '--';
                }
            } else {
                if (selBadge) {
                    selBadge.textContent = `${selected.length} TOKENS SELECTED`;
                    selBadge.className = 'text-[8px] font-mono px-1.5 py-0.5 rounded bg-yellow-950 text-yellow-300 border border-yellow-500/50 font-bold';
                }
                const firstNote = selected.find(n => n.type === 'note');
                if (firstNote) {
                    const midi = noteToMidiNum(firstNote.val) ?? 48;
                    const noteStr = midiNumToNote(midi).toUpperCase();
                    if (pitchDisp) pitchDisp.textContent = `${noteStr} (±SHIFT)`;
                    if (pitchSlider) pitchSlider.value = midi;
                    if (pitchSliderDisp) pitchSliderDisp.textContent = noteStr;
                } else {
                    if (pitchDisp) pitchDisp.textContent = 'MULTI';
                    if (pitchSliderDisp) pitchSliderDisp.textContent = '--';
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

        const bindTokenEvents = () => {
            tokenStrip.querySelectorAll('.pat2-node-token').forEach(el => {
                const id = el.dataset.nodeId;
                let pressTimer = null;
                let startY = 0;
                let isDraggingSwipe = false;
                let lastDiff = 0;

                const onPointerDown = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startY = e.clientY;
                    isDraggingSwipe = false;
                    lastDiff = 0;

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
                        const dy = startY - me.clientY;
                        if (Math.abs(dy) >= 8) {
                            if (pressTimer) {
                                clearTimeout(pressTimer);
                                pressTimer = null;
                            }
                            isDraggingSwipe = true;
                            if (!selectedIds.has(id) && selectedIds.size === 0) {
                                selectedIds.add(id);
                                renderTokens();
                            }
                            const semitoneSteps = Math.trunc(dy / 10);
                            const diff = semitoneSteps - lastDiff;
                            if (diff !== 0) {
                                shiftSelectedPitch(diff);
                                lastDiff = semitoneSteps;
                            }
                        }
                    };

                    const onPointerUp = () => {
                        if (pressTimer) {
                            clearTimeout(pressTimer);
                            pressTimer = null;
                            // Tap behavior (single select or toggle)
                            if (selectedIds.has(id) && selectedIds.size === 1) {
                                selectedIds.clear();
                            } else {
                                selectedIds.clear();
                                selectedIds.add(id);
                            }
                            renderTokens();
                        }
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

        // Pitch button controls
        pitchDownBtn?.addEventListener('click', () => shiftSelectedPitch(-1));
        pitchUpBtn?.addEventListener('click', () => shiftSelectedPitch(1));
        octDownBtn?.addEventListener('click', () => shiftSelectedPitch(-12));
        octUpBtn?.addEventListener('click', () => shiftSelectedPitch(12));

        // Pitch slider control
        pitchSlider?.addEventListener('input', (e) => {
            const targetMidi = parseInt(e.target.value, 10);
            const selected = getSelectedNodes();
            if (selected.length === 1 && selected[0].type === 'note') {
                selected[0].val = midiNumToNote(targetMidi);
                renderTokens();
                syncPattern();
            } else if (selected.length > 1) {
                const firstNote = selected.find(n => n.type === 'note');
                if (firstNote) {
                    const baseMidi = noteToMidiNum(firstNote.val) ?? 48;
                    const delta = targetMidi - baseMidi;
                    shiftSelectedPitch(delta);
                }
            }
        });

        // Grouping: wrap selected items in a bracket group
        groupBtn?.addEventListener('click', () => {
            if (selectedIds.size < 2) return;
            const newChildren = [];
            const remainingTokens = [];

            m._tokens.forEach(t => {
                if (selectedIds.has(t.id)) {
                    newChildren.push(t);
                } else {
                    remainingTokens.push(t);
                }
            });

            if (newChildren.length > 0) {
                const newGroup = {
                    id: genId(),
                    type: 'group',
                    groupType: 'bracket',
                    children: newChildren
                };
                remainingTokens.push(newGroup);
                m._tokens = remainingTokens;
                selectedIds.clear();
                selectedIds.add(newGroup.id);
                renderTokens();
                syncPattern();
            }
        });

        // Ungroup: unwrap children of selected groups
        ungroupBtn?.addEventListener('click', () => {
            const selected = getSelectedNodes();
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
                    n.val = 'c2';
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

        // Add Note to end
        addNoteBtn?.addEventListener('click', () => {
            const newNode = { id: genId(), type: 'note', val: 'c2' };
            m._tokens.push(newNode);
            selectedIds.clear();
            selectedIds.add(newNode.id);
            renderTokens();
            syncPattern();
        });

        // Add Rest to end
        addRestBtn?.addEventListener('click', () => {
            const newNode = { id: genId(), type: 'rest', val: '~' };
            m._tokens.push(newNode);
            selectedIds.clear();
            selectedIds.add(newNode.id);
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

        // Text representation toggle & apply
        toggleText?.addEventListener('click', () => {
            m._showText = !m._showText;
            ctx.reRenderModal();
        });

        applyRawBtn?.addEventListener('click', () => {
            if (rawInput) {
                const rawVal = rawInput.value.trim() || 'c2';
                m.pattern = rawVal;
                m._tokens = parsePatternToTokens(rawVal);
                m._lastPatStr = rawVal;
                selectedIds.clear();
                renderTokens();
                syncPattern();
            }
        });

        // Initial render
        renderTokens();
    }
};

export const pat2Defs = {
    PAT2
};

