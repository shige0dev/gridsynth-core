// src/presets/demos/14_16_pad_drumkit.js
export const preset14 = {
    bpm: 128,
    pages: {
        "0": {
            name: "16_PAD_DRUMKIT",
            slots: {
                // Row 0: Slots 0..3 (Kick 1, Kick 2, Snare 1, Snare Rim)
                "0": "PAD1",
                "1": "PAD2",
                "2": "PAD3",
                "3": "PAD4",
                // Row 1: Slots 4..7 (Closed Hat Tight, Closed Hat Soft, Open Hat, Clap)
                "4": "PAD5",
                "5": "PAD6",
                "6": "PAD7",
                "7": "PAD8",
                // Row 2: Slots 8..11 (Low Tom, Mid Tom, High Tom, Perc / Rim)
                "8": "PAD9",
                "9": "PAD10",
                "10": "PAD11",
                "11": "PAD12",
                // Row 3: Slots 12..15 (Perc High, Snare Ghost, Kick Sub, Splash / Crash)
                "12": "PAD13",
                "13": "PAD14",
                "14": "PAD15",
                "15": "PAD16",
                // Row 4: Slots 16..19 (Sound Engines: Kick, Snare, Closed Hat, Open Hat)
                "16": "SUB1",
                "17": "SUB2",
                "18": "SUB3",
                "19": "SUB4",
                // Row 5: Slots 20..22 (Sound Engines: Clap, Tom, Master Speaker)
                "20": "SUB5",
                "21": "SUB6",
                "22": "SPK1"
            },
            modules: {
                // 16 Touch Pads (HSL color coded for instant visual recognition)
                "PAD1": { type: "PAD", name: "KICK 1", opacity: 0.8, hue: 0.00, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD2": { type: "PAD", name: "KICK 2", opacity: 0.8, hue: 0.04, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD3": { type: "PAD", name: "SNARE 1", opacity: 0.8, hue: 0.08, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD4": { type: "PAD", name: "RIM", opacity: 0.8, hue: 0.12, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD5": { type: "PAD", name: "CH TIGHT", opacity: 0.8, hue: 0.48, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD6": { type: "PAD", name: "CH SOFT", opacity: 0.8, hue: 0.53, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD7": { type: "PAD", name: "OPEN HAT", opacity: 0.8, hue: 0.58, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD8": { type: "PAD", name: "CLAP", opacity: 0.8, hue: 0.88, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD9": { type: "PAD", name: "LOW TOM", opacity: 0.8, hue: 0.25, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD10": { type: "PAD", name: "MID TOM", opacity: 0.8, hue: 0.32, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD11": { type: "PAD", name: "HIGH TOM", opacity: 0.8, hue: 0.38, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD12": { type: "PAD", name: "PERC 1", opacity: 0.8, hue: 0.16, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD13": { type: "PAD", name: "PERC 2", opacity: 0.8, hue: 0.70, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD14": { type: "PAD", name: "GHOST", opacity: 0.8, hue: 0.10, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD15": { type: "PAD", name: "SUB KICK", opacity: 0.8, hue: 0.02, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD16": { type: "PAD", name: "CRASH", opacity: 0.8, hue: 0.80, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                // 6 Optimized Core Drum Engines
                "SUB1": { type: "SUB", targetPage: 1, subType: "BassDrum" },
                "SUB2": { type: "SUB", targetPage: 2, subType: "SnareDrum" },
                "SUB3": { type: "SUB", targetPage: 3, subType: "HiHat" },
                "SUB4": { type: "SUB", targetPage: 4, subType: "HiHat" },
                "SUB5": { type: "SUB", targetPage: 5, subType: "HandClap" },
                "SUB6": { type: "SUB", targetPage: 6, subType: "TechnoTom" },
                // Output Stage
                "SPK1": { type: "SPK", masterVol: 0.6 }
            },
            connections: [
                // Gate routings from 16 Pads to 6 Engines
                "PAD1:gate_out > SUB1:PIN5_in",
                "PAD2:gate_out > SUB1:PIN5_in",
                "PAD15:gate_out > SUB1:PIN5_in",
                "PAD3:gate_out > SUB2:PIN5_in",
                "PAD4:gate_out > SUB2:PIN5_in",
                "PAD14:gate_out > SUB2:PIN5_in",
                "PAD5:gate_out > SUB3:PIN5_in",
                "PAD6:gate_out > SUB3:PIN5_in",
                "PAD7:gate_out > SUB4:PIN5_in",
                "PAD16:gate_out > SUB4:PIN5_in",
                "PAD8:gate_out > SUB5:PIN5_in",
                "PAD9:gate_out > SUB6:PIN5_in",
                "PAD10:gate_out > SUB6:PIN5_in",
                "PAD11:gate_out > SUB6:PIN5_in",
                "PAD12:gate_out > SUB6:PIN5_in",
                "PAD13:gate_out > SUB6:PIN5_in",
                // Direct Audio Summing into Master Speaker (No Mixer needed)
                "SUB1:PIN10_out > SPK1:wave_in_l",
                "SUB1:PIN10_out > SPK1:wave_in_r",
                "SUB2:PIN10_out > SPK1:wave_in_l",
                "SUB2:PIN10_out > SPK1:wave_in_r",
                "SUB3:PIN10_out > SPK1:wave_in_l",
                "SUB3:PIN10_out > SPK1:wave_in_r",
                "SUB4:PIN10_out > SPK1:wave_in_l",
                "SUB4:PIN10_out > SPK1:wave_in_r",
                "SUB5:PIN10_out > SPK1:wave_in_l",
                "SUB5:PIN10_out > SPK1:wave_in_r",
                "SUB6:PIN10_out > SPK1:wave_in_l",
                "SUB6:PIN10_out > SPK1:wave_in_r"
            ]
        },
        // Page 1: BASS DRUM (Kick)
        "1": {
            name: "BASS DRUM",
            subType: "BassDrum",
            sourceTemplateId: "FACTORY_KICK",
            slots: { "2": "SUB_IO1", "5": "VCO1", "6": "MATH2_1", "7": "ADSR1", "8": "ADSR2", "10": "VCA1" },
            modules: {
                "SUB_IO1": { type: "SUB_IO", col: 2, row: 0 },
                "VCO1": { type: "VCO", channels: 1, freq1: 52, wave: "sine", quantize: false, col: 0, row: 1 },
                "MATH2_1": { type: "MATH2", mode: "MULTI", valA: 0.0, valB: 2.6, col: 1, row: 1 },
                "ADSR1": { type: "ADSR", attack: 0.0005, attackCurve: -0.5, decay: 0.055, decayCurve: -0.75, sustain: 0.0, release: 0.03, releaseCurve: -0.7, col: 2, row: 1 },
                "ADSR2": { type: "ADSR", attack: 0.0005, attackCurve: -0.5, decay: 0.52, decayCurve: -0.42, sustain: 0.0, release: 0.08, releaseCurve: -0.4, col: 3, row: 1 },
                "VCA1": { type: "VCA", level: 0.0, col: 0, row: 2 }
            },
            connections: [
                "SUB_IO1:PIN5_out > ADSR1:gate_in",
                "SUB_IO1:PIN5_out > ADSR2:gate_in",
                "ADSR1:cv_out > MATH2_1:cv_in_a",
                "MATH2_1:cv_out > VCO1:cv_in",
                "VCO1:wave_out > VCA1:wave_in",
                "ADSR2:cv_out > VCA1:cv_in",
                "VCA1:wave_out > SUB_IO1:PIN10_in"
            ]
        },
        // Page 2: SNARE DRUM
        "2": {
            name: "SNARE DRUM",
            subType: "SnareDrum",
            sourceTemplateId: "FACTORY_SNARE",
            slots: { "2": "SUB_IO1", "5": "VCO1", "6": "ADSR1", "7": "MIX1", "8": "ADSR2", "9": "NOISE1", "10": "VCA1", "14": "VCF1", "19": "VCA2" },
            modules: {
                "SUB_IO1": { type: "SUB_IO", col: 2, row: 0 },
                "VCO1": { type: "VCO", channels: 1, freq1: 185, wave: "triangle", quantize: false, col: 0, row: 1 },
                "ADSR1": { type: "ADSR", attack: 0.0005, decay: 0.08, sustain: 0.0, release: 0.04, col: 1, row: 1 },
                "MIX1": { type: "MIX", channels: 2, lvl1: 0.8, lvl2: 0.9, col: 2, row: 1 },
                "ADSR2": { type: "ADSR", attack: 0.0005, decay: 0.18, sustain: 0.0, release: 0.06, col: 3, row: 1 },
                "NOISE1": { type: "NOISE", noiseType: "white", tone: 8000, level: 1.0, col: 0, row: 2 },
                "VCA1": { type: "VCA", level: 0.0, col: 1, row: 2 },
                "VCF1": { type: "VCF", filterType: "highpass", cutoff: 1400, q: 2.0, modDepth: 0, col: 0, row: 3 },
                "VCA2": { type: "VCA", level: 0.0, col: 1, row: 3 }
            },
            connections: [
                "SUB_IO1:PIN5_out > ADSR1:gate_in",
                "SUB_IO1:PIN5_out > ADSR2:gate_in",
                "VCO1:wave_out > VCA1:wave_in",
                "ADSR1:cv_out > VCA1:cv_in",
                "VCA1:wave_out > MIX1:wave_in1",
                "NOISE1:wave_out > VCF1:wave_in",
                "VCF1:wave_out > VCA2:wave_in",
                "ADSR2:cv_out > VCA2:cv_in",
                "VCA2:wave_out > MIX1:wave_in2",
                "MIX1:wave_out > SUB_IO1:PIN10_in"
            ]
        },
        // Page 3: CLOSED HI-HAT (Tight & Crisp)
        "3": {
            name: "CLOSED HAT",
            subType: "HiHat",
            sourceTemplateId: "FACTORY_HIHAT",
            slots: { "2": "SUB_IO1", "6": "NOISE1", "7": "VCF1", "8": "ADSR1", "12": "VCA1" },
            modules: {
                "SUB_IO1": { type: "SUB_IO", col: 2, row: 0 },
                "NOISE1": { type: "NOISE", noiseType: "white", tone: 9500, level: 1.0, col: 1, row: 1 },
                "VCF1": { type: "VCF", filterType: "highpass", cutoff: 7800, q: 3.5, modDepth: 0, col: 2, row: 1 },
                "ADSR1": { type: "ADSR", attack: 0.0005, attackCurve: -0.5, decay: 0.045, decayCurve: -0.85, sustain: 0.0, release: 0.02, releaseCurve: -0.8, col: 3, row: 1 },
                "VCA1": { type: "VCA", level: 0.0, col: 2, row: 2 }
            },
            connections: [
                "SUB_IO1:PIN5_out > ADSR1:gate_in",
                "NOISE1:wave_out > VCF1:wave_in",
                "VCF1:wave_out > VCA1:wave_in",
                "ADSR1:cv_out > VCA1:cv_in",
                "VCA1:wave_out > SUB_IO1:PIN10_in"
            ]
        },
        // Page 4: OPEN HI-HAT (Sizzling Long Tail)
        "4": {
            name: "OPEN HAT",
            subType: "HiHat",
            sourceTemplateId: "FACTORY_HIHAT",
            slots: { "2": "SUB_IO1", "6": "NOISE1", "7": "VCF1", "8": "ADSR1", "12": "VCA1" },
            modules: {
                "SUB_IO1": { type: "SUB_IO", col: 2, row: 0 },
                "NOISE1": { type: "NOISE", noiseType: "white", tone: 9200, level: 1.0, col: 1, row: 1 },
                "VCF1": { type: "VCF", filterType: "highpass", cutoff: 6500, q: 2.8, modDepth: 0, col: 2, row: 1 },
                "ADSR1": { type: "ADSR", attack: 0.0005, attackCurve: -0.5, decay: 0.28, decayCurve: -0.5, sustain: 0.0, release: 0.08, releaseCurve: -0.5, col: 3, row: 1 },
                "VCA1": { type: "VCA", level: 0.0, col: 2, row: 2 }
            },
            connections: [
                "SUB_IO1:PIN5_out > ADSR1:gate_in",
                "NOISE1:wave_out > VCF1:wave_in",
                "VCF1:wave_out > VCA1:wave_in",
                "ADSR1:cv_out > VCA1:cv_in",
                "VCA1:wave_out > SUB_IO1:PIN10_in"
            ]
        },
        // Page 5: HAND CLAP (Multi-Burst 909 style)
        "5": {
            name: "HAND CLAP",
            subType: "HandClap",
            sourceTemplateId: "FACTORY_CLAP",
            slots: { "2": "SUB_IO1", "5": "CVDELAY1", "6": "CVDELAY2", "7": "ADSR1", "8": "ADSR2", "9": "ADSR3", "11": "NOISE1", "12": "VCF1", "13": "VCA1" },
            modules: {
                "SUB_IO1": { type: "SUB_IO", col: 2, row: 0 },
                "CVDELAY1": { type: "CVDELAY", time: 0.012, feedback: 0.0, col: 0, row: 1 },
                "CVDELAY2": { type: "CVDELAY", time: 0.024, feedback: 0.0, col: 1, row: 1 },
                "ADSR1": { type: "ADSR", attack: 0.0005, attackCurve: -0.5, decay: 0.012, decayCurve: -0.8, sustain: 0.0, release: 0.01, releaseCurve: -0.8, col: 2, row: 1 },
                "ADSR2": { type: "ADSR", attack: 0.0005, attackCurve: -0.5, decay: 0.012, decayCurve: -0.8, sustain: 0.0, release: 0.01, releaseCurve: -0.8, col: 3, row: 1 },
                "ADSR3": { type: "ADSR", attack: 0.0005, attackCurve: -0.5, decay: 0.22, decayCurve: -0.55, sustain: 0.0, release: 0.04, releaseCurve: -0.5, col: 0, row: 2 },
                "NOISE1": { type: "NOISE", noiseType: "white", tone: 6000, level: 1.0, col: 1, row: 2 },
                "VCF1": { type: "VCF", filterType: "bandpass", cutoff: 1100, q: 3.2, modDepth: 0, col: 2, row: 2 },
                "VCA1": { type: "VCA", level: 0.0, col: 3, row: 2 }
            },
            connections: [
                "SUB_IO1:PIN5_out > ADSR1:gate_in",
                "SUB_IO1:PIN5_out > CVDELAY1:cv_in",
                "CVDELAY1:cv_out > ADSR2:gate_in",
                "SUB_IO1:PIN5_out > CVDELAY2:cv_in",
                "CVDELAY2:cv_out > ADSR3:gate_in",
                "ADSR1:cv_out > VCA1:cv_in",
                "ADSR2:cv_out > VCA1:cv_in",
                "ADSR3:cv_out > VCA1:cv_in",
                "NOISE1:wave_out > VCF1:wave_in",
                "VCF1:wave_out > VCA1:wave_in",
                "VCA1:wave_out > SUB_IO1:PIN10_in"
            ]
        },
        // Page 6: TECHNO TOM / PERC
        "6": {
            name: "TECHNO TOM",
            subType: "TechnoTom",
            sourceTemplateId: "FACTORY_TOM",
            slots: { "2": "SUB_IO1", "5": "MATH2_1", "6": "MATH2_2", "7": "ADSR1", "8": "ADSR2", "11": "VCO1", "12": "VCA1" },
            modules: {
                "SUB_IO1": { type: "SUB_IO", col: 2, row: 0 },
                "MATH2_1": { type: "MATH2", mode: "MULTI", valA: 0.0, valB: 1.8, col: 0, row: 1 },
                "MATH2_2": { type: "MATH2", mode: "ADD", valA: 0.0, valB: 1.6, col: 1, row: 1 },
                "ADSR1": { type: "ADSR", attack: 0.0005, attackCurve: -0.5, decay: 0.045, decayCurve: -0.8, sustain: 0.0, release: 0.02, releaseCurve: -0.8, col: 2, row: 1 },
                "ADSR2": { type: "ADSR", attack: 0.0005, attackCurve: -0.5, decay: 0.35, decayCurve: -0.45, sustain: 0.0, release: 0.06, releaseCurve: -0.4, col: 3, row: 1 },
                "VCO1": { type: "VCO", channels: 1, freq1: 100, wave: "triangle", quantize: false, col: 1, row: 2 },
                "VCA1": { type: "VCA", level: 0.0, col: 2, row: 2 }
            },
            connections: [
                "SUB_IO1:PIN5_out > ADSR1:gate_in",
                "SUB_IO1:PIN5_out > ADSR2:gate_in",
                "ADSR1:cv_out > MATH2_1:cv_in_a",
                "MATH2_1:cv_out > MATH2_2:cv_in_a",
                "MATH2_2:cv_out > VCO1:cv_in",
                "VCO1:wave_out > VCA1:wave_in",
                "ADSR2:cv_out > VCA1:cv_in",
                "VCA1:wave_out > SUB_IO1:PIN10_in"
            ]
        }
    }
};

