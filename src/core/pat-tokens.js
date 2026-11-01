// src/core/pat-tokens.js
// Token tree (AST) parser, serializer, and manipulation utilities for PAT modules

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

export function noteToMidiNum(noteStr) {
    if (!noteStr) return null;
    const match = String(noteStr).trim().toLowerCase().match(/^([a-g][#b]?)(-?\d+)?$/);
    if (!match) return null;
    const semi = NOTE_SEMITONES_MAP[match[1]];
    if (semi === undefined) return null;
    const oct = match[2] !== undefined ? parseInt(match[2], 10) : 2;
    return (oct + 1) * 12 + semi;
}

export function midiNumToNote(midi) {
    const m = Math.max(12, Math.min(108, Math.round(midi)));
    const oct = Math.floor(m / 12) - 1;
    const semi = ((m % 12) + 12) % 12;
    return `${SEMITONE_NOTES[semi]}${oct}`;
}

let nextTokenId = 1;
export const genTokenId = () => 't_' + (nextTokenId++);

export function walkTokens(list, fn) {
    const res = [];
    for (const node of list) {
        const out = fn(node);
        if (out === null) continue;
        if (Array.isArray(out)) res.push(...out);
        else {
            if (node.children) node.children = walkTokens(node.children, fn);
            res.push(out || node);
        }
    }
    return res;
}

export function findTokens(list, predicate) {
    const res = [];
    function traverse(nodes) {
        for (const n of nodes) {
            if (predicate(n)) res.push(n);
            if (n.children) traverse(n.children);
        }
    }
    traverse(list);
    return res;
}

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
            if (endChars && endChars.includes(s[i])) break;

            if (s[i] === '[' || s[i] === '<') {
                const isAngle = s[i] === '<';
                const closeChar = isAngle ? '>' : ']';
                i++;
                const children = parseTokensList(closeChar);
                if (i < len && s[i] === closeChar) i++;

                // Check if any child was a pipe '|' or if children form a choice
                const hasPipe = children.some(c => c.type === 'pipe');
                let groupType = isAngle ? 'angle' : 'bracket';
                let filteredChildren = children;

                if (hasPipe) {
                    groupType = 'choice';
                    filteredChildren = children.filter(c => c.type !== 'pipe');
                }

                const groupNode = {
                    id: genTokenId(),
                    type: 'group',
                    groupType,
                    children: filteredChildren
                };
                parseModifiers(groupNode);
                list.push(groupNode);
            } else if (s[i] === ']' || s[i] === '>') {
                i++;
            } else if (s[i] === '|') {
                i++;
                list.push({ id: genTokenId(), type: 'pipe' });
            } else {
                let atomStr = '';
                while (i < len && !/\s/.test(s[i]) && s[i] !== '[' && s[i] !== ']' && s[i] !== '<' && s[i] !== '>' && s[i] !== '|') {
                    atomStr += s[i];
                    i++;
                }
                if (atomStr) {
                    list.push(parseAtomicToken(atomStr));
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
            } else if (s[i] === '/' && /\d/.test(s[i + 1])) {
                i++;
                let num = '';
                while (i < len && /\d/.test(s[i])) { num += s[i]; i++; }
                node.slowdown = parseInt(num, 10);
            } else if (s[i] === '?' && /[\d.]/.test(s[i + 1])) {
                i++;
                let p = '';
                while (i < len && /[\d.]/.test(s[i])) { p += s[i]; i++; }
                node.prob = parseFloat(p);
            } else if (s[i] === '?') {
                i++;
                node.prob = 0.5;
            } else {
                break;
            }
        }
    }

    function parseAtomicToken(raw) {
        let base = raw;
        let repeat, subdiv, slowdown, prob;

        const probMatch = base.match(/\?([0-9.]+)?$/);
        if (probMatch) {
            prob = probMatch[1] !== undefined ? parseFloat(probMatch[1]) : 0.5;
            base = base.slice(0, probMatch.index);
        }

        const repMatch = base.match(/!(\d+)$/);
        if (repMatch) {
            repeat = parseInt(repMatch[1], 10);
            base = base.slice(0, repMatch.index);
        }

        const slowMatch = base.match(/\/(\d+)$/);
        if (slowMatch) {
            slowdown = parseInt(slowMatch[1], 10);
            base = base.slice(0, slowMatch.index);
        }

        const multMatch = base.match(/\*(\d+)$/);
        if (multMatch) {
            subdiv = parseInt(multMatch[1], 10);
            base = base.slice(0, multMatch.index);
        }

        const isRest = base === '~' || base === '-' || base === '_' || !base;
        return {
            id: genTokenId(),
            type: isRest ? 'rest' : 'note',
            val: isRest ? '~' : base.toLowerCase(),
            repeat,
            subdiv,
            slowdown,
            prob
        };
    }

    return parseTokensList();
}

export function tokensToPattern(tokens) {
    if (!tokens || !tokens.length) return '~';

    function serializeNode(n) {
        let res = '';
        if (n.type === 'group') {
            const isAngle = n.groupType === 'angle';
            const isChoice = n.groupType === 'choice';
            const open = isAngle ? '<' : '[';
            const close = isAngle ? '>' : ']';
            const separator = isChoice ? ' | ' : ' ';
            const childStr = (n.children || []).map(serializeNode).join(separator);
            res = `${open}${childStr}${close}`;
        } else if (n.type === 'rest') {
            res = '~';
        } else {
            res = n.val || 'c2';
        }

        if (n.subdiv && n.subdiv > 1) res += `*${n.subdiv}`;
        if (n.slowdown && n.slowdown > 1) res += `/${n.slowdown}`;
        if (n.repeat && n.repeat > 1) res += `!${n.repeat}`;
        if (n.prob !== undefined && n.prob < 1.0) {
            res += n.prob === 0.5 ? '?' : `?${n.prob}`;
        }
        return res;
    }

    return tokens.map(serializeNode).join(' ');
}

export const MODIFIER_KEYS = ['subdiv', 'slowdown', 'repeat', 'prob'];

export function clearTokenModifiers(node) {
    let cleared = false;
    for (const k of MODIFIER_KEYS) {
        if (node[k] !== undefined) {
            delete node[k];
            cleared = true;
        }
    }
    return cleared;
}

export function getAdjacentGroup(tokens, selectedIds) {
    if (!selectedIds || selectedIds.size < 2) return null;
    let result = null;

    function searchList(list) {
        const indices = [];
        for (let i = 0; i < list.length; i++) {
            if (selectedIds.has(list[i].id)) indices.push(i);
        }
        if (indices.length === selectedIds.size) {
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
        for (const node of list) {
            if (node.children && searchList(node.children)) return true;
        }
        return false;
    }

    searchList(tokens);
    return result;
}

export function groupTokens(tokens, selectedIds, groupType) {
    const adj = getAdjacentGroup(tokens, selectedIds);
    if (!adj) return null;
    const { list, start, end } = adj;
    const newGroup = {
        id: genTokenId(),
        type: 'group',
        groupType,
        children: list.slice(start, end + 1)
    };
    list.splice(start, end - start + 1, newGroup);
    return newGroup;
}

export function moveTokenNode(tokens, sourceId, targetId, insertPos = 'after', isInsideGroup = false) {
    if (!sourceId || !targetId || sourceId === targetId) return tokens;

    let sourceNode = null;
    const nextTokens = walkTokens(tokens, n => {
        if (n.id === sourceId) { sourceNode = n; return null; }
        return n;
    });
    if (!sourceNode) return tokens;

    function insertNear(list) {
        for (let i = 0; i < list.length; i++) {
            if (list[i].id === targetId) {
                if (isInsideGroup && list[i].type === 'group') {
                    list[i].children = list[i].children || [];
                    insertPos === 'before' ? list[i].children.unshift(sourceNode) : list[i].children.push(sourceNode);
                } else {
                    const insertIndex = insertPos === 'before' ? i : i + 1;
                    list.splice(insertIndex, 0, sourceNode);
                }
                return true;
            }
            if (list[i].children && insertNear(list[i].children)) return true;
        }
        return false;
    }
    insertNear(nextTokens);
    return nextTokens;
}


