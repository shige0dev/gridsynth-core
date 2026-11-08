// src/dsp/processors/chord.js

export class ChordProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.rootCv = 2.0; // default C3 ((48-24)/12)
        this.chordIdx = 0; // min
        this.hasRoot = false;

        // 16 chord definitions (0..15)
        this.chordSemis = [
            [0, 3, 7, 12],  // 0: min
            [0, 4, 7, 12],  // 1: maj
            [0, 5, 7, 12],  // 2: sus4
            [0, 2, 7, 12],  // 3: sus2
            [0, 3, 7, 10],  // 4: m7
            [0, 4, 7, 10],  // 5: 7th
            [0, 4, 7, 11],  // 6: Maj7
            [0, 3, 6, 10],  // 7: m7b5
            [0, 7, 12, 19], // 8: 5th
            [0, 7, 12, 15], // 9: open_min
            [0, 7, 12, 16], // 10: open_maj
            [0, 4, 7, 14],  // 11: add9
            [0, 3, 10, 14], // 12: m9
            [0, 4, 10, 14], // 13: 9th
            [0, 3, 6, 9],   // 14: dim7
            [0, 4, 8, 12]   // 15: aug
        ];
        this.currentOffsets = this.chordSemis[0];

        this.port.onmessage = (e) => {
            if (e.data.type === 'SET_PARAMS') {
                if (e.data.rootCv !== undefined) this.rootCv = e.data.rootCv;
                if (e.data.chordIdx !== undefined) {
                    this.chordIdx = Math.max(0, Math.min(15, e.data.chordIdx));
                    this.currentOffsets = this.chordSemis[this.chordIdx] || this.chordSemis[0];
                }
                if (Array.isArray(e.data.offsets) && e.data.offsets.length === 4) {
                    this.currentOffsets = e.data.offsets;
                }
                if (e.data.hasRoot !== undefined) this.hasRoot = !!e.data.hasRoot;
            }
        };
    }

    process(ins, outs) {
        const inRoot = ins[0]?.[0];
        const o1 = outs[0]?.[0];
        const o2 = outs[1]?.[0];
        const o3 = outs[2]?.[0];
        const o4 = outs[3]?.[0];

        if (!o1 && !o2 && !o3 && !o4) return true;

        const len = (o1 || o2 || o3 || o4).length;
        const hasRoot = this.hasRoot && inRoot;
        const offsets = this.currentOffsets;

        const off1 = offsets[0] / 12.0;
        const off2 = offsets[1] / 12.0;
        const off3 = offsets[2] / 12.0;
        const off4 = offsets[3] / 12.0;

        if (hasRoot) {
            for (let i = 0; i < len; i++) {
                const root = inRoot[i];
                if (o1) o1[i] = root + off1;
                if (o2) o2[i] = root + off2;
                if (o3) o3[i] = root + off3;
                if (o4) o4[i] = root + off4;
            }
        } else {
            const root = this.rootCv;
            const v1 = root + off1;
            const v2 = root + off2;
            const v3 = root + off3;
            const v4 = root + off4;
            if (o1) o1.fill(v1);
            if (o2) o2.fill(v2);
            if (o3) o3.fill(v3);
            if (o4) o4.fill(v4);
        }

        return true;
    }
}

registerProcessor('chord-processor', ChordProcessor);

