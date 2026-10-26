// src/core/signals.js

export const SIGNAL_TYPES = {
    CLOCK: {
        id: 'clock',
        label: 'CLOCK',
        stroke: '#f43f5e',       // rose-500
        brightStroke: '#fecdd3', // rose-200
        tailwind: 'bg-rose-500'
    },
    GATE_SEQ: {
        id: 'gate_seq',
        label: 'GATE/STEP',
        stroke: '#f43f5e',       // rose-500 (MARKOV / SEQ8 / SEQ16 gate)
        brightStroke: '#fecdd3',
        tailwind: 'bg-rose-500'
    },
    TRIGGER: {
        id: 'trigger',
        label: 'TRIGGER',
        stroke: '#94a3b8',       // slate-400 (TRANS / TRIGGER)
        brightStroke: '#cbd5e1', // slate-300
        tailwind: 'bg-slate-400'
    },
    GATE: {
        id: 'gate',
        label: 'GATE',
        stroke: '#f59e0b',       // amber-500
        brightStroke: '#fde68a',
        tailwind: 'bg-orange-500'
    },
    CV: {
        id: 'cv',
        label: 'CV',
        stroke: '#eab308',       // yellow-500
        brightStroke: '#fef08a', // yellow-200
        tailwind: 'bg-yellow-400'
    },
    AUDIO: {
        id: 'audio',
        label: 'AUDIO',
        stroke: '#38bdf8',       // sky-400
        brightStroke: '#bae6fd', // sky-200
        tailwind: 'bg-blue-500'
    },
    LINK: {
        id: 'link',
        label: 'LINK',
        stroke: '#94a3b8',       // slate-400
        brightStroke: '#f1f5f9', // slate-100
        tailwind: 'bg-slate-300'
    },
    DEFAULT: {
        id: 'default',
        label: 'SIGNAL',
        stroke: '#38bdf8',
        brightStroke: '#bae6fd',
        tailwind: 'bg-slate-500'
    }
};

export const getPortSignalType = (portName = '', modId = '') => {
    const p = String(portName).toLowerCase();
    const m = String(modId).toUpperCase();

    if (p.includes('link')) {
        return SIGNAL_TYPES.LINK;
    }
    if (m.startsWith('GATE4')) {
        if (p.includes('in')) return SIGNAL_TYPES.GATE_SEQ;
        if (p.startsWith('gate_out')) return SIGNAL_TYPES.TRIGGER;
    }
    if (m.startsWith('ARP')) {
        if (p.includes('clk')) return SIGNAL_TYPES.CLOCK;
        if (p.includes('gate')) return SIGNAL_TYPES.GATE;
        if (p === 'out' || p.includes('cv') || p.startsWith('in_')) return SIGNAL_TYPES.CV;
    }

    if (p.includes('power')) {
        return SIGNAL_TYPES.GATE;
    }

    if (m.startsWith('CLK') || p.includes('clk')) {
        return SIGNAL_TYPES.CLOCK;
    }
    if ((p.includes('gate_in') && (m.startsWith('SEQ8') || m.startsWith('SEQ16') || m.startsWith('GATE4'))) || ((p.includes('gate') || p === 'trig_out') && m.startsWith('MARKOV'))) {
        return SIGNAL_TYPES.GATE_SEQ;
    }
    if (p.includes('trig') || p.includes('transition') || p.includes('trans') || p === 'reset') {
        return SIGNAL_TYPES.TRIGGER;
    }
    if (p.includes('gate')) {
        return SIGNAL_TYPES.GATE;
    }
    if (p.includes('cv') || p.includes('pitch') || p === 'a' || p === 'b' || p.startsWith('time') || p.startsWith('fold') || p.includes('attack') || p.includes('release') || p.includes('peak') || (p.startsWith('in') && !p.startsWith('wave'))) {
        return SIGNAL_TYPES.CV;
    }
    if (p.includes('wave') || p.startsWith('out') || p.startsWith('audio')) {
        return SIGNAL_TYPES.AUDIO;
    }
    return SIGNAL_TYPES.DEFAULT;
};

export const resolveConnectionSignalType = (conn) => {
    if (!conn) return SIGNAL_TYPES.DEFAULT;
    const fM = conn.from?.moduleId || '';
    const fP = conn.from?.port || '';
    const tM = conn.to?.moduleId || '';
    const tP = conn.to?.port || '';

    const fType = getPortSignalType(fP, fM);
    const tType = getPortSignalType(tP, tM);

    if (fType.id === 'link' || tType.id === 'link') return SIGNAL_TYPES.LINK;
    if (fType.id === 'clock' || tType.id === 'clock') return SIGNAL_TYPES.CLOCK;
    if (fType.id === 'gate_seq' || tType.id === 'gate_seq') return SIGNAL_TYPES.GATE_SEQ;
    if (fType.id === 'trigger' || tType.id === 'trigger') return SIGNAL_TYPES.TRIGGER;
    if (fType.id === 'gate' || tType.id === 'gate') return SIGNAL_TYPES.GATE;
    if (fType.id === 'cv' || tType.id === 'cv') return SIGNAL_TYPES.CV;
    if (fType.id === 'audio' || tType.id === 'audio') return SIGNAL_TYPES.AUDIO;

    return fType.id !== 'default' ? fType : tType;
};

export const parseClockRate = (val) => {
    if (typeof val === 'number') return val > 0 ? val : 1.0;
    if (!val || typeof val !== 'string') return 1.0;
    const s = val.trim();
    if (s.startsWith('/')) {
        const d = parseFloat(s.slice(1));
        return (d && d > 0) ? 1.0 / d : 1.0;
    }
    if (s.includes('/')) {
        const parts = s.split('/');
        const num = parseFloat(parts[0]), den = parseFloat(parts[1]);
        if (num && den) return num / den;
    }
    if (s.toLowerCase().startsWith('x')) {
        const m = parseFloat(s.slice(1));
        return (m && m > 0) ? m : 1.0;
    }
    const n = parseFloat(s);
    return (n && n > 0) ? n : 1.0;
};

