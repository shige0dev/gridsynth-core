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
                // Row 2: Slots 8..11 (Low Tom, High Tom, Cowbell, Perc 1)
                "8": "PAD9",
                "9": "PAD10",
                "10": "PAD11",
                "11": "PAD12",
                // Row 3: Slots 12..15 (Perc High, Snare Ghost, Kick Sub, Splash / Crash)
                "12": "PAD13",
                "13": "PAD14",
                "14": "PAD15",
                "15": "PAD16",
                // Row 4: Slots 16..19 (Dedicated Sound Engines for Row 0 pads)
                "16": "SUB1",
                "17": "SUB2",
                "18": "SUB3",
                "19": "SUB4",
                // Row 5: Slots 20..23 (Dedicated Sound Engines for Row 1 pads)
                "20": "SUB5",
                "21": "SUB6",
                "22": "SUB7",
                "23": "SUB8",
                // Row 6: Slots 24..27 (Dedicated Sound Engines for Row 2 pads)
                "24": "SUB9",
                "25": "SUB10",
                "26": "SUB11",
                "27": "SUB12",
                // Row 7: Slots 28..31 (Dedicated Sound Engines for Row 3 pads)
                "28": "SUB13",
                "29": "SUB14",
                "30": "SUB15",
                "31": "SUB16",
                // Row 8: Slots 32..35 (Master Summing VCA, Scope, Spectrum, and Speaker output)
                "32": "VCA1",
                "33": "SCOPE1",
                "34": "SPEC1",
                "35": "SPK1"
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
                "PAD10": { type: "PAD", name: "HIGH TOM", opacity: 0.8, hue: 0.32, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD11": { type: "PAD", name: "COWBELL", opacity: 0.8, hue: 0.14, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD12": { type: "PAD", name: "PERC 1", opacity: 0.8, hue: 0.16, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD13": { type: "PAD", name: "PERC 2", opacity: 0.8, hue: 0.70, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD14": { type: "PAD", name: "GHOST", opacity: 0.8, hue: 0.10, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD15": { type: "PAD", name: "SUB KICK", opacity: 0.8, hue: 0.02, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                "PAD16": { type: "PAD", name: "CRASH", opacity: 0.8, hue: 0.80, sat: 1.0, bright: 0.6, polX: 'bi', polY: 'bi' },
                // 16 Dedicated Sound Engines (Auto-expanded from subType templates)
                "SUB1": { type: "SUB", subType: "BassDrum" },
                "SUB2": { type: "SUB", subType: "TechnoKick" },
                "SUB3": { type: "SUB", subType: "SnareDrum" },
                "SUB4": { type: "SUB", subType: "RimShot" },
                "SUB5": { type: "SUB", subType: "HiHat" },
                "SUB6": { type: "SUB", subType: "HiHatSoft" },
                "SUB7": { type: "SUB", subType: "OpenHiHat" },
                "SUB8": { type: "SUB", subType: "HandClap" },
                "SUB9": { type: "SUB", subType: "TechnoTom" },
                "SUB10": { type: "SUB", subType: "HighTom" },
                "SUB11": { type: "SUB", subType: "Cowbell" },
                "SUB12": { type: "SUB", subType: "MetallicPerc" },
                "SUB13": { type: "SUB", subType: "HighPerc" },
                "SUB14": { type: "SUB", subType: "GhostSnare" },
                "SUB15": { type: "SUB", subType: "SubKick" },
                "SUB16": { type: "SUB", subType: "CrashCymbal" },
                // Master Section
                "VCA1": { type: "VCA", level: 0.8 },
                "SCOPE1": { type: "SCOPE" },
                "SPEC1": { type: "SPEC" },
                "SPK1": { type: "SPK", masterVol: 0.6 }
            },
            connections: [
                // 1-to-1 Gate routings from each Pad to its dedicated Sound Engine
                "PAD1:gate_out > SUB1:PIN5_in",
                "PAD2:gate_out > SUB2:PIN5_in",
                "PAD3:gate_out > SUB3:PIN5_in",
                "PAD4:gate_out > SUB4:PIN5_in",
                "PAD5:gate_out > SUB5:PIN5_in",
                "PAD6:gate_out > SUB6:PIN5_in",
                "PAD7:gate_out > SUB7:PIN5_in",
                "PAD8:gate_out > SUB8:PIN5_in",
                "PAD9:gate_out > SUB9:PIN5_in",
                "PAD10:gate_out > SUB10:PIN5_in",
                "PAD11:gate_out > SUB11:PIN5_in",
                "PAD12:gate_out > SUB12:PIN5_in",
                "PAD13:gate_out > SUB13:PIN5_in",
                "PAD14:gate_out > SUB14:PIN5_in",
                "PAD15:gate_out > SUB15:PIN5_in",
                "PAD16:gate_out > SUB16:PIN5_in",
                // Direct Audio Summing from all 16 Engines into Master VCA
                "SUB1:PIN10_out > VCA1:wave_in",
                "SUB2:PIN10_out > VCA1:wave_in",
                "SUB3:PIN10_out > VCA1:wave_in",
                "SUB4:PIN10_out > VCA1:wave_in",
                "SUB5:PIN10_out > VCA1:wave_in",
                "SUB6:PIN10_out > VCA1:wave_in",
                "SUB7:PIN10_out > VCA1:wave_in",
                "SUB8:PIN10_out > VCA1:wave_in",
                "SUB9:PIN10_out > VCA1:wave_in",
                "SUB10:PIN10_out > VCA1:wave_in",
                "SUB11:PIN10_out > VCA1:wave_in",
                "SUB12:PIN10_out > VCA1:wave_in",
                "SUB13:PIN10_out > VCA1:wave_in",
                "SUB14:PIN10_out > VCA1:wave_in",
                "SUB15:PIN10_out > VCA1:wave_in",
                "SUB16:PIN10_out > VCA1:wave_in",
                // Master VCA to Visualizers and Master Speaker
                "VCA1:wave_out > SCOPE1:cv_in",
                "VCA1:wave_out > SPEC1:wave_in",
                "VCA1:wave_out > SPK1:wave_in_l",
                "VCA1:wave_out > SPK1:wave_in_r"
            ]
        }
    }
};
