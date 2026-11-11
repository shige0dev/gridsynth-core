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
        stroke: '#f97316',       // orange-500
        brightStroke: '#fdba74', // orange-300
        tailwind: 'bg-orange-500'
    },
    TRANS: {
        id: 'trans',
        label: 'TRANS',
        stroke: '#94a3b8',       // slate-400 (MARKOV transition)
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
    GEOMETRY: {
        id: 'geometry',
        label: 'OBJ',
        stroke: '#a855f7',       // purple-500
        brightStroke: '#f3e8ff', // purple-100
        tailwind: 'bg-purple-500'
    },
    VIDEO: {
        id: 'video',
        label: 'VIDEO',
        stroke: '#10b981',       // emerald-500 (Green)
        brightStroke: '#a7f3d0', // emerald-200
        tailwind: 'bg-emerald-500'
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

    if (p.includes('geo') || p.includes('obj') || m.startsWith('OBJECT') || m.startsWith('ROTATE')) {
        if (!p.includes('cv') && !p.includes('rot') && !p.includes('scale') && !p.includes('fov')) {
            return SIGNAL_TYPES.GEOMETRY;
        }
    }
    if (p.includes('video') || m.startsWith('RENDER') || m.startsWith('DISPLAY')) {
        if (!p.includes('cv') && !p.includes('rot') && !p.includes('scale') && !p.includes('fov') && !p.includes('div') && !p.includes('obj')) {
            return SIGNAL_TYPES.VIDEO;
        }
    }
    if (p.includes('link')) {
        return SIGNAL_TYPES.LINK;
    }
    if (p.includes('trans')) {
        return SIGNAL_TYPES.TRANS;
    }
    if (m.startsWith('SLCT4') || m.startsWith('DIST4') || m.startsWith('MATRIX')) {
        if (p.includes('gate') || p.includes('clk')) return SIGNAL_TYPES.GATE_SEQ;
        if (p.includes('cv') || p.startsWith('out') || p.startsWith('in_')) return SIGNAL_TYPES.CV;
    }

    if (p.includes('power') || p.includes('run')) {
        return SIGNAL_TYPES.GATE;
    }

    if (m.startsWith('CLK') || p.includes('clk')) {
        return SIGNAL_TYPES.CLOCK;
    }
    if (
        (p.includes('gate') && (m.startsWith('SEQ8') || m.startsWith('SEQ16') || m.startsWith('MARKOV') || m.startsWith('DIST4'))) ||
        (p === 'trig_out' && m.startsWith('MARKOV'))
    ) {
        return SIGNAL_TYPES.GATE_SEQ;
    }
    if (p.includes('trig') || p.includes('transition') || p.includes('reset')) {
        return SIGNAL_TYPES.TRIGGER;
    }
    if (p.includes('gate')) {
        return SIGNAL_TYPES.GATE;
    }
    if (m.startsWith('FMCORE') && (p === 'mod_in' || p === 'wave_in')) {
        return SIGNAL_TYPES.AUDIO;
    }
    if (p.includes('cv') || p.includes('pitch') || p === 'a' || p === 'b' || p.startsWith('time') || p.startsWith('fold') || p.includes('attack') || p.includes('release') || p.includes('peak') || p.includes('fov') || p.includes('div') || (p.startsWith('in') && !p.startsWith('wave') && !p.startsWith('video') && !p.startsWith('obj'))) {
        return SIGNAL_TYPES.CV;
    }
    if (p.includes('wave') || p.startsWith('out') || p.startsWith('audio') || p.includes('mod_in')) {
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

    if (fType.id === 'geometry' || tType.id === 'geometry') return SIGNAL_TYPES.GEOMETRY;
    if (fType.id === 'video' || tType.id === 'video') return SIGNAL_TYPES.VIDEO;
    if (fType.id === 'link' || tType.id === 'link') return SIGNAL_TYPES.LINK;
    if (fType.id === 'trans' || tType.id === 'trans') return SIGNAL_TYPES.TRANS;
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

