// src/core/sub-utils.js

export const isSubModule = (modIdOrType) => {
    if (!modIdOrType || typeof modIdOrType !== 'string') return false;
    const s = modIdOrType.trim().toUpperCase();
    return s === 'SUB' || s === 'SUB_IO' || s.startsWith('SUB_IO') || s.startsWith('SUB');
};

export const isSubIOModule = (modIdOrType) => {
    if (!modIdOrType || typeof modIdOrType !== 'string') return false;
    const s = modIdOrType.trim().toUpperCase();
    return s === 'SUB_IO' || s.startsWith('SUB_IO');
};

export const getOppositeSubPort = (port) => {
    if (!port || typeof port !== 'string') return port;
    const m = port.match(/^PIN([1-9]|1[0-4])_(in|out)$/i);
    if (!m) return port;
    const num = parseInt(m[1], 10);
    const dir = m[2].toLowerCase();
    const oppDir = dir === 'in' ? 'out' : 'in';
    return `PIN${num}_${oppDir}`;
};

export const normalizeSubPort = (port, modIdOrType = null, manifest = null) => {
    if (!port || typeof port !== 'string') return port;
    const p = port.trim();
    const pLower = p.toLowerCase();
    const isChild = modIdOrType ? isSubIOModule(modIdOrType) : false;

    // 1. Check if port matches an alias defined in manifest.ports
    if (manifest && manifest.ports) {
        for (const [aliasKey, def] of Object.entries(manifest.ports)) {
            if (aliasKey.toLowerCase() === pLower) {
                const pinStr = (def.pin || '').toUpperCase();
                const m = pinStr.match(/^PIN([1-9]|1[0-4])$/);
                if (m) {
                    const slot = parseInt(m[1], 10);
                    if (slot <= 7) {
                        return isChild ? `PIN${slot}_out` : `PIN${slot}_in`;
                    } else {
                        return isChild ? `PIN${slot}_in` : `PIN${slot}_out`;
                    }
                }
            }
        }
    }

    // 2. Already exact PINn_in or PINn_out (case-insensitive)
    const pinMatch = p.match(/^PIN([1-9]|1[0-4])_(in|out)$/i);
    if (pinMatch) {
        return `PIN${pinMatch[1]}_${pinMatch[2].toLowerCase()}`;
    }

    // 3. Bare PINn without _in/_out
    const barePinMatch = p.match(/^PIN([1-9]|1[0-4])$/i);
    if (barePinMatch) {
        const slot = parseInt(barePinMatch[1], 10);
        if (slot <= 7) {
            return isChild ? `PIN${slot}_out` : `PIN${slot}_in`;
        } else {
            return isChild ? `PIN${slot}_in` : `PIN${slot}_out`;
        }
    }

    // 4. Common functional fallbacks
    const fallbacks = {
        'cv_in': 5, 'cv': 5, 'pitch_in': 5, 'pitch': 5, '1v_oct': 5, '1v/oct': 5,
        'gate_in': 4, 'gate': 4,
        'trig_in': 5, 'trig': 5,
        'wave_in': 5, 'audio_in': 5,
        'cv_in2': 4, 'mod_in': 4, 'cv2': 4, 'clk_in': 4, 'sync_in': 4,
        'gate_in2': 3, 'trig2': 3, 'reset_in': 3, 'reset': 3,
        'wave_out': 10, 'out': 10, 'audio_out': 10, 'main_out': 10,
        'wave_out2': 11, 'out2': 11, 'audio_out2': 11, 'aux_out': 11, 'wet_out': 11
    };
    if (fallbacks[pLower]) {
        const slot = fallbacks[pLower];
        if (slot <= 7) {
            return isChild ? `PIN${slot}_out` : `PIN${slot}_in`;
        } else {
            return isChild ? `PIN${slot}_in` : `PIN${slot}_out`;
        }
    }

    // 5. Legacy io_1 .. io_14 support
    const ioMatch = pLower.match(/^io_?([1-9]|1[0-4])$/);
    if (ioMatch) {
        const num = parseInt(ioMatch[1], 10);
        let slot = num;
        if (num === 9) slot = 8;
        else if (num === 10) slot = 9;
        else if (num === 11) slot = 10;
        else if (num === 12) slot = 11;

        if (slot <= 7) {
            return isChild ? `PIN${slot}_out` : `PIN${slot}_in`;
        } else {
            return isChild ? `PIN${slot}_in` : `PIN${slot}_out`;
        }
    }

    return port;
};

export const getSubPortAlias = (port, modIdOrType = null, manifest = null) => {
    if (!port || typeof port !== 'string') return null;
    const norm = normalizeSubPort(port, modIdOrType, manifest);
    const pinMatch = norm.match(/^PIN([1-9]|1[0-4])_(in|out)$/i);
    const pinNumber = pinMatch ? parseInt(pinMatch[1], 10) : null;
    const pinBare = pinNumber ? `PIN${pinNumber}` : null;

    if (!manifest || !manifest.ports || !pinBare) {
        return pinBare ? { pin: pinBare, physicalPort: norm, alias: null, aliasUpper: null, label: norm, desc: null, signal: null } : null;
    }

    for (const [aliasKey, def] of Object.entries(manifest.ports)) {
        if ((def.pin || '').toUpperCase() === pinBare) {
            const aliasUpper = aliasKey.toUpperCase();
            return {
                alias: aliasKey,
                aliasUpper,
                pin: pinBare,
                physicalPort: norm,
                label: `${aliasUpper} (${norm})`,
                desc: def.desc || null,
                signal: def.signal || null
            };
        }
    }

    return { pin: pinBare, physicalPort: norm, alias: null, aliasUpper: null, label: norm, desc: null, signal: null };
};

export const isSubPortOutput = (port, modIdOrType = null, manifest = null) => {
    const norm = normalizeSubPort(port, modIdOrType, manifest);
    const m = norm.match(/^PIN([1-9]|1[0-4])_(in|out)$/i);
    return m ? m[2].toLowerCase() === 'out' : false;
};

export const isSubPortInput = (port, modIdOrType = null, manifest = null) => {
    const norm = normalizeSubPort(port, modIdOrType, manifest);
    const m = norm.match(/^PIN([1-9]|1[0-4])_(in|out)$/i);
    return m ? m[2].toLowerCase() === 'in' : false;
};

