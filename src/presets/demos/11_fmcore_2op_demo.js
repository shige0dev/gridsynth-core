export const preset11 = {
  "bpm": 126,
  "pages": {
    "0": {
      "name": "FM Crystal Chime (16-Step)",
      "slots": {
        "0": "CLK1",
        "1": "SEQ16_1",
        "2": "ADSR1",
        "3": "ADSR2",
        "4": "SPK1",
        "5": "LFO1",
        "6": "FMCORE1",
        "7": "FMCORE2",
        "8": "VCA1",
        "9": "SCOPE1",
        "10": "DELAY1"
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
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5833, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.8333, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": false, "cvActive": false, "gate": false },
            { "cv": 1.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5833, "active": false, "cvActive": false, "gate": false },
            { "cv": 1.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.1667, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.8333, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5833, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": false, "cvActive": false, "gate": false },
            { "cv": 1.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.5833, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.8333, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.4167, "active": true, "cvActive": true, "gate": true }
          ]
        },
        "ADSR1": {
          "type": "ADSR",
          "attack": 0.002,
          "decay": 0.26,
          "sustain": 0.04,
          "release": 0.12,
          "aCurve": "exp",
          "dCurve": "exp",
          "rCurve": "exp"
        },
        "ADSR2": {
          "type": "ADSR",
          "attack": 0.003,
          "decay": 0.48,
          "sustain": 0.08,
          "release": 0.22,
          "aCurve": "exp",
          "dCurve": "exp",
          "rCurve": "exp"
        },
        "LFO1": {
          "type": "LFO",
          "syncMode": "free",
          "rate": 0.15,
          "depth": 0.18,
          "waveType": "sine"
        },
        "FMCORE1": {
          "type": "FMCORE",
          "level": 0.95,
          "ratio": 3.5,
          "fine": 5,
          "index": 2.8,
          "feedback": 0.12,
          "rootMidi": 60
        },
        "FMCORE2": {
          "type": "FMCORE",
          "level": 0.85,
          "ratio": 1.0,
          "fine": 0,
          "index": 1.0,
          "feedback": 0.04,
          "rootMidi": 60
        },
        "VCA1": {
          "type": "VCA",
          "level": 1.0,
          "cvDepth": 1.0
        },
        "DELAY1": {
          "type": "DELAY",
          "delayTime": 0.357,
          "feedback": 0.46,
          "mix": 0.45
        },
        "SCOPE1": {
          "type": "SCOPE",
          "timeSpan": 0.02,
          "vRange": 5.0,
          "trigMode": "auto",
          "displayMode": "time",
          "ySpread": 0.22
        },
        "SPK1": {
          "type": "SPK",
          "masterVol": 0.22
        }
      },
      "connections": [
        "CLK1:gate_out > SEQ16_1:gate_in",
        "SEQ16_1:gate_out > ADSR1:gate_in",
        "SEQ16_1:gate_out > ADSR2:gate_in",
        "SEQ16_1:cv_out > FMCORE1:cv_in",
        "SEQ16_1:cv_out > FMCORE2:cv_in",
        "ADSR1:cv_out > FMCORE2:index_cv",
        "LFO1:cv_out > FMCORE1:index_cv",
        "FMCORE1:wave_out > FMCORE2:mod_in",
        "FMCORE2:wave_out > VCA1:wave_in",
        "ADSR2:cv_out > VCA1:cv_in",
        "VCA1:wave_out > DELAY1:wave_in",
        "VCA1:wave_out > SPK1:wave_in_l",
        "DELAY1:wave_out > SPK1:wave_in_r",
        "VCA1:wave_out > SCOPE1:wave_in",
        "DELAY1:wave_out > SCOPE1:wave_in",
        "CLK1:gate_out > SCOPE1:trig_in"
      ]
    }
  }
};
