export class ScaleProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.rootMidi = 0; // 0: C, 1: C#, ..., 11: B
        this.mask = [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0]; // default: PENT.MIN
        this.validSemis = [0, 3, 5, 7, 10]; // relative semitones

        this.heldCv = 0.0;
        this.heldSemi = 0; // 0縲・1 (absolute semitone C縲廝)
        this.sampleCount = 0;

        this.port.onmessage = (e) => {
            if (e.data.type === 'SET_CONFIG') {
                if (e.data.rootMidi !== undefined) this.rootMidi = Math.max(0, Math.min(11, Math.round(e.data.rootMidi)));
                if (Array.isArray(e.data.mask) && e.data.mask.length === 12) {
                    this.mask = e.data.mask;
                    this.rebuildValidSemis();
                }
            }
        };
    }

    rebuildValidSemis() {
        const list = [];
        for (let i = 0; i < 12; i++) {
            if (this.mask[i] === 1) list.push(i);
        }
        this.validSemis = list;
    }

    quantizeEqual(inV) {
        const N = this.validSemis.length;
        if (N === 0) return { cv: inV, semi: 0 };

        // 0縲・V・医♀繧医・蜷・が繧ｯ繧ｿ繝ｼ繝厄ｼ峨・蜈･蜉帛､繧誰遲牙・縺励※繧ｹ繧ｱ繝ｼ繝ｫ髻ｳ縺ｸ蝮・ｭ峨ｈ繧雁・縺・
        const oct = Math.floor(inV);
        let frac = inV - oct;
        if (frac < 0) frac = 0;
        if (frac >= 0.999999) frac = 0.999999;

        // N遲牙・縺励※螳悟・蝮・ｭ臥｢ｺ邇・〒繧､繝ｳ繝・ャ繧ｯ繧ｹ豎ｺ螳・
        const idx = Math.min(N - 1, Math.max(0, Math.floor(frac * N)));
        const relSemi = this.validSemis[idx];

        // 繝ｫ繝ｼ繝磯浹繧ｪ繝輔そ繝・ヨ繧貞刈蜻ｳ・・1縲廚2: 0V縲・V・・
        const totalSemi = relSemi + this.rootMidi;
        const addOct = Math.floor(totalSemi / 12);
        const absSemi = ((totalSemi % 12) + 12) % 12;

        const outOct = oct + addOct;
        const outCv = outOct + (absSemi / 12.0);

        return { cv: outCv, semi: absSemi };
    }

    process(ins, outs) {
        const cvIn = ins[0]?.[0];
        const cvOut = outs[0]?.[0];
        if (!cvOut) return true;

        const len = cvOut.length;

        for (let i = 0; i < len; i++) {
            const rawV = cvIn ? cvIn[i] : 0.0;
            const q = this.quantizeEqual(rawV);
            this.heldCv = q.cv;
            this.heldSemi = q.semi;

            cvOut[i] = this.heldCv;
            this.sampleCount++;
        }

        // 螳壽悄逧・↓UI縺ｸ迥ｶ諷矩∽ｿ｡・育ｴ・30Hz: 44100 / 1470 竕・30fps・・
        if (this.sampleCount >= 1470) {
            this.sampleCount = 0;
            this.port.postMessage({
                type: 'STATE',
                activeSemi: this.heldSemi,
                cv: this.heldCv
            });
        }

        return true;
    }
}

registerProcessor('scale-processor', ScaleProcessor);
