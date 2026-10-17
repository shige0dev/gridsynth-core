export const preset13 = {
  "bpm": 124,
  "pages": {
    "0": {
      "name": "RF & AR Groove",
      "slots": {
        "0": "CLK1",
        "1": "SEQ8_1",
        "2": "VCO1",
        "3": "VCF1",
        "4": "SPK1",
        "5": "RF1",
        "6": "AR1",
        "7": "VCA1",
        "8": "DELAY1"
      },
      "modules": {
        "CLK1": {
          "type": "CLK",
          "div": "x4",
          "pulseWidthMs": 30,
          "limitPct": 90
        },
        "SEQ8_1": {
          "type": "SEQ8",
          "quantize": true,
          "steps": [
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": true, "gate": false },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5833, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": false },
            { "cv": 1.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.5833, "active": true, "cvActive": true, "gate": true }
          ]
        },
        "VCO1": {
          "type": "VCO",
          "wave": "sawtooth",
          "freq1": 130.81,
          "channels": 1,
          "quantize": true
        },
        "VCF1": {
          "type": "VCF",
          "filterType": "lowpass",
          "cutoff": 420,
          "q": 6.0,
          "modDepth": 2600
        },
        "RF1": {
          "type": "RF",
          "time": 0.18,
          "peak": 0.18,
          "level": 0.9
        },
        "AR1": {
          "type": "AR",
          "attack": 0.008,
          "release": 0.19,
          "level": 1.0
        },
        "VCA1": {
          "type": "VCA",
          "level": 0.0,
          "cvDepth": 1.0
        },
        "DELAY1": {
          "type": "DELAY",
          "delayTime": 0.242,
          "feedback": 0.46,
          "mix": 0.32
        },
        "SPK1": {
          "type": "SPK",
          "masterVol": 0.25
        }
      },
      "connections": [
        {
          "from": { "moduleId": "CLK1", "port": "gate_out" },
          "to": { "moduleId": "SEQ8_1", "port": "gate_in" }
        },
        {
          "from": { "moduleId": "SEQ8_1", "port": "cv_out" },
          "to": { "moduleId": "VCO1", "port": "cv_in" }
        },
        {
          "from": { "moduleId": "VCO1", "port": "wave_out" },
          "to": { "moduleId": "VCF1", "port": "wave_in" }
        },
        {
          "from": { "moduleId": "VCF1", "port": "wave_out" },
          "to": { "moduleId": "VCA1", "port": "wave_in" }
        },
        {
          "from": { "moduleId": "VCA1", "port": "wave_out" },
          "to": { "moduleId": "DELAY1", "port": "wave_in" }
        },
        {
          "from": { "moduleId": "DELAY1", "port": "wave_out" },
          "to": { "moduleId": "SPK1", "port": "wave_inL" }
        },
        {
          "from": { "moduleId": "DELAY1", "port": "wave_out" },
          "to": { "moduleId": "SPK1", "port": "wave_inR" }
        },
        {
          "from": { "moduleId": "SEQ8_1", "port": "gate_out" },
          "to": { "moduleId": "AR1", "port": "gate_in" }
        },
        {
          "from": { "moduleId": "AR1", "port": "cv_out" },
          "to": { "moduleId": "VCA1", "port": "cv_in" }
        },
        {
          "from": { "moduleId": "SEQ8_1", "port": "gate_out" },
          "to": { "moduleId": "RF1", "port": "trig_in" }
        },
        {
          "from": { "moduleId": "RF1", "port": "cv_out" },
          "to": { "moduleId": "VCF1", "port": "cv_in" }
        },
        {
          "from": { "moduleId": "SEQ8_1", "port": "cv_out" },
          "to": { "moduleId": "RF1", "port": "time_cv" }
        }
      ]
    }
  }
};
