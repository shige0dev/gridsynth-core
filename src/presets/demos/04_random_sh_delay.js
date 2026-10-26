export const preset04 = {
  "bpm": 120,
  "pages": {
    "0": {
      "name": "",
      "slots": {
        "0": "CLK1",
        "1": "SH1",
        "2": "VCO1",
        "3": "VCF1",
        "4": "SPK1",
        "6": "SCALE1",
        "8": "DELAY1",
        "11": "KEY1"
      },
      "modules": {
        "CLK1": {
          "type": "CLK",
          "div": "x2",
          "pulseWidthMs": 30,
          "limitPct": 90
        },
        "SH1": {
          "type": "SH",
          "glide": 0,
          "scale": 0.9,
          "polarity": "unipolar"
        },
        "VCO1": {
          "type": "VCO",
          "channels": 1,
          "quantize": true,
          "wave": "triangle",
          "freq1": 160,
          "freq2": 220,
          "freq3": 220,
          "freq4": 220
        },
        "VCF1": {
          "type": "VCF",
          "cutoff": 2400,
          "q": 2.2,
          "filterType": "lowpass",
          "modDepth": 1000
        },
        "SPK1": {
          "type": "SPK",
          "masterVol": 0.31
        },
        "KEY1": {
          "type": "KEY",
          "octave": 3,
          "lastNote": "C3",
          "currentMidi": 60
        },
        "DELAY1": {
          "type": "DELAY",
          "delayTime": 0.38,
          "feedback": 0.58,
          "mix": 0.38
        },
        "SCALE1": {
          "type": "SCALE",
          "root": 0,
          "scale": "CUSTOM",
          "mask": [
            1,
            0,
            0,
            0,
            1,
            0,
            0,
            1,
            0,
            1,
            0,
            1
          ]
        }
      },
      "connections": [
        {
          "from": {
            "moduleId": "CLK1",
            "port": "gate_out"
          },
          "to": {
            "moduleId": "SH1",
            "port": "trig_in"
          }
        },
        {
          "from": {
            "moduleId": "VCO1",
            "port": "wave_out"
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
            "moduleId": "SPK1",
            "port": "wave_in_l"
          }
        },
        {
          "from": {
            "moduleId": "DELAY1",
            "port": "wave_out"
          },
          "to": {
            "moduleId": "SPK1",
            "port": "wave_in_r"
          }
        },
        {
          "from": {
            "moduleId": "SCALE1",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "VCO1",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "KEY1",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "VCO1",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "SH1",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "SCALE1",
            "port": "cv_in"
          }
        }
      ]
    }
  }
};
