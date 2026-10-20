// Transfer function dictionary for wavefolding and non-linear waveshaping
export const SHAPER_FUNCTIONS = {
    // Standard iterative wavefold (Buchla / Serge West Coast style)
    fold: (v) => {
        for (let it = 0; it < 6; it++) {
            if (v > 1.0) v = 2.0 - v;
            else if (v < -1.0) v = -2.0 - v;
            else break;
        }
        return v;
    },
    // Trigonometric sine wavefold (smooth harmonic-rich folding)
    sine: (v) => Math.sin(v * Math.PI * 0.5),
    // Soft saturation / overdrive (tanh transfer)
    tanh: (v) => Math.tanh(v),
    // Full-wave rectification (octave-up fold)
    rectify: (v) => Math.abs(v) * 2.0 - 1.0
};

export class FoldProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'gain', defaultValue: 1.5, minValue: 0.0, maxValue: 10.0 },
            { name: 'mix', defaultValue: 1.0, minValue: 0.0, maxValue: 1.0 }
        ];
    }

    constructor() {
        super();
        this.shapeMode = 'fold';
        this.port.onmessage = (e) => {
            if (e.data?.type === 'SET_SHAPE' && SHAPER_FUNCTIONS[e.data.mode]) {
                this.shapeMode = e.data.mode;
            }
        };
    }

    process(ins, outs, params) {
        const inp = ins[0]?.[0];
        const out = outs[0]?.[0];
        if (!out) return true;

        if (!inp) {
            out.fill(0);
            return true;
        }

        const mix = params.mix[0] !== undefined ? params.mix[0] : 1.0;
        const isGainArray = params.gain.length > 1;
        const singleGain = params.gain[0] || 0;
        const shaper = SHAPER_FUNCTIONS[this.shapeMode] || SHAPER_FUNCTIONS.fold;

        for (let i = 0; i < out.length; i++) {
            const inVal = inp[i];
            const gainVal = Math.max(0, isGainArray ? params.gain[i] : singleGain);
            const u = inVal * gainVal;
            const folded = shaper(u);
            const res = (1.0 - mix) * inVal + mix * folded;
            out[i] = Math.max(-1.0, Math.min(1.0, res * 0.95));
        }
        return true;
    }
}

registerProcessor('fold-processor', FoldProcessor);