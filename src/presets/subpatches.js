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
                pitch_in: { pin: 'PIN4', signal: 'cv' },
                gate_in: { pin: 'PIN3', signal: 'gate' },
                wave_out: { pin: 'PIN9', signal: 'audio' }
            }
        },
        pins: {
            PIN4: { label: 'Pitch (1V/Oct)', type: 'cv_in' },
            PIN3: { label: 'Gate In', type: 'gate_in' },
            PIN9: { label: 'Audio Out', type: 'audio_out' }
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
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "VCO1", port: "cv_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN3_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCF1", port: "cv_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN9_in" } }
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
            description: '303繧ｹ繧ｿ繧､繝ｫ縺ｮ繧｢繧ｷ繝・ラ繝吶・繧ｹ繝懊う繧ｹ・・CO + Resonant VCF + Snappy ADSR + VCA・・,
            ports: {
                pitch_in: { pin: 'PIN4', signal: 'cv' },
                trig_in: { pin: 'PIN3', signal: 'gate' },
                wave_out: { pin: 'PIN9', signal: 'audio' }
            }
        },
        pins: {
            PIN4: { label: 'Pitch (1V/Oct)', type: 'cv_in' },
            PIN3: { label: 'Gate In', type: 'gate_in' },
            PIN9: { label: 'Audio Out', type: 'audio_out' }
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
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "VCO1", port: "cv_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN3_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCF1", port: "cv_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN9_in" } }
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
            description: '繝・Η繧｢繝ｫ繝ｻ繧ｪ繧ｷ繝ｬ繝ｼ繧ｿ繝ｼ・・Ο繝ｼ繝代せ繝輔ぅ繝ｫ繧ｿ繝ｼ縺ｫ繧医ｋ繝ｪ繝ｼ繝峨・繧､繧ｹ',
            ports: {
                pitch_in: { pin: 'PIN4', signal: 'cv' },
                gate_in: { pin: 'PIN3', signal: 'gate' },
                wave_out: { pin: 'PIN9', signal: 'audio' }
            }
        },
        pins: {
            PIN4: { label: 'Pitch (1V/Oct)', type: 'cv_in' },
            PIN3: { label: 'Gate In', type: 'gate_in' },
            PIN9: { label: 'Audio Out', type: 'audio_out' }
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
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "VCO1", port: "cv_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "VCO1", port: "cv_in2" } },
                { from: { moduleId: "SUB_IO1", port: "PIN3_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCF1", port: "cv_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN9_in" } }
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
            description: '遨ｺ髢鍋ｳｻ繧ｨ繝輔ぉ繧ｯ繝茨ｼ医ョ繧｣繝ｬ繧､・・せ繝・Ξ繧ｪ繝ｪ繝舌・繝厄ｼ峨ヶ繝ｭ繝・け',
            ports: {
                wave_in: { pin: 'PIN4', signal: 'audio' },
                wave_out: { pin: 'PIN9', signal: 'audio' }
            }
        },
        pins: {
            PIN4: { label: 'Audio In', type: 'audio_in' },
            PIN9: { label: 'Audio Out', type: 'audio_out' }
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
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "DELAY1", port: "wave_in" } },
                { from: { moduleId: "DELAY1", port: "wave_out" }, to: { moduleId: "REVERB1", port: "wave_in" } },
                { from: { moduleId: "REVERB1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN9_in" } }
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
            description: '繧｢繝翫Ο繧ｰ繧ｹ繧ｿ繧､繝ｫ繝ｻ繝代Φ繝√・繝舌せ繝峨Λ繝・医ヴ繝・メ繧ｹ繧ｦ繧｣繝ｼ繝暦ｼ区ｸ幄｡ｰ・・,
            ports: {
                trig_in: { pin: 'PIN4', signal: 'gate' },
                wave_out: { pin: 'PIN9', signal: 'audio' }
            }
        },
        pins: {
            PIN4: { label: 'Trig / Gate', type: 'gate_in' },
            PIN9: { label: 'Audio Out', type: 'audio_out' }
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
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "ADSR2", port: "gate_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "MATH2_1", port: "a" } },
                { from: { moduleId: "MATH2_1", port: "cv_out" }, to: { moduleId: "VCO1", port: "cv_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR2", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN9_in" } }
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
            description: '繧｢繝翫Ο繧ｰ繧ｹ繧ｿ繧､繝ｫ繝ｻ繧ｹ繝阪い繝峨Λ繝・井ｸ芽ｧ呈ｳ｢繝懊ョ繧｣繝医・繝ｳ・九ヮ繧､繧ｺ繝ｯ繧､繝､繝ｼ・・,
            ports: {
                trig_in: { pin: 'PIN4', signal: 'gate' },
                wave_out: { pin: 'PIN9', signal: 'audio' }
            }
        },
        pins: {
            PIN4: { label: 'Trig / Gate', type: 'gate_in' },
            PIN9: { label: 'Audio Out', type: 'audio_out' }
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
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "ADSR2", port: "gate_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "MIX1", port: "wave_in1" } },
                { from: { moduleId: "NOISE1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA2", port: "wave_in" } },
                { from: { moduleId: "ADSR2", port: "cv_out" }, to: { moduleId: "VCA2", port: "cv_in" } },
                { from: { moduleId: "VCA2", port: "wave_out" }, to: { moduleId: "MIX1", port: "wave_in2" } },
                { from: { moduleId: "MIX1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN9_in" } }
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
            description: '繝上・繝会ｼ・Μ繝・メ繝ｻ繝・け繝弱く繝・け・医い繧ｿ繝・け繧ｯ繝ｪ繝・け・・0Hz繧ｵ繝悶Λ繝ｳ繝悶Ν・・,
            ports: {
                trig_in: { pin: 'PIN4', signal: 'gate' },
                wave_out: { pin: 'PIN9', signal: 'audio' }
            }
        },
        pins: {
            PIN4: { label: 'Trig / Gate', type: 'gate_in' },
            PIN9: { label: 'Audio Out', type: 'audio_out' }
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
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "ADSR2", port: "gate_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "MATH2_1", port: "a" } },
                { from: { moduleId: "MATH2_1", port: "cv_out" }, to: { moduleId: "MATH2_2", port: "a" } },
                { from: { moduleId: "MATH2_2", port: "cv_out" }, to: { moduleId: "VCO1", port: "cv_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR2", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "MIX1", port: "wave_in1" } },
                { from: { moduleId: "NOISE1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA2", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA2", port: "cv_in" } },
                { from: { moduleId: "VCA2", port: "wave_out" }, to: { moduleId: "MIX1", port: "wave_in2" } },
                { from: { moduleId: "MIX1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN9_in" } }
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
            description: '繝上う繝代せ繝輔ぅ繝ｫ繧ｿ繝ｼ繝峨・繝｡繧ｿ繝ｪ繝・け繝弱う繧ｺ縺ｫ繧医ｋ繧ｯ繝ｪ繧ｹ繝励↑繝上う繝上ャ繝・,
            ports: {
                trig_in: { pin: 'PIN4', signal: 'gate' },
                wave_out: { pin: 'PIN9', signal: 'audio' }
            }
        },
        pins: {
            PIN4: { label: 'Trig / Gate', type: 'gate_in' },
            PIN9: { label: 'Audio Out', type: 'audio_out' }
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
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "NOISE1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN9_in" } }
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
            description: '909繧ｹ繧ｿ繧､繝ｫ繝ｻ繝槭Ν繝√ヰ繝ｼ繧ｹ繝医・繝上Φ繝峨け繝ｩ繝・・・・騾｣繝舌・繧ｹ繝医お繝ｳ繝吶Ο繝ｼ繝暦ｼ・,
            ports: {
                trig_in: { pin: 'PIN4', signal: 'gate' },
                wave_out: { pin: 'PIN9', signal: 'audio' }
            }
        },
        pins: {
            PIN4: { label: 'Trig / Gate', type: 'gate_in' },
            PIN9: { label: 'Audio Out', type: 'audio_out' }
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
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "CVDELAY1", port: "sig_in" } },
                { from: { moduleId: "CVDELAY1", port: "cv_out" }, to: { moduleId: "ADSR2", port: "gate_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "CVDELAY2", port: "sig_in" } },
                { from: { moduleId: "CVDELAY2", port: "cv_out" }, to: { moduleId: "ADSR3", port: "gate_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "ADSR2", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "ADSR3", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "NOISE1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN9_in" } }
            ]
        }
    },
    'FACTORY_TOM': {
        id: 'FACTORY_TOM',
        subType: 'TechnoTom',
        format: 'gridsynth-submodule',
        version: '2.1',
        name: 'TECHNO TOM',
        category: 'Percussion',
        isSystem: true,
        description: 'Polyrhythmic Acid/Tribal Tom (Tuned Triangle Pitch-bend + Deep Resonant Body)',
        manifest: {
            description: '繝・け繝弱ち繝・医ヴ繝・メ繝吶Φ繝我ｸ芽ｧ呈ｳ｢・区ｷｱ縺ｿ縺ｮ縺ゅｋ繝ｬ繧ｾ繝翫Φ繧ｹ繝懊ョ繧｣・・,
            ports: {
                trig_in: { pin: 'PIN4', signal: 'gate' },
                wave_out: { pin: 'PIN9', signal: 'audio' }
            }
        },
        pins: {
            PIN4: { label: 'Trig / Gate', type: 'gate_in' },
            PIN9: { label: 'Audio Out', type: 'audio_out' }
        },
        pageData: {
            name: 'TECHNO TOM',
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
                "MATH2_1": { "type": "MATH2", "mode": "MULTI", "valA": 0.0, "valB": 1.8, "col": 0, "row": 1 },
                "MATH2_2": { "type": "MATH2", "mode": "ADD", "valA": 0.0, "valB": 1.6, "col": 1, "row": 1 },
                "ADSR1": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 0.045, "decayCurve": -0.8, "sustain": 0.0, "release": 0.02, "releaseCurve": -0.8, "col": 2, "row": 1 },
                "ADSR2": { "type": "ADSR", "attack": 0.0005, "attackCurve": -0.5, "decay": 0.35, "decayCurve": -0.45, "sustain": 0.0, "release": 0.06, "releaseCurve": -0.4, "col": 3, "row": 1 },
                "VCO1": { "type": "VCO", "channels": 1, "freq1": 100, "wave": "triangle", "quantize": false, "col": 1, "row": 2 },
                "VCA1": { "type": "VCA", "level": 0.0, "col": 2, "row": 2 }
            },
            connections: [
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "ADSR2", port: "gate_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "MATH2_1", port: "a" } },
                { from: { moduleId: "MATH2_1", port: "cv_out" }, to: { moduleId: "MATH2_2", port: "a" } },
                { from: { moduleId: "MATH2_2", port: "cv_out" }, to: { moduleId: "VCO1", port: "cv_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR2", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN9_in" } }
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
            description: '繝｡繧ｿ繝ｪ繝・け繝代・繧ｫ繝・す繝ｧ繝ｳ / 繝ｪ繝繧ｷ繝ｧ繝・ヨ・磯≡螻樒噪縺ｪ蛟埼浹繝ｪ繝ｳ繧ｰ繝｢繧ｸ繝･繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ・・,
            ports: {
                trig_in: { pin: 'PIN4', signal: 'gate' },
                wave_out: { pin: 'PIN9', signal: 'audio' }
            }
        },
        pins: {
            PIN4: { label: 'Trig / Gate', type: 'gate_in' },
            PIN9: { label: 'Audio Out', type: 'audio_out' }
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
                { from: { moduleId: "SUB_IO1", port: "PIN4_out" }, to: { moduleId: "ADSR1", port: "gate_in" } },
                { from: { moduleId: "VCO1", port: "wave_out" }, to: { moduleId: "VCF1", port: "wave_in" } },
                { from: { moduleId: "VCF1", port: "wave_out" }, to: { moduleId: "VCA1", port: "wave_in" } },
                { from: { moduleId: "ADSR1", port: "cv_out" }, to: { moduleId: "VCA1", port: "cv_in" } },
                { from: { moduleId: "VCA1", port: "wave_out" }, to: { moduleId: "SUB_IO1", port: "PIN9_in" } }
            ]
        }
    }
};

export const findSubpatchTemplate = (idOrSubType) => {
    if (!idOrSubType) return null;
    if (FACTORY_SUBPATCHES[idOrSubType]) return FACTORY_SUBPATCHES[idOrSubType];
    return Object.values(FACTORY_SUBPATCHES).find(s => s.subType === idOrSubType || s.id === idOrSubType) || null;
};
