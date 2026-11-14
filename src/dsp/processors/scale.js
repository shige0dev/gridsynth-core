import { getSR } from './common.js';

export class ScaleProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.root = 0; // 0: C, 1: C#, ..., 11: B
        this.mask = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]; // default: CHROMATIC
        this.scaleNotes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        this.isPatched = false;

        this.manualCv = 1.0; // default C2 (cv=1.0)
        this.manualGate = 0.0;
        this.isManualActive = false;
        this.legato = false;
        this.retrigGap = 0;
        this.lastMidi = null;
        this.sawNoteOffInBlock = false;

        this.heldCv = 1.0;
        this.heldGate = 0.0;
        this.rawInCv = null;
        this.sampleCount = 0;

        this.updateScaleNotes();

        this.port.onmessage = (e) => {
            const d = e.data;
            if (!d) return;
            if (d.type === 'SET_CONFIG') {
                let changed = false;
                if (d.root !== undefined) {
                    this.root = Math.max(0, Math.min(11, Math.round(d.root)));
                    changed = true;
                }
                if (d.rootMidi !== undefined) {
                    this.root = Math.max(0, Math.min(11, Math.round(d.rootMidi)));
                    changed = true;
                }
                if (Array.isArray(d.mask) && d.mask.length === 12) {
                    this.mask = d.mask;
                    changed = true;
                }
                if (changed) {
                    this.updateScaleNotes();
                }
                if (d.isPatched !== undefined) {
                    this.isPatched = Boolean(d.isPatched);
                }
                if (d.legato !== undefined) {
                    this.legato = Boolean(d.legato);
                }
            } else if (d.type === 'NOTE' || d.type === 'NOTE_ON' || d.type === 'NOTE_OFF') {
                const isDown = d.isDown ?? (d.type !== 'NOTE_OFF');
                const isLegato = d.legato !== undefined ? Boolean(d.legato) : this.legato;
                const midi = d.midi ?? 48;
                const rawSemi = ((midi % 12) + 12) % 12;
                const snappedSemi = this.snapSemi(rawSemi);
                const oct = Math.floor(midi / 12) - 1;
                const cv = (oct - 1) + (snappedSemi / 12.0);

                const wasActive = this.manualGate > 0.5 || this.sawNoteOffInBlock;
                this.manualCv = cv;
                if (isDown) {
                    if (wasActive && !isLegato && (midi !== this.lastMidi || this.sawNoteOffInBlock)) {
                        this.retrigGap = Math.max(1, Math.round(0.005 * getSR()));
                    }
                    this.manualGate = 1.0;
                    this.lastMidi = midi;
                    this.sawNoteOffInBlock = false;
                } else {
                    if (this.manualGate > 0.5) {
                        this.sawNoteOffInBlock = true;
                    }
                    this.manualGate = 0.0;
                    this.retrigGap = 0;
                    this.lastMidi = null;
                }
                this.isManualActive = isDown;
            }
        };
    }

    updateScaleNotes() {
        const notes = [];
        for (let s = 0; s < 12; s++) {
            const rel = ((s - this.root) % 12 + 12) % 12;
            if ((this.mask[rel] ?? 1) === 1) notes.push(s);
        }
        this.scaleNotes = notes.length > 0 ? notes : [((this.root % 12) + 12) % 12];
    }

    snapSemi(absSemi) {
        const rel = ((absSemi - this.root) % 12 + 12) % 12;
        if ((this.mask[rel] ?? 1) === 1) return absSemi;
        for (let dist = 1; dist <= 6; dist++) {
            const downRel = (rel - dist + 12) % 12;
            if (this.mask[downRel] === 1) return (this.root + downRel) % 12;
            const upRel = (rel + dist) % 12;
            if (this.mask[upRel] === 1) return (this.root + upRel) % 12;
        }
        return absSemi;
    }

    quantize(inCv) {
        const notes = this.scaleNotes || [0];
        const N = notes.length;
        const oct = Math.floor(inCv);
        let frac = inCv - oct;
        if (frac < 0) frac = 0;
        if (frac >= 1) frac = 0.999999;
        const normIdx = Math.min(N - 1, Math.max(0, Math.floor(frac * N)));
        return oct + (notes[normIdx] / 12.0);
    }

    process(ins, outs) {
        const cvIn = ins[0]?.[0];
        const cvOut = outs[0]?.[0];
        const gateOut = outs[1]?.[0];

        if (!cvOut) return true;
        this.sawNoteOffInBlock = false;
        const len = cvOut.length;
        const useExternal = this.isPatched && cvIn && !this.isManualActive;

        for (let i = 0; i < len; i++) {
            if (useExternal) {
                this.heldCv = this.quantize(cvIn[i]);
                this.rawInCv = cvIn[i];
            } else {
                this.heldCv = this.manualCv;
                this.rawInCv = null;
            }
            if (this.retrigGap > 0) {
                this.retrigGap--;
                this.heldGate = 0.0;
            } else {
                this.heldGate = this.manualGate;
            }

            cvOut[i] = this.heldCv;
            if (gateOut) gateOut[i] = this.heldGate;
            this.sampleCount++;
        }

        if (this.sampleCount >= 256) {
            this.sampleCount = 0;
            this.port.postMessage({
                type: 'STATE',
                cv: this.heldCv,
                inCv: this.rawInCv,
                isPatched: this.isPatched
            });
        }

        return true;
    }
}

registerProcessor('scale-processor', ScaleProcessor);
