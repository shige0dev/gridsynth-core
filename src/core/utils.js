// src/core/utils.js

import { isSubModule, normalizeSubPort } from './sub-utils.js?v=459';

export const safeClone = (obj) =>
    typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));

export const generateModuleId = (type, existingModules) => {
    const sep = /\d$/.test(type) ? '_' : '';
    let num = 1;
    while (existingModules[`${type}${sep}${num}`]) num++;
    return `${type}${sep}${num}`;
};

export const parseConn = (c) => {
    if (!c) return null;
    if (typeof c === 'object') {
        if (c.from && c.to) {
            const fM = typeof c.from === 'object' ? c.from.moduleId : c.from.split(':')[0];
            const fP = typeof c.from === 'object' ? c.from.port : c.from.split(':')[1];
            const tM = typeof c.to === 'object' ? c.to.moduleId : c.to.split(':')[0];
            const tP = typeof c.to === 'object' ? c.to.port : c.to.split(':')[1];
            if (fM && fP && tM && tP) {
                return {
                    from: { moduleId: String(fM).trim(), port: String(fP).trim() },
                    to: { moduleId: String(tM).trim(), port: String(tP).trim() }
                };
            }
        }
        return null;
    }
    if (typeof c === 'string' && c.includes('>')) {
        const [f, t] = c.split('>');
        const [fM, fP] = f.split(':'), [tM, tP] = t.split(':');
        if (fM && fP && tM && tP) {
            return {
                from: { moduleId: fM.trim(), port: fP.trim() },
                to: { moduleId: tM.trim(), port: tP.trim() }
            };
        }
    }
    return null;
};

export const PORT_ALIASES = {
    // SPK
    'wave_inL': 'wave_in_l',
    'wave_inR': 'wave_in_r',

    // MATH
    'a': 'cv_in_a',
    'in_a': 'cv_in_a',
    'b': 'cv_in_b',
    'in_b': 'cv_in_b',

    // CLK / GATE
    'clk_in': 'gate_in',
    'power_in': 'run_in',
    'power': 'run_in',

    // IO / SCOPE
    'cv_in': 'wave_in',
    'in1': 'wave_in',
    'wave_in1': 'wave_in',
    'in2': 'wave_in2',
    'trig': 'trig_in',

    // FOLD / EFFECTS / AR
    'fold_cv': 'gain_cv',
    'sig_in': 'cv_in',
    'a_cv': 'attack_in',
    'attack_cv': 'attack_in',
    'r_cv': 'release_in',
    'release_cv': 'release_in'
};

export const getPortAliases = (port) => {
    if (!port || typeof port !== 'string') return [];
    const p = port.trim();
    const set = new Set([p]);

    if (PORT_ALIASES[p]) {
        set.add(PORT_ALIASES[p]);
    }
    for (const [alias, canonical] of Object.entries(PORT_ALIASES)) {
        if (canonical === p) {
            set.add(alias);
        }
        if (canonical.toLowerCase() === p.toLowerCase()) {
            set.add(canonical);
            set.add(alias);
        }
    }
    return Array.from(set);
};

export const isPortMatching = (p1, p2) => {
    if (!p1 || !p2) return false;
    if (p1 === p2) return true;
    if (p1.toLowerCase() === p2.toLowerCase()) return true;
    const a1 = getPortAliases(p1);
    if (a1.includes(p2)) return true;
    const a1Lower = a1.map(x => x.toLowerCase());
    return a1Lower.includes(p2.toLowerCase());
};

export const isSameConn = (a, b) => {
    if (!a || !b) return false;
    const aFromM = a.from?.moduleId, bFromM = b.from?.moduleId;
    const aToM = a.to?.moduleId, bToM = b.to?.moduleId;
    if (aFromM !== bFromM || aToM !== bToM) return false;

    const aFromP = a.from?.port, bFromP = b.from?.port;
    const fromMatch = aFromP === bFromP || isPortMatching(aFromP, bFromP) || (isSubModule(aFromM) && normalizeSubPort(aFromP, aFromM) === normalizeSubPort(bFromP, bFromM));
    if (!fromMatch) return false;

    const aToP = a.to?.port, bToP = b.to?.port;
    const toMatch = aToP === bToP || isPortMatching(aToP, bToP) || (isSubModule(aToM) && normalizeSubPort(aToP, aToM) === normalizeSubPort(bToP, bToM));
    return toMatch;
};

export const HIGHLIGHT_CLASSES = {
    move: 'drop-highlight-valid',
    copy: 'drop-highlight-copy-valid',
    invalid: 'drop-highlight-invalid'
};

// Re-export subpatch utilities & signal definitions for seamless backward compatibility
export * from './sub-utils.js?v=459';
export * from './signals.js?v=459';
