// src/presets/demos/13_tape_cue_chop.js

export const preset13 = {
  "bpm": 120,
  "pages": {
    "0": {
      "name": "13_TAPE CUE CHOP",
      "slots": {
        "0": "CLK1",
        "1": "CUE1",
        "2": "TAPE1",
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
        "CUE1": {
          "type": "CUE",
          "start": 0.8,
          "end": 0.2,
          "speedCv": 0.0
        },
        "TAPE1": {
          "type": "TAPE",
          "name": "Vintage Reel",
          "codec": "opus",
          "sampleRate": 48000,
          "maxDuration": 16.0,
          "duration": 1.5,
          "start": 0.0,
          "end": 1.0,
          "speed": 1.0,
          "loop": true,
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
        { "from": { "moduleId": "CLK1", "port": "gate_out" }, "to": { "moduleId": "CUE1", "port": "trig_in" } },
        { "from": { "moduleId": "CUE1", "port": "trig_out" }, "to": { "moduleId": "TAPE1", "port": "gate_in" } },
        { "from": { "moduleId": "CUE1", "port": "start_cv" }, "to": { "moduleId": "TAPE1", "port": "start_cv" } },
        { "from": { "moduleId": "CUE1", "port": "end_cv" }, "to": { "moduleId": "TAPE1", "port": "end_cv" } },
        { "from": { "moduleId": "CUE1", "port": "speed_cv" }, "to": { "moduleId": "TAPE1", "port": "speed_cv" } },
        { "from": { "moduleId": "TAPE1", "port": "wave_out" }, "to": { "moduleId": "VCF1", "port": "wave_in" } },
        { "from": { "moduleId": "VCF1", "port": "wave_out" }, "to": { "moduleId": "DELAY1", "port": "wave_in" } },
        { "from": { "moduleId": "DELAY1", "port": "wave_out" }, "to": { "moduleId": "SPK1", "port": "wave_inL" } },
        { "from": { "moduleId": "DELAY1", "port": "wave_out" }, "to": { "moduleId": "SPK1", "port": "wave_inR" } }
      ]
    }
  }
};

