export const preset15 = {
  "bpm": 126,
  "pages": {
    "0": {
      "name": "3D Video Wall",
      "slots": {
        "0": "OBJECT1",
        "1": "ROTATE1",
        "2": "RENDER1",
        "3": "LFO1",
        "5": "VFX1",
        "8": "DISPLAY13",
        "9": "DISPLAY14",
        "10": "DISPLAY15",
        "11": "DISPLAY16",
        "12": "DISPLAY5",
        "13": "DISPLAY6",
        "14": "DISPLAY7",
        "15": "DISPLAY8",
        "16": "DISPLAY9",
        "17": "DISPLAY10",
        "18": "DISPLAY11",
        "19": "DISPLAY12",
        "20": "DISPLAY1",
        "21": "DISPLAY2",
        "22": "DISPLAY3",
        "23": "DISPLAY4"
      },
      "modules": {
        "OBJECT1": {
          "type": "OBJECT",
          "shape": "torus",
          "material": "wire",
          "color": "#ffffff"
        },
        "ROTATE1": {
          "type": "ROTATE",
          "axis": "x",
          "angle": 0
        },
        "RENDER1": {
          "type": "RENDER",
          "camX": 3,
          "camY": 3.8,
          "camZ": 5,
          "targetX": 0,
          "targetY": 0,
          "targetZ": 0,
          "fov": 45,
          "camRoll": 0,
          "materialOverride": "auto"
        },
        "LFO1": {
          "type": "LFO",
          "waveType": "sine",
          "polarity": "bipolar",
          "syncMode": "free",
          "division": "1/4",
          "period": 35.77633506368,
          "rate": 0.02795143768136262,
          "depth": 1,
          "phase": 0,
          "duty": 0.5
        },
        "VFX1": {
          "type": "VFX",
          "mode": "invert",
          "amount": 0.82
        },
        "DISPLAY13": {
          "type": "DISPLAY",
          "divN": 3,
          "tileX": 0,
          "tileY": 0
        },
        "DISPLAY14": {
          "type": "DISPLAY",
          "divN": 3,
          "tileX": 0.44,
          "tileY": 0
        },
        "DISPLAY15": {
          "type": "DISPLAY",
          "divN": 3,
          "tileX": 0.67,
          "tileY": 0
        },
        "DISPLAY16": {
          "type": "DISPLAY",
          "divN": 1,
          "tileX": 1,
          "tileY": 0
        },
        "DISPLAY5": {
          "type": "DISPLAY",
          "divN": 3,
          "tileX": 0,
          "tileY": 0.35
        },
        "DISPLAY6": {
          "type": "DISPLAY",
          "divN": 3,
          "tileX": 0.51,
          "tileY": 0.55
        },
        "DISPLAY7": {
          "type": "DISPLAY",
          "divN": 3,
          "tileX": 0.87,
          "tileY": 0.46
        },
        "DISPLAY8": {
          "type": "DISPLAY",
          "divN": 1,
          "tileX": 1,
          "tileY": 0.32
        },
        "DISPLAY9": {
          "type": "DISPLAY",
          "divN": 3,
          "tileX": 0,
          "tileY": 0.74
        },
        "DISPLAY10": {
          "type": "DISPLAY",
          "divN": 3,
          "tileX": 0.65,
          "tileY": 0.74
        },
        "DISPLAY11": {
          "type": "DISPLAY",
          "divN": 2,
          "tileX": 0.86,
          "tileY": 0.78
        },
        "DISPLAY12": {
          "type": "DISPLAY",
          "divN": 2,
          "tileX": 0.97,
          "tileY": 0.63
        },
        "DISPLAY1": {
          "type": "DISPLAY",
          "divN": 1,
          "tileX": 0,
          "tileY": 1
        },
        "DISPLAY2": {
          "type": "DISPLAY",
          "divN": 1,
          "tileX": 0.37,
          "tileY": 1
        },
        "DISPLAY3": {
          "type": "DISPLAY",
          "divN": 2,
          "tileX": 0.71,
          "tileY": 1
        },
        "DISPLAY4": {
          "type": "DISPLAY",
          "divN": 2,
          "tileX": 1,
          "tileY": 1
        }
      },
      "connections": [
        {
          "from": {
            "moduleId": "ROTATE1",
            "port": "obj_out"
          },
          "to": {
            "moduleId": "RENDER1",
            "port": "obj_in"
          }
        },
        {
          "from": {
            "moduleId": "OBJECT1",
            "port": "obj_out"
          },
          "to": {
            "moduleId": "ROTATE1",
            "port": "obj_in"
          }
        },
        {
          "from": {
            "moduleId": "LFO1",
            "port": "cv_out"
          },
          "to": {
            "moduleId": "ROTATE1",
            "port": "cv_in"
          }
        },
        {
          "from": {
            "moduleId": "DISPLAY13",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY14",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "DISPLAY14",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY15",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "DISPLAY15",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY5",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "DISPLAY5",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY6",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "DISPLAY6",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY7",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "DISPLAY7",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY9",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "DISPLAY9",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY10",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "DISPLAY10",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY11",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "DISPLAY16",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY8",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "DISPLAY1",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY2",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "DISPLAY11",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY12",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "DISPLAY8",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY1",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "DISPLAY12",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY3",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "DISPLAY3",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY4",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "RENDER1",
            "port": "video_out"
          },
          "to": {
            "moduleId": "VFX1",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "RENDER1",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY16",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "VFX1",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY13",
            "port": "video_in"
          }
        }
      ]
    }
  }
};
