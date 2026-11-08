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

        this.heldCv = 1.0;
        this.heldGate = 0.0;
        this.sliceIdx = null;
        this.targetSemi = -1;
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
            } else if (d.type === 'NOTE' || d.type === 'NOTE_ON' || d.type === 'NOTE_OFF') {
                const isDown = d.isDown ?? (d.type !== 'NOTE_OFF');
                const midi = d.midi ?? 48;
                const rawSemi = ((midi % 12) + 12) % 12;
                const snappedSemi = this.snapSemi(rawSemi);
                const oct = Math.floor(midi / 12) - 1;
                const cv = (oct - 1) + (snappedSemi / 12.0);

                this.manualCv = cv;
                this.manualGate = isDown ? 1.0 : 0.0;
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
        const sliceIdx = Math.min(N - 1, Math.max(0, Math.floor(frac * N)));
        const targetSemi = notes[sliceIdx];
        const outCv = oct + (targetSemi / 12.0);

        // 表示用スライス判定:
        // 表示域内 [-2/12, 14/12) であればオクターブ外でもCV感知でハイライト
        // 表示範囲外は null (ハイライト非表示)
        let displaySlice = null;
        if (inCv >= -2.0 / 12.0 && inCv < 14.0 / 12.0) {
            displaySlice = Math.floor(inCv * N);
        }

        return {
            cv: outCv,
            sliceIdx: displaySlice,
            targetSemi
        };
    }

    process(ins, outs) {
        const cvIn = ins[0]?.[0];
        const cvOut = outs[0]?.[0];
        const gateOut = outs[1]?.[0];

        if (!cvOut) return true;
        const len = cvOut.length;
        const useExternal = this.isPatched && cvIn && !this.isManualActive;

        for (let i = 0; i < len; i++) {
            if (useExternal) {
                const q = this.quantize(cvIn[i]);
                this.heldCv = q.cv;
                this.sliceIdx = q.sliceIdx;
                this.targetSemi = q.targetSemi;
            } else {
                this.heldCv = this.manualCv;
                this.sliceIdx = null;
                this.targetSemi = -1;
            }
            this.heldGate = this.manualGate;

            cvOut[i] = this.heldCv;
            if (gateOut) gateOut[i] = this.heldGate;
            this.sampleCount++;
        }

        if (this.sampleCount >= 1470) {
            this.sampleCount = 0;
            this.port.postMessage({
                type: 'STATE',
                sliceIdx: this.sliceIdx,
                targetSemi: this.targetSemi,
                cv: this.heldCv,
                isPatched: this.isPatched
            });
        }

        return true;
    }
}

registerProcessor('scale-processor', ScaleProcessor);
