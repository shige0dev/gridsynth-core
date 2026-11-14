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
        "4": "OBJECT2",
        "6": "SCATTER1",
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
        "23": "DISPLAY4",
        "24": "OBJECT3",
        "25": "SCALE1",
        "26": "LFO2",
        "30": "MATH2_1",
        "31": "MATH2_2"
      },
      "modules": {
        "OBJECT1": {
          "type": "OBJECT",
          "shape": "icosa",
          "material": "wire",
          "wireWidth": 2,
          "pointSize": 3,
          "glassOpacity": 0.25,
          "glow": 1.8,
          "color": "#bababa",
          "detail": "mid"
        },
        "ROTATE1": {
          "type": "ROTATE",
          "axis": "x",
          "angle": 0
        },
        "RENDER1": {
          "type": "RENDER",
          "camX": 6.6,
          "camY": 1.6,
          "camZ": 1,
          "targetX": 0.1,
          "targetY": 0,
          "targetZ": 0,
          "fov": 29,
          "camRoll": 0,
          "materialOverride": "auto",
          "vrIpd": -80,
          "dofFocus": 15,
          "dofBokeh": 0
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
        "OBJECT2": {
          "type": "OBJECT",
          "shape": "sphere",
          "material": "solid",
          "wireWidth": 1.5,
          "pointSize": 3,
          "glassOpacity": 0.85,
          "glow": 0,
          "color": "#ff0000",
          "detail": "mid"
        },
        "SCATTER1": {
          "type": "SCATTER",
          "scale": 0.05,
          "showBase": true,
          "alignNormal": false
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
        },
        "OBJECT3": {
          "type": "OBJECT",
          "shape": "icosa",
          "material": "glass",
          "wireWidth": 2,
          "pointSize": 3,
          "glassOpacity": 0.7,
          "glow": 0,
          "color": "#616161",
          "detail": "mid"
        },
        "SCALE1": {
          "type": "SCALE",
          "axis": "all",
          "scale": 2
        },
        "LFO2": {
          "type": "LFO",
          "waveType": "sine",
          "polarity": "unipolar",
          "syncMode": "free",
          "division": "1/4",
          "period": 15.00875,
          "rate": 0.06662780044973765,
          "depth": 1,
          "phase": 0,
          "duty": 0.5
        },
        "MATH2_1": {
          "type": "MATH2",
          "mode": "MULTI",
          "valA": 0,
          "valB": 0.8
        },
        "MATH2_2": {
          "type": "MATH2",
          "mode": "ADD",
          "valA": 0,
          "valB": 0.1
        }
      },
      "connections": [
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
            "moduleId": "DISPLAY16",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "RENDER1",
            "port": "video_out"
          },
          "to": {
            "moduleId": "DISPLAY13",
            "port": "video_in"
          }
        },
        {
          "from": {
            "moduleId": "OBJECT2",
            "port": "obj_out"
          },
          "to": {
            "moduleId": "SCATTER1",
            "port": "child_in"
          }
        },
        {
          "from": {
            "moduleId": "OBJECT3",
            "port": "obj_out"
          },
          "to": {
            "moduleId": "SCALE1",
            "port": "obj_in"
          }
        },
        {
          "from": {
            "moduleId": "OBJECT1",
            "port": "obj_out"
          },
          "to": {
            "moduleId": "SCATTER1",
            "port": "base_in"
          }
        },
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
            "moduleId": "SCALE1",
            "port": "obj_out"
          },
          "to": {
            "moduleId": "ROTATE1",
            "port": "obj_in"
          }
        },
        {
          "from": {
            "moduleId": "SCATTER1",
            "port": "obj_out"
          },
          "to": {
            "moduleId": "ROTATE1",
            "port": "obj_in"
          }
        },
        {
          "from": {
            "moduleId": "LFO2",
            "port": "cv_out"
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
            "moduleId": "MATH2_2",
            "port": "cv_in_a"
          }
        },
        {
          "from": {
            "moduleId": "MATH2_2",
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
