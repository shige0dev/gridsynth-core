import { safeClone, parseConn } from '../../core/utils.js?v=459';
import { parsePatch, exportPatch, createDefaultPatchData } from '../../core/patch.js?v=459';
import { getDefaultPresets } from '../../presets/default.js?v=459';
import { JsonIoDialog } from '../json-io-dialog.js?v=459';

export class PresetManager {
    showImportError(opts) {
        return this.ui.openCustomAlert(
            opts.title || 'IMPORT ERROR',
            opts.message || 'インポート中にエラーが発生しました。',
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

        const obsoleteKeys = ['10_FM_CRYSTAL_GROOVE', '10_FM_SIMPLE_TEST'];
        try {
            const stored = JSON.parse(localStorage.getItem('gridsynth_presets_db')) || {};
            this.presets = {};
            Object.entries(stored).forEach(([k, v]) => {
                if (v && v.pages && v.pages["0"] && !k.startsWith('DEMO') && !obsoleteKeys.includes(k)) {
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
            this.presetOrder = order.filter(k => this.presets[k] && !k.startsWith('DEMO') && !obsoleteKeys.includes(k));
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
            this.ui.showToast(`サブパッチ「${template.name}」を上書きストックしました`);
        } else {
            this.ui.showToast(`サブパッチ「${template.name}」をストックしました（＋ ADD MODULE から呼び出せます）`);
        }
    }

    deleteUserSubpatch(id) {
        if (this.userSubpatches && this.userSubpatches[id]) {
            const name = this.userSubpatches[id].name;
            delete this.userSubpatches[id];
            localStorage.setItem('gridsynth_user_subpatches', JSON.stringify(this.userSubpatches));
            this.ui.showToast(`サブパッチ「${name}」を削除しました`);
            return true;
        }
        return false;
    }

    _buildSubpatchTemplate({ id, name, pageData, source = {} }) {
        const template = {
            id,
            subType: source.subType || pageData.subType || id,
            format: 'gridsynth-submodule',
            version: '2.1',
            name,
            category: source.category || 'User Custom',
            author: source.author || 'User',
            isSystem: false,
            description: source.description || source.manifest?.description || pageData.manifest?.description || `${Object.keys(pageData.modules || {}).length} modules`,
            manifest: source.manifest || pageData.manifest || { description: source.description || '', ports: {} },
            pins: source.pins || {},
            pageData: safeClone(pageData)
        };
        delete template.pageData.sourceTemplateId;
        template.pageData.name = name;
        return template;
    }

    _parseImportObject(rawVal, { isSubpatch = false } = {}) {
        const label = isSubpatch ? 'サブパッチ' : 'パッチ';
        const titlePrefix = isSubpatch ? 'SUBPATCH IMPORT ERROR' : 'IMPORT ERROR';
        const res = JsonIoDialog.parseJsonText(rawVal);

        if (res.empty) {
            this.showImportError({
                title: `${titlePrefix}: EMPTY TEXT`,
                message: `${label}のJSONテキストが空です。`,
                details: [`インポートする${label}のJSON文字列を貼り付けてください。`],
                copyText: `[Gridsynth ${isSubpatch ? 'Subpatch' : 'Patch'} Import Error]\nエラー: ${label}JSONテキストが空です。\n${label}のJSONを貼り付けてからインポートを実行してください。`
            });
            return null;
        }

        if (res.syntaxError) {
            const info = res.info;
            this.showImportError({
                title: `${titlePrefix}: JSON SYNTAX`,
                message: `JSON構文エラー: ${res.err.message}`,
                details: [
                    `位置: 行 ${info.line}, 列 ${info.col}`,
                    '',
                    '--- 周辺コード ---',
                    info.snippet,
                    '',
                    '※「COPY ERROR」を押すとエラー内容とAIへの修正指示がコピーされます。'
                ],
                copyText: [
                    `[Gridsynth ${isSubpatch ? 'Subpatch' : 'Patch'} Import Error - JSON Syntax]`,
                    `エラー内容: ${res.err.message}`,
                    `発生箇所: 行 ${info.line}, 列 ${info.col}`,
                    ``,
                    `--- 周辺コード ---`,
                    info.snippet,
                    ``,
                    `--- AIへの修正指示 ---`,
                    `Gridsynth${label}JSONのパース中に構文エラーが発生しました。`,
                    `上記の行・位置にある不要なカンマや構文違反を修正し、完全な${label}JSONを再生成してください。`
                ].join('\n')
            });
            return null;
        }

        const parsed = res.data;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            this.showImportError({
                title: `${titlePrefix}: INVALID TYPE`,
                message: `${label}形式が無効です (JSONオブジェクトである必要があります)`,
                details: [`${label}データはJSONオブジェクト形式である必要があります。`],
                copyText: `[Gridsynth ${isSubpatch ? 'Subpatch' : 'Patch'} Import Error - Invalid Type]\nエラー: ${label}データがオブジェクト形式ではありません。\n修正指示: Gridsynthの${label}仕様に従い、JSONオブジェクトを再生成してください。`
            });
            return null;
        }

        return parsed;
    }

    _showWarningsAlert(errors, { isSubpatch = false, name = '' } = {}) {
        if (!errors || errors.length === 0) return;
        const label = isSubpatch ? `サブパッチ "${name}"` : 'パッチ';
        setTimeout(() => {
            this.ui.openCustomAlert(
                isSubpatch ? 'サブパッチ結線警告 (SUBPATCH WARNINGS)' : 'パッチ結線警告 (IMPORT WARNINGS)',
                `${label}を展開しましたが、${errors.length}件の結線/モジュールエラーが検出されました。AIに修正を依頼する場合は「COPY ERRORS」を押してください。`,
                errors,
                {
                    isError: false,
                    copyBtnLabel: 'COPY ERRORS',
                    copyText: [
                        `[Gridsynth ${isSubpatch ? 'Subpatch' : 'Patch'} Import Warnings - Connections / Modules]`,
                        `${label}の読み込み時に以下の結線/モジュールエラーが検出されました (${errors.length}件):`,
                        '',
                        ...errors.map((e, idx) => `${idx + 1}. ${e}`),
                        '',
                        `--- AIへの修正指示 ---`,
                        `上記の結線/モジュールエラーを修正してください。`,
                        `- 送信元 (from) は必ずモジュールの有効な出力端子 (_out)`,
                        `- 送信先 (to) は必ずモジュールの有効な入力端子 (_in)`,
                        `- 正しい端子名とモジュールIDを指定し、修正した完全な${isSubpatch ? 'サブパッチ' : 'パッチ'}JSONを再生成してください。`
                    ].join('\n')
                }
            );
        }, 100);
    }

    _registerAndActivatePreset(name, data, toastMsg = null) {
        this.presets[name] = data;
        this.presetOrder.unshift(name);
        this.currentPresetKey = name;
        this.savePresetsDB();
        this.loadActivePreset();
        this.renderPresetList();
        if (toastMsg) this.ui.showToast(toastMsg);
    }

    saveCurrentSubpatchToLibrary(customName) {
        if (this.ui.currentPageId === "0") {
            this.ui.showToast("メインページはサブパッチとして保存できません");
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
        const template = this._buildSubpatchTemplate({ id, name, pageData: pData });
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
            copyToast: `サブパッチ「${template.name}」のJSONをコピーしました`,
            showToast: msg => this.ui.showToast(msg)
        });
    }

    openSubpatchImportModal(onImported) {
        JsonIoDialog.openImport({
            title: 'SUBPATCH JSON IMPORT',
            icon: 'package-plus',
            placeholder: 'ここにサブパッチの JSON テキストを貼り付けてください...',
            showToast: msg => this.ui.showToast(msg),
            actions: [
                {
                    id: 'sub-import-apply-btn',
                    label: 'IMPORT TO STOCK',
                    icon: 'archive',
                    cls: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30',
                    onClick: (rawVal, modal) => {
                        const parsed = this._parseImportObject(rawVal, { isSubpatch: true });
                        if (!parsed) return;

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
                            const keys = Object.keys(parsed).join(', ') || '(なし)';
                            this.showImportError({
                                title: 'SUBPATCH IMPORT ERROR: MISSING MODULES',
                                message: '有効なサブパッチデータが見つかりません。',
                                details: [
                                    `検出されたキー: ${keys}`,
                                    'サブパッチJSONには "pageData.modules" または "modules" の定義が必要です。'
                                ],
                                copyText: `[Gridsynth Subpatch Import Error - Missing Modules]\nエラー: 有効なサブパッチデータが見つかりません。\n検出されたキー: ${keys}\n--- AIへの修正指示 ---\nGridsynthサブパッチ仕様（format: "gridsynth-submodule" または pageData.modules を含む構造）に従って再生成してください。`
                            });
                            return;
                        }

                        const subErrors = [];
                        parsePatch({ pages: { "0": pageData } }, this.ui.COLS, this.ui.userSubpatches, subErrors);

                        const name = (parsed.name || pageData.name || `IMPORTED_${Date.now().toString().slice(-4)}`).trim();
                        const template = this._buildSubpatchTemplate({
                            id: `USER_SUB_${Date.now()}`,
                            name,
                            pageData,
                            source: parsed
                        });

                        this.saveUserSubpatch(template, false);
                        modal.classList.add('hidden');
                        if (typeof onImported === 'function') onImported(template);
                        this._showWarningsAlert(subErrors, { isSubpatch: true, name });
                    }
                }
            ]
        });
    }

    exportCurrentPreset() {
        this.ui.persistCurrentPage();
        return exportPatch(this.ui.pagesData, this.ui.synth.masterBPM, this.ui.COLS, this.ui.ROWS);
    }

    loadPatchData(p, name = null) {
        if (!p) return;
        if (name) {
            this.currentPresetKey = name;
            this.presets[name] = p;
        }

        // パッチ切り替え時は開いているすべてのドックダイアログ（LOCK中含む）とポップアップを閉じる
        this.ui.closeDockModal();
        // パッチ切り替え時・新規パッチ読み込み時はパフォームモードを基本ディセーブル（OFF）にリセット
        if (this.ui.isPerformanceMode) {
            this.ui.togglePerformanceMode(false, true);
        }
        // layout mode discontinued
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

        // パッチ展開時の結線・モジュール警告チェック
        this._showWarningsAlert(parseErrors);
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
        if (this.DEMO_KEYS.includes(this.currentPresetKey)) return this.ui.showToast('DEMOパッチは上書きできません');
        this.presets[this.currentPresetKey] = this.exportCurrentPreset();
        this.savePresetsDB();
        this.ui.showToast(`"${this.currentPresetKey}" を上書き保存しました`);
    }

    createNewPatch() {
        const name = `PATCH_${Date.now().toString().slice(-4)}`;
        this._registerAndActivatePreset(name, createDefaultPatchData(120), `新規作成: ${name}`);
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
            copyToast: 'パッチJSONをクリップボードにコピーしました',
            showToast: msg => this.ui.showToast(msg)
        });
    }

    openJsonImportModal() {
        const parseAndValidate = (rawVal) => {
            const parsed = this._parseImportObject(rawVal, { isSubpatch: false });
            if (!parsed) return null;

            if (!parsed.pages && !parsed["0"] && !parsed.slots && !parsed.modules) {
                const keys = Object.keys(parsed).join(', ') || '(なし)';
                this.showImportError({
                    title: 'IMPORT ERROR: MISSING STRUCTURE',
                    message: 'パッチ構造が無効です。必要なキーが見つかりません。',
                    details: [
                        `検出されたキー: ${keys}`,
                        'パッチJSONには "pages" (または "modules", "slots") の定義が必要です。',
                        '基本構造の例:',
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
                        `エラー: パッチ構造が無効です。"pages" または "modules"/"slots" が定義されていません。`,
                        `検出されたキー: ${keys}`,
                        ``,
                        `--- AIへの修正指示 ---`,
                        `Gridsynthのパッチ構造仕様に準拠し、"pages" (または "modules", "slots", "connections") を含めた有効なJSONを再生成してください。`
                    ].join('\n')
                });
                return null;
            }

            return parsed;
        };

        JsonIoDialog.openImport({
            title: 'PATCH JSON IMPORT',
            icon: 'download',
            placeholder: 'ここにパッチの JSON テキストを貼り付けてください...',
            showToast: msg => this.ui.showToast(msg),
            actions: [
                {
                    id: 'json-apply-load-btn',
                    label: 'LOAD (現在の画面に展開)',
                    icon: 'play',
                    cls: 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30',
                    onClick: (rawVal, modal) => {
                        const data = parseAndValidate(rawVal);
                        if (data) {
                            this.ui.saveHistory();
                            this.loadPatchData(data);
                            modal.classList.add('hidden');
                            document.getElementById('preset-manager-modal')?.classList.add('hidden');
                            this.ui.showToast('パッチを読み込みました');
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
                                this._registerAndActivatePreset(name, data, `"${name}" として保存・展開しました`);
                                modal.classList.add('hidden');
                                document.getElementById('preset-manager-modal')?.classList.add('hidden');
                            }
                        }
                    }
                }
            ]
        });
    }

    async openAiSpecModal() {
        if (!this._aiSpecCache) {
            try {
                const res = await fetch('./GRIDSYNTH_AI_PATCH_SPEC.md');
                if (res.ok) this._aiSpecCache = await res.text();
            } catch (_) {}
        }
        const specText = this._aiSpecCache || '# GRIDSYNTH AI PATCH SPEC (Failed to load ./GRIDSYNTH_AI_PATCH_SPEC.md)';
        JsonIoDialog.openExport({
            title: 'AI PATCH SPEC (Markdown)',
            icon: 'bot',
            jsonStr: specText,
            btnColorCls: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/30',
            copyToast: 'AI仕様書プロンプトをクリップボードにコピーしました',
            showToast: msg => this.ui.showToast(msg),
            leftActionHtml: `
                <div class="flex items-center gap-1.5">
                    <button id="ai-spec-dl-btn" class="h-6 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] rounded-lg transition border border-slate-700 flex items-center gap-1 cursor-pointer" title=".mdファイルとしてダウンロード">
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
                        this.ui.showToast('GRIDSYNTH_AI_PATCH_SPEC.md をダウンロードしました');
                    } catch (err) {
                        this.ui.showToast('ダウンロードに失敗しました: ' + err.message);
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
            item.innerHTML = `<span class="truncate">${k}</span><div class="flex items-center gap-1 shrink-0"><button class="rename-p text-violet-400 hover:text-white px-1">✎</button><button class="copy-p text-amber-400 hover:text-white px-1">📋</button><button class="del-p text-rose-400 hover:text-white px-1">✕</button></div>`;
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
        dHeader.innerHTML = `<span>DEMO PATCHES</span><span>${this.demoAccordionOpen ? '▲' : '▼'}</span>`;
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

    bindPresetEvents() {
        document.getElementById('preset-trigger-btn')?.addEventListener('click', () => {
            this.renderPresetList();
            document.getElementById('preset-manager-modal')?.classList.remove('hidden');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
        document.getElementById('close-preset-bg')?.addEventListener('click', () => document.getElementById('preset-manager-modal')?.classList.add('hidden'));
        document.getElementById('close-preset-modal-btn')?.addEventListener('click', () => document.getElementById('preset-manager-modal')?.classList.add('hidden'));
        document.getElementById('preset-new-top-btn')?.addEventListener('click', () => this.createNewPatch());
        document.getElementById('preset-save-top-btn')?.addEventListener('click', () => this.saveCurrentPatch());
        document.getElementById('preset-saveas-top-btn')?.addEventListener('click', async () => {
            const name = await this.ui.openCustomPrompt('SAVE AS', `PATCH_${Date.now().toString().slice(-4)}`);
            if (name) {
                this._registerAndActivatePreset(name, this.exportCurrentPreset(), `"${name}" を保存しました`);
            }
        });
        document.getElementById('preset-export-top-btn')?.addEventListener('click', () => this.openJsonExportModal());
        document.getElementById('preset-import-top-btn')?.addEventListener('click', () => this.openJsonImportModal());
        document.getElementById('preset-ai-spec-top-btn')?.addEventListener('click', () => this.openAiSpecModal());
        document.getElementById('main-ai-spec-btn')?.addEventListener('click', () => this.openAiSpecModal());
        document.getElementById('preset-about-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('about-modal')?.classList.remove('hidden');
        });
    }
}

