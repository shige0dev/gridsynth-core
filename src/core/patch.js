import { safeClone, parseConn, isSubModule, normalizeSubPort, isPortMatching } from './utils.js?v=456';
import { MODULE_REGISTRY } from '../modules/registry.js?v=456';
import { FACTORY_SUBPATCHES } from '../presets/subpatches.js?v=456';
import { WaveCodec } from '../audio/wave-codec.js?v=456';

/**
 * Resolves a subpatch template by id, subType, or name.
 * Searches FACTORY_SUBPATCHES first, then userSubpatches or localStorage.
 */
export function resolveSubpatchTemplate(idOrSubType, userSubpatches = null) {
    if (!idOrSubType) return null;
    const key = String(idOrSubType).trim();
    const keyLower = key.toLowerCase();

    if (FACTORY_SUBPATCHES[key]) return FACTORY_SUBPATCHES[key];

    const ALIAS_MAP = {
        'dualvcovoice': 'FACTORY_DUAL_VCO',
        'dualvco': 'FACTORY_DUAL_VCO',
        'duallead': 'FACTORY_DUAL_VCO',
        'spacefxvoice': 'FACTORY_SPACE_FX',
        'spacefx': 'FACTORY_SPACE_FX',
        'acidbass': 'FACTORY_ACID',
        'kick': 'FACTORY_KICK',
        'bassdrum': 'FACTORY_KICK',
        'kick2': 'FACTORY_KICK2',
        'technokick': 'FACTORY_KICK2',
        'subkick': 'FACTORY_SUB_KICK',
        'snare': 'FACTORY_SNARE',
        'snaredrum': 'FACTORY_SNARE',
        'rim': 'FACTORY_RIM',
        'rimshot': 'FACTORY_RIM',
        'ghost': 'FACTORY_GHOST_SNARE',
        'ghostsnare': 'FACTORY_GHOST_SNARE',
        'hihat': 'FACTORY_HIHAT',
        'ch': 'FACTORY_HIHAT',
        'chtight': 'FACTORY_HIHAT',
        'chsoft': 'FACTORY_CH_SOFT',
        'hihatsoft': 'FACTORY_CH_SOFT',
        'openhat': 'FACTORY_OPEN_HAT',
        'clap': 'FACTORY_CLAP',
        'handclap': 'FACTORY_CLAP',
        'tom': 'FACTORY_TOM',
        'technotom': 'FACTORY_TOM',
        'perc': 'FACTORY_PERC',
        'metallicperc': 'FACTORY_PERC',
        'crash': 'FACTORY_CRASH',
        'crashcymbal': 'FACTORY_CRASH'
    };
    if (ALIAS_MAP[keyLower] && FACTORY_SUBPATCHES[ALIAS_MAP[keyLower]]) {
        return FACTORY_SUBPATCHES[ALIAS_MAP[keyLower]];
    }

    const factoryMatch = Object.values(FACTORY_SUBPATCHES).find(s =>
        (s.subType && s.subType.toLowerCase() === keyLower) ||
        (s.id && s.id.toLowerCase() === keyLower) ||
        (s.name && s.name.toLowerCase() === keyLower)
    );
    if (factoryMatch) return factoryMatch;

    let userSubs = userSubpatches;
    if (!userSubs && typeof localStorage !== 'undefined') {
        try {
            userSubs = JSON.parse(localStorage.getItem('gridsynth_user_subpatches')) || null;
        } catch (e) {}
    }
    if (userSubs) {
        if (userSubs[key]) return userSubs[key];
        const userMatch = Object.values(userSubs).find(s =>
            (s.subType && s.subType.toLowerCase() === keyLower) ||
            (s.id && s.id.toLowerCase() === keyLower) ||
            (s.name && s.name.toLowerCase() === keyLower)
        );
        if (userMatch) return userMatch;
    }

    return null;
}

export function resolveModManifest(mod, rawPages, pageId, userSubpatches = null) {
    if (!mod) return null;
    if (mod.manifest) return mod.manifest;
    if (mod.type === 'SUB') {
        const targetPage = String(mod.targetPage ?? 1);
        const targetPData = rawPages?.[targetPage];
        if (targetPData?.manifest) return targetPData.manifest;
        const tId = mod.subType || targetPData?.subType || targetPData?.sourceTemplateId;
        if (tId) {
            const tmpl = resolveSubpatchTemplate(tId, userSubpatches);
            if (tmpl?.manifest) return tmpl.manifest;
        }
    } else if (mod.type === 'SUB_IO') {
        const curPData = rawPages?.[pageId];
        if (curPData?.manifest) return curPData.manifest;
        const tId = curPData?.subType || curPData?.sourceTemplateId;
        if (tId) {
            const tmpl = resolveSubpatchTemplate(tId, userSubpatches);
            if (tmpl?.manifest) return tmpl.manifest;
        }
    }
    return null;
}

function resolveUniquePageName(preferredName, existingNames) {
    const cleanBase = (preferredName || 'SUBPATCH').replace(/_\d+$/, '');
    if (!existingNames.has(cleanBase)) {
        existingNames.add(cleanBase);
        return cleanBase;
    }
    let suffix = 1;
    while (existingNames.has(`${cleanBase}_${suffix}`)) {
        suffix++;
    }
    const unique = `${cleanBase}_${suffix}`;
    existingNames.add(unique);
    return unique;
}

/**
 * Dynamic Page Binder:
 * Scans rawPages for SUB modules. If a SUB module has `subType` (or is missing targetPage),
 * binds it to a free page index (lowest unused integer >= 1) and instantiates the template
 * definition (from FACTORY_SUBPATCHES or userSubpatches) into rawPages.
 */
export function bindSubtypesAndExpandPages(rawPages, userSubpatches = null) {
    if (!rawPages || typeof rawPages !== 'object') return;

    const usedPageIds = new Set(Object.keys(rawPages).map(String));
    const usedNames = new Set(
        Object.values(rawPages)
            .map(p => p?.name)
            .filter(Boolean)
    );

    Object.values(rawPages).forEach(p => {
        if (!p) return;
        const mods = p.modules || {};
        Object.values(mods).forEach(m => {
            if (m && (m.type === 'SUB' || (!m.type && m.id?.startsWith('SUB') && !m.id?.startsWith('SUB_IO')))) {
                if (m.targetPage !== undefined && m.targetPage !== null) {
                    usedPageIds.add(String(m.targetPage));
                }
            }
        });
    });

    let maxDepth = 10;
    let anyExpanded = true;

    while (anyExpanded && maxDepth-- > 0) {
        anyExpanded = false;

        const pageEntries = Object.entries(rawPages);
        for (const [pageId, pData] of pageEntries) {
            if (!pData) continue;
            const mods = pData.modules || (pData.modules = {});
            const slots = pData.slots || {};

            Object.values(slots).forEach(mId => {
                if (typeof mId === 'string' && mId.startsWith('SUB') && !mId.startsWith('SUB_IO')) {
                    if (!mods[mId]) mods[mId] = { type: 'SUB', id: mId };
                }
            });

            for (const [mId, mod] of Object.entries(mods)) {
                if (!mod) continue;
                const modType = mod.type || mId.replace(/[0-9]/g, '').toUpperCase();
                if (modType !== 'SUB') continue;

                const existingTarget = (mod.targetPage !== undefined && mod.targetPage !== null)
                    ? String(mod.targetPage)
                    : null;
                const pageAlreadyExists = existingTarget && rawPages[existingTarget];

                if (pageAlreadyExists) {
                    const targetPData = rawPages[existingTarget];
                    const tId = mod.subType || targetPData.subType || targetPData.sourceTemplateId;
                    if (tId) {
                        if (!targetPData.subType) targetPData.subType = tId;
                        if (!mod.subType) mod.subType = tId;
                        if (!targetPData.manifest || !mod.manifest) {
                            const tmpl = resolveSubpatchTemplate(tId, userSubpatches);
                            if (tmpl?.manifest) {
                                if (!targetPData.manifest) targetPData.manifest = safeClone(tmpl.manifest);
                                if (!mod.manifest) mod.manifest = safeClone(tmpl.manifest);
                            }
                        }
                    }
                    continue;
                }

                if (!mod.subType && existingTarget) {
                    continue;
                }

                let nextNum = 1;
                while (usedPageIds.has(String(nextNum)) || rawPages[String(nextNum)]) {
                    nextNum++;
                }
                const newPageId = String(nextNum);
                usedPageIds.add(newPageId);

                mod.targetPage = nextNum;

                const subType = mod.subType || mod.sourceTemplateId;
                const tmpl = subType ? resolveSubpatchTemplate(subType, userSubpatches) : null;

                if (tmpl) {
                    const tPageData = tmpl.pageData || tmpl;
                    const baseName = tmpl.name || `SUBPATCH ${newPageId}`;
                    const uniqueName = resolveUniquePageName(baseName, usedNames);

                    rawPages[newPageId] = {
                        name: uniqueName,
                        subType: tmpl.subType || subType,
                        sourceTemplateId: tmpl.id || subType,
                        manifest: safeClone(tmpl.manifest || mod.manifest || { description: '', ports: {} }),
                        slots: safeClone(tPageData.slots || {}),
                        modules: safeClone(tPageData.modules || {}),
                        connections: safeClone(tPageData.connections || [])
                    };
                    if (!mod.manifest && tmpl.manifest) {
                        mod.manifest = safeClone(tmpl.manifest);
                    }
                    if (!mod.subType) {
                        mod.subType = tmpl.subType || subType;
                    }
                } else {
                    const baseName = mod.name || `SUBPATCH ${newPageId}`;
                    const uniqueName = resolveUniquePageName(baseName, usedNames);
                    const ioMod = { type: 'SUB_IO', id: 'SUB_IO1', col: 2, row: 0 };
                    rawPages[newPageId] = {
                        name: uniqueName,
                        subType: subType || undefined,
                        manifest: safeClone(mod.manifest || { description: '', ports: {} }),
                        slots: { "2": "SUB_IO1" },
                        modules: { "SUB_IO1": ioMod },
                        connections: []
                    };
                }

                anyExpanded = true;
            }
        }
    }
}

export function validateConnectionDirection(c, fromMod, toMod, fromManifest = null, toManifest = null, errorSink = null) {
    const logErr = (msg) => {
        console.error(`[Gridsynth Parse Error] ${msg}`);
        if (errorSink && Array.isArray(errorSink)) {
            errorSink.push(msg);
        }
    };

    if (!c || !c.from || !c.to) {
        logErr('結線構文エラー: 接続の from または to が指定されていません。');
        return false;
    }

    if (!fromMod) {
        logErr(`結線エラー: "${c.from.moduleId}:${c.from.port} > ${c.to.moduleId}:${c.to.port}" - 送信元モジュール "${c.from.moduleId}" は modules に定義されていません。`);
        return false;
    }
    if (!toMod) {
        logErr(`結線エラー: "${c.from.moduleId}:${c.from.port} > ${c.to.moduleId}:${c.to.port}" - 送信先モジュール "${c.to.moduleId}" は modules に定義されていません。`);
        return false;
    }

    const fromType = fromMod?.type || c.from.moduleId?.replace(/[0-9]/g, '').toUpperCase();
    const toType = toMod?.type || c.to.moduleId?.replace(/[0-9]/g, '').toUpperCase();

    // Check sender (from)
    const fromIsSub = isSubModule(fromType);
    let fromPort = c.from.port;
    if (fromIsSub) {
        fromPort = normalizeSubPort(fromPort, fromType, fromManifest);
        const m = fromPort.match(/^PIN([1-9]|1[0-4])_(in|out)$/i);
        if (m && m[2].toLowerCase() !== 'out') {
            logErr(`結線構文エラー: "${c.from.moduleId}:${c.from.port} > ${c.to.moduleId}:${c.to.port}" - ${c.from.moduleId}:${fromPort} は入力端子です。送信元には出力端子(_out)を指定してください。`);
            return false;
        }
    } else {
        const regFrom = MODULE_REGISTRY[fromType];
        if (regFrom?.ports) {
            try {
                const pList = typeof regFrom.ports === 'function' ? regFrom.ports(fromMod || {}) : regFrom.ports;
                const outPorts = (pList?.out || []).map(p => (typeof p === 'string' ? p : p.port));
                const outAliases = (pList?.out || []).flatMap(p => typeof p === 'object' && p.alias ? p.alias.split(',').map(s => s.trim()) : []);
                const isMatch = outPorts.some(p => isPortMatching(p, fromPort)) || outAliases.includes(fromPort);
                if (outPorts.length > 0 && !isMatch) {
                    logErr(`結線構文エラー: "${c.from.moduleId}:${c.from.port} > ${c.to.moduleId}:${c.to.port}" - ${c.from.moduleId}:${fromPort} は有効な出力端子ではありません。(利用可能な出力端子: [${outPorts.join(', ')}])`);
                    return false;
                }
            } catch (e) {}
        } else if (fromPort.endsWith('_in')) {
            logErr(`結線構文エラー: "${c.from.moduleId}:${c.from.port} > ${c.to.moduleId}:${c.to.port}" - 送信元は出力端子(_out)である必要があります。`);
            return false;
        }
    }

    // Check receiver (to)
    const toIsSub = isSubModule(toType);
    let toPort = c.to.port;
    if (toIsSub) {
        toPort = normalizeSubPort(toPort, toType, toManifest);
        const m = toPort.match(/^PIN([1-9]|1[0-4])_(in|out)$/i);
        if (m && m[2].toLowerCase() !== 'in') {
            logErr(`結線構文エラー: "${c.from.moduleId}:${c.from.port} > ${c.to.moduleId}:${c.to.port}" - ${c.to.moduleId}:${toPort} は出力端子です。送信先には入力端子(_in)を指定してください。`);
            return false;
        }
    } else {
        const regTo = MODULE_REGISTRY[toType];
        if (regTo?.ports) {
            try {
                const pList = typeof regTo.ports === 'function' ? regTo.ports(toMod || {}) : regTo.ports;
                const inPorts = (pList?.in || []).map(p => (typeof p === 'string' ? p : p.port));
                const inAliases = (pList?.in || []).flatMap(p => typeof p === 'object' && p.alias ? p.alias.split(',').map(s => s.trim()) : []);
                const isMatch = inPorts.some(p => isPortMatching(p, toPort)) || inAliases.includes(toPort);
                if (inPorts.length > 0 && !isMatch) {
                    logErr(`結線構文エラー: "${c.from.moduleId}:${c.from.port} > ${c.to.moduleId}:${c.to.port}" - ${c.to.moduleId}:${toPort} は有効な入力端子ではありません。(利用可能な入力端子: [${inPorts.join(', ')}])`);
                    return false;
                }
            } catch (e) {}
        } else if (toPort.endsWith('_out')) {
            logErr(`結線構文エラー: "${c.from.moduleId}:${c.from.port} > ${c.to.moduleId}:${c.to.port}" - 送信先は入力端子(_in)である必要があります。`);
            return false;
        }
    }

    return true;
}

/**
 * Normalizes any patch data format (full pages or single-page) into standard { bpm, pages, errors }
 */
export function parsePatch(patchData, cols = 4, userSubpatches = null, errorSink = null) {
    const errors = errorSink && Array.isArray(errorSink) ? errorSink : [];
    if (!patchData) {
        return { bpm: 120, pages: { "0": { name: '', slots: {}, modules: {}, connections: [] } }, errors };
    }

    let rawPages;
    if (patchData.pages) {
        rawPages = safeClone(patchData.pages);
    } else {
        const page0 = safeClone(patchData);
        rawPages = { "0": page0 };
    }

    // If standalone submodule format, preserve metadata on page 0
    if (patchData.format === 'gridsynth-submodule' || patchData.subType) {
        if (rawPages["0"]) {
            if (patchData.name && !rawPages["0"].name) rawPages["0"].name = patchData.name;
            if (patchData.subType && !rawPages["0"].subType) rawPages["0"].subType = patchData.subType;
            if (patchData.manifest && !rawPages["0"].manifest) rawPages["0"].manifest = safeClone(patchData.manifest);
        }
    }

    // Dynamic Page Binder: resolve subType, allocate free pages, expand templates
    bindSubtypesAndExpandPages(rawPages, userSubpatches);

    const parsedPages = {};

    Object.entries(rawPages).forEach(([pageId, pData]) => {
        const resolvedMods = {};
        const slots = pData.slots ? { ...pData.slots } : {};
        const rawMods = pData.modules || {};

        // Track malformed raw connections if any
        (pData.connections || []).forEach(rawC => {
            const parsed = parseConn(rawC);
            if (!parsed) {
                const repr = typeof rawC === 'string' ? rawC : JSON.stringify(rawC);
                const msg = `結線構文エラー: 接続形式が無効です (${repr})。"from" および "to" ("moduleId", "port") を指定してください。`;
                console.error(`[Gridsynth Parse Error] ${msg}`);
                errors.push(msg);
            }
        });

        // Collect all modules with explicit row/col or slot placement
        // If source was created for different columns (e.g. 5 cols) or module has explicit row/col,
        // safely remap onto current cols
        const finalSlots = {};
        const placedPositions = new Set(); // "r,c"

        // Pass 1: Modules that have explicit row/col
        Object.entries(rawMods).forEach(([id, raw]) => {
            if (raw && raw.row !== undefined && raw.col !== undefined) {
                let r = raw.row;
                let c = raw.col;
                if (c >= cols) {
                    c = c % cols;
                    r = r + 1;
                }
                while (placedPositions.has(`${r},${c}`)) {
                    c++;
                    if (c >= cols) {
                        c = 0;
                        r++;
                    }
                }
                placedPositions.add(`${r},${c}`);
                finalSlots[String(r * cols + c)] = id;
            }
        });

        // Pass 2: Modules specified via slots (index-based)
        Object.entries(slots).forEach(([slotStr, id]) => {
            if (Object.values(finalSlots).includes(id)) return;
            const oldIdx = parseInt(slotStr, 10);
            let r = Math.floor(oldIdx / cols);
            let c = oldIdx % cols;
            while (placedPositions.has(`${r},${c}`)) {
                c++;
                if (c >= cols) {
                    c = 0;
                    r++;
                }
            }
            placedPositions.add(`${r},${c}`);
            finalSlots[String(r * cols + c)] = id;
        });

        // Pass 3: Any leftover module
        Object.entries(rawMods).forEach(([id, raw]) => {
            if (Object.values(finalSlots).includes(id)) return;
            let r = 0, c = 0;
            while (placedPositions.has(`${r},${c}`)) {
                c++;
                if (c >= cols) {
                    c = 0;
                    r++;
                }
            }
            placedPositions.add(`${r},${c}`);
            finalSlots[String(r * cols + c)] = id;
        });

        Object.entries(finalSlots).forEach(([slotStr, id]) => {
            const slotIdx = parseInt(slotStr, 10);
            const raw = rawMods[id] || {};
            const type = raw.type || id.replace(/[0-9]/g, '').toUpperCase();
            if (!MODULE_REGISTRY[type] && !isSubModule(type)) {
                const msg = `モジュール設定エラー: 未知のモジュールタイプ "${type}" (モジュールID: "${id}") です。`;
                console.error(`[Gridsynth Parse Error] ${msg}`);
                errors.push(msg);
            }
            const def = MODULE_REGISTRY[type]?.defaults ? MODULE_REGISTRY[type].defaults() : { type };
            const mod = Object.assign({}, def, raw, {
                type,
                id,
                col: slotIdx % cols,
                row: Math.floor(slotIdx / cols)
            });
            MODULE_REGISTRY[type]?.onNormalize?.(mod);
            resolvedMods[id] = mod;
        });

        const connections = (pData.connections || []).map(parseConn).filter(Boolean).flatMap(c => {
            if (c.to?.port === 'wave_in' && (resolvedMods[c.to.moduleId]?.type === 'SPK' || c.to.moduleId?.startsWith('SPK'))) {
                return [
                    { from: { ...c.from }, to: { moduleId: c.to.moduleId, port: 'wave_in_l' } },
                    { from: { ...c.from }, to: { moduleId: c.to.moduleId, port: 'wave_in_r' } }
                ];
            }
            return [c];
        }).map(c => {
            const fromMod = resolvedMods[c.from?.moduleId];
            const toMod = resolvedMods[c.to?.moduleId];
            const fromManifest = resolveModManifest(fromMod, rawPages, pageId, userSubpatches);
            const toManifest = resolveModManifest(toMod, rawPages, pageId, userSubpatches);

            let fromPort = c.from?.port;
            let toPort = c.to?.port;

            if (isSubModule(fromMod?.type || c.from?.moduleId)) {
                fromPort = normalizeSubPort(fromPort, fromMod?.type || c.from?.moduleId, fromManifest);
            }
            if (isSubModule(toMod?.type || c.to?.moduleId)) {
                toPort = normalizeSubPort(toPort, toMod?.type || c.to?.moduleId, toManifest);
            }

            const normConn = {
                from: { ...c.from, port: fromPort },
                to: { ...c.to, port: toPort }
            };

            const isValid = validateConnectionDirection(normConn, fromMod, toMod, fromManifest, toManifest, errors);
            if (!isValid) return null;

            return normConn;
        }).filter(Boolean);

        parsedPages[pageId] = {
            name: pData.name || '',
            ...(pData.subType ? { subType: pData.subType } : {}),
            ...(pData.sourceTemplateId ? { sourceTemplateId: pData.sourceTemplateId } : {}),
            ...(pData.manifest ? { manifest: safeClone(pData.manifest) } : {}),
            slots: { ...slots },
            modules: resolvedMods,
            connections
        };
        WaveCodec.syncWaveLinks(parsedPages[pageId]);
    });

    if (!parsedPages["0"]) {
        parsedPages["0"] = { name: '', slots: {}, modules: {}, connections: [] };
    }

    return {
        bpm: patchData.bpm || 120,
        pages: parsedPages,
        errors
    };
}

/**
 * Exports a single module's data in the exact same structure as embedded in a patch JSON
 */
export function exportModuleData(m) {
    if (!m) return {};
    const { col, row, id: _id, ...props } = m;
    const cleanProps = {};
    Object.entries(props).forEach(([k, v]) => {
        if (!k.startsWith('_')) cleanProps[k] = v;
    });
    const cloned = safeClone(cleanProps);

    // Module lifecycle onExport hook
    MODULE_REGISTRY[m.type]?.onExport?.(cloned, m);

    return { type: m.type, ...cloned };
}

/**
 * Exports current pagesData structure into a clean, portable patch JSON object
 */
export function exportPatch(pagesData, bpm = 120, cols = 4, rows = 32) {
    const exportPages = {};

    Object.entries(pagesData || {}).forEach(([pId, pData]) => {
        WaveCodec.syncWaveLinks(pData);
        const slots = {};
        const cleanMods = {};

        Object.entries(pData.modules || {}).forEach(([id, m]) => {
            const slotIdx = m.row * cols + m.col;
            slots[String(slotIdx)] = id;
            cleanMods[id] = exportModuleData(m);
        });

        exportPages[pId] = {
            name: pData.name || '',
            ...(pData.subType ? { subType: pData.subType } : {}),
            ...(pData.sourceTemplateId ? { sourceTemplateId: pData.sourceTemplateId } : {}),
            ...(pData.manifest ? { manifest: safeClone(pData.manifest) } : {}),
            slots,
            modules: cleanMods,
            connections: (pData.connections || []).map(parseConn).filter(Boolean).map(c => {
                const fromMod = cleanMods[c.from?.moduleId] || pData.modules?.[c.from?.moduleId];
                const toMod = cleanMods[c.to?.moduleId] || pData.modules?.[c.to?.moduleId];
                let fromPort = c.from?.port;
                let toPort = c.to?.port;
                const fromManifest = resolveModManifest(fromMod, pagesData, pId);
                const toManifest = resolveModManifest(toMod, pagesData, pId);

                if (isSubModule(fromMod?.type || c.from?.moduleId)) {
                    fromPort = normalizeSubPort(fromPort, fromMod?.type || c.from?.moduleId, fromManifest);
                }
                if (isSubModule(toMod?.type || c.to?.moduleId)) {
                    toPort = normalizeSubPort(toPort, toMod?.type || c.to?.moduleId, toManifest);
                }

                if (fromPort !== c.from?.port || toPort !== c.to?.port) {
                    return {
                        from: { ...c.from, port: fromPort },
                        to: { ...c.to, port: toPort }
                    };
                }
                return c;
            })
        };
    });

    return {
        bpm: bpm || 120,
        grid: { cols, rows },
        pages: exportPages
    };
}

/**
 * Creates default blank patch structure (with SPK1 at slot 3)
 */
export function createDefaultPatchData(bpm = 120) {
    return {
        bpm,
        grid: { cols: 4, rows: 32 },
        pages: {
            "0": {
                name: '',
                slots: { "3": "SPK1" },
                modules: { "SPK1": { type: "SPK", masterVol: 0.12 } },
                connections: []
            }
        }
    };
}

