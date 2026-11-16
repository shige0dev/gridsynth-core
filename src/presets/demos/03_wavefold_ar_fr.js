export const preset03 = {
  "bpm": 120,
  "pages": {
    "0": {
      "name": "03_VolcaModuler",
      "slots": {
        "0": "DIST4_1",
        "1": "DIST4_2",
        "2": "DIST4_3",
        "3": "CLK1",
        "4": "KEY1",
        "5": "SEQ16_1",
        "7": "SCOPE1",
        "11": "SCOPE2",
        "12": "VALUE8",
        "13": "SLIDER1",
        "14": "VALUE6",
        "15": "SUB1",
        "21": "SLIDER2",
        "22": "VALUE5",
        "23": "AR1",
        "24": "LFO1",
        "25": "VALUE3",
        "26": "VALUE4",
        "27": "RF1",
        "32": "VALUE7",
        "33": "SUB4",
        "34": "NOISE1",
        "35": "SH1",
        "40": "VALUE1",
        "41": "SUB2",
        "42": "VALUE2",
        "43": "SUB3",
        "45": "SCOPE4",
        "48": "SLIDER4",
        "49": "REVERB1",
        "50": "SPK1",
        "51": "SCOPE3"
      },
      "modules": {
        "DIST4_1": {
          "type": "DIST4",
          "steps": 4,
          "mode": "up"
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
        "CLK1": {
          "type": "CLK",
          "div": "x1",
          "pulseWidthMs": 30,
          "limitPct": 90
        },
        "KEY1": {
          "type": "KEY",
          "octave": 2,
          "root": 0,
          "scale": "CHROMATIC",
          "mask": [
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1
          ],
          "lastNote": "C2",
          "currentMidi": 36,
          "cv": 1,
          "legato": false
        },
        "SEQ16_1": {
          "type": "SEQ16",
          "quantize": true,
          "keyMode": "loop",
          "steps": [
            {
              "cv": 0,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0.25,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0.499998,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 1.083329,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0.666664,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 1.083329,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 1.083329,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 1.166662,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0.25,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0.749997,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0.499998,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0.83333,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0.916663,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0.749997,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0.749997,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0.749997,
              "active": true,
              "cvActive": true,
              "gate": true
            }
          ]
        },
        "SCOPE1": {
          "type": "SCOPE",
          "timeSpan": 0.05,
          "vRange": 2,
          "trigMode": "auto",
          "opacity": 0.8
        },
        "SCOPE2": {
          "type": "SCOPE",
          "timeSpan": 0.05,
          "vRange": 2,
          "trigMode": "auto",
          "opacity": 0.8
        },
        "VALUE8": {
          "type": "VALUE",
          "label": "MOD LVL",
          "val": 0.77,
          "min": 0,
          "max": 1,
          "def": 0.7,
          "step": 0.01,
          "stepType": "0.01",
          "name": "VALUE"
        },
        "SLIDER1": {
          "type": "VALUE",
          "label": "MOD LVL",
          "val": 0.5,
          "min": 0,
          "max": 1,
          "def": 0.7,
          "step": 0.01,
          "stepType": "0.01",
          "name": "VALUE"
        },
        "VALUE6": {
          "type": "VALUE",
          "label": "MOD LVL",
          "val": 0.32,
          "min": 0,
          "max": 1,
          "def": 0.7,
          "step": 0.01,
          "stepType": "0.01",
          "name": "VALUE"
        },
        "SUB1": {
          "type": "SUB",
          "targetPage": 1,
          "subType": "ComplexSource",
          "manifest": {
            "description": "volca modular SOURCE 構造の西海岸コンプレックス・オシレータ（Modulator + Carrier FM + Wavefolder）",
            "ports": {
              "cv_in": {
                "pin": "PIN5",
                "signal": "cv"
              },
              "mod_cv": {
                "pin": "PIN4",
                "signal": "cv"
              },
              "fold_cv": {
                "pin": "PIN3",
                "signal": "cv"
              },
              "wave_out": {
                "pin": "PIN10",
                "signal": "audio"
              },
              "mod_out": {
                "pin": "PIN11",
                "signal": "audio"
              }
            }
          }
        },
        "VALUE5": {
          "type": "VALUE",
          "label": "FOLD LVL",
          "val": 0.34,
          "min": 0,
          "max": 1,
          "def": 0.7,
          "step": 0.01,
          "stepType": "0.01",
          "name": "VALUE"
        },
        "SLIDER2": {
          "type": "VALUE",
          "label": "FOLD LVL",
          "val": 0.27,
          "min": 0,
          "max": 1,
          "def": 0.7,
          "step": 0.01,
          "stepType": "0.01",
          "name": "VALUE"
        },
        "AR1": {
          "type": "AR",
          "attack": 0.008,
          "release": 2.653434262630505,
          "level": 1
        },
        "LFO1": {
          "type": "LFO",
          "waveType": "sine",
          "polarity": "unipolar",
          "syncMode": "free",
          "division": "4/1",
          "period": 0.5,
          "rate": 2,
          "depth": 1,
          "phase": 0,
          "duty": 0.5
        },
        "VALUE4": {
          "type": "VALUE",
          "label": "FOLD LVL",
          "val": 0.1,
          "min": 0,
          "max": 1,
          "def": 0.7,
          "step": 0.01,
          "stepType": "0.01",
          "name": "VALUE"
        },
        "VALUE3": {
          "type": "VALUE",
          "label": "FOLD LVL",
          "val": 0.42,
          "min": 0,
          "max": 1,
          "def": 0.7,
          "step": 0.01,
          "stepType": "0.01",
          "name": "VALUE"
        },
        "RF1": {
          "type": "RF",
          "time": 1.2440525462210172,
          "peak": 0.11,
          "level": 0.9
        },
        "VALUE7": {
          "type": "VALUE",
          "label": "FOLD LVL",
          "val": 1,
          "min": 0,
          "max": 1,
          "def": 0.7,
          "step": 0.01,
          "stepType": "0.01",
          "name": "VALUE"
        },
        "SUB4": {
          "type": "SUB",
          "targetPage": 4
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
        "VALUE1": {
          "type": "VALUE",
          "label": "LPG ENV",
          "val": 1,
          "min": 0,
          "max": 1,
          "def": 1,
          "step": 0.01,
          "stepType": "0.01",
          "name": "VALUE"
        },
        "SUB2": {
          "type": "SUB",
          "targetPage": 2,
          "subType": "LowPassGate",
          "manifest": {
            "description": "バクトール風ローパスゲート（VCF + VCA セット＆VALUE 適用度調整）",
            "ports": {
              "wave_in": {
                "pin": "PIN5",
                "signal": "audio"
              },
              "cv_in": {
                "pin": "PIN4",
                "signal": "cv"
              },
              "wave_out": {
                "pin": "PIN10",
                "signal": "audio"
              }
            }
          }
        },
        "VALUE2": {
          "type": "VALUE",
          "label": "LPG ENV",
          "val": 0.92,
          "min": 0,
          "max": 1,
          "def": 1,
          "step": 0.01,
          "stepType": "0.01",
          "name": "VALUE"
        },
        "SUB3": {
          "type": "SUB",
          "targetPage": 3,
          "subType": "LowPassGate",
          "manifest": {
            "description": "バクトール風ローパスゲート（VCF + VCA セット＆VALUE 適用度調整）",
            "ports": {
              "wave_in": {
                "pin": "PIN5",
                "signal": "audio"
              },
              "cv_in": {
                "pin": "PIN4",
                "signal": "cv"
              },
              "wave_out": {
                "pin": "PIN10",
                "signal": "audio"
              }
            }
          }
        },
        "SLIDER4": {
          "type": "VALUE",
          "label": "SPACE",
          "val": 0.74,
          "min": 0,
          "max": 1,
          "def": 0.74,
          "step": 0.01,
          "stepType": "0.01",
          "name": "VALUE"
        },
        "REVERB1": {
          "type": "REVERB",
          "time": 4.2,
          "damp": 8500,
          "mix": 0.74,
          "cvDepth": 1,
          "mode": "space"
        },
        "SPK1": {
          "type": "SPK",
          "masterVol": 0.4
        },
        "SCOPE3": {
          "type": "SCOPE",
          "timeSpan": 1,
          "vRange": 2,
          "trigMode": "free",
          "opacity": 0.8
        },
        "SCOPE4": {
          "type": "SCOPE",
          "timeSpan": 1,
          "vRange": 2,
          "trigMode": "free",
          "opacity": 0.8
        }
      },
      "connections": [
        {
          "from": {
            "moduleId": "REVERB1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "SPK1",
            "port": "wave_in_l"
          }
        },
        {
          "from": {
            "moduleId": "REVERB1",
            "port": "wave_out_r"
          },
          "to": {
            "moduleId": "SPK1",
            "port": "wave_in_r"
          }
        },
        {
          "from": {
            "moduleId": "SLIDER4",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "REVERB1",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "CLK1",
            "port": "gate_out"
          },
          "to": {
            "moduleId": "DIST4_2",
            "port": "gate_in"
          }
        },
        {
          "from": {
            "moduleId": "CLK1",
            "port": "gate_out"
          },
          "to": {
            "moduleId": "DIST4_1",
            "port": "gate_in"
          }
        },
        {
          "from": {
            "moduleId": "CLK1",
            "port": "gate_out"
          },
          "to": {
            "moduleId": "SEQ16_1",
            "port": "gate_in"
          }
        },
        {
          "from": {
            "moduleId": "SUB2",
            "port": "PIN10_out"
          },
          "to": {
            "moduleId": "REVERB1",
            "port": "wave_in"
          }
        },
        {
          "from": {
            "moduleId": "SUB3",
            "port": "PIN10_out"
          },
          "to": {
            "moduleId": "REVERB1",
            "port": "wave_in"
          }
        },
        {
          "from": {
            "moduleId": "VALUE2",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "SUB3",
            "port": "PIN4_in"
          }
        },
        {
          "from": {
            "moduleId": "VALUE1",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "SUB2",
            "port": "PIN4_in"
          }
        },
        {
          "from": {
            "moduleId": "VALUE7",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "SUB4",
            "port": "PIN5_in"
          }
        },
        {
          "from": {
            "moduleId": "VALUE5",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "AR1",
            "port": "release_in"
          }
        },
        {
          "from": {
            "moduleId": "SLIDER2",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "AR1",
            "port": "attack_in"
          }
        },
        {
          "from": {
            "moduleId": "VALUE4",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "RF1",
            "port": "peak_cv"
          }
        },
        {
          "from": {
            "moduleId": "VALUE3",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "RF1",
            "port": "time_cv"
          }
        },
        {
          "from": {
            "moduleId": "SEQ16_1",
            "port": "gate_out"
          },
          "to": {
            "moduleId": "AR1",
            "port": "gate_in"
          }
        },
        {
          "from": {
            "moduleId": "VALUE8",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "SUB1",
            "port": "PIN3_in"
          }
        },
        {
          "from": {
            "moduleId": "SLIDER1",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "SUB1",
            "port": "PIN4_in"
          }
        },
        {
          "from": {
            "moduleId": "KEY1",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "SUB1",
            "port": "PIN5_in"
          }
        },
        {
          "from": {
            "moduleId": "SUB1",
            "port": "PIN11_out"
          },
          "to": {
            "moduleId": "SCOPE1",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "SUB1",
            "port": "PIN10_out"
          },
          "to": {
            "moduleId": "SCOPE2",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "SUB1",
            "port": "PIN10_out"
          },
          "to": {
            "moduleId": "SUB2",
            "port": "PIN5_in"
          }
        },
        {
          "from": {
            "moduleId": "REVERB1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "SCOPE3",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "CLK1",
            "port": "gate_out"
          },
          "to": {
            "moduleId": "DIST4_3",
            "port": "gate_in"
          }
        },
        {
          "from": {
            "moduleId": "SUB2",
            "port": "PIN10_out"
          },
          "to": {
            "moduleId": "SCOPE4",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "RF1",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "SUB2",
            "port": "PIN3_in"
          }
        },
        {
          "from": {
            "moduleId": "SEQ16_1",
            "port": "gate_out"
          },
          "to": {
            "moduleId": "RF1",
            "port": "trig_in"
          }
        },
        {
          "from": {
            "moduleId": "SUB1",
            "port": "PIN10_out"
          },
          "to": {
            "moduleId": "SCOPE2",
            "port": "trig_in"
          }
        },
        {
          "from": {
            "moduleId": "SUB1",
            "port": "PIN11_out"
          },
          "to": {
            "moduleId": "SCOPE1",
            "port": "trig_in"
          }
        }
      ]
    },
    "1": {
      "name": "SOURCE",
      "subType": "ComplexSource",
      "sourceTemplateId": "FACTORY_SOURCE",
      "manifest": {
        "description": "volca modular SOURCE 構造の西海岸コンプレックス・オシレータ（Modulator + Carrier FM + Wavefolder）",
        "ports": {
          "cv_in": {
            "pin": "PIN5",
            "signal": "cv"
          },
          "mod_cv": {
            "pin": "PIN4",
            "signal": "cv"
          },
          "fold_cv": {
            "pin": "PIN3",
            "signal": "cv"
          },
          "wave_out": {
            "pin": "PIN10",
            "signal": "audio"
          },
          "mod_out": {
            "pin": "PIN11",
            "signal": "audio"
          }
        }
      },
      "slots": {
        "2": "SUB_IO1",
        "4": "VCO1",
        "5": "FMCORE1",
        "6": "FMCORE2",
        "7": "FOLD1",
        "9": "SCOPE1",
        "10": "SCOPE2"
      },
      "modules": {
        "SUB_IO1": {
          "type": "SUB_IO"
        },
        "FMCORE1": {
          "type": "FMCORE",
          "level": 0.85,
          "ratio": 2,
          "fine": 0,
          "index": 1,
          "feedback": 0,
          "wave": "triangle",
          "rootMidi": 48
        },
        "FMCORE2": {
          "type": "FMCORE",
          "level": 0.85,
          "ratio": 1,
          "fine": 0,
          "index": 1.5,
          "feedback": 0,
          "wave": "triangle",
          "rootMidi": 48
        },
        "FOLD1": {
          "type": "FOLD",
          "gain": 1.5,
          "mix": 1,
          "shape": "fold"
        },
        "SCOPE1": {
          "type": "SCOPE",
          "timeSpan": 0.1,
          "vRange": 2,
          "trigMode": "auto",
          "opacity": 0.8
        },
        "SCOPE2": {
          "type": "SCOPE",
          "timeSpan": 0.1,
          "vRange": 2,
          "trigMode": "auto",
          "opacity": 0.8
        },
        "VCO1": {
          "type": "VCO",
          "channels": 1,
          "quantize": true,
          "wave": "sine",
          "freq1": 220,
          "freq2": 220,
          "freq3": 220,
          "freq4": 220
        }
      },
      "connections": [
        {
          "from": {
            "moduleId": "SUB_IO1",
            "port": "PIN5_out"
          },
          "to": {
            "moduleId": "FMCORE1",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "SUB_IO1",
            "port": "PIN5_out"
          },
          "to": {
            "moduleId": "FMCORE2",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "SUB_IO1",
            "port": "PIN4_out"
          },
          "to": {
            "moduleId": "FMCORE2",
            "port": "index_cv"
          }
        },
        {
          "from": {
            "moduleId": "SUB_IO1",
            "port": "PIN3_out"
          },
          "to": {
            "moduleId": "FOLD1",
            "port": "gain_cv"
          }
        },
        {
          "from": {
            "moduleId": "FMCORE1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "FMCORE2",
            "port": "mod_in"
          }
        },
        {
          "from": {
            "moduleId": "FMCORE1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "SUB_IO1",
            "port": "PIN11_in"
          }
        },
        {
          "from": {
            "moduleId": "FMCORE2",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "FOLD1",
            "port": "wave_in"
          }
        },
        {
          "from": {
            "moduleId": "FOLD1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "SUB_IO1",
            "port": "PIN10_in"
          }
        },
        {
          "from": {
            "moduleId": "FMCORE1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "SCOPE1",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "FMCORE2",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "SCOPE2",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "SUB_IO1",
            "port": "PIN5_out"
          },
          "to": {
            "moduleId": "VCO1",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "VCO1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "SCOPE1",
            "port": "trig_in"
          }
        },
        {
          "from": {
            "moduleId": "VCO1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "SCOPE2",
            "port": "trig_in"
          }
        }
      ]
    },
    "2": {
      "name": "LPG",
      "subType": "LowPassGate",
      "sourceTemplateId": "FACTORY_LPG",
      "manifest": {
        "description": "バクトール風ローパスゲート（VCF + VCA セット＆VALUE 適用度調整）",
        "ports": {
          "wave_in": {
            "pin": "PIN5",
            "signal": "audio"
          },
          "cv_in": {
            "pin": "PIN4",
            "signal": "cv"
          },
          "wave_out": {
            "pin": "PIN10",
            "signal": "audio"
          }
        }
      },
      "slots": {
        "2": "SUB_IO1",
        "5": "VCF1",
        "6": "VCA1",
        "9": "MATH2_1"
      },
      "modules": {
        "SUB_IO1": {
          "type": "SUB_IO"
        },
        "VCF1": {
          "type": "VCF",
          "filterType": "lowpass",
          "cutoff": 420,
          "q": 6,
          "modDepth": 2600
        },
        "VCA1": {
          "type": "VCA",
          "level": 0,
          "cvDepth": 1
        },
        "MATH2_1": {
          "type": "MATH2",
          "mode": "MULTI",
          "valA": 0,
          "valB": 1
        }
      },
      "connections": [
        {
          "from": {
            "moduleId": "SUB_IO1",
            "port": "PIN5_out"
          },
          "to": {
            "moduleId": "VCF1",
            "port": "wave_in"
          }
        },
        {
          "from": {
            "moduleId": "VCF1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "VCA1",
            "port": "wave_in"
          }
        },
        {
          "from": {
            "moduleId": "SUB_IO1",
            "port": "PIN4_out"
          },
          "to": {
            "moduleId": "MATH2_1",
            "port": "cv_in_a"
          }
        },
        {
          "from": {
            "moduleId": "MATH2_1",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "VCF1",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "MATH2_1",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "VCA1",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "VCA1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "SUB_IO1",
            "port": "PIN10_in"
          }
        },
        {
          "from": {
            "moduleId": "SUB_IO1",
            "port": "PIN3_out"
          },
          "to": {
            "moduleId": "MATH2_1",
            "port": "cv_in_b"
          }
        }
      ]
    },
    "3": {
      "name": "LPG_1",
      "subType": "LowPassGate",
      "sourceTemplateId": "FACTORY_LPG",
      "manifest": {
        "description": "バクトール風ローパスゲート（VCF + VCA セット＆VALUE 適用度調整）",
        "ports": {
          "wave_in": {
            "pin": "PIN5",
            "signal": "audio"
          },
          "cv_in": {
            "pin": "PIN4",
            "signal": "cv"
          },
          "wave_out": {
            "pin": "PIN10",
            "signal": "audio"
          }
        }
      },
      "slots": {
        "2": "SUB_IO1",
        "5": "VCF1",
        "6": "VCA1",
        "9": "MATH2_1",
        "10": "VALUE_1"
      },
      "modules": {
        "SUB_IO1": {
          "type": "SUB_IO"
        },
        "VCF1": {
          "type": "VCF",
          "filterType": "lowpass",
          "cutoff": 420,
          "q": 6,
          "modDepth": 2600
        },
        "VCA1": {
          "type": "VCA",
          "level": 0,
          "cvDepth": 1
        },
        "MATH2_1": {
          "type": "MATH2",
          "mode": "MULTI",
          "valA": 0,
          "valB": 1
        },
        "VALUE_1": {
          "type": "VALUE",
          "label": "AMOUNT",
          "val": 1,
          "min": 0,
          "max": 1,
          "def": 1,
          "step": 0.01,
          "stepType": "0.01",
          "name": "VALUE"
        }
      },
      "connections": [
        {
          "from": {
            "moduleId": "SUB_IO1",
            "port": "PIN5_out"
          },
          "to": {
            "moduleId": "VCF1",
            "port": "wave_in"
          }
        },
        {
          "from": {
            "moduleId": "VCF1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "VCA1",
            "port": "wave_in"
          }
        },
        {
          "from": {
            "moduleId": "SUB_IO1",
            "port": "PIN4_out"
          },
          "to": {
            "moduleId": "MATH2_1",
            "port": "cv_in_a"
          }
        },
        {
          "from": {
            "moduleId": "MATH2_1",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "VCF1",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "MATH2_1",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "VCA1",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "VCA1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "SUB_IO1",
            "port": "PIN10_in"
          }
        },
        {
          "from": {
            "moduleId": "SUB_IO1",
            "port": "PIN3_out"
          },
          "to": {
            "moduleId": "MATH2_1",
            "port": "cv_in_b"
          }
        }
      ]
    },
    "4": {
      "name": "A+BxC A-BxC",
      "slots": {
        "2": "SUB_IO1",
        "6": "MATH2_1",
        "10": "MATH2_2"
      },
      "modules": {
        "SUB_IO1": {
          "type": "SUB_IO"
        },
        "MATH2_1": {
          "type": "MATH2",
          "mode": "ADD",
          "valA": 0,
          "valB": 1
        },
        "MATH2_2": {
          "type": "MATH2",
          "mode": "MULTI",
          "valA": 0,
          "valB": 1
        }
      },
      "connections": [
        {
          "from": {
            "moduleId": "SUB_IO1",
            "port": "PIN3_out"
          },
          "to": {
            "moduleId": "MATH2_1",
            "port": "cv_in_a"
          }
        },
        {
          "from": {
            "moduleId": "SUB_IO1",
            "port": "PIN4_out"
          },
          "to": {
            "moduleId": "MATH2_2",
            "port": "cv_in_a"
          }
        },
        {
          "from": {
            "moduleId": "SUB_IO1",
            "port": "PIN5_out"
          },
          "to": {
            "moduleId": "MATH2_2",
            "port": "cv_in_b"
          }
        },
        {
          "from": {
            "moduleId": "MATH2_2",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "MATH2_1",
            "port": "cv_in_b"
          }
        },
        {
          "from": {
            "moduleId": "MATH2_1",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "SUB_IO1",
            "port": "PIN10_in"
          }
        }
      ]
    }
  }
};
