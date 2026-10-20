import { safeClone, parseConn } from '../../core/utils.js?v=275';
import { parsePatch, exportPatch, createDefaultPatchData } from '../../core/patch.js?v=275';
import { getDefaultPresets } from '../../presets/default.js?v=275';
import { AI_PATCH_SPEC_CONTENT } from '../../presets/ai-spec-content.js';
import { JsonIoDialog, analyzeJsonError } from '../json-io-dialog.js?v=275';

export { analyzeJsonError };

export class PresetManager {
    showImportError(opts) {
        return this.ui.openCustomAlert(
            opts.title || 'IMPORT ERROR',
            opts.message || '繧､繝ｳ繝昴・繝井ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・,
            opts.details || [],
            {
                isError: opts.isError !== false,
                copyBtnLabel: opts.copyBtnLabel || 'COPY ERROR',
                copyText: opts.copyText
            }
        );
    }

    constructor(ui) {
        this.ui = ui;
        const defs = getDefaultPresets();
        this.DEMO_KEYS = Object.keys(defs);
        this.demoAccordionOpen = false;

        try {
            this.userSubpatches = JSON.parse(localStorage.getItem('gridsynth_user_subpatches')) || {};
        } catch (e) {
            this.userSubpatches = {};
        }

        try {
            const stored = JSON.parse(localStorage.getItem('gridsynth_presets_db')) || {};
            this.presets = {};
            Object.entries(stored).forEach(([k, v]) => {
                if (v && v.pages && v.pages["0"] && !k.startsWith('DEMO')) {
                    this.presets[k] = v;
                }
            });
        } catch (e) {
            this.presets = {};
        }

        this.DEMO_KEYS.forEach(k => {
            this.presets[k] = defs[k];
        });

        try {
            const order = JSON.parse(localStorage.getItem('gridsynth_preset_order')) || [];
            this.presetOrder = order.filter(k => this.presets[k] && !k.startsWith('DEMO'));
            this.DEMO_KEYS.forEach(k => {
                if (!this.presetOrder.includes(k)) this.presetOrder.push(k);
            });
        } catch (e) {
            this.presetOrder = [...this.DEMO_KEYS];
        }

        this.currentPresetKey = this.presets['01_DELAY_TECHNO'] ? '01_DELAY_TECHNO' : (this.presetOrder[0] || Object.keys(this.presets)[0]);
    }

    getUserSubpatches() {
        return this.userSubpatches || {};
    }

    saveUserSubpatch(template, isOverwrite = false) {
        if (!this.userSubpatches) this.userSubpatches = {};
        this.userSubpatches[template.id] = template;
        localStorage.setItem('gridsynth_user_subpatches', JSON.stringify(this.userSubpatches));
        if (isOverwrite) {
            this.ui.showToast(`繧ｵ繝悶ヱ繝・メ縲・{template.name}縲阪ｒ荳頑嶌縺阪せ繝医ャ繧ｯ縺励∪縺励◆`);
        } else {
            this.ui.showToast(`繧ｵ繝悶ヱ繝・メ縲・{template.name}縲阪ｒ繧ｹ繝医ャ繧ｯ縺励∪縺励◆・茨ｼ・ADD MODULE 縺九ｉ蜻ｼ縺ｳ蜃ｺ縺帙∪縺呻ｼ荏);
        }
    }

    deleteUserSubpatch(id) {
        if (this.userSubpatches && this.userSubpatches[id]) {
            const name = this.userSubpatches[id].name;
            delete this.userSubpatches[id];
            localStorage.setItem('gridsynth_user_subpatches', JSON.stringify(this.userSubpatches));
            this.ui.showToast(`繧ｵ繝悶ヱ繝・メ縲・{name}縲阪ｒ蜑企勁縺励∪縺励◆`);
            return true;
        }
        return false;
    }

    saveCurrentSubpatchToLibrary(customName) {
        if (this.ui.currentPageId === "0") {
            this.ui.showToast("繝｡繧､繝ｳ繝壹・繧ｸ縺ｯ繧ｵ繝悶ヱ繝・メ縺ｨ縺励※菫晏ｭ倥〒縺阪∪縺帙ｓ");
            return;
        }
        this.ui.persistCurrentPage();
        const pData = this.ui.pagesData[this.ui.currentPageId];
        if (!pData) return;
        const name = (customName || pData.name || `SUBPATCH ${this.ui.currentPageId}`).trim();
        if (!name) return;

        const userSubs = this.getUserSubpatches();
        let existingEntry = null;
        if (pData.sourceTemplateId && userSubs[pData.sourceTemplateId]) {
            const src = userSubs[pData.sourceTemplateId];
            if (src.name.trim().toLowerCase() === name.toLowerCase()) {
                existingEntry = src;
            }
        }
        if (!existingEntry) {
            existingEntry = Object.values(userSubs).find(s => s && s.name && s.name.trim().toLowerCase() === name.toLowerCase());
        }

        const id = existingEntry ? existingEntry.id : `USER_SUB_${Date.now()}`;
        const isOverwrite = !!existingEntry;

        const template = {
            id,
            subType: pData.subType || id,
            format: 'gridsynth-submodule',
            version: '2.1',
            name,
            category: 'User Custom',
            author: 'User',
            isSystem: false,
            description: pData.manifest?.description || `${Object.keys(pData.modules || {}).length} modules`,
            manifest: pData.manifest || { description: '', ports: {} },
            pins: {},
            pageData: safeClone(pData)
        };
        delete template.pageData.sourceTemplateId;
        template.pageData.name = name;
        this.saveUserSubpatch(template, isOverwrite);
        pData.sourceTemplateId = id;
    }

    openSubpatchExportModal(template) {
        if (!template) return;
        const exportData = {
            format: "gridsynth-submodule",
            version: "2.1",
            subType: template.subType || template.id,
            name: template.name || 'SUBPATCH',
            category: template.category || 'User Custom',
            author: template.author || 'User',
            manifest: template.manifest || {
                description: template.description || '',
                ports: {}
            },
            slots: template.pageData?.slots || {},
            modules: template.pageData?.modules || {},
            connections: template.pageData?.connections || []
        };
        const jsonStr = JSON.stringify(exportData, null, 2);
        const modCount = Object.keys(exportData.modules || {}).length;
        const connCount = (exportData.connections || []).length;

        JsonIoDialog.openExport({
            title: `SUBPATCH EXPORT (${template.name})`,
            icon: 'package',
            jsonStr,
            infoBadges: [`MODULES: ${modCount}`, `CONNS: ${connCount}`],
            btnColorCls: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30',
            copyToast: `繧ｵ繝悶ヱ繝・メ縲・{template.name}縲阪・JSON繧偵さ繝斐・縺励∪縺励◆`,
            showToast: msg => this.ui.showToast(msg)
        });
    }

    openSubpatchImportModal(onImported) {
        JsonIoDialog.openImport({
            title: 'SUBPATCH JSON IMPORT',
            icon: 'package-plus',
            placeholder: '縺薙％縺ｫ繧ｵ繝悶ヱ繝・メ縺ｮ JSON 繝・く繧ｹ繝医ｒ雋ｼ繧贋ｻ倥￠縺ｦ縺上□縺輔＞...',
            showToast: msg => this.ui.showToast(msg),
            actions: [
                {
                    id: 'sub-import-apply-btn',
                    label: 'IMPORT TO STOCK',
                    icon: 'archive',
                    cls: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30',
                    onClick: (rawVal, modal) => {
                        const rawText = (rawVal || '').trim();
                        if (!rawText) {
                            this.showImportError({
                                title: 'SUBPATCH IMPORT ERROR: EMPTY TEXT',
                                message: '繧ｵ繝悶ヱ繝・メ縺ｮJSON繝・く繧ｹ繝医′遨ｺ縺ｧ縺吶・,
                                details: ['繧､繝ｳ繝昴・繝医☆繧九し繝悶ヱ繝・メ縺ｮJSON譁・ｭ怜・繧定ｲｼ繧贋ｻ倥￠縺ｦ縺上□縺輔＞縲・],
                                copyText: [
                                    '[Gridsynth Subpatch Import Error]',
                                    '繧ｨ繝ｩ繝ｼ: 繧ｵ繝悶ヱ繝・メJSON繝・く繧ｹ繝医′遨ｺ縺ｧ縺吶・,
                                    '繧ｵ繝悶ヱ繝・メ縺ｮJSON繧定ｲｼ繧贋ｻ倥￠縺ｦ縺九ｉ繧､繝ｳ繝昴・繝医ｒ螳溯｡後＠縺ｦ縺上□縺輔＞縲・
                                ].join('\n')
                            });
                            return;
                        }

                        let text = rawText;
                        if (text.startsWith('```')) {
                            text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
                        }

                        let parsed;
                        try {
                            parsed = JSON.parse(text);
                        } catch (err) {
                            const info = analyzeJsonError(text, err);
                            this.showImportError({
                                title: 'SUBPATCH IMPORT ERROR: JSON SYNTAX',
                                message: `JSON讒区枚繧ｨ繝ｩ繝ｼ: ${err.message}`,
                                details: [
                                    `菴咲ｽｮ: 陦・${info.line}, 蛻・${info.col}`,
                                    '',
                                    '--- 蜻ｨ霎ｺ繧ｳ繝ｼ繝・---',
                                    info.snippet,
                                    '',
                                    '窶ｻ縲靴OPY ERROR縲阪ｒ謚ｼ縺吶→繧ｨ繝ｩ繝ｼ蜀・ｮｹ縺ｨAI縺ｸ縺ｮ菫ｮ豁｣謖・､ｺ縺後さ繝斐・縺輔ｌ縺ｾ縺吶・
                                ],
                                copyText: [
                                    `[Gridsynth Subpatch Import Error - JSON Syntax]`,
                                    `繧ｨ繝ｩ繝ｼ蜀・ｮｹ: ${err.message}`,
                                    `逋ｺ逕溽ｮ・園: 陦・${info.line}, 蛻・${info.col}`,
                                    ``,
                                    `--- 蜻ｨ霎ｺ繧ｳ繝ｼ繝・---`,
                                    info.snippet,
                                    ``,
                                    `--- AI縺ｸ縺ｮ菫ｮ豁｣謖・､ｺ ---`,
                                    `Gridsynth繧ｵ繝悶ヱ繝・メJSON縺ｮ繝代・繧ｹ荳ｭ縺ｫ讒区枚繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲Ａ,
                                    `荳願ｨ倥・陦後・菴咲ｽｮ縺ｫ縺ゅｋ荳崎ｦ√↑繧ｫ繝ｳ繝槭ｄ讒区枚驕募渚繧剃ｿｮ豁｣縺励∝ｮ悟・縺ｪ繧ｵ繝悶ヱ繝・メJSON繧貞・逕滓・縺励※縺上□縺輔＞縲Ａ
                                ].join('\n')
                            });
                            return;
                        }

                        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                            this.showImportError({
                                title: 'SUBPATCH IMPORT ERROR: INVALID TYPE',
                                message: '繧ｵ繝悶ヱ繝・メ蠖｢蠑上′辟｡蜉ｹ縺ｧ縺・(JSON繧ｪ繝悶ず繧ｧ繧ｯ繝医〒縺ゅｋ蠢・ｦ√′縺ゅｊ縺ｾ縺・',
                                details: ['繧ｵ繝悶ヱ繝・メ繝・・繧ｿ縺ｯJSON繧ｪ繝悶ず繧ｧ繧ｯ繝亥ｽ｢蠑上〒縺ゅｋ蠢・ｦ√′縺ゅｊ縺ｾ縺吶・],
                                copyText: [
                                    `[Gridsynth Subpatch Import Error - Invalid Type]`,
                                    `繧ｨ繝ｩ繝ｼ: 繧ｵ繝悶ヱ繝・メ繝・・繧ｿ縺後が繝悶ず繧ｧ繧ｯ繝亥ｽ｢蠑上〒縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲Ａ,
                                    `菫ｮ豁｣謖・､ｺ: Gridsynth縺ｮ繧ｵ繝悶ヱ繝・メ莉墓ｧ倥↓蠕薙＞縲゛SON繧ｪ繝悶ず繧ｧ繧ｯ繝医ｒ蜀咲函謌舌＠縺ｦ縺上□縺輔＞縲Ａ
                                ].join('\n')
                            });
                            return;
                        }

                        let pageData = null;
                        if (parsed.pageData && (parsed.pageData.modules || parsed.pageData.slots)) {
                            pageData = parsed.pageData;
                        } else if (parsed.pages && parsed.pages["0"]) {
                            pageData = parsed.pages["0"];
                        } else if (parsed.modules || parsed.slots) {
                            pageData = {
                                slots: parsed.slots || {},
                                modules: parsed.modules || {},
                                connections: parsed.connections || []
                            };
                        }

                        if (!pageData || !pageData.modules || Object.keys(pageData.modules).length === 0) {
                            const keys = Object.keys(parsed).join(', ') || '(縺ｪ縺・';
                            this.showImportError({
                                title: 'SUBPATCH IMPORT ERROR: MISSING MODULES',
                                message: '譛牙柑縺ｪ繧ｵ繝悶ヱ繝・メ繝・・繧ｿ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縲・,
                                details: [
                                    `讀懷・縺輔ｌ縺溘く繝ｼ: ${keys}`,
                                    '繧ｵ繝悶ヱ繝・メJSON縺ｫ縺ｯ "pageData.modules" 縺ｾ縺溘・ "modules" 縺ｮ螳夂ｾｩ縺悟ｿ・ｦ√〒縺吶・
                                ],
                                copyText: [
                                    `[Gridsynth Subpatch Import Error - Missing Modules]`,
                                    `繧ｨ繝ｩ繝ｼ: 譛牙柑縺ｪ繧ｵ繝悶ヱ繝・メ繝・・繧ｿ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縲Ａ,
                                    `逅・罰: "pageData.modules" 縺ｾ縺溘・ "modules" 縺悟ｮ夂ｾｩ縺輔ｌ縺ｦ縺・∪縺帙ｓ縲Ａ,
                                    `讀懷・縺輔ｌ縺溘く繝ｼ: ${keys}`,
                                    ``,
                                    `--- AI縺ｸ縺ｮ菫ｮ豁｣謖・､ｺ ---`,
                                    `Gridsynth繧ｵ繝悶ヱ繝・メ莉墓ｧ假ｼ・ormat: "gridsynth-submodule" 縺ｾ縺溘・ pageData.modules 繧貞性繧讒矩・峨↓蠕薙▲縺ｦ蜀咲函謌舌＠縺ｦ縺上□縺輔＞縲Ａ
                                ].join('\n')
                            });
                            return;
                        }

                        const subErrors = [];
                        parsePatch({ pages: { "0": pageData } }, this.ui.COLS, this.ui.userSubpatches, subErrors);

                        const name = (parsed.name || pageData.name || `IMPORTED_${Date.now().toString().slice(-4)}`).trim();
                        const template = {
                            id: `USER_SUB_${Date.now()}`,
                            subType: parsed.subType || undefined,
                            format: 'gridsynth-submodule',
                            version: '2.1',
                            name,
                            category: parsed.category || 'User Custom',
                            author: parsed.author || 'User',
                            isSystem: false,
                            description: parsed.description || parsed.manifest?.description || `${Object.keys(pageData.modules || {}).length} modules`,
                            manifest: parsed.manifest || { description: parsed.description || '', ports: {} },
                            pins: parsed.pins || {},
                            pageData: safeClone(pageData)
                        };
                        delete template.pageData.sourceTemplateId;
                        template.pageData.name = name;

                        this.saveUserSubpatch(template, false);
                        modal.classList.add('hidden');
                        if (typeof onImported === 'function') onImported(template);

                        if (subErrors.length > 0) {
                            setTimeout(() => {
                                this.ui.openCustomAlert(
                                    '繧ｵ繝悶ヱ繝・メ邨千ｷ夊ｭｦ蜻・(SUBPATCH WARNINGS)',
                                    `繧ｵ繝悶ヱ繝・メ "${name}" 繧偵せ繝医ャ繧ｯ縺ｫ繧､繝ｳ繝昴・繝医＠縺ｾ縺励◆縺後・{subErrors.length}莉ｶ縺ｮ邨千ｷ・繝｢繧ｸ繝･繝ｼ繝ｫ繧ｨ繝ｩ繝ｼ縺梧､懷・縺輔ｌ縺ｾ縺励◆縲・I縺ｫ菫ｮ豁｣繧剃ｾ晞ｼ縺吶ｋ蝣ｴ蜷医・縲靴OPY ERRORS縲阪ｒ謚ｼ縺励※縺上□縺輔＞縲Ａ,
                                    subErrors,
                                    {
                                        isError: false,
                                        copyBtnLabel: 'COPY ERRORS',
                                        copyText: [
                                            `[Gridsynth Subpatch Import Warnings - Connections / Modules]`,
                                            `繧ｵ繝悶ヱ繝・メ "${name}" 縺ｮ隱ｭ縺ｿ霎ｼ縺ｿ譎ゅ↓莉･荳九・繧ｨ繝ｩ繝ｼ縺梧､懷・縺輔ｌ縺ｾ縺励◆ (${subErrors.length}莉ｶ):`,
                                            ``,
                                            ...subErrors.map((e, idx) => `${idx + 1}. ${e}`),
                                            ``,
                                            `--- AI縺ｸ縺ｮ菫ｮ豁｣謖・､ｺ ---`,
                                            `荳願ｨ倥・邨千ｷ・繝｢繧ｸ繝･繝ｼ繝ｫ繧ｨ繝ｩ繝ｼ繧剃ｿｮ豁｣縺励※縺上□縺輔＞縲Ａ,
                                            `菫ｮ豁｣縺励◆螳悟・縺ｪ繧ｵ繝悶ヱ繝・メJSON繧貞・逕滓・縺励※縺上□縺輔＞縲Ａ
                                        ].join('\n')
                                    }
                                );
                            }, 100);
                        }
                    }
                }
            ]
        });
    }

    exportCurrentPreset() {
        this.ui.persistCurrentPage();
        return exportPatch(this.ui.pagesData, this.ui.synth.masterBPM, this.ui.COLS);
    }

    loadPatchData(p, name = null) {
        if (!p) return;
        if (name) {
            this.currentPresetKey = name;
            this.presets[name] = p;
        }

        // 繝代ャ繝∝・繧頑崛縺域凾縺ｯ髢九＞縺ｦ縺・ｋ縺吶∋縺ｦ縺ｮ繝峨ャ繧ｯ繝繧､繧｢繝ｭ繧ｰ・・OCK荳ｭ蜷ｫ繧・峨→繝昴ャ繝励い繝・・繧帝哩縺倥ｋ
        this.ui.closeDockModal();
        document.getElementById('shared-modal')?.classList.add('hidden');

        const parseErrors = [];
        const parsed = parsePatch(p, this.ui.COLS, this.ui.userSubpatches, parseErrors);
        if (parsed.bpm) {
            this.ui.synth.setBPM(parsed.bpm);
        }
        this.ui.updatePresetDisplay(this.currentPresetKey, parsed.bpm);

        this.ui.pagesData = parsed.pages;
        this.ui.currentPageId = "0";
        this.ui.modules = this.ui.pagesData["0"]?.modules || {};
        this.ui.connections = this.ui.pagesData["0"]?.connections || [];
        this.ui.syncGridMap();
        this.ui.synth.rebuildAll(this.ui.pagesData, (pId, id) => this.ui.getPatchState(id, pId));
        this.ui.updateAllCells();
        this.ui.updatePageNavUI();
        requestAnimationFrame(() => this.ui.renderCables());

        // 繝代ャ繝∝ｱ暮幕譎ゅ・邨千ｷ壹・繝｢繧ｸ繝･繝ｼ繝ｫ隴ｦ蜻翫メ繧ｧ繝・け
        if (parseErrors.length > 0) {
            setTimeout(() => {
                this.ui.openCustomAlert(
                    '繝代ャ繝∫ｵ千ｷ夊ｭｦ蜻・(IMPORT WARNINGS)',
                    `繝代ャ繝√ｒ螻暮幕縺励∪縺励◆縺後・{parseErrors.length}莉ｶ縺ｮ邨千ｷ・繝｢繧ｸ繝･繝ｼ繝ｫ繧ｨ繝ｩ繝ｼ縺梧､懷・縺輔ｌ辟｡蜉ｹ縺ｪ謗･邯壹・繧ｹ繧ｭ繝・・縺輔ｌ縺ｾ縺励◆縲・I縺ｫ菫ｮ豁｣繧剃ｾ晞ｼ縺吶ｋ蝣ｴ蜷医・縲靴OPY ERRORS縲阪ｒ謚ｼ縺励※縺上□縺輔＞縲Ａ,
                    parseErrors,
                    {
                        isError: false,
                        copyBtnLabel: 'COPY ERRORS',
                        copyText: [
                            `[Gridsynth Patch Import - Connection/Module Warnings]`,
                            `繝代ャ繝∬ｪｭ縺ｿ霎ｼ縺ｿ譎ゅ↓莉･荳九・邨千ｷ・繝｢繧ｸ繝･繝ｼ繝ｫ繧ｨ繝ｩ繝ｼ縺梧､懷・縺輔ｌ縺ｾ縺励◆ (${parseErrors.length}莉ｶ):`,
                            '',
                            ...parseErrors.map((e, idx) => `${idx + 1}. ${e}`),
                            '',
                            `--- AI縺ｸ縺ｮ菫ｮ豁｣謖・､ｺ ---`,
                            `荳願ｨ倥・邨千ｷ・繝｢繧ｸ繝･繝ｼ繝ｫ繧ｨ繝ｩ繝ｼ繧剃ｿｮ豁｣縺励※縺上□縺輔＞縲Ａ,
                            `Gridsynth縺ｮ邨千ｷ夊ｦ丞援:`,
                            `- 騾∽ｿ｡蜈・(from) 縺ｯ蠢・★繝｢繧ｸ繝･繝ｼ繝ｫ縺ｮ譛牙柑縺ｪ蜃ｺ蜉帷ｫｯ蟄・(_out)`,
                            `- 騾∽ｿ｡蜈・(to) 縺ｯ蠢・★繝｢繧ｸ繝･繝ｼ繝ｫ縺ｮ譛牙柑縺ｪ蜈･蜉帷ｫｯ蟄・(_in)`,
                            `- 豁｣縺励＞遶ｯ蟄仙錐縺ｨ繝｢繧ｸ繝･繝ｼ繝ｫID繧呈欠螳壹＠縲∽ｿｮ豁｣縺励◆螳悟・縺ｪ繝代ャ繝゛SON繧貞・逕滓・縺励※縺上□縺輔＞縲Ａ
                        ].join('\n')
                    }
                );
            }, 100);
        }
    }

    loadActivePreset() {
        const p = this.presets[this.currentPresetKey];
        if (p) this.loadPatchData(p);
    }

    savePresetsDB() {
        try {
            localStorage.setItem('gridsynth_presets_db', JSON.stringify(this.presets));
            localStorage.setItem('gridsynth_preset_order', JSON.stringify(this.presetOrder));
        } catch (e) {
            console.warn('Preset storage save error:', e);
        }
    }

    saveCurrentPatch() {
        if (this.DEMO_KEYS.includes(this.currentPresetKey)) return this.ui.showToast('DEMO繝代ャ繝√・荳頑嶌縺阪〒縺阪∪縺帙ｓ');
        this.presets[this.currentPresetKey] = this.exportCurrentPreset();
        this.savePresetsDB();
        this.ui.showToast(`"${this.currentPresetKey}" 繧剃ｸ頑嶌縺堺ｿ晏ｭ倥＠縺ｾ縺励◆`);
    }

    createNewPatch() {
        const name = `PATCH_${Date.now().toString().slice(-4)}`;
        this.presets[name] = createDefaultPatchData(120);
        this.presetOrder.unshift(name);
        this.currentPresetKey = name;
        this.savePresetsDB();
        this.loadActivePreset();
        this.renderPresetList();
        this.ui.showToast(`譁ｰ隕丈ｽ懈・: ${name}`);
    }

    openJsonExportModal() {
        const patchData = this.exportCurrentPreset();
        const jsonStr = JSON.stringify(patchData, null, 2);
        const pageCount = Object.keys(patchData.pages || {}).length;

        JsonIoDialog.openExport({
            title: `PATCH JSON EXPORT (${this.currentPresetKey})`,
            icon: 'upload',
            jsonStr,
            infoBadges: [`PAGES: ${pageCount}`, `BPM: ${patchData.bpm || 120}`],
            btnColorCls: 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30',
            copyToast: '繝代ャ繝゛SON繧偵け繝ｪ繝・・繝懊・繝峨↓繧ｳ繝斐・縺励∪縺励◆',
            showToast: msg => this.ui.showToast(msg)
        });
    }

    openJsonImportModal() {
        const parseAndValidate = (rawVal) => {
            const rawText = (rawVal || '').trim();
            if (!rawText) {
                this.showImportError({
                    title: 'IMPORT ERROR: EMPTY TEXT',
                    message: '繝代ャ繝√・JSON繝・く繧ｹ繝医′遨ｺ縺ｧ縺吶・,
                    details: ['繧､繝ｳ繝昴・繝医☆繧九ヱ繝・メ縺ｮJSON譁・ｭ怜・繧偵ユ繧ｭ繧ｹ繝医お繝ｪ繧｢縺ｫ雋ｼ繧贋ｻ倥￠縺ｦ縺上□縺輔＞縲・],
                    copyText: [
                        '[Gridsynth Patch Import Error]',
                        '繧ｨ繝ｩ繝ｼ: 繝代ャ繝゛SON繝・く繧ｹ繝医′遨ｺ縺ｧ縺吶・,
                        '繝・く繧ｹ繝医お繝ｪ繧｢縺ｫ繝代ャ繝゛SON繧定ｲｼ繧贋ｻ倥￠縺ｦ縺九ｉ [LOAD] 縺ｾ縺溘・ [SAVE AS NEW] 繧貞ｮ溯｡後＠縺ｦ縺上□縺輔＞縲・
                    ].join('\n')
                });
                return null;
            }

            let text = rawText;
            if (text.startsWith('```')) {
                text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
            }

            let parsed;
            try {
                parsed = JSON.parse(text);
            } catch (err) {
                const info = analyzeJsonError(text, err);
                this.showImportError({
                    title: 'IMPORT ERROR: JSON SYNTAX',
                    message: `JSON讒区枚繧ｨ繝ｩ繝ｼ: ${err.message}`,
                    details: [
                        `菴咲ｽｮ: 陦・${info.line}, 蛻・${info.col}`,
                        '',
                        '--- 蜻ｨ霎ｺ繧ｳ繝ｼ繝・---',
                        info.snippet,
                        '',
                        '窶ｻ縲靴OPY ERROR縲阪ｒ謚ｼ縺吶→繧ｨ繝ｩ繝ｼ蜀・ｮｹ縺ｨAI縺ｸ縺ｮ菫ｮ豁｣謖・､ｺ縺後さ繝斐・縺輔ｌ縺ｾ縺吶ゅ◎縺ｮ縺ｾ縺ｾAI縺ｫ雋ｼ繧贋ｻ倥￠縺ｦ菫ｮ豁｣繧呈欠遉ｺ縺ｧ縺阪∪縺吶・
                    ],
                    copyText: [
                        `[Gridsynth Patch Import Error - JSON Syntax]`,
                        `繧ｨ繝ｩ繝ｼ蜀・ｮｹ: ${err.message}`,
                        `逋ｺ逕溽ｮ・園: 陦・${info.line}, 蛻・${info.col}`,
                        ``,
                        `--- 蜻ｨ霎ｺ繧ｳ繝ｼ繝・---`,
                        info.snippet,
                        ``,
                        `--- AI縺ｸ縺ｮ菫ｮ豁｣謖・､ｺ ---`,
                        `Gridsynth繝代ャ繝゛SON縺ｮ繝代・繧ｹ荳ｭ縺ｫ讒区枚繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲Ａ,
                        `荳願ｨ倥・陦後・菴咲ｽｮ縺ｫ縺ゅｋ荳崎ｦ√↑繧ｫ繝ｳ繝槭ｄ讒区枚驕募渚繧剃ｿｮ豁｣縺励∝ｮ悟・縺ｪ繝代ャ繝゛SON繧貞・逕滓・縺励※縺上□縺輔＞縲Ａ
                    ].join('\n')
                });
                return null;
            }

            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                this.showImportError({
                    title: 'IMPORT ERROR: INVALID TYPE',
                    message: '繝代ャ繝∝ｽ｢蠑上′辟｡蜉ｹ縺ｧ縺・(JSON繧ｪ繝悶ず繧ｧ繧ｯ繝医〒縺ゅｋ蠢・ｦ√′縺ゅｊ縺ｾ縺・',
                    details: ['繝代ャ繝√ョ繝ｼ繧ｿ縺ｯ { "bpm": 120, "pages": { ... } } 縺ｮ繧医≧縺ｪJSON繧ｪ繝悶ず繧ｧ繧ｯ繝亥ｽ｢蠑上〒縺ゅｋ蠢・ｦ√′縺ゅｊ縺ｾ縺吶・],
                    copyText: [
                        `[Gridsynth Patch Import Error - Invalid Type]`,
                        `繧ｨ繝ｩ繝ｼ: 繝代ャ繝√ョ繝ｼ繧ｿ縺後が繝悶ず繧ｧ繧ｯ繝亥ｽ｢蠑上〒縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲Ａ,
                        `菫ｮ豁｣謖・､ｺ: Gridsynth縺ｮ繝代ャ繝∽ｻ墓ｧ倥↓蠕薙＞縲＋ "bpm": 120, "pages": { ... } } 蠖｢蠑上・JSON繧ｪ繝悶ず繧ｧ繧ｯ繝医ｒ蜀咲函謌舌＠縺ｦ縺上□縺輔＞縲Ａ
                    ].join('\n')
                });
                return null;
            }

            if (!parsed.pages && !parsed["0"] && !parsed.slots && !parsed.modules) {
                const keys = Object.keys(parsed).join(', ') || '(縺ｪ縺・';
                this.showImportError({
                    title: 'IMPORT ERROR: MISSING STRUCTURE',
                    message: '繝代ャ繝∵ｧ矩縺檎┌蜉ｹ縺ｧ縺吶ょｿ・ｦ√↑繧ｭ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縲・,
                    details: [
                        `讀懷・縺輔ｌ縺溘く繝ｼ: ${keys}`,
                        '繝代ャ繝゛SON縺ｫ縺ｯ "pages" (縺ｾ縺溘・ "modules", "slots") 縺ｮ螳夂ｾｩ縺悟ｿ・ｦ√〒縺吶・,
                        '蝓ｺ譛ｬ讒矩縺ｮ萓・',
                        '  {',
                        '    "bpm": 120,',
                        '    "pages": {',
                        '      "0": {',
                        '        "slots": { "0": "OSC1" },',
                        '        "modules": { "OSC1": { "type": "OSC" } },',
                        '        "connections": []',
                        '      }',
                        '    }',
                        '  }'
                    ],
                    copyText: [
                        `[Gridsynth Patch Import Error - Missing Structure]`,
                        `繧ｨ繝ｩ繝ｼ: 繝代ャ繝∵ｧ矩縺檎┌蜉ｹ縺ｧ縺吶・pages" 縺ｾ縺溘・ "modules"/"slots" 縺悟ｮ夂ｾｩ縺輔ｌ縺ｦ縺・∪縺帙ｓ縲Ａ,
                        `讀懷・縺輔ｌ縺溘く繝ｼ: ${keys}`,
                        ``,
                        `--- AI縺ｸ縺ｮ菫ｮ豁｣謖・､ｺ ---`,
                        `Gridsynth縺ｮ繝代ャ繝∵ｧ矩莉墓ｧ倥↓貅匁侠縺励・pages" (縺ｾ縺溘・ "modules", "slots", "connections") 繧貞性繧√◆譛牙柑縺ｪJSON繧貞・逕滓・縺励※縺上□縺輔＞縲Ａ
                    ].join('\n')
                });
                return null;
            }

            return parsed;
        };

        JsonIoDialog.openImport({
            title: 'PATCH JSON IMPORT',
            icon: 'download',
            placeholder: '縺薙％縺ｫ繝代ャ繝√・ JSON 繝・く繧ｹ繝医ｒ雋ｼ繧贋ｻ倥￠縺ｦ縺上□縺輔＞...',
            showToast: msg => this.ui.showToast(msg),
            actions: [
                {
                    id: 'json-apply-load-btn',
                    label: 'LOAD (迴ｾ蝨ｨ縺ｮ逕ｻ髱｢縺ｫ螻暮幕)',
                    icon: 'play',
                    cls: 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30',
                    onClick: (rawVal, modal) => {
                        const data = parseAndValidate(rawVal);
                        if (data) {
                            this.ui.saveHistory();
                            this.loadPatchData(data);
                            modal.classList.add('hidden');
                            document.getElementById('preset-manager-modal')?.classList.add('hidden');
                            this.ui.showToast('繝代ャ繝√ｒ隱ｭ縺ｿ霎ｼ縺ｿ縺ｾ縺励◆');
                        }
                    }
                },
                {
                    id: 'json-apply-saveas-btn',
                    label: 'SAVE AS NEW',
                    icon: 'file-plus',
                    cls: 'bg-cyan-700 hover:bg-cyan-600 text-white',
                    onClick: async (rawVal, modal) => {
                        const data = parseAndValidate(rawVal);
                        if (data) {
                            const name = await this.ui.openCustomPrompt('SAVE AS NEW PATCH', `IMPORT_${Date.now().toString().slice(-4)}`);
                            if (name) {
                                this.ui.saveHistory();
                                this.presets[name] = data;
                                this.presetOrder.unshift(name);
                                this.currentPresetKey = name;
                                this.savePresetsDB();
                                this.loadActivePreset();
                                this.renderPresetList();
                                modal.classList.add('hidden');
                                document.getElementById('preset-manager-modal')?.classList.add('hidden');
                                this.ui.showToast(`"${name}" 縺ｨ縺励※菫晏ｭ倥・螻暮幕縺励∪縺励◆`);
                            }
                        }
                    }
                }
            ]
        });
    }

    openAiSpecModal() {
        const specText = AI_PATCH_SPEC_CONTENT;
        JsonIoDialog.openExport({
            title: 'AI PATCH SPEC (Markdown)',
            icon: 'bot',
            jsonStr: specText,
            btnColorCls: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/30',
            copyToast: 'AI莉墓ｧ俶嶌繝励Ο繝ｳ繝励ヨ繧偵け繝ｪ繝・・繝懊・繝峨↓繧ｳ繝斐・縺励∪縺励◆',
            showToast: msg => this.ui.showToast(msg),
            leftActionHtml: `
                <div class="flex items-center gap-1.5">
                    <button id="ai-spec-dl-btn" class="h-6 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] rounded-lg transition border border-slate-700 flex items-center gap-1 cursor-pointer" title=".md繝輔ぃ繧､繝ｫ縺ｨ縺励※繝繧ｦ繝ｳ繝ｭ繝ｼ繝・>
                        <i data-lucide="download" class="w-3 h-3 pointer-events-none text-cyan-400"></i>
                        <span>DOWNLOAD .MD</span>
                    </button>
                </div>
            `,
            onBindFooter: () => {
                document.getElementById('ai-spec-dl-btn')?.addEventListener('click', () => {
                    try {
                        const blob = new Blob([specText], { type: 'text/markdown;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'GRIDSYNTH_AI_PATCH_SPEC.md';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        this.ui.showToast('GRIDSYNTH_AI_PATCH_SPEC.md 繧偵ム繧ｦ繝ｳ繝ｭ繝ｼ繝峨＠縺ｾ縺励◆');
                    } catch (err) {
                        this.ui.showToast('繝繧ｦ繝ｳ繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆: ' + err.message);
                    }
                });
            }
        });
    }

    renderPresetList() {
        const c = document.getElementById('preset-list-container');
        if (!c) return;
        c.innerHTML = '';
        const userKeys = this.presetOrder.filter(k => !this.DEMO_KEYS.includes(k));
        userKeys.forEach(k => {
            const item = document.createElement('div');
            item.className = `flex items-center justify-between py-1 px-2 mb-1 rounded border ${k === this.currentPresetKey ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 font-bold' : 'bg-slate-800/60 border-slate-700/60 text-slate-300'} cursor-pointer text-xs`;
            item.innerHTML = `<span class="truncate">${k}</span><div class="flex items-center gap-1 shrink-0"><button class="rename-p text-violet-400 hover:text-white px-1">笨・/button><button class="copy-p text-amber-400 hover:text-white px-1">搭</button><button class="del-p text-rose-400 hover:text-white px-1">笨・/button></div>`;
            item.addEventListener('click', async (e) => {
                if (e.target.classList.contains('del-p')) {
                    delete this.presets[k];
                    this.presetOrder = this.presetOrder.filter(x => x !== k);
                    this.savePresetsDB();
                    this.renderPresetList();
                    return;
                }
                if (e.target.classList.contains('copy-p')) {
                    const nK = `${k}_COPY`;
                    this.presets[nK] = safeClone(this.presets[k]);
                    this.presetOrder.unshift(nK);
                    this.savePresetsDB();
                    this.renderPresetList();
                    return;
                }
                if (e.target.classList.contains('rename-p')) {
                    const ren = await this.ui.openCustomPrompt('RENAME', k);
                    if (ren && ren !== k) {
                        this.presets[ren] = this.presets[k];
                        delete this.presets[k];
                        const idx = this.presetOrder.indexOf(k);
                        if (idx !== -1) this.presetOrder[idx] = ren;
                        if (this.currentPresetKey === k) this.currentPresetKey = ren;
                        this.savePresetsDB();
                        this.renderPresetList();
                    }
                    return;
                }
                this.currentPresetKey = k;
                this.loadActivePreset();
                document.getElementById('preset-manager-modal')?.classList.add('hidden');
            });
            c.appendChild(item);
        });

        const dHeader = document.createElement('div');
        dHeader.className = 'flex items-center justify-between px-2 py-1 mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-800/40 rounded cursor-pointer';
        dHeader.innerHTML = `<span>DEMO PATCHES</span><span>${this.demoAccordionOpen ? '笆ｲ' : '笆ｼ'}</span>`;
        dHeader.onclick = () => {
            this.demoAccordionOpen = !this.demoAccordionOpen;
            this.renderPresetList();
        };
        c.appendChild(dHeader);

        if (this.demoAccordionOpen) {
            this.DEMO_KEYS.forEach(k => {
                const item = document.createElement('div');
                item.className = `flex items-center justify-between py-1 px-2 my-1 rounded border ${k === this.currentPresetKey ? 'bg-amber-950/60 border-amber-500 text-amber-200 font-bold' : 'bg-slate-800/40 border-slate-700/40 text-slate-400'} cursor-pointer text-xs`;
                item.innerHTML = `<span>${k}</span>`;
                item.onclick = () => {
                    this.currentPresetKey = k;
                    this.loadActivePreset();
                    document.getElementById('preset-manager-modal')?.classList.add('hidden');
                };
                c.appendChild(item);
            });
        }
    }
}

