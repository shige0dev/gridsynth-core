export const preset12 = {
  "bpm": 124,
  "pages": {
    "0": {
      "name": "Chord Arpeggio",
      "slots": {
        "0": "CLK1",
        "1": "CHORD1",
        "2": "ARP1",
        "3": "SCOPE1",
        "4": "SPK1",
        "5": "CLK2",
        "6": "SEQ8_1",
        "7": "VCO1",
        "8": "VCF1",
        "9": "VCA1",
        "10": "GATE4_1",
        "12": "ADSR1",
        "13": "DELAY1",
        "14": "REVERB1"
      },
      "modules": {
        "CLK1": {
          "type": "CLK",
          "div": "x4",
          "pulseWidthMs": 15,
          "limitPct": 50
        },
        "CLK2": {
          "type": "CLK",
          "div": "/4",
          "pulseWidthMs": 30,
          "limitPct": 50
        },
        "SEQ8_1": {
          "type": "SEQ8",
          "quantize": true,
          "steps": [
            { "cv": 2.0, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.6667, "active": true, "cvActive": true, "gate": true },
            { "cv": 2.25, "active": true, "cvActive": true, "gate": true },
            { "cv": 1.8333, "active": true, "cvActive": true, "gate": true },
            { "cv": 2.0, "active": false, "cvActive": false, "gate": false },
            { "cv": 2.0, "active": false, "cvActive": false, "gate": false },
            { "cv": 2.0, "active": false, "cvActive": false, "gate": false },
            { "cv": 2.0, "active": false, "cvActive": false, "gate": false }
          ]
        },
        "CHORD1": {
          "type": "CHORD",
          "chord": "m7",
          "voicing": "close",
          "rootMidi": 48
        },
        "ARP1": {
          "type": "ARP",
          "mode": "updown"
        },
        "GATE4_1": {
          "type": "GATE4",
          "steps": 4,
          "mode": "up"
        },
        "VCO1": {
          "type": "VCO",
          "wave": "sawtooth",
          "channels": 1,
          "freq1": 130.81,
          "quantize": true
        },
        "VCF1": {
          "type": "VCF",
          "filterType": "lowpass",
          "cutoff": 850,
          "q": 3.2,
          "modDepth": 2200
        },
        "ADSR1": {
          "type": "ADSR",
          "attack": 0.005,
          "decay": 0.18,
          "sustain": 0.12,
          "release": 0.22,
          "attackCurve": 0.0,
          "decayCurve": 0.0,
          "releaseCurve": 0.0
        },
        "VCA1": {
          "type": "VCA",
          "level": 0.0,
          "cvDepth": 1.0
        },
        "DELAY1": {
          "type": "DELAY",
          "delayTime": 0.28,
          "feedback": 0.42,
          "mix": 0.32
        },
        "REVERB1": {
          "type": "REVERB",
          "time": 1.6,
          "damp": 4500,
          "mix": 0.24,
          "mode": "hall"
        },
        "SCOPE1": {
          "type": "SCOPE",
          "timeSpan": 0.05
        },
        "SPK1": {
          "type": "SPK",
          "masterVol": 0.16
        }
      },
      "connections": [
        "CLK1:gate_out > ARP1:clk_in",
        "CLK1:gate_out > GATE4_1:gate_in",
        "CLK2:gate_out > SEQ8_1:gate_in",
        "SEQ8_1:cv_out > CHORD1:cv_in",
        "CHORD1:cv_out1 > ARP1:cv_in1",
        "CHORD1:cv_out2 > ARP1:cv_in2",
        "CHORD1:cv_out3 > ARP1:cv_in3",
        "CHORD1:cv_out4 > ARP1:cv_in4",
        "ARP1:out > VCO1:cv_in",
        "ARP1:gate_out > ADSR1:gate_in",
        "GATE4_1:gate_out1 > VCF1:cv_in",
        "VCO1:wave_out > VCF1:wave_in",
        "ADSR1:cv_out > VCF1:cv_in",
        "VCF1:wave_out > VCA1:wave_in",
        "ADSR1:cv_out > VCA1:cv_in",
        "VCA1:wave_out > DELAY1:wave_in",
        "DELAY1:wave_out > REVERB1:wave_in",
        "REVERB1:wave_out > SCOPE1:in1",
        "REVERB1:wave_out > SPK1:wave_in_l",
        "REVERB1:wave_out > SPK1:wave_in_r"
      ]
    }
  }
};

