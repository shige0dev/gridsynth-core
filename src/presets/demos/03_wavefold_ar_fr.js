export const preset03 = {
  "bpm": 120,
  "pages": {
    "0": {
      "name": "03_WAVEFOLD AR FR",
      "slots": {
        "0": "SUB1",
        "1": "SLIDER1",
        "2": "SLIDER2",
        "4": "CLK1",
        "9": "SEQ16_1",
        "10": "AR1",
        "11": "RF1",
        "12": "LFO1",
        "14": "KEY1",
        "19": "DIST4_1",
        "20": "SUB2",
        "21": "SUB3",
        "22": "SLIDER3",
        "24": "DIST4_2",
        "30": "MATH2_1",
        "31": "MATH2_2",
        "32": "MATH2_3",
        "34": "NOISE1",
        "39": "SH1",
        "40": "REVERB1",
        "41": "SLIDER4",
        "44": "DIST4_3",
        "50": "SPK1"
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
          "mode": "MULTI",
          "valA": 0,
          "valB": 1
        },
        "MATH2_2": {
          "type": "MATH2",
          "mode": "MULTI",
          "valA": 0,
          "valB": 1
        },
        "MATH2_3": {
          "type": "MATH2",
          "mode": "MULTI",
          "valA": 0,
          "valB": 1
        },
        "SLIDER1": {
          "type": "VALUE",
          "label": "MOD LVL",
          "val": 0.7,
          "min": 0,
          "max": 1,
          "def": 0.7
        },
        "SLIDER2": {
          "type": "VALUE",
          "label": "FOLD LVL",
          "val": 0.7,
          "min": 0,
          "max": 1,
          "def": 0.7
        },
        "SLIDER3": {
          "type": "VALUE",
          "label": "LPG ENV",
          "val": 1.0,
          "min": 0,
          "max": 1,
          "def": 1.0
        },
        "SLIDER4": {
          "type": "VALUE",
          "label": "SPACE",
          "val": 0.74,
          "min": 0,
          "max": 1,
          "def": 0.74
        },
        "SUB1": {
          "type": "SUB",
          "subType": "ComplexSource"
        },
        "SUB2": {
          "type": "SUB",
          "subType": "LowPassGate"
        },
        "SUB3": {
          "type": "SUB",
          "subType": "LowPassGate"
        }
      },
      "connections": [
        { "from": { "moduleId": "REVERB1", "port": "wave_out" }, "to": { "moduleId": "SPK1", "port": "wave_in_l" } },
        { "from": { "moduleId": "REVERB1", "port": "wave_out" }, "to": { "moduleId": "SPK1", "port": "wave_in_r" } },
        { "from": { "moduleId": "AR1", "port": "cv_out" }, "to": { "moduleId": "MATH2_3", "port": "cv_in_a" } },
        { "from": { "moduleId": "SLIDER3", "port": "cv_out" }, "to": { "moduleId": "MATH2_3", "port": "cv_in_b" } },
        { "from": { "moduleId": "MATH2_3", "port": "cv_out" }, "to": { "moduleId": "SUB2", "port": "PIN4_in" } },
        { "from": { "moduleId": "SLIDER4", "port": "cv_out" }, "to": { "moduleId": "REVERB1", "port": "cv_in" } },
        { "from": { "moduleId": "LFO1", "port": "cv_out" }, "to": { "moduleId": "AR1", "port": "attack_in" } },
        { "from": { "moduleId": "DIST4_1", "port": "cv_out4" }, "to": { "moduleId": "RF1", "port": "trig_in" } },
        { "from": { "moduleId": "CLK1", "port": "gate_out" }, "to": { "moduleId": "DIST4_2", "port": "gate_in" } },
        { "from": { "moduleId": "CLK1", "port": "gate_out" }, "to": { "moduleId": "DIST4_3", "port": "gate_in" } },
        { "from": { "moduleId": "CLK1", "port": "gate_out" }, "to": { "moduleId": "DIST4_1", "port": "gate_in" } },
        { "from": { "moduleId": "CLK1", "port": "gate_out" }, "to": { "moduleId": "SEQ16_1", "port": "gate_in" } },
        { "from": { "moduleId": "SEQ16_1", "port": "gate_out" }, "to": { "moduleId": "AR1", "port": "gate_in" } },
        { "from": { "moduleId": "SUB2", "port": "PIN10_out" }, "to": { "moduleId": "REVERB1", "port": "wave_in" } },
        { "from": { "moduleId": "KEY1", "port": "cv_out" }, "to": { "moduleId": "SUB1", "port": "PIN5_in" } },
        { "from": { "moduleId": "SEQ16_1", "port": "cv_out" }, "to": { "moduleId": "SUB1", "port": "PIN5_in" } },
        { "from": { "moduleId": "SUB1", "port": "PIN10_out" }, "to": { "moduleId": "SUB2", "port": "PIN5_in" } },
        { "from": { "moduleId": "RF1", "port": "cv_out" }, "to": { "moduleId": "MATH2_2", "port": "cv_in_a" } },
        { "from": { "moduleId": "SLIDER2", "port": "cv_out" }, "to": { "moduleId": "MATH2_2", "port": "cv_in_b" } },
        { "from": { "moduleId": "MATH2_2", "port": "cv_out" }, "to": { "moduleId": "SUB1", "port": "PIN3_in" } },
        { "from": { "moduleId": "NOISE1", "port": "wave_out" }, "to": { "moduleId": "SH1", "port": "cv_in" } },
        { "from": { "moduleId": "DIST4_2", "port": "cv_out3" }, "to": { "moduleId": "SH1", "port": "trig_in" } },
        { "from": { "moduleId": "SH1", "port": "cv_out" }, "to": { "moduleId": "MATH2_1", "port": "cv_in_a" } },
        { "from": { "moduleId": "SLIDER1", "port": "cv_out" }, "to": { "moduleId": "MATH2_1", "port": "cv_in_b" } },
        { "from": { "moduleId": "MATH2_1", "port": "cv_out" }, "to": { "moduleId": "SUB1", "port": "PIN4_in" } },
        { "from": { "moduleId": "NOISE1", "port": "wave_out" }, "to": { "moduleId": "SUB3", "port": "PIN5_in" } },
        { "from": { "moduleId": "LFO1", "port": "cv_out" }, "to": { "moduleId": "SUB3", "port": "PIN4_in" } },
        { "from": { "moduleId": "SUB3", "port": "PIN10_out" }, "to": { "moduleId": "REVERB1", "port": "wave_in" } }
      ]
    }
  }
};

