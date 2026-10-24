export const preset09 = {
  "bpm": 132,
  "grid": { "cols": 4, "rows": 32 },
  "pages": {
    "0": {
      "name": "FM Heavy Techno",
      "slots": {
        // --- Row 0: Clocks ---
        "0": "CLK1",
        "1": "CLK2",
        "2": "CLK3",
        // Row 1: [Blank]
        // --- Row 2: Drums - Kick & Snare ---
        "8": "FM1",
        "9": "ADSR1",
        "10": "MATH2",
        "11": "FM2",
        // --- Row 3: Drums - Hats & Industrial Perc ---
        "12": "SEQ8_2",
        "13": "FM3",
        "14": "CVDELAY1",
        "15": "FM6",
        // --- Row 4: Drums Submix ---
        "16": "MIX1",
        // Row 5: [Blank]
        // --- Row 6: Bassline ---
        "24": "SEQ8_1",
        "25": "FM4",
        "26": "VCF1",
        "27": "LFO1",
        // Row 7: [Blank]
        // --- Row 8: Generative Markov Nodes ---
        "32": "MARKOV1",
        "33": "MARKOV2",
        "34": "MARKOV3",
        // --- Row 9: Lead FM Synth & Delays ---
        "36": "FM5",
        "37": "VCF2",
        "38": "LFO2",
        "39": "DELAY1",
        // --- Row 10: Lead Reverb ---
        "40": "REVERB1",
        // Row 11: [Blank]
        // --- Row 12: Master Mix & Audio Output ---
        "48": "MIX2",
        "49": "SCOPE1",
        "50": "SPK1"
      },
      "modules": {
        // --- Clock Section (Row 0) ---
        "CLK1": {
          "type": "CLK",
          "row": 0,
          "col": 0,
          "div": "x4",
          "pulseWidthMs": 65,
          "limitPct": 50
        },
        "CLK2": {
          "type": "CLK",
          "row": 0,
          "col": 1,
          "div": "x1",
          "pulseWidthMs": 40,
          "limitPct": 50
        },
        "CLK3": {
          "type": "CLK",
          "row": 0,
          "col": 2,
          "div": "/2",
          "pulseWidthMs": 35,
          "limitPct": 50
        },

        // --- Drum Section: Kick & Snare (Row 2) ---
        "FM1": {
          "type": "FMx3",
          "row": 2,
          "col": 0,
          "algorithm": 1,
          "rootMidi": 28,
          "op1": { "ratio": 1.0, "level": 1.0, "attack": 0.001, "decay": 0.42, "sustain": 0.0, "release": 0.08, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op2": { "ratio": 1.0, "level": 1.6, "attack": 0.001, "decay": 0.028, "sustain": 0.0, "release": 0.01, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op3": { "ratio": 2.0, "level": 1.0, "feedback": 0.25, "wave": "sine", "attack": 0.001, "decay": 0.015, "sustain": 0.0, "release": 0.01, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" }
        },
        "ADSR1": {
          "type": "ADSR",
          "row": 2,
          "col": 1,
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
          "row": 2,
          "col": 2,
          "mode": "MULTI",
          "valA": 0.0,
          "valB": 2.2
        },
        "FM2": {
          "type": "FMx3",
          "row": 2,
          "col": 3,
          "algorithm": 3,
          "rootMidi": 48,
          "op1": { "ratio": 1.0, "level": 0.85, "attack": 0.001, "decay": 0.18, "sustain": 0.0, "release": 0.05, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op2": { "ratio": 1.5, "level": 1.2, "attack": 0.001, "decay": 0.12, "sustain": 0.0, "release": 0.04, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op3": { "ratio": 3.0, "level": 2.4, "feedback": 0.0, "wave": "noise", "attack": 0.001, "decay": 0.16, "sustain": 0.0, "release": 0.05, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" }
        },

        // --- Drum Section: Hats & Percussion (Row 3) ---
        "SEQ8_2": {
          "type": "SEQ8",
          "row": 3,
          "col": 0,
          "quantize": true,
          "steps": [
            { "cv": 0.0, "active": true, "cvActive": false, "gate": false },
            { "cv": 0.0, "active": true, "cvActive": false, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": false, "gate": false },
            { "cv": 0.0, "active": true, "cvActive": false, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": false, "gate": false },
            { "cv": 0.0, "active": true, "cvActive": false, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": false, "gate": false },
            { "cv": 0.0, "active": true, "cvActive": false, "gate": true }
          ]
        },
        "FM3": {
          "type": "FMx3",
          "row": 3,
          "col": 1,
          "algorithm": 1,
          "rootMidi": 64,
          "op1": { "ratio": 2.83, "level": 0.85, "attack": 0.001, "decay": 0.07, "sustain": 0.0, "release": 0.02, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op2": { "ratio": 4.17, "level": 2.2, "attack": 0.001, "decay": 0.06, "sustain": 0.0, "release": 0.02, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op3": { "ratio": 6.89, "level": 3.2, "feedback": 0.0, "wave": "noise", "attack": 0.001, "decay": 0.05, "sustain": 0.0, "release": 0.02, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" }
        },
        "CVDELAY1": {
          "type": "CVDELAY",
          "row": 3,
          "col": 2,
          "timeMs": 114,
          "cvDepth": 1.0
        },
        "FM6": {
          "type": "FMx3",
          "row": 3,
          "col": 3,
          "algorithm": 3,
          "rootMidi": 60,
          "op1": { "ratio": 1.0, "level": 0.85, "attack": 0.001, "decay": 0.045, "sustain": 0.0, "release": 0.015, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op2": { "ratio": 5.42, "level": 2.4, "attack": 0.001, "decay": 0.030, "sustain": 0.0, "release": 0.01, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op3": { "ratio": 7.0, "level": 3.2, "feedback": 0.0, "wave": "noise", "attack": 0.001, "decay": 0.012, "sustain": 0.0, "release": 0.01, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" }
        },

        // --- Drum Mixer (Row 4) ---
        "MIX1": {
          "type": "MIX",
          "row": 4,
          "col": 0,
          "channels": 4,
          "lvl1": 0.95,
          "lvl2": 0.80,
          "lvl3": 0.70,
          "lvl4": 0.75
        },

        // --- Bassline Section (Row 6) ---
        "SEQ8_1": {
          "type": "SEQ8",
          "row": 6,
          "col": 0,
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
          "row": 6,
          "col": 1,
          "algorithm": 1,
          "rootMidi": 24,
          "op1": { "ratio": 1.0, "level": 0.95, "attack": 0.002, "decay": 0.25, "sustain": 0.35, "release": 0.06, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op2": { "ratio": 1.0, "level": 1.2, "attack": 0.002, "decay": 0.12, "sustain": 0.1, "release": 0.04, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op3": { "ratio": 2.0, "level": 0.7, "feedback": 0.25, "wave": "sine", "attack": 0.002, "decay": 0.08, "sustain": 0.0, "release": 0.03, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" }
        },
        "VCF1": {
          "type": "VCF",
          "row": 6,
          "col": 2,
          "cutoff": 420,
          "q": 1.4,
          "filterType": "lowpass",
          "modDepth": 800
        },
        "LFO1": {
          "type": "LFO",
          "row": 6,
          "col": 3,
          "syncMode": "sync",
          "division": "1/1",
          "waveType": "triangle",
          "depth": 0.35,
          "rate": 0.5
        },

        // --- Generative Markov Section (Row 8) ---
        "MARKOV1": {
          "type": "MARKOV",
          "row": 8,
          "col": 0,
          "rootMidi": 48,
          "holdClocks": 2,
          "stayWeight": 15,
          "weights": [25, 0, 0, 0],
          "initOn": true,
          "state": 1
        },
        "MARKOV2": {
          "type": "MARKOV",
          "row": 8,
          "col": 1,
          "rootMidi": 51,
          "holdClocks": 2,
          "stayWeight": 15,
          "weights": [25, 0, 0, 0],
          "initOn": false,
          "state": 0
        },
        "MARKOV3": {
          "type": "MARKOV",
          "row": 8,
          "col": 2,
          "rootMidi": 55,
          "holdClocks": 2,
          "stayWeight": 20,
          "weights": [25, 0, 0, 0],
          "initOn": false,
          "state": 0
        },

        // --- Lead Synth & Effects (Row 9 & 10) ---
        "FM5": {
          "type": "FMx3",
          "row": 9,
          "col": 0,
          "algorithm": 2,
          "rootMidi": 24,
          "op1": { "ratio": 1.0, "level": 0.85, "attack": 0.002, "decay": 0.28, "sustain": 0.0, "release": 0.12, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op2": { "ratio": 3.0, "level": 1.4, "attack": 0.002, "decay": 0.15, "sustain": 0.0, "release": 0.06, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" },
          "op3": { "ratio": 4.0, "level": 1.1, "feedback": 0.2, "wave": "sine", "attack": 0.002, "decay": 0.10, "sustain": 0.0, "release": 0.04, "aCurve": "exp", "dCurve": "exp", "rCurve": "exp" }
        },
        "VCF2": {
          "type": "VCF",
          "row": 9,
          "col": 1,
          "cutoff": 1400,
          "q": 2.5,
          "filterType": "bandpass",
          "modDepth": 600
        },
        "LFO2": {
          "type": "LFO",
          "row": 9,
          "col": 2,
          "syncMode": "free",
          "waveType": "sine",
          "rate": 0.2,
          "depth": 0.3
        },
        "DELAY1": {
          "type": "DELAY",
          "row": 9,
          "col": 3,
          "delayTime": 0.341,
          "feedback": 0.45,
          "mix": 0.45
        },
        "REVERB1": {
          "type": "REVERB",
          "row": 10,
          "col": 0,
          "time": 2.2,
          "mix": 0.35,
          "mode": "hall"
        },

        // --- Master Output Section (Row 12) ---
        "MIX2": {
          "type": "MIX",
          "row": 12,
          "col": 0,
          "channels": 4,
          "lvl1": 0.85,
          "lvl2": 0.85,
          "lvl3": 0.75,
          "lvl4": 0.65
        },
        "SCOPE1": {
          "type": "SCOPE",
          "row": 12,
          "col": 1
        },
        "SPK1": {
          "type": "SPK",
          "row": 12,
          "col": 2,
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

        "CLK3:gate_out > CVDELAY1:sig_in",
        "CVDELAY1:cv_out > FM6:gate_in",
        "FM6:wave_out > MIX1:wave_in4",

        "SEQ8_1:cv_out > FM4:pitch_in",
        "SEQ8_1:gate_out > FM4:gate_in",
        "FM4:wave_out > VCF1:wave_in",
        "LFO1:cv_out > VCF1:cv_in",
        "VCF1:wave_out > MIX2:wave_in2",

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
        "DELAY1:wave_out > MIX2:wave_in3",
        "REVERB1:wave_out > MIX2:wave_in4",

        "MIX1:wave_out > MIX2:wave_in1",

        "MIX2:wave_out > SCOPE1:in1",
        "CLK2:gate_out > SCOPE1:trig",
        "MIX2:wave_out > SPK1:wave_inL",
        "MIX2:wave_out > SPK1:wave_inR"
      ]
    }
  }
};
