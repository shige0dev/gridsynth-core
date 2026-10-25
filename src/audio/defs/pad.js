// src/audio/defs/pad.js

export const PAD = {
    create: (ctx, d, patch, eng) => {
        const w = new AudioWorkletNode(ctx, 'pad-processor', {
            numberOfInputs: 2,
            numberOfOutputs: 5
        });

        w.port.postMessage({
            type: 'SET_CONFIG',
            hue: d.hue ?? 0.5,
            sat: d.sat ?? 1.0,
            bright: d.bright ?? 0.0,
            polX: d.polX ?? 'bi',
            polY: d.polY ?? 'bi'
        });

        const inHue = ctx.createGain();
        const inBright = ctx.createGain();

        inHue.connect(w, 0, 0);
        inBright.connect(w, 0, 1);

        const outTrig = ctx.createGain();
        const outGate = ctx.createGain();
        const outX = ctx.createGain();
        const outY = ctx.createGain();
        const outPress = ctx.createGain();

        w.connect(outTrig, 0, 0);
        w.connect(outGate, 1, 0);
        w.connect(outX, 2, 0);
        w.connect(outY, 3, 0);
        w.connect(outPress, 4, 0);

        if (eng?.silentSink) {
            outTrig.connect(eng.silentSink);
            outGate.connect(eng.silentSink);
            outX.connect(eng.silentSink);
            outY.connect(eng.silentSink);
            outPress.connect(eng.silentSink);
        }

        let latest = {
            x: 0.5,
            y: 0.5,
            pressure: 0.0,
            isDown: false,
            hue: d.hue ?? 0.5,
            sat: d.sat ?? 1.0,
            bright: d.bright ?? 0.0,
            baseHue: d.hue ?? 0.5,
            baseSat: d.sat ?? 1.0,
            baseBright: d.bright ?? 0.0
        };

        w.port.onmessage = (e) => {
            if (e.data.type === 'PAD_DATA') {
                latest = e.data;
            }
        };

        return {
            nodes: { w, inHue, inBright, outTrig, outGate, outX, outY, outPress },
            inputs: {
                hue_cv: inHue,
                hue: inHue,
                bright_cv: inBright,
                bright: inBright
            },
            outputs: {
                trig_out: outTrig,
                trig: outTrig,
                gate_out: outGate,
                gate: outGate,
                x_cv: outX,
                x: outX,
                y_cv: outY,
                y: outY,
                pressure_cv: outPress,
                pressure: outPress,
                press_cv: outPress
            },
            read: () => ({ ...latest })
        };
    },
    update: (ctx, inst, d) => {
        inst.nodes.w.port.postMessage({
            type: 'SET_CONFIG',
            hue: d.hue ?? 0.5,
            sat: d.sat ?? 1.0,
            bright: d.bright ?? 0.0,
            polX: d.polX ?? 'bi',
            polY: d.polY ?? 'bi'
        });
    }
};

export const padAudioDefs = {
    PAD
};

