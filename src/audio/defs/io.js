import { AudioHelpers } from '../helpers.js';

export const SPK = {
    create: (ctx, d) => {
        const inL = ctx.createGain(), inR = ctx.createGain();
        const outL = ctx.createGain(), outR = ctx.createGain();
        const anL = ctx.createAnalyser(), anR = ctx.createAnalyser();
        anL.fftSize = 64;
        anR.fftSize = 64;
        const bufL = new Float32Array(anL.frequencyBinCount);
        const bufR = new Float32Array(anR.frequencyBinCount);

        const merger = ctx.createChannelMerger(2);
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -1.5;
        limiter.knee.value = 3.0;
        limiter.ratio.value = 20.0;
        limiter.attack.value = 0.002;
        limiter.release.value = 0.08;

        const vol = d.masterVol ?? 0.12;
        outL.gain.value = vol;
        outR.gain.value = vol;

        inL.connect(outL);
        inR.connect(outR);

        outL.connect(anL);
        outR.connect(anR);

        outL.connect(merger, 0, 0);
        outR.connect(merger, 0, 1);
        merger.connect(limiter);
        limiter.connect(ctx.destination);

        return {
            nodes: { inL, inR, outL, outR, anL, anR, merger, limiter },
            inputs: {
                wave_inL: inL,
                wave_inR: inR,
                wave_in_l: inL,
                wave_in_r: inR,
                wave_in: inL
            },
            outputs: {},
            read: () => {
                anL.getFloatTimeDomainData(bufL);
                anR.getFloatTimeDomainData(bufR);
                let peakL = 0, peakR = 0;
                for (let i = 0; i < bufL.length; i++) {
                    const aL = Math.abs(bufL[i]);
                    if (aL > peakL) peakL = aL;
                    const aR = Math.abs(bufR[i]);
                    if (aR > peakR) peakR = aR;
                }
                return { peakL, peakR };
            }
        };
    },
    update: (ctx, inst, d) => {
        const vol = d.masterVol ?? 0.12;
        if (inst.nodes.outL) AudioHelpers.set(inst.nodes.outL.gain, vol, ctx);
        if (inst.nodes.outR) AudioHelpers.set(inst.nodes.outR.gain, vol, ctx);
    }
};

export const ioAudioDefs = {
    SPK
};
