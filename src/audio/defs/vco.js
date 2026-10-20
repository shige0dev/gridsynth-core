import { AudioHelpers } from '../helpers.js';
import { MultiOscGroup } from '../multi-osc.js';

export const VCO = {
    create: (ctx, d, patch) => {
        const ch = Math.min(4, Math.max(1, d.channels || 1));
        const out = ctx.createGain();
        out.gain.value = 0.75 / Math.sqrt(ch);
        const { oscs, cvGains, inputs } = MultiOscGroup.create(ctx, d, patch, out);
        return {
            nodes: { oscs, cvGains, out },
            inputs,
            outputs: { wave_out: out }
        };
    },
    update: (ctx, inst, d, patch) => {
        const ch = Math.min(4, Math.max(1, d.channels || 1));
        AudioHelpers.set(inst.nodes.out.gain, 0.75 / Math.sqrt(ch), ctx);
        MultiOscGroup.update(ctx, inst.nodes.oscs, d, patch);
    }
};



export const NOISE = {
    create: (ctx, d) => {
        const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = d.tone ?? 8000;
        const out = ctx.createGain(); out.gain.value = d.level ?? 0.8; flt.connect(out);
        const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), data = b.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource(); src.buffer = b; src.loop = true; src.connect(flt); src.start();
        return { nodes: { flt, out, src, _b: b }, inputs: {}, outputs: { wave_out: out }, _type: 'white' };
    },
    update: (ctx, inst, d) => {
        AudioHelpers.set(inst.nodes.flt.frequency, d.tone ?? 8000, ctx); AudioHelpers.set(inst.nodes.out.gain, d.level ?? 0.8, ctx);
        if (d.noiseType && d.noiseType !== inst._type) {
            inst._type = d.noiseType; const data = inst.nodes._b.getChannelData(0), len = data.length;
            if (d.noiseType === 'white') { for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1; }
            else if (d.noiseType === 'pink') {
                let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
                for (let i = 0; i < len; i++) {
                    let w = Math.random() * 2 - 1;
                    b0 = 0.99886 * b0 + w * 0.0555; b1 = 0.99332 * b1 + w * 0.075; b2 = 0.969 * b2 + w * 0.153; b3 = 0.8665 * b3 + w * 0.31; b4 = 0.55 * b4 + w * 0.53; b5 = -0.7616 * b5 - w * 0.016;
                    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.536) * 0.11; b6 = w * 0.1159;
                }
            } else if (d.noiseType === 'brown') {
                let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; data[i] = last * 3.5; }
            }
        }
    }
};

export const vcoAudioDefs = {
    VCO,
    NOISE
};
