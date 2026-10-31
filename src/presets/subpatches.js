export const FACTORY_SUBPATCHES = {
    'FACTORY_VOICE': {
        id: 'FACTORY_VOICE',
        subType: 'MonoVoice',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'VOICE',
        category: 'Synth Voice',
        isSystem: true,
        description: 'Standard Mono Synth Voice (VCO + VCF + ADSR + VCA)',
        manifest: {
            description: 'Standard Mono Synth Voice (VCO + VCF + ADSR + VCA)',
            ports: {
                cv_in: { pin: 'PIN5', signal: 'cv' },
                gate_in: { pin: 'PIN4', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Pitch (1V/Oct)', type: 'cv_in' },
            PIN4: { label: 'Gate In', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'VOICE',
            slots: {
                "2": "SUB_IO1",
                "7": "VCO1",
                "8": "VCF1",
                "12": "ADSR1",
                "13": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "VCO1": { "type": "VCO", "channels": 1, "freq1": 130, "wave": "sawtooth", "col": 2, "row": 1 },
                "VCF1": { "type": "VCF", "cutoff": 1600, "q": 3.8, "modDepth": 1800, "col": 3, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.01, "decay": 0.25, "sustain": 0.25, "release": 0.2, "col": 2, "row": 2 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 3, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "VCO1", port: "cv_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCF1", port: "cv_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_ACID': {
        id: 'FACTORY_ACID',
        subType: 'AcidVoice',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'ACID BASS',
        category: 'Synth Voice',
        isSystem: true,
        description: '303-style resonant screaming acid bass (Sawtooth + Resonant VCF + Snappy Decay)',
        manifest: {
            description: '303スタイルのアシッドベースボイス（VCO + Resonant VCF + Snappy ADSR + VCA）',
            ports: {
                cv_in: { pin: 'PIN5', signal: 'cv' },
                trig_in: { pin: 'PIN4', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Pitch (1V/Oct)', type: 'cv_in' },
            PIN4: { label: 'Gate In', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'ACID BASS',
            slots: {
                "2": "SUB_IO1",
                "7": "VCO1",
                "8": "VCF1",
                "12": "ADSR1",
                "13": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "VCO1": { "type": "VCO", "channels": 1, "freq1": 65.41, "wave": "sawtooth", "col": 2, "row": 1 },
                "VCF1": { "type": "VCF", "cutoff": 320, "q": 12.0, "modDepth": 4600, "col": 3, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.002, "decay": 0.22, "sustain": 0.05, "release": 0.15, "col": 2, "row": 2 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 3, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "VCO1", port: "cv_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCF1", port: "cv_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_DUAL_VCO': {
        id: 'FACTORY_DUAL_VCO',
        subType: 'DualLead',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'DUAL LEAD',
        category: 'Synth Voice',
        isSystem: true,
        description: 'Dual detuned oscillators with lowpass filter',
        manifest: {
            description: 'デュアル・オシレーター＆ローパスフィルターによるリードボイス',
            ports: {
                cv_in: { pin: 'PIN5', signal: 'cv' },
                gate_in: { pin: 'PIN4', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Pitch (1V/Oct)', type: 'cv_in' },
            PIN4: { label: 'Gate In', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'DUAL LEAD',
            slots: {
                "2": "SUB_IO1",
                "7": "VCO1",
                "8": "VCF1",
                "12": "ADSR1",
                "13": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "VCO1": { "type": "VCO", "channels": 2, "freq1": 220, "freq2": 222, "wave": "sawtooth", "col": 2, "row": 1 },
                "VCF1": { "type": "VCF", "cutoff": 2200, "q": 2.5, "modDepth": 1500, "col": 3, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.02, "decay": 0.35, "sustain": 0.4, "release": 0.3, "col": 2, "row": 2 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 3, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "VCO1", port: "cv_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "VCO1", port: "cv_in2" } },
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCF1", port: "cv_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_SPACE_FX': {
        id: 'FACTORY_SPACE_FX',
        subType: 'SpaceFx',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'SPACE FX',
        category: 'Effect',
        isSystem: true,
        description: 'Stereo-like Delay & Reverb processing block',
        manifest: {
            description: '空間系エフェクト（ディレイ＆ステレオリバーブ）ブロック',
            ports: {
                wave_in: { pin: 'PIN5', signal: 'audio' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Audio In', type: 'audio_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'SPACE FX',
            slots: {
                "2": "SUB_IO1",
                "7": "DELAY1",
                "8": "REVERB1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "DELAY1": { "type": "DELAY", "delayTime": 0.32, "feedback": 0.45, "mix": 0.4, "col": 2, "row": 1 },
                "REVERB1": { "type": "REVERB", "time": 2.6, "damp": 4000, "mix": 0.35, "col": 3, "row": 1 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "DELAY1", port: "wave_in" } },
                { from: { moduleId: "DELAY1", port: "wave_out" }, to: { moduleId: "REVERB1", port: "wave_in" } },
                { from: { moduleId: "REVERB1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_KICK': {
        id: 'FACTORY_KICK',
        subType: 'BassDrum',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'BASS DRUM',
        category: 'Percussion',
        isSystem: true,
        description: 'Punchy 808/909-style analogue kick with pitch sweep and exponential decay',
        manifest: {
            description: 'アナログスタイル・パンチーバスドラム（ピッチスウィープ＋減衰）',
            ports: {
                trig_in: { pin: 'PIN5', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Trig / Gate', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'BASS DRUM',
            slots: {
                "2": "SUB_IO1",
                "5": "VCO1",
                "6": "MATH2_1",
                "7": "ADSR1",
                "8": "ADSR2",
                "10": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "VCO1": { "type": "VCO", "channels": 1, "freq1": 52, "wave": "sine", "quantize": false, "col": 0, "row": 1 },
                "MATH2_1": { "type": "MATH2", "mode": "MULTI", "valA": 0.0, "valB": 2.6, "col": 1, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 0.055, "decayCurve": -0.75, "sustain": 0.0, "release": 0.03, "releaseCurve": -0.7, "col": 2, "row": 1 },
                "ADSR2": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 0.52, "decayCurve": -0.42, "sustain": 0.0, "release": 0.08, "releaseCurve": -0.4, "col": 3, "row": 1 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 0, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR2", port: "gate_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "MATH2_1", port: "cv_in_a" } },
                { from: { moduleId: "MATH2_1", port: "cv_out" }, to: { moduleId: "VCO1", port: "cv_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR2", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_SNARE': {
        id: 'FACTORY_SNARE',
        subType: 'SnareDrum',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'SNARE DRUM',
        category: 'Percussion',
        isSystem: true,
        description: 'Dual-layer analogue snare (Triangle body tone + Highpass filtered noise wire)',
        manifest: {
            description: 'アナログスタイル・スネアドラム（三角波ボディトーン＋ノイズワイヤー）',
            ports: {
                trig_in: { pin: 'PIN5', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Trig / Gate', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'SNARE DRUM',
            slots: {
                "2": "SUB_IO1",
                "5": "VCO1",
                "6": "ADSR1",
                "7": "MIX1",
                "8": "ADSR2",
                "9": "NOISE1",
                "10": "VCA1",
                "14": "VCF1",
                "19": "VCA2"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "VCO1": { "type": "VCO", "channels": 1, "freq1": 185, "wave": "triangle", "quantize": false, "col": 0, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 0.085, "decayCurve": -0.7, "sustain": 0.0, "release": 0.03, "releaseCurve": -0.7, "col": 1, "row": 1 },
                "MIX1": { "type": "MIX", "channels": 2, "lvl1": 0.85, "lvl2": 0.75, "col": 2, "row": 1 },
                "ADSR2": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 0.18, "decayCurve": -0.6, "sustain": 0.0, "release": 0.04, "releaseCurve": -0.6, "col": 3, "row": 1 },
                "NOISE1": { "type": "NOISE", "noiseType": "white", "tone": 7500, "level": 1.0, "col": 4, "row": 1 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 0, "row": 2 },
                "VCF1": { "type": "VCF", "filterType": "highpass", "cutoff": 2400, "q": 1.8, "modDepth": 0, "col": 4, "row": 2 },
                "VCA2": { "type": "VCA", "level": 0.0, "col": 4, "row": 3 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR2", port: "gate_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "MIX1", port: "wave_in1" } },
                { from: { moduleId: "NOISE1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA2", port: "wave_in" } },
                { from: { moduleId: "ADSR2", port: "cv_out" }, to: { moduleId: "VCA2", port: "cv_in" } },
                { from: { moduleId: "VCA2", port: "wave_out" }, to: { moduleId: "MIX1", port: "wave_in2" } },
                { from: { moduleId: "MIX1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_KICK2': {
        id: 'FACTORY_KICK2',
        subType: 'TechnoKick',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'BASS DRUM 2',
        category: 'Percussion',
        isSystem: true,
        description: 'Hard & Rich Techno Kick (Crisp Attack Click + 50Hz Deep Resonant Sub Rumble)',
        manifest: {
            description: 'ハード＆リッチ・テクノキック（アタッククリック＋50Hzサブランブル）',
            ports: {
                trig_in: { pin: 'PIN5', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Trig / Gate', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'BASS DRUM 2',
            slots: {
                "2": "SUB_IO1",
                "5": "MATH2_1",
                "6": "MATH2_2",
                "7": "ADSR1",
                "8": "ADSR2",
                "9": "NOISE1",
                "10": "VCO1",
                "11": "VCA1",
                "12": "MIX1",
                "13": "VCA2",
                "14": "VCF1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "MATH2_1": { "type": "MATH2", "mode": "MULTI", "valA": 0.0, "valB": 2.2, "col": 0, "row": 1 },
                "MATH2_2": { "type": "MATH2", "mode": "ADD", "valA": 0.0, "valB": 0.62, "col": 1, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 0.045, "decayCurve": -0.85, "sustain": 0.0, "release": 0.02, "releaseCurve": -0.8, "col": 2, "row": 1 },
                "ADSR2": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 0.65, "decayCurve": -0.28, "sustain": 0.0, "release": 0.12, "releaseCurve": -0.3, "col": 3, "row": 1 },
                "NOISE1": { "type": "NOISE", "noiseType": "white", "tone": 8000, "level": 1.0, "col": 4, "row": 1 },
                "VCO1": { "type": "VCO", "channels": 1, "freq1": 52, "wave": "sine", "quantize": false, "col": 0, "row": 2 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 1, "row": 2 },
                "MIX1": { "type": "MIX", "channels": 2, "lvl1": 1.0, "lvl2": 0.18, "col": 2, "row": 2 },
                "VCA2": { "type": "VCA", "level": 0.0, "col": 3, "row": 2 },
                "VCF1": { "type": "VCF", "filterType": "highpass", "cutoff": 4500, "q": 2.2, "modDepth": 0, "col": 4, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR2", port: "gate_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "MATH2_1", port: "cv_in_a" } },
                { from: { moduleId: "MATH2_1", port: "cv_out" }, to: { moduleId: "MATH2_2", port: "cv_in_a" } },
                { from: { moduleId: "MATH2_2", port: "cv_out" }, to: { moduleId: "VCO1", port: "cv_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR2", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "MIX1", port: "wave_in1" } },
                { from: { moduleId: "NOISE1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA2", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA2", port: "cv_in" } },
                { from: { moduleId: "VCA2", port: "wave_out" }, to: { moduleId: "MIX1", port: "wave_in2" } },
                { from: { moduleId: "MIX1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_HIHAT': {
        id: 'FACTORY_HIHAT',
        subType: 'HiHat',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'HI-HAT',
        category: 'Percussion',
        isSystem: true,
        description: 'Crisp & Sizzling Techno Hi-Hat (Highpass Filtered Metallic Noise + Ultra-snappy Decay)',
        manifest: {
            description: 'ハイパスフィルタード・メタリックノイズによるクリスプなハイハット',
            ports: {
                trig_in: { pin: 'PIN5', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Trig / Gate', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'HI-HAT',
            slots: {
                "2": "SUB_IO1",
                "6": "NOISE1",
                "7": "VCF1",
                "8": "ADSR1",
                "12": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "NOISE1": { "type": "NOISE", "noiseType": "white", "tone": 9500, "level": 1.0, "col": 1, "row": 1 },
                "VCF1": { "type": "VCF", "filterType": "highpass", "cutoff": 7800, "q": 3.5, "modDepth": 0, "col": 2, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 0.048, "decayCurve": -0.85, "sustain": 0.0, "release": 0.02, "releaseCurve": -0.8, "col": 3, "row": 1 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 2, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "NOISE1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_CLAP': {
        id: 'FACTORY_CLAP',
        subType: 'HandClap',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'HAND CLAP',
        category: 'Percussion',
        isSystem: true,
        description: 'Authentic 909 Multi-Burst Hand Clap (Dual CVDELAY + Triple Burst ADSR + Bandpass Resonant Noise)',
        manifest: {
            description: '909スタイル・マルチバースト・ハンドクラップ（3連バーストエンベロープ）',
            ports: {
                trig_in: { pin: 'PIN5', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Trig / Gate', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'HAND CLAP',
            slots: {
                "2": "SUB_IO1",
                "5": "CVDELAY1",
                "6": "CVDELAY2",
                "7": "ADSR1",
                "8": "ADSR2",
                "9": "ADSR3",
                "10": "NOISE1",
                "11": "VCF1",
                "12": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "CVDELAY1": { "type": "CVDELAY", "timeMs": 11, "col": 0, "row": 1 },
                "CVDELAY2": { "type": "CVDELAY", "timeMs": 22, "col": 1, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 0.010, "decayCurve": -0.85, "sustain": 0.0, "release": 0.005, "releaseCurve": -0.8, "col": 2, "row": 1 },
                "ADSR2": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 0.010, "decayCurve": -0.85, "sustain": 0.0, "release": 0.005, "releaseCurve": -0.8, "col": 3, "row": 1 },
                "ADSR3": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 0.18, "decayCurve": -0.55, "sustain": 0.0, "release": 0.04, "releaseCurve": -0.6, "col": 4, "row": 1 },
                "NOISE1": { "type": "NOISE", "noiseType": "white", "tone": 6000, "level": 1.0, "col": 0, "row": 2 },
                "VCF1": { "type": "VCF", "filterType": "bandpass", "cutoff": 1300, "q": 2.2, "modDepth": 0, "col": 1, "row": 2 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 2, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "CVDELAY1", port: "cv_in" } },
                { from: { moduleId: "CVDELAY1", port: "cv_out" }, to: { moduleId: "ADSR2", port: "gate_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "CVDELAY2", port: "cv_in" } },
                { from: { moduleId: "CVDELAY2", port: "cv_out" }, to: { moduleId: "ADSR3", port: "gate_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "ADSR2", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "ADSR3", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "NOISE1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_TOM': {
        id: 'FACTORY_TOM',
        subType: 'TechnoTom',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'LOW TOM',
        category: 'Percussion',
        isSystem: true,
        description: 'Deep resonant low tom with natural punch and organic acoustic decay',
        manifest: {
            description: 'ロータム（自然な打撃アタックと深く豊かなアコースティック胴鳴り）',
            ports: {
                trig_in: { pin: 'PIN5', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Trig / Gate', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'LOW TOM',
            slots: {
                "2": "SUB_IO1",
                "5": "MATH2_1",
                "6": "MATH2_2",
                "7": "ADSR1",
                "8": "ADSR2",
                "11": "VCO1",
                "12": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "MATH2_1": { "type": "MATH2", "mode": "MULTI", "valA": 0.0, "valB": 0.45, "col": 0, "row": 1 },
                "MATH2_2": { "type": "MATH2", "mode": "ADD", "valA": 0.0, "valB": 1.2, "col": 1, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.8, "decay": 0.015, "decayCurve": -0.9, "sustain": 0.0, "release": 0.01, "releaseCurve": -0.9, "col": 2, "row": 1 },
                "ADSR2": { "type": "ADSR", "attack": 0.001, "attackCurve": -0.4, "decay": 0.28, "decayCurve": -0.6, "sustain": 0.0, "release": 0.05, "releaseCurve": -0.6, "col": 3, "row": 1 },
                "VCO1": { "type": "VCO", "channels": 1, "freq1": 85, "wave": "sine", "quantize": false, "col": 1, "row": 2 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 2, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR2", port: "gate_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "MATH2_1", port: "cv_in_a" } },
                { from: { moduleId: "MATH2_1", port: "cv_out" }, to: { moduleId: "MATH2_2", port: "cv_in_a" } },
                { from: { moduleId: "MATH2_2", port: "cv_out" }, to: { moduleId: "VCO1", port: "cv_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR2", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_PERC': {
        id: 'FACTORY_PERC',
        subType: 'MetallicPerc',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'METALLIC PERC',
        category: 'Percussion',
        isSystem: true,
        description: 'Hypnotic Modular Metallic Percussion / Rim Shot (Dual Resonant Ring + Snappy Click)',
        manifest: {
            description: 'メタリックパーカッション / リムショット（金属的な倍音リングモジュレーション）',
            ports: {
                trig_in: { pin: 'PIN5', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Trig / Gate', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'METALLIC PERC',
            slots: {
                "2": "SUB_IO1",
                "6": "VCO1",
                "7": "VCF1",
                "8": "ADSR1",
                "12": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "VCO1": { "type": "VCO", "channels": 2, "freq1": 1850, "freq2": 2420, "wave": "square", "quantize": false, "col": 1, "row": 1 },
                "VCF1": { "type": "VCF", "filterType": "bandpass", "cutoff": 2100, "q": 4.5, "modDepth": 0, "col": 2, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 0.028, "decayCurve": -0.9, "sustain": 0.0, "release": 0.015, "releaseCurve": -0.9, "col": 3, "row": 1 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 2, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR1", gate: true, port: "gate_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_SUB_KICK': {
        id: 'FACTORY_SUB_KICK',
        subType: 'SubKick',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'SUB KICK',
        category: 'Percussion',
        isSystem: true,
        description: 'Ultra-deep sine sub bass drum (38Hz sub-bass boom with long smooth decay)',
        manifest: {
            description: '38Hzの重低音サブベースキック。ディープなローエンド振動',
            ports: {
                trig_in: { pin: 'PIN5', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Trig / Gate', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'SUB KICK',
            slots: {
                "2": "SUB_IO1",
                "5": "MATH2_1",
                "6": "ADSR1",
                "7": "ADSR2",
                "10": "VCO1",
                "11": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "MATH2_1": { "type": "MATH2", "mode": "MULTI", "valA": 0.0, "valB": 1.2, "col": 1, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.001, "attackCurve": -0.5, "decay": 0.06, "decayCurve": -0.8, "sustain": 0.0, "release": 0.04, "releaseCurve": -0.7, "col": 2, "row": 1 },
                "ADSR2": { "type": "ADSR", "attack": 0.002, "attackCurve": -0.5, "decay": 0.85, "decayCurve": -0.35, "sustain": 0.0, "release": 0.15, "releaseCurve": -0.3, "col": 3, "row": 1 },
                "VCO1": { "type": "VCO", "channels": 1, "freq1": 38, "wave": "sine", "quantize": false, "col": 2, "row": 2 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 3, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR2", port: "gate_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "MATH2_1", port: "cv_in_a" } },
                { from: { moduleId: "MATH2_1", port: "cv_out" }, to: { moduleId: "VCO1", port: "cv_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR2", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_RIM': {
        id: 'FACTORY_RIM',
        subType: 'RimShot',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'RIM SHOT',
        category: 'Percussion',
        isSystem: true,
        description: 'Crisp acoustic/electronic rimshot (Narrow Bandpass resonance click)',
        manifest: {
            description: 'ソリッドなリムショット。高域レゾナンスの鋭いクリック音',
            ports: {
                trig_in: { pin: 'PIN5', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Trig / Gate', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'RIM SHOT',
            slots: {
                "2": "SUB_IO1",
                "6": "VCO1",
                "7": "VCF1",
                "8": "ADSR1",
                "12": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "VCO1": { "type": "VCO", "channels": 1, "freq1": 480, "wave": "square", "quantize": false, "col": 1, "row": 1 },
                "VCF1": { "type": "VCF", "filterType": "bandpass", "cutoff": 1750, "q": 8.0, "modDepth": 0, "col": 2, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 0.032, "decayCurve": -0.85, "sustain": 0.0, "release": 0.015, "releaseCurve": -0.8, "col": 3, "row": 1 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 2, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_GHOST_SNARE': {
        id: 'FACTORY_GHOST_SNARE',
        subType: 'GhostSnare',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'GHOST SNARE',
        category: 'Percussion',
        isSystem: true,
        description: 'Delicate low-velocity ghost snare (Soft filtered noise wire + gentle tone)',
        manifest: {
            description: '繊細なゴーストスネア。控えめなアタックとソフトなホワイトノイズ',
            ports: {
                trig_in: { pin: 'PIN5', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Trig / Gate', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'GHOST SNARE',
            slots: {
                "2": "SUB_IO1",
                "6": "NOISE1",
                "7": "VCF1",
                "8": "ADSR1",
                "12": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "NOISE1": { "type": "NOISE", "noiseType": "white", "tone": 6000, "level": 0.8, "col": 1, "row": 1 },
                "VCF1": { "type": "VCF", "filterType": "bandpass", "cutoff": 2200, "q": 2.5, "modDepth": 0, "col": 2, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.003, "attackCurve": -0.3, "decay": 0.09, "decayCurve": -0.7, "sustain": 0.0, "release": 0.04, "releaseCurve": -0.6, "col": 3, "row": 1 },
                "VCA1": { "type": "VCA", "level": 0.0, "cvDepth": 0.65, "col": 2, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "NOISE1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_CH_SOFT': {
        id: 'FACTORY_CH_SOFT',
        subType: 'HiHatSoft',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'SOFT HAT',
        category: 'Percussion',
        isSystem: true,
        description: 'Smooth and warm closed hi-hat (Lower cutoff, softer envelope)',
        manifest: {
            description: '柔らかく耳馴染みの良いソフトクローズドハイハット',
            ports: {
                trig_in: { pin: 'PIN5', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Trig / Gate', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'SOFT HAT',
            slots: {
                "2": "SUB_IO1",
                "6": "NOISE1",
                "7": "VCF1",
                "8": "ADSR1",
                "12": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "NOISE1": { "type": "NOISE", "noiseType": "white", "tone": 8000, "level": 0.9, "col": 1, "row": 1 },
                "VCF1": { "type": "VCF", "filterType": "bandpass", "cutoff": 5800, "q": 2.2, "modDepth": 0, "col": 2, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.002, "attackCurve": -0.3, "decay": 0.065, "decayCurve": -0.75, "sustain": 0.0, "release": 0.03, "releaseCurve": -0.7, "col": 3, "row": 1 },
                "VCA1": { "type": "VCA", "level": 0.0, "cvDepth": 0.85, "col": 2, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "NOISE1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_OPEN_HAT': {
        id: 'FACTORY_OPEN_HAT',
        subType: 'OpenHiHat',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'OPEN HAT',
        category: 'Percussion',
        isSystem: true,
        description: 'Sizzling Open Hi-Hat (Extended release highpass metallic noise)',
        manifest: {
            description: 'ロングテイルのオープンハイハット。シズル感のある減衰',
            ports: {
                trig_in: { pin: 'PIN5', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Trig / Gate', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'OPEN HAT',
            slots: {
                "2": "SUB_IO1",
                "6": "NOISE1",
                "7": "VCF1",
                "8": "ADSR1",
                "12": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "NOISE1": { "type": "NOISE", "noiseType": "white", "tone": 9200, "level": 1.0, "col": 1, "row": 1 },
                "VCF1": { "type": "VCF", "filterType": "highpass", "cutoff": 6500, "q": 2.8, "modDepth": 0, "col": 2, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 0.32, "decayCurve": -0.5, "sustain": 0.0, "release": 0.08, "releaseCurve": -0.5, "col": 3, "row": 1 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 2, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "NOISE1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_COWBELL': {
        id: 'FACTORY_COWBELL',
        subType: 'Cowbell',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'COWBELL',
        category: 'Percussion',
        isSystem: true,
        description: 'Classic 808-style dual-pulse cowbell with resonant bandpass body',
        manifest: {
            description: 'カウベル（808スタイルのデュアル矩形波＋バンドパスフィルターによる金属打音）',
            ports: {
                trig_in: { pin: 'PIN5', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Trig / Gate', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'COWBELL',
            slots: {
                "2": "SUB_IO1",
                "6": "VCO1",
                "7": "ADSR1",
                "10": "VCF1",
                "11": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "VCO1": { "type": "VCO", "channels": 2, "freq1": 540, "freq2": 800, "wave": "square", "quantize": false, "col": 2, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.8, "decay": 0.22, "decayCurve": -0.7, "sustain": 0.0, "release": 0.04, "releaseCurve": -0.7, "col": 3, "row": 1 },
                "VCF1": { "type": "VCF", "filterType": "bandpass", "cutoff": 1200, "q": 4.5, "modDepth": 0, "col": 2, "row": 2 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 3, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_HIGH_TOM': {
        id: 'FACTORY_HIGH_TOM',
        subType: 'HighTom',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'HIGH TOM',
        category: 'Percussion',
        isSystem: true,
        description: 'High pitched punchy tom with tight attack and resonant acoustic body',
        manifest: {
            description: 'ハイタム（タイトな打撃アタックとパンチの効いたアコースティック胴鳴り）',
            ports: {
                trig_in: { pin: 'PIN5', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Trig / Gate', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'HIGH TOM',
            slots: {
                "2": "SUB_IO1",
                "5": "MATH2_1",
                "6": "MATH2_2",
                "7": "ADSR1",
                "8": "ADSR2",
                "11": "VCO1",
                "12": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "MATH2_1": { "type": "MATH2", "mode": "MULTI", "valA": 0.0, "valB": 0.45, "col": 0, "row": 1 },
                "MATH2_2": { "type": "MATH2", "mode": "ADD", "valA": 0.0, "valB": 2.0, "col": 1, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.8, "decay": 0.015, "decayCurve": -0.9, "sustain": 0.0, "release": 0.01, "releaseCurve": -0.9, "col": 2, "row": 1 },
                "ADSR2": { "type": "ADSR", "attack": 0.001, "attackCurve": -0.4, "decay": 0.20, "decayCurve": -0.65, "sustain": 0.0, "release": 0.03, "releaseCurve": -0.65, "col": 3, "row": 1 },
                "VCO1": { "type": "VCO", "channels": 1, "freq1": 150, "wave": "sine", "quantize": false, "col": 1, "row": 2 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 2, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR2", port: "gate_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "MATH2_1", port: "cv_in_a" } },
                { from: { moduleId: "MATH2_1", port: "cv_out" }, to: { moduleId: "MATH2_2", port: "cv_in_a" } },
                { from: { moduleId: "MATH2_2", port: "cv_out" }, to: { moduleId: "VCO1", port: "cv_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR2", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_PERC2': {
        id: 'FACTORY_PERC2',
        subType: 'HighPerc',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'HIGH PERC',
        category: 'Percussion',
        isSystem: true,
        description: 'Ultra-high resonant bongo/bell percussion (Bright dual square tones)',
        manifest: {
            description: '超高域のレゾナントパーカッション。クリスタル・ボンゴ的な響き',
            ports: {
                trig_in: { pin: 'PIN5', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Trig / Gate', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'HIGH PERC',
            slots: {
                "2": "SUB_IO1",
                "6": "VCO1",
                "7": "VCF1",
                "8": "ADSR1",
                "12": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "VCO1": { "type": "VCO", "channels": 2, "freq1": 2680, "freq2": 3790, "wave": "square", "quantize": false, "col": 1, "row": 1 },
                "VCF1": { "type": "VCF", "filterType": "bandpass", "cutoff": 3200, "q": 6.5, "modDepth": 0, "col": 2, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 0.042, "decayCurve": -0.85, "sustain": 0.0, "release": 0.02, "releaseCurve": -0.8, "col": 3, "row": 1 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 2, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    },
    'FACTORY_CRASH': {
        id: 'FACTORY_CRASH',
        subType: 'CrashCymbal',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'CRASH CYMBAL',
        category: 'Percussion',
        isSystem: true,
        description: 'Explosive metallic crash cymbal with long decaying shimmer',
        manifest: {
            description: 'エクスプローシブなクラッシュシンバル。金属倍音とロングシマー減衰',
            ports: {
                trig_in: { pin: 'PIN5', signal: 'gate' },
                wave_out: { pin: 'PIN10', signal: 'audio' }
            }
        },
        pins: {
            PIN5: { label: 'Trig / Gate', type: 'gate_in' },
            PIN10: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'CRASH CYMBAL',
            slots: {
                "2": "SUB_IO1",
                "5": "VCO1",
                "6": "NOISE1",
                "7": "MIX1",
                "8": "VCF1",
                "9": "ADSR1",
                "12": "VCA1"
            },
            modules: {
                "SUB_IO1": { "type": "SUB_IO", "col": 2, "row": 0 },
                "VCO1": { "type": "VCO", "channels": 3, "freq1": 3120, "freq2": 4480, "wave": "square", "quantize": false, "col": 0, "row": 1 },
                "NOISE1": { "type": "NOISE", "noiseType": "white", "tone": 11000, "level": 1.0, "col": 1, "row": 1 },
                "MIX1": { "type": "MIX", "channels": 2, "lvl1": 0.45, "lvl2": 0.85, "col": 2, "row": 1 },
                "VCF1": { "type": "VCF", "filterType": "highpass", "cutoff": 5200, "q": 2.2, "modDepth": 0, "col": 3, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 1.1, "decayCurve": -0.4, "sustain": 0.0, "release": 0.4, "releaseCurve": -0.4, "col": 0, "row": 2 },
                "VCA1": { "type": "VCA", "level": 0.0, "cvDepth": 1.0, "col": 2, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN5_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "MIX1", port: "wave_in1" } },
                { from: { moduleId: "NOISE1", port: "wave_out" }, to: { moduleId: "MIX1", port: "wave_in2" } },
                { from: { moduleId: "MIX1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN10_in" } }
            ]
        }
    }
};
