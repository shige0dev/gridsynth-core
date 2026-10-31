export const preset03 = {
  "bpm": 120,
  "pages": {
    "0": {
      "name": "03_WAVEFOLD AR FR",
      "slots": {
        "0": "CLK1",
        "1": "KEY1",
        "5": "SEQ16_1",
        "6": "VCO1",
        "7": "FOLD1",
        "10": "DIST4_1",
        "12": "AR1",
        "15": "DIST4_2",
        "17": "RF1",
        "19": "LFO1",
        "20": "DIST4_3",
        "22": "VCF1",
        "23": "VCA1",
        "25": "NOISE1",
        "26": "SH1",
        "27": "VCF2",
        "28": "VCA2",
        "29": "REVERB1",
        "30": "SLIDER1",
        "31": "MATH2_3",
        "32": "MATH2_1",
        "33": "DELAY2",
        "34": "DELAY1",
        "35": "SLIDER2",
        "36": "MATH2_4",
        "37": "MATH2_2",
        "39": "SPK1"
      },
      "modules": {
        "CLK1": {
          "type": "CLK",
          "div": "/4",
          "pulseWidthMs": 30,
          "limitPct": 90
        },
        "AR1": {
          "type": "AR",
          "attack": 0.008,
          "release": 2.653434262630505,
          "level": 1
        },
        "RF1": {
          "type": "RF",
          "time": 1.2440525462210172,
          "peak": 0.11,
          "level": 0.9
        },
        "VCF1": {
          "type": "VCF",
          "cutoff": 420,
          "q": 6,
          "filterType": "lowpass",
          "modDepth": 2600
        },
        "VCA1": {
          "type": "VCA",
          "level": 0,
          "cvDepth": 1
        },
        "VCF2": {
          "type": "VCF",
          "cutoff": 2290,
          "q": 6,
          "filterType": "lowpass",
          "modDepth": 2600
        },
        "VCA2": {
          "type": "VCA",
          "level": 0.54,
          "cvDepth": 0.2
        },
        "DELAY1": {
          "type": "DELAY",
          "delayTime": 0.77,
          "feedback": 0.6,
          "mix": 0.72
        },
        "SPK1": {
          "type": "SPK",
          "masterVol": 0.4
        },
        "LFO1": {
          "type": "LFO",
          "waveType": "sine",
          "polarity": "unipolar",
          "syncMode": "free",
          "division": "4/1",
          "rate": 0.05,
          "depth": 1,
          "phase": 0,
          "duty": 0.5
        },
        "DIST4_1": {
          "type": "DIST4",
          "steps": 4,
          "mode": "up"
        },
        "KEY1": {
          "type": "KEY",
          "octave": 4,
          "lastNote": "C4",
          "currentMidi": 60
        },
        "DIST4_2": {
          "type": "DIST4",
          "steps": 3,
          "mode": "up"
        },
        "DIST4_3": {
          "type": "DIST4",
          "steps": 2,
          "mode": "up"
        },
        "SEQ16_1": {
          "type": "SEQ16",
          "quantize": true,
          "steps": [
            { "cv": 0, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.499998, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.083329, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.666664, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.083329, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.083329, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.166662, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.749997, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.499998, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.83333, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.916663, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.749997, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.749997, "active": true, "cvActive": true, "gate": true },
            { "cv": 0.749997, "active": true, "cvActive": true, "gate": true }
          ]
        },
        "REVERB1": {
          "type": "REVERB",
          "time": 2.7,
          "damp": 8500,
          "mix": 0.74,
          "cvDepth": 1,
          "mode": "hall"
        },
        "NOISE1": {
          "type": "NOISE",
          "noiseType": "white",
          "tone": 8000,
          "level": 0.8
        },
        "SH1": {
          "type": "SH",
          "glide": 0,
          "scale": 1,
          "polarity": "unipolar"
        },
        "MATH2_1": {
          "type": "MATH2",
          "mode": "ADD",
          "valA": 0,
          "valB": 1
        },
        "MATH2_2": {
          "type": "MATH2",
          "mode": "ADD",
          "valA": 0,
          "valB": 1
        },
        "MATH2_3": {
          "type": "MATH2",
          "mode": "ADD",
          "valA": 0,
          "valB": 1
        },
        "MATH2_4": {
          "type": "MATH2",
          "mode": "ADD",
          "valA": 0,
          "valB": 1
        },
        "SLIDER1": {
          "type": "SLIDER",
          "vol": 0.7
        },
        "SLIDER2": {
          "type": "SLIDER",
          "vol": 0.7
        },
        "VCO1": {
          "type": "VCO",
          "wave": "triangle",
          "freq1": 110,
          "channels": 1
        },
        "FOLD1": {
          "type": "FOLD",
          "gain": 2.2,
          "mix": 1.0
        },
        "DELAY2": {
          "type": "DELAY",
          "delayTime": 0.08700000000000001,
          "feedback": 0.79,
          "mix": 0.82
        }
      },
      "connections": [
        { "from": { "moduleId": "VCF1", "port": "wave_out" }, "to": { "moduleId": "VCA1", "port": "wave_in" } },
        { "from": { "moduleId": "DELAY1", "port": "wave_out" }, "to": { "moduleId": "SPK1", "port": "wave_in_l" } },
        { "from": { "moduleId": "DELAY1", "port": "wave_out" }, "to": { "moduleId": "SPK1", "port": "wave_in_r" } },
        { "from": { "moduleId": "AR1", "port": "cv_out" }, "to": { "moduleId": "VCA1", "port": "cv_in" } },
        { "from": { "moduleId": "AR1", "port": "cv_out" }, "to": { "moduleId": "VCF1", "port": "cv_in" } },
        { "from": { "moduleId": "VCF2", "port": "wave_out" }, "to": { "moduleId": "VCA2", "port": "wave_in" } },
        { "from": { "moduleId": "LFO1", "port": "cv_out" }, "to": { "moduleId": "AR1", "port": "attack_in" } },
        { "from": { "moduleId": "DIST4_1", "port": "cv_out4" }, "to": { "moduleId": "RF1", "port": "trig_in" } },
        { "from": { "moduleId": "CLK1", "port": "gate_out" }, "to": { "moduleId": "DIST4_2", "port": "gate_in" } },
        { "from": { "moduleId": "CLK1", "port": "gate_out" }, "to": { "moduleId": "DIST4_3", "port": "gate_in" } },
        { "from": { "moduleId": "CLK1", "port": "gate_out" }, "to": { "moduleId": "DIST4_1", "port": "gate_in" } },
        { "from": { "moduleId": "CLK1", "port": "gate_out" }, "to": { "moduleId": "SEQ16_1", "port": "gate_in" } },
        { "from": { "moduleId": "SEQ16_1", "port": "gate_out" }, "to": { "moduleId": "AR1", "port": "gate_in" } },
        { "from": { "moduleId": "VCA1", "port": "wave_out" }, "to": { "moduleId": "REVERB1", "port": "wave_in" } },
        { "from": { "moduleId": "REVERB1", "port": "wave_out" }, "to": { "moduleId": "DELAY1", "port": "wave_in" } },
        { "from": { "moduleId": "KEY1", "port": "cv_out" }, "to": { "moduleId": "VCO1", "port": "cv_in" } },
        { "from": { "moduleId": "SEQ16_1", "port": "cv_out" }, "to": { "moduleId": "VCO1", "port": "cv_in" } },
        { "from": { "moduleId": "VCO1", "port": "wave_out" }, "to": { "moduleId": "FOLD1", "port": "wave_in" } },
        { "from": { "moduleId": "FOLD1", "port": "wave_out" }, "to": { "moduleId": "VCF1", "port": "wave_in" } },
        { "from": { "moduleId": "RF1", "port": "cv_out" }, "to": { "moduleId": "FOLD1", "port": "gain_cv" } },
        { "from": { "moduleId": "NOISE1", "port": "wave_out" }, "to": { "moduleId": "VCF2", "port": "wave_in" } },
        { "from": { "moduleId": "LFO1", "port": "cv_out" }, "to": { "moduleId": "VCA2", "port": "cv_in" } },
        { "from": { "moduleId": "LFO1", "port": "cv_out" }, "to": { "moduleId": "VCF2", "port": "cv_in" } },
        { "from": { "moduleId": "VCA2", "port": "wave_out" }, "to": { "moduleId": "DELAY2", "port": "wave_in" } },
        { "from": { "moduleId": "DELAY2", "port": "wave_out" }, "to": { "moduleId": "REVERB1", "port": "wave_in" } }
      ]
    }
  }
};

