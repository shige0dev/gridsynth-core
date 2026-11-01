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

                const groupNode = {
                    id: genTokenId(),
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
            id: genTokenId(),
            type: isRest ? 'rest' : 'note',
            val: isRest ? '~' : base.toLowerCase(),
            repeat,
            subdiv,
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
        if (n.prob !== undefined && n.prob < 1.0) res += `?${n.prob}`;
        return res;
    }

    return tokens.map(serializeNode).join(' ');
}

