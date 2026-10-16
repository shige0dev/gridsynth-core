export const preset09 = {
  "bpm": 132,
  "pages": {
    "0": {
      "name": "FM Heavy Techno",
      "slots": {
        "0": "CLK1",
        "1": "CLK2",
        "2": "FM1",
        "3": "MIX1",
        "4": "SPK1",
        "5": "CLK3",
        "6": "SEQ8_1",
        "7": "FM2",
        "8": "VCF1",
        "9": "MIX2",
        "10": "SEQ8_2",
        "11": "CVDELAY1",
        "12": "FM3",
        "13": "VCF2",
        "14": "MIX3",
        "15": "MARKOV1",
        "16": "LFO1",
        "17": "FM4",
        "18": "ADSR1",
        "19": "DELAY1",
        "20": "MARKOV2",
        "21": "LFO2",
        "22": "FM5",
        "23": "MATH2",
        "24": "REVERB1",
        "25": "MARKOV3",
        "26": "SH1",
        "27": "FM6",
        "28": "FOLD1",
        "29": "SCOPE1"
      },
      "modules": {
        "CLK1": {
          "type": "CLK",
          "div": "x4",
          "pulseWidthMs": 65,
          "limitPct": 50
        },
        "CLK2": {
          "type": "CLK",
          "div": "x1",
          "pulseWidthMs": 40,
          "limitPct": 50
        },
        "CLK3": {
          "type": "CLK",
          "div": "/2",
          "pulseWidthMs": 35,
          "limitPct": 50
        },
        "ADSR1": {
          "type": "ADSR",
          "attack": 0.001,
          "decay": 0.038,
          "sustain": 0.0,
          "release": 0.02,
          "aCurve": "exp",
          "dCurve": "exp",
          "rCurve": "exp"
        },
        "MATH2": {
          "type": "MATH2",
          "mode": "MULTI",
          "valA": 0.0,
          "valB": 2.2
        },
        "FM1": {
          "type": "FMx3",
          "algorithm": 1,
          "rootMidi": 28,
          "op1": { "ratio": 1.0, "level": 1.0, "attack": 0.001, "decay": 0.42, "sustain": 0.0, "release": 0.08, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op2": { "ratio": 1.0, "level": 1.6, "attack": 0.001, "decay": 0.028, "sustain": 0.0, "release": 0.01, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op3": { "ratio": 2.0, "level": 1.0, "feedback": 0.25, "wave": "sine", "attack": 0.001, "decay": 0.015, "sustain": 0.0, "release": 0.01, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" }
        },
        "FM2": {
          "type": "FMx3",
          "algorithm": 3,
          "rootMidi": 48,
          "op1": { "ratio": 1.0, "level": 0.85, "attack": 0.001, "decay": 0.18, "sustain": 0.0, "release": 0.05, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op2": { "ratio": 1.5, "level": 1.2, "attack": 0.001, "decay": 0.12, "sustain": 0.0, "release": 0.04, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op3": { "ratio": 3.0, "level": 2.4, "feedback": 0.0, "wave": "noise", "attack": 0.001, "decay": 0.16, "sustain": 0.0, "release": 0.05, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" }
        },
        "SEQ8_2": {
          "type": "SEQ8",
          "quantize": true,
          "steps": [
            { "cv": 0.0, "active": true, "cvActive": false, "gate": false },
            { "cv": 0.0, "active": true, "cvActive": false, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": false, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": false, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": false, "gate": false },
            { "cv": 0.0, "active": true, "cvActive": false, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": false, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": false, "gate": true }
          ]
        },
        "FM3": {
          "type": "FMx3",
          "algorithm": 1,
          "rootMidi": 64,
          "op1": { "ratio": 2.83, "level": 0.85, "attack": 0.001, "decay": 0.07, "sustain": 0.0, "release": 0.02, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op2": { "ratio": 4.17, "level": 2.2, "attack": 0.001, "decay": 0.06, "sustain": 0.0, "release": 0.02, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op3": { "ratio": 6.89, "level": 3.2, "feedback": 0.0, "wave": "noise", "attack": 0.001, "decay": 0.05, "sustain": 0.0, "release": 0.02, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" }
        },
        "CVDELAY1": {
          "type": "CVDELAY",
          "timeMs": 57,
          "cvDepth": 1.0
        },
        "FM6": {
          "type": "FMx3",
          "algorithm": 2,
          "rootMidi": 52,
          "op1": { "ratio": 1.0, "level": 0.70, "attack": 0.001, "decay": 0.08, "sustain": 0.0, "release": 0.02, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op2": { "ratio": 3.46, "level": 2.5, "attack": 0.001, "decay": 0.04, "sustain": 0.0, "release": 0.01, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op3": { "ratio": 5.19, "level": 2.8, "feedback": 0.3, "wave": "sine", "attack": 0.001, "decay": 0.025, "sustain": 0.0, "release": 0.01, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" }
        },
        "SEQ8_1": {
          "type": "SEQ8",
          "quantize": true,
          "steps": [
            { "cv": 0.0, "active": true, "cvActive": true, "gate": false },
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": true, "gate": false },
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5833, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true }
          ]
        },
        "FM4": {
          "type": "FMx3",
          "algorithm": 1,
          "rootMidi": 24,
          "op1": { "ratio": 1.0, "level": 0.95, "attack": 0.002, "decay": 0.25, "sustain": 0.35, "release": 0.06, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op2": { "ratio": 1.0, "level": 1.2, "attack": 0.002, "decay": 0.12, "sustain": 0.1, "release": 0.04, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op3": { "ratio": 2.0, "level": 0.7, "feedback": 0.25, "wave": "sine", "attack": 0.002, "decay": 0.08, "sustain": 0.0, "release": 0.03, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" }
        },
        "VCF1": {
          "type": "VCF",
          "cutoff": 420,
          "q": 1.4,
          "filterType": "lowpass",
          "modDepth": 800
        },
        "LFO1": {
          "type": "LFO",
          "syncMode": "sync",
          "division": "1/1",
          "waveType": "triangle",
          "depth": 0.35,
          "rate": 0.5
        },
        "MARKOV1": {
          "type": "MARKOV",
          "rootMidi": 48,
          "holdClocks": 2,
          "stayWeight": 15,
          "weights": [25, 0, 0, 0],
          "initOn": true,
          "state": 1
        },
        "MARKOV2": {
          "type": "MARKOV",
          "rootMidi": 51,
          "holdClocks": 2,
          "stayWeight": 15,
          "weights": [25, 0, 0, 0],
          "initOn": false,
          "state": 0
        },
        "MARKOV3": {
          "type": "MARKOV",
          "rootMidi": 55,
          "holdClocks": 2,
          "stayWeight": 20,
          "weights": [25, 0, 0, 0],
          "initOn": false,
          "state": 0
        },
        "FM5": {
          "type": "FMx3",
          "algorithm": 2,
          "rootMidi": 24,
          "op1": { "ratio": 1.0, "level": 0.85, "attack": 0.002, "decay": 0.28, "sustain": 0.0, "release": 0.12, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op2": { "ratio": 3.0, "level": 1.4, "attack": 0.002, "decay": 0.15, "sustain": 0.0, "release": 0.06, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op3": { "ratio": 4.0, "level": 1.1, "feedback": 0.2, "wave": "sine", "attack": 0.002, "decay": 0.10, "sustain": 0.0, "release": 0.04, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" }
        },
        "VCF2": {
          "type": "VCF",
          "cutoff": 1400,
          "q": 2.5,
          "filterType": "bandpass",
          "modDepth": 600
        },
        "LFO2": {
          "type": "LFO",
          "syncMode": "free",
          "waveType": "sine",
          "rate": 0.2,
          "depth": 0.3
        },
        "DELAY1": {
          "type": "DELAY",
          "delayTime": 0.341,
          "feedback": 0.45,
          "mix": 0.45
        },
        "REVERB1": {
          "type": "REVERB",
          "time": 2.2,
          "mix": 0.35,
          "mode": "hall"
        },
        "FOLD1": {
          "type": "FOLD",
          "fold": 1.8,
          "bias": 0.2
        },
        "SH1": {
          "type": "SH",
          "polarity": "bipolar"
        },
        "MIX1": {
          "type": "MIX",
          "channels": 4,
          "lvl1": 0.95,
          "lvl2": 0.80,
          "lvl3": 0.70,
          "lvl4": 0.60
        },
        "MIX2": {
          "type": "MIX",
          "channels": 4,
          "lvl1": 0.90,
          "lvl2": 0.75,
          "lvl3": 0.0,
          "lvl4": 0.0
        },
        "MIX3": {
          "type": "MIX",
          "channels": 2,
          "lvl1": 0.85,
          "lvl2": 0.80
        },
        "SCOPE1": {
          "type": "SCOPE"
        },
        "SPK1": {
          "type": "SPK",
          "masterVol": 0.22
        }
      },
      "connections": [
        "CLK1:gate_out > SEQ8_1:gate_in",
        "CLK1:gate_out > SEQ8_2:gate_in",
        "CLK1:gate_out > MARKOV1:clk_in",
        "CLK1:gate_out > MARKOV2:clk_in",
        "CLK1:gate_out > MARKOV3:clk_in",

        "CLK2:gate_out > ADSR1:gate_in",
        "ADSR1:cv_out > MATH2:CV_inA",
        "MATH2:CV_OUT > FM1:pitch_in",
        "CLK2:gate_out > FM1:gate_in",
        "FM1:wave_out > MIX1:wave_in1",

        "CLK3:gate_out > FM2:gate_in",
        "FM2:wave_out > MIX1:wave_in2",

        "SEQ8_2:gate_out > FM3:gate_in",
        "FM3:wave_out > MIX1:wave_in3",

        "SEQ8_2:gate_out > CVDELAY1:sig_in",
        "CVDELAY1:cv_out > FM6:gate_in",
        "FM6:wave_out > MIX1:wave_in4",

        "SEQ8_1:cv_out > FM4:pitch_in",
        "SEQ8_1:gate_out > FM4:gate_in",
        "FM4:wave_out > VCF1:wave_in",
        "LFO1:cv_out > VCF1:cv_in",
        "VCF1:wave_out > MIX2:wave_in1",

        "MARKOV1:transition_out1 > MARKOV2:transition_in",
        "MARKOV2:transition_out1 > MARKOV3:transition_in",
        "MARKOV3:transition_out1 > MARKOV1:transition_in",

        "MARKOV1:cv_out > FM5:pitch_in",
        "MARKOV2:cv_out > FM5:pitch_in",
        "MARKOV3:cv_out > FM5:pitch_in",
        "MARKOV1:trig_out > FM5:gate_in",
        "MARKOV2:trig_out > FM5:gate_in",
        "MARKOV3:trig_out > FM5:gate_in",

        "LFO2:cv_out > VCF2:cv_in",
        "FM5:wave_out > VCF2:wave_in",
        "VCF2:wave_out > DELAY1:wave_in",
        "DELAY1:wave_out > REVERB1:wave_in",
        "REVERB1:wave_out > MIX2:wave_in2",

        "MIX1:wave_out > MIX3:wave_in1",
        "MIX2:wave_out > MIX3:wave_in2",

        "MIX3:wave_out > SCOPE1:in1",
        "CLK2:gate_out > SCOPE1:trig",
        "MIX3:wave_out > SPK1:wave_inL",
        "MIX3:wave_out > SPK1:wave_inR"
      ]
    }
  }
};
