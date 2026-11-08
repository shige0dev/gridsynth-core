// src/core/musical.js

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const CHORD_SPECS = {
    'min':      { index: 0,  label: 'Minor',     intervals: [0, 3, 7, 12] },
    'maj':      { index: 1,  label: 'Major',     intervals: [0, 4, 7, 12] },
    'sus4':     { index: 2,  label: 'Sus 4',     intervals: [0, 5, 7, 12] },
    'sus2':     { index: 3,  label: 'Sus 2',     intervals: [0, 2, 7, 12] },
    'm7':       { index: 4,  label: 'Min 7th',   intervals: [0, 3, 7, 10] },
    '7th':      { index: 5,  label: 'Dom 7th',   intervals: [0, 4, 7, 10] },
    'Maj7':     { index: 6,  label: 'Maj 7th',   intervals: [0, 4, 7, 11] },
    'm7b5':     { index: 7,  label: 'Half Dim',  intervals: [0, 3, 6, 10] },
    '5th':      { index: 8,  label: 'Power 5th', intervals: [0, 7, 12, 19] },
    'open_min': { index: 9,  label: 'Open Min',  intervals: [0, 7, 12, 15] },
    'open_maj': { index: 10, label: 'Open Maj',  intervals: [0, 7, 12, 16] },
    'add9':     { index: 11, label: 'Add 9th',   intervals: [0, 4, 7, 14] },
    'm9':       { index: 12, label: 'Min 9th',   intervals: [0, 3, 10, 14] },
    '9th':      { index: 13, label: 'Dom 9th',   intervals: [0, 4, 10, 14] },
    'dim7':     { index: 14, label: 'Dim 7th',   intervals: [0, 3, 6, 9] },
    'aug':      { index: 15, label: 'Augment',   intervals: [0, 4, 8, 12] }
};

export const CHORD_KEYS = [
    'min', 'maj', 'sus4', 'sus2',
    'm7', '7th', 'Maj7', 'm7b5',
    '5th', 'open_min', 'open_maj', 'add9',
    'm9', '9th', 'dim7', 'aug'
];

export const CHORD_TYPES = CHORD_SPECS;
export const CHORD_ORDER = CHORD_KEYS;

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


