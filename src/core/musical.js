// src/core/musical.js

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const CHORD_TYPES = {
    'min':  { label: 'MIN',  semis: [0, 3, 7, 12], binary: '000', index: 0 },
    'maj':  { label: 'MAJ',  semis: [0, 4, 7, 12], binary: '001', index: 1 },
    'm7':   { label: 'm7',   semis: [0, 3, 7, 10], binary: '010', index: 2 },
    '7th':  { label: '7TH',  semis: [0, 4, 7, 10], binary: '011', index: 3 },
    'dim7': { label: 'DIM7', semis: [0, 3, 6, 9],  binary: '100', index: 4 },
    '5th':  { label: '5TH',  semis: [0, 7, 12, 19], binary: '101', index: 5 },
    'sus4': { label: 'SUS4', semis: [0, 5, 7, 12], binary: '110', index: 6 },
    'Maj7': { label: 'MAJ7', semis: [0, 4, 7, 11], binary: '111', index: 7 }
};

export const CHORD_ORDER = ['min', 'maj', 'm7', '7th', 'dim7', '5th', 'sus4', 'Maj7'];

export const CHORD_VOICINGS = {
    'close': [0, 0, 0, 0],
    'drop2': [0, -12, 0, 0],
    'drop3': [0, 0, -12, 0],
    'open':  [0, 0, 12, 12]
};

export const VOICING_LABELS = {
    'close': { label: 'CLOSE',  binary: '00', index: 0 },
    'drop2': { label: 'DROP 2', binary: '01', index: 1 },
    'drop3': { label: 'DROP 3', binary: '10', index: 2 },
    'open':  { label: 'OPEN',   binary: '11', index: 3 }
};

export const VOICING_ORDER = ['close', 'drop2', 'drop3', 'open'];

export const midiToNoteName = (midi) => {
    const m = Math.round(midi);
    const n = NOTES[((m % 12) + 12) % 12];
    const oct = Math.floor(m / 12) - 1;
    return `${n}${oct}`;
};

export const cvToNoteName = (cv) => midiToNoteName(Math.round(cv * 12) + 24);

export const midiToFreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

export const freqToMidi = (freq) => Math.round(69 + 12 * Math.log2(Math.max(10, freq) / 440));

export const NOTE_SEMITONES = {
    'c': 0, 'c#': 1, 'db': 1,
    'd': 2, 'd#': 3, 'eb': 3,
    'e': 4,
    'f': 5, 'f#': 6, 'gb': 6,
    'g': 7, 'g#': 8, 'ab': 8,
    'a': 9, 'a#': 10, 'bb': 10,
    'b': 11
};

/**
 * Robustly parses note string (e.g. "C2", "eb3", "F#4", "c2^1", "0.5") or numeric CV to 1V/Oct CV voltage.
 * Calibration: 0V = C1 (32.7Hz), 1V = C2 (65.4Hz), 2V = C3 (130.8Hz), etc.
 */
export function parseNoteToCv(val, defaultOctave = 2, minVal = null, maxVal = null) {
    if (typeof val === 'number') {
        let v = val;
        if (minVal !== null) v = Math.max(minVal, v);
        if (maxVal !== null) v = Math.min(maxVal, v);
        return v;
    }
    if (typeof val !== 'string') return 0.0;
    let s = val.trim();
    if (!s) return 0.0;

    const num = Number(s);
    if (!isNaN(num) && !/[a-g]/i.test(s)) {
        let v = num;
        if (minVal !== null) v = Math.max(minVal, v);
        if (maxVal !== null) v = Math.min(maxVal, v);
        return v;
    }

    let octShift = 0;
    const shiftMatch = s.match(/^(.*?)\^([+-]?\d+)$/);
    if (shiftMatch) {
        s = shiftMatch[1];
        octShift = parseInt(shiftMatch[2], 10) || 0;
    }

    const match = s.match(/^([a-gA-G])([#bB]?)(-?\d+)?$/);
    if (!match) return 0.0;

    const letter = match[1].toLowerCase();
    const accidental = (match[2] || '').toLowerCase();
    const key = letter + accidental;
    const semi = NOTE_SEMITONES[key] ?? 0;
    const oct = (match[3] !== undefined ? parseInt(match[3], 10) : defaultOctave) + octShift;

    let cv = (oct - 1) + semi / 12.0;
    if (minVal !== null) cv = Math.max(minVal, cv);
    if (maxVal !== null) cv = Math.min(maxVal, cv);
    return cv;
}

export const noteToCv = parseNoteToCv;
export const parseKeyNoteToCv = (val) => parseNoteToCv(val, 2);


