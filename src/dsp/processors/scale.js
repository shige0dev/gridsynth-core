export class ScaleProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.root = 0; // 0: C, 1: C#, ..., 11: B
        this.mask = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]; // default: CHROMATIC
        this.isPatched = false;

        this.manualCv = 1.0; // default C2 (cv=1.0)
        this.manualGate = 0.0;
        this.isManualActive = false;

        this.heldCv = 1.0;
        this.heldGate = 0.0;

        this.port.onmessage = (e) => {
            const d = e.data;
            if (!d) return;
            if (d.type === 'SET_CONFIG') {
                if (d.root !== undefined) this.root = Math.max(0, Math.min(11, Math.round(d.root)));
                if (d.rootMidi !== undefined) this.root = Math.max(0, Math.min(11, Math.round(d.rootMidi)));
                if (Array.isArray(d.mask) && d.mask.length === 12) {
                    this.mask = d.mask;
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
        const totalSemi = Math.round(inCv * 12);
        const oct = Math.floor(totalSemi / 12);
        const absSemi = ((totalSemi % 12) + 12) % 12;
        const snapped = this.snapSemi(absSemi);
        return oct + (snapped / 12.0);
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
                this.heldCv = this.quantize(cvIn[i]);
            } else {
                this.heldCv = this.manualCv;
            }
            // GATE は手動タッチ時のみ 1.0、未タッチ時は確実に 0.0
            this.heldGate = this.manualGate;

            cvOut[i] = this.heldCv;
            if (gateOut) gateOut[i] = this.heldGate;
        }

        return true;
    }
}

registerProcessor('scale-processor', ScaleProcessor);
