export const ADSR = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'adsr-processor', { numberOfInputs: 1, numberOfOutputs: 1 });
        w.port.postMessage({
            type: 'SET_PARAMS',
            attack: d.attack ?? 0.02,
            attackCurve: d.attackCurve ?? 0.0,
            decay: d.decay ?? 0.2,
            decayCurve: d.decayCurve ?? 0.0,
            sustain: d.sustain ?? 0.6,
            release: d.release ?? 0.4,
            releaseCurve: d.releaseCurve ?? 0.0
        });
        const an = ctx.createAnalyser();
        an.fftSize = 256;
        w.connect(an);
        if (eng?.silentSink) w.connect(eng.silentSink);
        const buf = new Float32Array(an.frequencyBinCount);
        let curStage = -1;
        let attackTriggered = false;
        w.port.onmessage = e => {
            if (e.data.type === 'STAGE') {
                curStage = e.data.stage;
            }
            if (e.data.type === 'ATTACK') {
                attackTriggered = true;
            }
        };
        return {
            nodes: { w, an },
            inputs: { gate_in: w },
            outputs: { cv_out: w },
            resetStage: () => {
                curStage = -1;
                attackTriggered = false;
                w.port.postMessage({ type: 'RESET' });
            },
            clear: () => {
                curStage = -1;
                attackTriggered = false;
                w.port.postMessage({ type: 'RESET' });
            },
            read: () => {
                an.getFloatTimeDomainData(buf);
                const atk = attackTriggered;
                attackTriggered = false;
                return { stage: curStage, attackTriggered: atk, values: [buf[0] || 0] };
            }
        };
    },
    update: (ctx, inst, d) => inst.nodes.w.port.postMessage({
        type: 'SET_PARAMS',
        attack: d.attack ?? 0.02,
        attackCurve: d.attackCurve ?? 0.0,
        decay: d.decay ?? 0.2,
        decayCurve: d.decayCurve ?? 0.0,
        sustain: d.sustain ?? 0.6,
        release: d.release ?? 0.4,
        releaseCurve: d.releaseCurve ?? 0.0
    })
};

export const adsrAudioDefs = {
    ADSR
};
