export const preset10 = {
  "bpm": 120,
  "pages": {
    "0": {
      "name": "FM Crystal Groove",
      "slots": {
        "0": "CLK1",
        "1": "SEQ16_1",
        "2": "FM1",
        "3": "DELAY1",
        "4": "SPK1",
        "5": "REVERB1",
        "6": "FM2",
        "7": "MIX1",
        "8": "SCOPE1"
      },
      "modules": {
        "CLK1": {
          "type": "CLK",
          "div": "x2",
          "pulseWidthMs": 25,
          "limitPct": 50
        },
        "SEQ16_1": {
          "type": "SEQ16",
          "quantize": true,
          "steps": [
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5833, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5833, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.8333, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.4167, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5833, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.4167, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5833, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.8333, "active": true, "cvActive": true, "gate": true }
          ]
        },
        "FM1": {
          "type": "FMx3",
          "algorithm": 2,
          "rootMidi": 57,
          "op1": {
            "ratio": 1.0,
            "level": 0.9,
            "attack": 0.002,
            "decay": 0.45,
            "sustain": 0.0,
            "release": 0.15,
            "curve": "exp"
          },
          "op2": {
            "ratio": 2.0,
            "level": 1.15,
            "attack": 0.002,
            "decay": 0.22,
            "sustain": 0.0,
            "release": 0.08,
            "curve": "exp"
          },
          "op3": {
            "ratio": 4.0,
            "level": 1.35,
            "feedback": 0.0,
            "wave": "sine",
            "attack": 0.001,
            "decay": 0.06,
            "sustain": 0.0,
            "release": 0.03,
            "curve": "exp"
          }
        },
        "FM2": {
          "type": "FMx3",
          "algorithm": 1,
          "rootMidi": 33,
          "op1": {
            "ratio": 1.0,
            "level": 0.95,
            "attack": 0.002,
            "decay": 0.22,
            "sustain": 0.0,
            "release": 0.06,
            "curve": "exp"
          },
          "op2": {
            "ratio": 1.0,
            "level": 1.25,
            "attack": 0.002,
            "decay": 0.14,
            "sustain": 0.0,
            "release": 0.04,
            "curve": "exp"
          },
          "op3": {
            "ratio": 2.0,
            "level": 0.8,
            "feedback": 0.12,
            "wave": "sine",
            "attack": 0.002,
            "decay": 0.05,
            "sustain": 0.0,
            "release": 0.02,
            "curve": "exp"
          }
        },
        "DELAY1": {
          "type": "DELAY",
          "delayTime": 0.375,
          "feedback": 0.42,
          "mix": 0.45
        },
        "REVERB1": {
          "type": "REVERB",
          "time": 2.4,
          "damp": 4800,
          "mix": 0.35,
          "mode": "hall"
        },
        "MIX1": {
          "type": "MIX",
          "channels": 2,
          "lvl1": 0.72,
          "lvl2": 0.88
        },
        "SCOPE1": {
          "type": "SCOPE"
        },
        "SPK1": {
          "type": "SPK",
          "masterVol": 0.24
        }
      },
      "connections": [
        "CLK1:gate_out > SEQ16_1:gate_in",
        "SEQ16_1:gate_out > FM1:gate_in",
        "SEQ16_1:cv_out > FM1:pitch_in",
        "CLK1:gate_out > FM2:gate_in",
        "FM1:wave_out > DELAY1:wave_in",
        "DELAY1:wave_out > REVERB1:wave_in",
        "REVERB1:wave_out > MIX1:wave_in1",
        "FM2:wave_out > MIX1:wave_in2",
        "MIX1:wave_out > SPK1:wave_in_l",
        "MIX1:wave_out > SPK1:wave_in_r",
        "MIX1:wave_out > SCOPE1:in1"
      ]
    }
  }
};
