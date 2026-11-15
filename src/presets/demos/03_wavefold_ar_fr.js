export const preset03 = {
  "bpm": 120,
  "pages": {
    "0": {
      "name": "03_WAVEFOLD AR FR",
      "slots": {
        "0": "CLK1",
        "1": "KEY1",
        "2": "SEQ16_1",
        "3": "DIST4_1",
        "4": "DIST4_2",
        "5": "SUB1",
        "6": "SLIDER1",
        "7": "MATH2_1",
        "8": "SLIDER2",
        "9": "MATH2_2",
        "10": "AR1",
        "11": "RF1",
        "12": "LFO1",
        "13": "SLIDER3",
        "14": "MATH2_3",
        "15": "VCF1",
        "16": "VCA1",
        "17": "VCF2",
        "18": "VCA2",
        "20": "NOISE1",
        "21": "SH1",
        "22": "DIST4_3",
        "25": "REVERB1",
        "26": "SLIDER4",
        "29": "SPK1"
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
        }
      },
      "connections": [
        { "from": { "moduleId": "VCF1", "port": "wave_out" }, "to": { "moduleId": "VCA1", "port": "wave_in" } },
        { "from": { "moduleId": "REVERB1", "port": "wave_out" }, "to": { "moduleId": "SPK1", "port": "wave_in_l" } },
        { "from": { "moduleId": "REVERB1", "port": "wave_out" }, "to": { "moduleId": "SPK1", "port": "wave_in_r" } },
        { "from": { "moduleId": "AR1", "port": "cv_out" }, "to": { "moduleId": "MATH2_3", "port": "cv_in_a" } },
        { "from": { "moduleId": "SLIDER3", "port": "cv_out" }, "to": { "moduleId": "MATH2_3", "port": "cv_in_b" } },
        { "from": { "moduleId": "MATH2_3", "port": "cv_out" }, "to": { "moduleId": "VCA1", "port": "cv_in" } },
        { "from": { "moduleId": "MATH2_3", "port": "cv_out" }, "to": { "moduleId": "VCF1", "port": "cv_in" } },
        { "from": { "moduleId": "SLIDER4", "port": "cv_out" }, "to": { "moduleId": "REVERB1", "port": "cv_in" } },
        { "from": { "moduleId": "VCF2", "port": "wave_out" }, "to": { "moduleId": "VCA2", "port": "wave_in" } },
        { "from": { "moduleId": "LFO1", "port": "cv_out" }, "to": { "moduleId": "AR1", "port": "attack_in" } },
        { "from": { "moduleId": "DIST4_1", "port": "cv_out4" }, "to": { "moduleId": "RF1", "port": "trig_in" } },
        { "from": { "moduleId": "CLK1", "port": "gate_out" }, "to": { "moduleId": "DIST4_2", "port": "gate_in" } },
        { "from": { "moduleId": "CLK1", "port": "gate_out" }, "to": { "moduleId": "DIST4_3", "port": "gate_in" } },
        { "from": { "moduleId": "CLK1", "port": "gate_out" }, "to": { "moduleId": "DIST4_1", "port": "gate_in" } },
        { "from": { "moduleId": "CLK1", "port": "gate_out" }, "to": { "moduleId": "SEQ16_1", "port": "gate_in" } },
        { "from": { "moduleId": "SEQ16_1", "port": "gate_out" }, "to": { "moduleId": "AR1", "port": "gate_in" } },
        { "from": { "moduleId": "VCA1", "port": "wave_out" }, "to": { "moduleId": "REVERB1", "port": "wave_in" } },
        { "from": { "moduleId": "KEY1", "port": "cv_out" }, "to": { "moduleId": "SUB1", "port": "PIN5_in" } },
        { "from": { "moduleId": "SEQ16_1", "port": "cv_out" }, "to": { "moduleId": "SUB1", "port": "PIN5_in" } },
        { "from": { "moduleId": "SUB1", "port": "PIN10_out" }, "to": { "moduleId": "VCF1", "port": "wave_in" } },
        { "from": { "moduleId": "RF1", "port": "cv_out" }, "to": { "moduleId": "MATH2_2", "port": "cv_in_a" } },
        { "from": { "moduleId": "SLIDER2", "port": "cv_out" }, "to": { "moduleId": "MATH2_2", "port": "cv_in_b" } },
        { "from": { "moduleId": "MATH2_2", "port": "cv_out" }, "to": { "moduleId": "SUB1", "port": "PIN3_in" } },
        { "from": { "moduleId": "NOISE1", "port": "wave_out" }, "to": { "moduleId": "SH1", "port": "cv_in" } },
        { "from": { "moduleId": "DIST4_2", "port": "cv_out3" }, "to": { "moduleId": "SH1", "port": "trig_in" } },
        { "from": { "moduleId": "SH1", "port": "cv_out" }, "to": { "moduleId": "MATH2_1", "port": "cv_in_a" } },
        { "from": { "moduleId": "SLIDER1", "port": "cv_out" }, "to": { "moduleId": "MATH2_1", "port": "cv_in_b" } },
        { "from": { "moduleId": "MATH2_1", "port": "cv_out" }, "to": { "moduleId": "SUB1", "port": "PIN4_in" } },
        { "from": { "moduleId": "NOISE1", "port": "wave_out" }, "to": { "moduleId": "VCF2", "port": "wave_in" } },
        { "from": { "moduleId": "LFO1", "port": "cv_out" }, "to": { "moduleId": "VCA2", "port": "cv_in" } },
        { "from": { "moduleId": "LFO1", "port": "cv_out" }, "to": { "moduleId": "VCF2", "port": "cv_in" } },
        { "from": { "moduleId": "VCA2", "port": "wave_out" }, "to": { "moduleId": "REVERB1", "port": "wave_in" } }
      ]
    }
  }
};

