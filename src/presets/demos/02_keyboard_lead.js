export const preset02 = {
    "bpm": 120,
    "pages": {
        "0": {
            "name": "",
            "slots": {
                "0": "KEY1",
                "1": "VCO1",
                "2": "VCF1",
                "5": "ADSR1",
                "6": "VCA1",
                "7": "SPK1",
                "9": "SCOPE1",
                "11": "MIX1",
                "12": "KEY2",
                "13": "VCO2",
                "14": "VCF2",
                "16": "SEQ8_1",
                "17": "ADSR2",
                "18": "VCA2",
                "20": "CLK1"
            },
            "modules": {
                "KEY1": {
                    "type": "KEY",
                    "octave": 3,
                    "root": 0,
                    "scale": "CHROMATIC",
                    "mask": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                    "lastNote": "",
                    "currentMidi": null,
                    "cv": 2,
                    "legato": false
                },
                "VCO1": {
                    "type": "VCO",
                    "channels": 1,
                    "quantize": true,
                    "wave": "sawtooth",
                    "freq1": 220,
                    "freq2": 220,
                    "freq3": 220,
                    "freq4": 220
                },
                "VCF1": {
                    "type": "VCF",
                    "filterType": "lowpass",
                    "cutoff": 2200,
                    "q": 3.8,
                    "modDepth": 1200
                },
                "ADSR1": {
                    "type": "ADSR",
                    "attack": 0.04,
                    "decay": 0.35,
                    "sustain": 0.45,
                    "release": 0.55,
                    "aCurve": "lin",
                    "dCurve": "lin",
                    "rCurve": "lin",
                    "attackCurve": 0,
                    "decayCurve": 0,
                    "releaseCurve": 0
                },
                "VCA1": {
                    "type": "VCA",
                    "level": 0,
                    "cvDepth": 1
                },
                "SPK1": {
                    "type": "SPK",
                    "masterVol": 0.12
                },
                "MIX1": {
                    "type": "MIX",
                    "channels": 2,
                    "lvl1": 1,
                    "lvl2": 1,
                    "lvl3": 1,
                    "lvl4": 1
                },
                "KEY2": {
                    "type": "KEY",
                    "octave": 3,
                    "root": 0,
                    "scale": "CHROMATIC",
                    "mask": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                    "lastNote": "G3",
                    "currentMidi": 55,
                    "cv": 2.5833333333333335,
                    "legato": false
                },
                "VCO2": {
                    "type": "VCO",
                    "channels": 1,
                    "quantize": true,
                    "wave": "sawtooth",
                    "freq1": 220,
                    "freq2": 220,
                    "freq3": 220,
                    "freq4": 220
                },
                "VCF2": {
                    "type": "VCF",
                    "filterType": "lowpass",
                    "cutoff": 2200,
                    "q": 3.8,
                    "modDepth": 1200
                },
                "SEQ8_1": {
                    "type": "SEQ8",
                    "quantize": true,
                    "keyMode": "loop",
                    "steps": [
                        { "cv": 0, "active": true, "cvActive": true, "gate": true },
                        { "cv": 0.499998, "active": true, "cvActive": true, "gate": true },
                        { "cv": 0.583331, "active": true, "cvActive": true, "gate": true },
                        { "cv": 0.83333, "active": true, "cvActive": true, "gate": true },
                        { "cv": 0.25, "active": false, "cvActive": true, "gate": true },
                        { "cv": 0.25, "active": false, "cvActive": true, "gate": true },
                        { "cv": 0.25, "active": false, "cvActive": true, "gate": true },
                        { "cv": 0.25, "active": false, "cvActive": true, "gate": true }
                    ]
                },
                "ADSR2": {
                    "type": "ADSR",
                    "attack": 0.04,
                    "decay": 0.35,
                    "sustain": 0.45,
                    "release": 0.55,
                    "aCurve": "lin",
                    "dCurve": "lin",
                    "rCurve": "lin",
                    "attackCurve": 0,
                    "decayCurve": 0,
                    "releaseCurve": 0
                },
                "VCA2": {
                    "type": "VCA",
                    "level": 0,
                    "cvDepth": 1
                },
                "CLK1": {
                    "type": "CLK",
                    "div": "x2",
                    "pulseWidthMs": 15,
                    "limitPct": 90
                },
                "SCOPE1": {
                    "type": "SCOPE",
                    "timeSpan": 1,
                    "vRange": 2,
                    "trigMode": "free",
                    "opacity": 0.8
                }
            },
            "connections": [
                { "from": { "moduleId": "KEY1", "port": "cv_out" }, "to": { "moduleId": "VCO1", "port": "cv_in" } },
                { "from": { "moduleId": "KEY1", "port": "gate_out" }, "to": { "moduleId": "ADSR1", "port": "gate_in" } },
                { "from": { "moduleId": "VCO1", "port": "wave_out" }, "to": { "moduleId": "VCF1", "port": "wave_in" } },
                { "from": { "moduleId": "VCF1", "port": "wave_out" }, "to": { "moduleId": "VCA1", "port": "wave_in" } },
                { "from": { "moduleId": "ADSR1", "port": "cv_out" }, "to": { "moduleId": "VCA1", "port": "cv_in" } },
                { "from": { "moduleId": "KEY2", "port": "cv_out" }, "to": { "moduleId": "VCO2", "port": "cv_in" } },
                { "from": { "moduleId": "KEY2", "port": "gate_out" }, "to": { "moduleId": "ADSR2", "port": "gate_in" } },
                { "from": { "moduleId": "VCO2", "port": "wave_out" }, "to": { "moduleId": "VCF2", "port": "wave_in" } },
                { "from": { "moduleId": "VCF2", "port": "wave_out" }, "to": { "moduleId": "VCA2", "port": "wave_in" } },
                { "from": { "moduleId": "ADSR2", "port": "cv_out" }, "to": { "moduleId": "VCA2", "port": "cv_in" } },
                { "from": { "moduleId": "KEY2", "port": "gate_out" }, "to": { "moduleId": "SEQ8_1", "port": "keygate_in" } },
                { "from": { "moduleId": "CLK1", "port": "gate_out" }, "to": { "moduleId": "SEQ8_1", "port": "gate_in" } },
                { "from": { "moduleId": "KEY2", "port": "gate_out" }, "to": { "moduleId": "CLK1", "port": "reset_in" } },
                { "from": { "moduleId": "SEQ8_1", "port": "cv_out" }, "to": { "moduleId": "VCO2", "port": "cv_in" } },
                { "from": { "moduleId": "VCA1", "port": "wave_out" }, "to": { "moduleId": "MIX1", "port": "wave_in1" } },
                { "from": { "moduleId": "VCA2", "port": "wave_out" }, "to": { "moduleId": "MIX1", "port": "wave_in2" } },
                { "from": { "moduleId": "MIX1", "port": "wave_out" }, "to": { "moduleId": "SPK1", "port": "wave_in_l" } },
                { "from": { "moduleId": "MIX1", "port": "wave_out" }, "to": { "moduleId": "SPK1", "port": "wave_in_r" } },
                { "from": { "moduleId": "KEY2", "port": "gate_out" }, "to": { "moduleId": "SCOPE1", "port": "cv_in" } }
            ]
        }
    }
};
