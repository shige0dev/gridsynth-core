export const preset09 = {
  "bpm": 74,
  "grid": {
    "cols": 4,
    "rows": 32
  },
  "pages": {
    "0": {
      "name": "FM Neo-Soul Trio",
      "slots": {
        "0": "CLK1",
        "8": "SEQ16_1",
        "9": "KEY1",
        "10": "FM1",
        "11": "DELAY1",
        "15": "REVERB1",
        "16": "SEQ16_2",
        "17": "FM2",
        "24": "SEQ16_3",
        "25": "FM3",
        "32": "MIX1",
        "33": "SCOPE1",
        "34": "SPK1"
      },
      "modules": {
        "CLK1": {
          "type": "CLK",
          "div": "x8",
          "pulseWidthMs": 30,
          "limitPct": 50
        },
        "KEY1": {
          "type": "KEY",
          "octave": 2,
          "lastNote": "C2",
          "currentMidi": 60
        },
        "SEQ16_1": {
          "type": "SEQ16",
          "quantize": true,
          "steps": [
            {
              "cv": 0.42,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 1,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0.5,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0.42,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0.67,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0.67,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            }
          ]
        },
        "FM1": {
          "type": "FMx3",
          "algorithm": 2,
          "rootMidi": 53,
          "op1": {
            "ratio": 0.25,
            "level": 0.95,
            "attack": 0.003,
            "decay": 2.4,
            "sustain": 0,
            "release": 0.6,
            "aCurve": "lin",
            "dCurve": "lin",
            "rCurve": "lin",
            "curve": "lin",
            "attackCurve": 0,
            "decayCurve": 0,
            "releaseCurve": 0
          },
          "op2": {
            "ratio": 2.25,
            "level": 0.55,
            "attack": 0.001,
            "decay": 0.15,
            "sustain": 0,
            "release": 0.05,
            "aCurve": "lin",
            "dCurve": "lin",
            "rCurve": "lin",
            "curve": "lin",
            "attackCurve": 0,
            "decayCurve": 0,
            "releaseCurve": 0
          },
          "op3": {
            "ratio": 1,
            "level": 0.6,
            "feedback": 0.12,
            "wave": "sine",
            "attack": 0.003,
            "decay": 0.9,
            "sustain": 0,
            "release": 0.3,
            "aCurve": "lin",
            "dCurve": "lin",
            "rCurve": "lin",
            "curve": "lin",
            "attackCurve": 0,
            "decayCurve": 0,
            "releaseCurve": 0
          }
        },
        "DELAY1": {
          "type": "DELAY",
          "delayTime": 0.302,
          "feedback": 0.08,
          "mix": 0.06
        },
        "REVERB1": {
          "type": "REVERB",
          "time": 2.8,
          "damp": 3800,
          "mix": 0.3,
          "cvDepth": 1,
          "mode": "hall"
        },
        "SEQ16_2": {
          "type": "SEQ16",
          "quantize": true,
          "steps": [
            {
              "cv": 0,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": true,
              "gate": true
            }
          ]
        },
        "FM2": {
          "type": "FMx3",
          "algorithm": 1,
          "rootMidi": 41,
          "op1": {
            "ratio": 0.75,
            "level": 0.95,
            "attack": 0.0005,
            "decay": 0.4186588609600563,
            "sustain": 0,
            "release": 0.08,
            "aCurve": "exp",
            "dCurve": "lin",
            "rCurve": "lin",
            "curve": "lin",
            "attackCurve": -0.75,
            "decayCurve": 0,
            "releaseCurve": 0
          },
          "op2": {
            "ratio": 0.25,
            "level": 3.4,
            "attack": 0.0038974878726873467,
            "decay": 0.15635730907985662,
            "sustain": 0,
            "release": 0.02,
            "aCurve": "exp",
            "dCurve": "exp",
            "rCurve": "lin",
            "curve": "lin",
            "attackCurve": -0.75,
            "decayCurve": -0.75,
            "releaseCurve": 0
          },
          "op3": {
            "ratio": 1,
            "level": 0,
            "feedback": 0,
            "wave": "noise",
            "attack": 0.001,
            "decay": 0.015,
            "sustain": 0,
            "release": 0.01,
            "aCurve": "lin",
            "dCurve": "lin",
            "rCurve": "lin",
            "curve": "lin",
            "attackCurve": 0,
            "decayCurve": 0,
            "releaseCurve": 0
          }
        },
        "SEQ16_3": {
          "type": "SEQ16",
          "quantize": true,
          "steps": [
            {
              "cv": 0.42,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0.42,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0.4583315,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0.666664,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 1.17,
              "active": true,
              "cvActive": true,
              "gate": false
            },
            {
              "cv": 0.416665,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 1,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0.499998,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 0,
              "active": true,
              "cvActive": false,
              "gate": false
            },
            {
              "cv": 0.58,
              "active": true,
              "cvActive": true,
              "gate": true
            },
            {
              "cv": 1,
              "active": true,
              "cvActive": true,
              "gate": false
            }
          ]
        },
        "FM3": {
          "type": "FMx3",
          "algorithm": 1,
          "rootMidi": 41,
          "op1": {
            "ratio": 1,
            "level": 0.78,
            "attack": 0.004,
            "decay": 0.65,
            "sustain": 0.15,
            "release": 0.15,
            "aCurve": "lin",
            "dCurve": "lin",
            "rCurve": "lin",
            "curve": "lin",
            "attackCurve": 0,
            "decayCurve": 0,
            "releaseCurve": 0
          },
          "op2": {
            "ratio": 1,
            "level": 1.75,
            "attack": 0.002,
            "decay": 0.25,
            "sustain": 0,
            "release": 0.05,
            "aCurve": "lin",
            "dCurve": "lin",
            "rCurve": "lin",
            "curve": "lin",
            "attackCurve": 0,
            "decayCurve": 0,
            "releaseCurve": 0
          },
          "op3": {
            "ratio": 1,
            "level": 0.15,
            "feedback": 0.08,
            "wave": "sine",
            "attack": 0.003,
            "decay": 0.15,
            "sustain": 0,
            "release": 0.05,
            "aCurve": "lin",
            "dCurve": "lin",
            "rCurve": "lin",
            "curve": "lin",
            "attackCurve": 0,
            "decayCurve": 0,
            "releaseCurve": 0
          }
        },
        "MIX1": {
          "type": "MIX",
          "channels": 4,
          "lvl1": 0.33,
          "lvl2": 0.68,
          "lvl3": 0.28,
          "lvl4": 0
        },
        "SCOPE1": {
          "type": "SCOPE",
          "timeSpan": 0.1,
          "vRange": 2,
          "trigMode": "auto",
          "opacity": 0.8
        },
        "SPK1": {
          "type": "SPK",
          "masterVol": 0.25
        }
      },
      "connections": [
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
            "moduleId": "CLK1",
            "port": "gate_out"
          },
          "to": {
            "moduleId": "SEQ16_2",
            "port": "gate_in"
          }
        },
        {
          "from": {
            "moduleId": "CLK1",
            "port": "gate_out"
          },
          "to": {
            "moduleId": "SEQ16_3",
            "port": "gate_in"
          }
        },
        {
          "from": {
            "moduleId": "CLK1",
            "port": "gate_out"
          },
          "to": {
            "moduleId": "SCOPE1",
            "port": "trig_in"
          }
        },
        {
          "from": {
            "moduleId": "KEY1",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "FM1",
            "port": "pitch_in"
          }
        },
        {
          "from": {
            "moduleId": "SEQ16_1",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "FM1",
            "port": "pitch_in"
          }
        },
        {
          "from": {
            "moduleId": "SEQ16_1",
            "port": "gate_out"
          },
          "to": {
            "moduleId": "FM1",
            "port": "gate_in"
          }
        },
        {
          "from": {
            "moduleId": "FM1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "DELAY1",
            "port": "wave_in"
          }
        },
        {
          "from": {
            "moduleId": "DELAY1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "REVERB1",
            "port": "wave_in"
          }
        },
        {
          "from": {
            "moduleId": "REVERB1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "MIX1",
            "port": "wave_in1"
          }
        },
        {
          "from": {
            "moduleId": "SEQ16_2",
            "port": "gate_out"
          },
          "to": {
            "moduleId": "FM2",
            "port": "gate_in"
          }
        },
        {
          "from": {
            "moduleId": "FM2",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "MIX1",
            "port": "wave_in2"
          }
        },
        {
          "from": {
            "moduleId": "SEQ16_3",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "FM3",
            "port": "pitch_in"
          }
        },
        {
          "from": {
            "moduleId": "SEQ16_3",
            "port": "gate_out"
          },
          "to": {
            "moduleId": "FM3",
            "port": "gate_in"
          }
        },
        {
          "from": {
            "moduleId": "FM3",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "MIX1",
            "port": "wave_in3"
          }
        },
        {
          "from": {
            "moduleId": "MIX1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "SCOPE1",
            "port": "wave_in"
          }
        },
        {
          "from": {
            "moduleId": "MIX1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "SPK1",
            "port": "wave_inL"
          }
        },
        {
          "from": {
            "moduleId": "MIX1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "SPK1",
            "port": "wave_inR"
          }
        }
      ]
    }
  }
};
