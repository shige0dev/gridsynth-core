// src/presets/demos/13_wave_chop.js

export const preset13 = {
  "bpm": 120,
  "pages": {
    "0": {
      "name": "13_WAVE CHOP",
      "slots": {
        "0": "CLK1",
        "1": "SEQ81",
        "2": "WAVE1",
        "3": "VCF1",
        "4": "DELAY1",
        "5": "SPK1"
      },
      "modules": {
        "CLK1": {
          "type": "CLK",
          "bpm": 120,
          "div": "/4",
          "pulseWidthMs": 25,
          "limitPct": 90
        },
        "SEQ81": {
          "type": "SEQ8",
          "quantize": false,
          "steps": [
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.50, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.75, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.50, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.75, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.0, "active": true, "cvActive": true, "gate": true }
          ]
        },
        "WAVE1": {
          "type": "WAVE",
          "name": "Wave 1",
          "codec": "opus",
          "sampleRate": 48000,
          "maxDuration": 16.0,
          "duration": 1.5,
          "start": 0.0,
          "end": 0.25,
          "speed": 1.0,
          "loop": false,
          "retrigger": true,
          "chopMode": "4",
          "chops": [0.25, 0.5, 0.75],
          "snapMode": true,
          "data": ""
        },
        "VCF1": {
          "type": "VCF",
          "cutoff": 3200,
          "q": 3.0,
          "filterType": "lowpass",
          "modDepth": 1200
        },
        "DELAY1": {
          "type": "DELAY",
          "delayTime": 0.35,
          "feedback": 0.45,
          "mix": 0.3
        },
        "SPK1": {
          "type": "SPK",
          "masterVol": 0.45
        }
      },
      "connections": [
        { "from": { "moduleId": "CLK1", "port": "gate_out" }, "to": { "moduleId": "SEQ81", "port": "gate_in" } },
        { "from": { "moduleId": "CLK1", "port": "gate_out" }, "to": { "moduleId": "WAVE1", "port": "gate_in" } },
        { "from": { "moduleId": "SEQ81", "port": "cv_out" }, "to": { "moduleId": "WAVE1", "port": "start_cv" } },
        { "from": { "moduleId": "WAVE1", "port": "wave_out" }, "to": { "moduleId": "VCF1", "port": "wave_in" } },
        { "from": { "moduleId": "VCF1", "port": "wave_out" }, "to": { "moduleId": "DELAY1", "port": "wave_in" } },
        { "from": { "moduleId": "DELAY1", "port": "wave_out" }, "to": { "moduleId": "SPK1", "port": "wave_inL" } },
        { "from": { "moduleId": "DELAY1", "port": "wave_out" }, "to": { "moduleId": "SPK1", "port": "wave_inR" } }
      ]
    }
  }
};
