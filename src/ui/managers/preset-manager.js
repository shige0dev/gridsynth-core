import { safeClone, parseConn } from '../../core/utils.js?v=241';
import { parsePatch, exportPatch, createDefaultPatchData } from '../../core/patch.js?v=241';
import { getDefaultPresets } from '../../presets/default.js?v=241';
import { AI_PATCH_SPEC_CONTENT } from '../../presets/ai-spec-content.js';

export function analyzeJsonError(rawText, err) {
    let cleanText = (rawText || '').trim();
    if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
    }

    const lines = cleanText.split('\n');
    let line = 1;
    let col = 1;

    const lineColMatch = err?.message?.match(/line\s+(\d+)\s+column\s+(\d+)/i);
    const posMatch = err?.message?.match(/position\s+(\d+)/i) || err?.message?.match(/char\s+(\d+)/i);

    if (lineColMatch) {
        line = parseInt(lineColMatch[1], 10);
        col = parseInt(lineColMatch[2], 10);
    } else if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const prefix = cleanText.slice(0, pos);
        const prefixLines = prefix.split('\n');
        line = prefixLines.length;
        col = prefixLines[prefixLines.length - 1].length + 1;
    }

    const contextLines = [];
    const startL = Math.max(1, line - 2);
    const endL = Math.min(lines.length, line + 2);

    for (let i = startL; i <= endL; i++) {
        const lineContent = lines[i - 1] || '';
        const lineNumStr = String(i).padStart(4, ' ');
        if (i === line) {
            contextLines.push(`> ${lineNumStr} | ${lineContent}`);
            const pointerPad = ' '.repeat(Math.max(0, col - 1));
            contextLines.push(`       | ${pointerPad}^`);
        } else {
            contextLines.push(`  ${lineNumStr} | ${lineContent}`);
        }
    }

    return {
        line,
        col,
        snippet: contextLines.join('\n'),
        message: err?.message || 'Unknown syntax error'
    };
}

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
        const modal = document.getElementById('json-io-modal');
        const title = document.getElementById('json-io-title');
        const icon = document.getElementById('json-io-icon');
        const textarea = document.getElementById('json-io-textarea');
        const footer = document.getElementById('json-io-footer');
        if (!modal || !textarea || !template) return;

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

        if (title) title.textContent = `SUBPATCH EXPORT (${template.name})`;
        if (icon) icon.setAttribute('data-lucide', 'package');
        textarea.value = jsonStr;
        textarea.readOnly = true;

        if (footer) {
            const modCount = Object.keys(exportData.pageData?.modules || {}).length;
            const connCount = (exportData.pageData?.connections || []).length;
            footer.innerHTML = `
                <div class="text-[8px] text-slate-400 font-mono flex items-center gap-2">
                    <span>MODULES: ${modCount}</span>
                    <span>CONNS: ${connCount}</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <button id="json-copy-btn" class="h-6 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] rounded-lg transition flex items-center gap-1 shadow-md shadow-emerald-600/30 cursor-pointer">
                        <i data-lucide="copy" class="w-3 h-3 pointer-events-none"></i>
                        <span id="json-copy-btn-text" class="pointer-events-none">COPY TO CLIPBOARD</span>
                    </button>
                    <button id="json-close-btn" class="h-6 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] rounded-lg transition border border-slate-700 cursor-pointer">
                        CLOSE
                    </button>
                </div>
            `;

            document.getElementById('json-copy-btn')?.addEventListener('click', () => {
                navigator.clipboard.writeText(jsonStr).then(() => {
                    const btnText = document.getElementById('json-copy-btn-text');
                    if (btnText) btnText.textContent = 'COPIED! ✅';
                    this.ui.showToast(`サブパッチ「${template.name}」のJSONをコピーしました`);
                    setTimeout(() => {
                        const bt = document.getElementById('json-copy-btn-text');
                        if (bt) bt.textContent = 'COPY TO CLIPBOARD';
                    }, 2000);
                }).catch(() => {
                    textarea.focus();
                    textarea.select();
                    document.execCommand('copy');
                    this.ui.showToast('選択部分をコピーしました');
                });
            });

            document.getElementById('json-close-btn')?.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }

        modal.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
        setTimeout(() => {
            textarea.focus();
            textarea.select();
        }, 50);
    }

    openSubpatchImportModal(onImported) {
        const modal = document.getElementById('json-io-modal');
        const title = document.getElementById('json-io-title');
        const icon = document.getElementById('json-io-icon');
        const textarea = document.getElementById('json-io-textarea');
        const footer = document.getElementById('json-io-footer');
        if (!modal || !textarea) return;

        if (title) title.textContent = 'SUBPATCH JSON IMPORT';
        if (icon) icon.setAttribute('data-lucide', 'package-plus');
        textarea.value = '';
        textarea.placeholder = 'ここにサブパッチの JSON テキストを貼り付けてください...';
        textarea.readOnly = false;

        if (footer) {
            footer.innerHTML = `
                <button id="json-paste-btn" class="h-6 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] rounded-lg transition border border-slate-700 flex items-center gap-1 cursor-pointer">
                    <i data-lucide="clipboard" class="w-3 h-3 pointer-events-none"></i>PASTE
                </button>
                <div class="flex items-center gap-1.5">
                    <button id="sub-import-apply-btn" class="h-6 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] rounded-lg transition flex items-center gap-1 shadow-md shadow-emerald-600/30 cursor-pointer">
                        <i data-lucide="archive" class="w-3 h-3 pointer-events-none"></i>
                        <span>IMPORT TO STOCK</span>
                    </button>
                </div>
            `;

            document.getElementById('json-paste-btn')?.addEventListener('click', async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        textarea.value = text;
                        this.ui.showToast('クリップボードから貼り付けました');
                    }
                } catch (e) {
                    this.ui.showToast('貼り付けは手動 (Ctrl+V) で行ってください');
                }
            });

            document.getElementById('sub-import-apply-btn')?.addEventListener('click', () => {
                const rawText = textarea.value.trim();
                if (!rawText) {
                    this.showImportError({
                        title: 'SUBPATCH IMPORT ERROR: EMPTY TEXT',
                        message: 'サブパッチのJSONテキストが空です。',
                        details: ['インポートするサブパッチのJSON文字列を貼り付けてください。'],
                        copyText: [
                            '[Gridsynth Subpatch Import Error]',
                            'エラー: サブパッチJSONテキストが空です。',
                            'サブパッチのJSONを貼り付けてからインポートを実行してください。'
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
                        message: `JSON構文エラー: ${err.message}`,
                        details: [
                            `位置: 行 ${info.line}, 列 ${info.col}`,
                            '',
                            '--- 周辺コード ---',
                            info.snippet,
                            '',
                            '※「COPY ERROR」を押すとエラー内容とAIへの修正指示がコピーされます。'
                        ],
                        copyText: [
                            `[Gridsynth Subpatch Import Error - JSON Syntax]`,
                            `エラー内容: ${err.message}`,
                            `発生箇所: 行 ${info.line}, 列 ${info.col}`,
                            ``,
                            `--- 周辺コード ---`,
                            info.snippet,
                            ``,
                            `--- AIへの修正指示 ---`,
                            `GridsynthサブパッチJSONのパース中に構文エラーが発生しました。`,
                            `上記の行・位置にある不要なカンマや構文違反を修正し、完全なサブパッチJSONを再生成してください。`
                        ].join('\n')
                    });
                    return;
                }

                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    this.showImportError({
                        title: 'SUBPATCH IMPORT ERROR: INVALID TYPE',
                        message: 'サブパッチ形式が無効です (JSONオブジェクトである必要があります)',
                        details: ['サブパッチデータはJSONオブジェクト形式である必要があります。'],
                        copyText: [
                            `[Gridsynth Subpatch Import Error - Invalid Type]`,
                            `エラー: サブパッチデータがオブジェクト形式ではありません。`,
                            `修正指示: Gridsynthのサブパッチ仕様に従い、JSONオブジェクトを再生成してください。`
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
                    const keys = Object.keys(parsed).join(', ') || '(なし)';
                    this.showImportError({
                        title: 'SUBPATCH IMPORT ERROR: MISSING MODULES',
                        message: '有効なサブパッチデータが見つかりません。',
                        details: [
                            `検出されたキー: ${keys}`,
                            'サブパッチJSONには "pageData.modules" または "modules" の定義が必要です。'
                        ],
                        copyText: [
                            `[Gridsynth Subpatch Import Error - Missing Modules]`,
                            `エラー: 有効なサブパッチデータが見つかりません。`,
                            `理由: "pageData.modules" または "modules" が定義されていません。`,
                            `検出されたキー: ${keys}`,
                            ``,
                            `--- AIへの修正指示 ---`,
                            `Gridsynthサブパッチ仕様（format: "gridsynth-submodule" または pageData.modules を含む構造）に従って再生成してください。`
                        ].join('\n')
                    });
                    return;
                }

                // Check for connection warnings inside the subpatch
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
                            'サブパッチ結線警告 (SUBPATCH WARNINGS)',
                            `サブパッチ "${name}" をストックにインポートしましたが、${subErrors.length}件の結線/モジュールエラーが検出されました。AIに修正を依頼する場合は「COPY ERRORS」を押してください。`,
                            subErrors,
                            {
                                isError: false,
                                copyBtnLabel: 'COPY ERRORS',
                                copyText: [
                                    `[Gridsynth Subpatch Import Warnings - Connections / Modules]`,
                                    `サブパッチ "${name}" の読み込み時に以下のエラーが検出されました (${subErrors.length}件):`,
                                    ``,
                                    ...subErrors.map((e, idx) => `${idx + 1}. ${e}`),
                                    ``,
                                    `--- AIへの修正指示 ---`,
                                    `上記の結線/モジュールエラーを修正してください。`,
                                    `修正した完全なサブパッチJSONを再生成してください。`
                                ].join('\n')
                            }
                        );
                    }, 100);
                }
            });
        }

        modal.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
        setTimeout(() => {
            textarea.focus();
            textarea.select();
        }, 50);
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

        // パッチ切り替え時は開いているすべてのドックダイアログ（LOCK中含む）とポップアップを閉じる
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

        // パッチ展開時の結線・モジュール警告チェック
        if (parseErrors.length > 0) {
            setTimeout(() => {
                this.ui.openCustomAlert(
                    'パッチ結線警告 (IMPORT WARNINGS)',
                    `パッチを展開しましたが、${parseErrors.length}件の結線/モジュールエラーが検出され無効な接続はスキップされました。AIに修正を依頼する場合は「COPY ERRORS」を押してください。`,
                    parseErrors,
                    {
                        isError: false,
                        copyBtnLabel: 'COPY ERRORS',
                        copyText: [
                            `[Gridsynth Patch Import - Connection/Module Warnings]`,
                            `パッチ読み込み時に以下の結線/モジュールエラーが検出されました (${parseErrors.length}件):`,
                            '',
                            ...parseErrors.map((e, idx) => `${idx + 1}. ${e}`),
                            '',
                            `--- AIへの修正指示 ---`,
                            `上記の結線/モジュールエラーを修正してください。`,
                            `Gridsynthの結線規則:`,
                            `- 送信元 (from) は必ずモジュールの有効な出力端子 (_out)`,
                            `- 送信先 (to) は必ずモジュールの有効な入力端子 (_in)`,
                            `- 正しい端子名とモジュールIDを指定し、修正した完全なパッチJSONを再生成してください。`
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
        if (this.DEMO_KEYS.includes(this.currentPresetKey)) return this.ui.showToast('DEMOパッチは上書きできません');
        this.presets[this.currentPresetKey] = this.exportCurrentPreset();
        this.savePresetsDB();
        this.ui.showToast(`"${this.currentPresetKey}" を上書き保存しました`);
    }

    createNewPatch() {
        const name = `PATCH_${Date.now().toString().slice(-4)}`;
        this.presets[name] = createDefaultPatchData(120);
        this.presetOrder.unshift(name);
        this.currentPresetKey = name;
        this.savePresetsDB();
        this.loadActivePreset();
        this.renderPresetList();
        this.ui.showToast(`新規作成: ${name}`);
    }

    openJsonExportModal() {
        const modal = document.getElementById('json-io-modal');
        const title = document.getElementById('json-io-title');
        const icon = document.getElementById('json-io-icon');
        const textarea = document.getElementById('json-io-textarea');
        const footer = document.getElementById('json-io-footer');
        if (!modal || !textarea) return;

        const patchData = this.exportCurrentPreset();
        const jsonStr = JSON.stringify(patchData, null, 2);

        if (title) title.textContent = `PATCH JSON EXPORT (${this.currentPresetKey})`;
        if (icon) icon.setAttribute('data-lucide', 'upload');
        textarea.value = jsonStr;
        textarea.readOnly = true;

        if (footer) {
            const pageCount = Object.keys(patchData.pages || {}).length;
            footer.innerHTML = `
                <div class="text-[8px] text-slate-400 font-mono flex items-center gap-2">
                    <span>PAGES: ${pageCount}</span>
                    <span>BPM: ${patchData.bpm || 120}</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <button id="json-copy-btn" class="h-6 px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[9px] rounded-lg transition flex items-center gap-1 shadow-md shadow-cyan-600/30 cursor-pointer">
                        <i data-lucide="copy" class="w-3 h-3 pointer-events-none"></i>
                        <span id="json-copy-btn-text" class="pointer-events-none">COPY TO CLIPBOARD</span>
                    </button>
                    <button id="json-close-btn" class="h-6 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] rounded-lg transition border border-slate-700 cursor-pointer">
                        CLOSE
                    </button>
                </div>
            `;

            document.getElementById('json-copy-btn')?.addEventListener('click', () => {
                navigator.clipboard.writeText(jsonStr).then(() => {
                    const btnText = document.getElementById('json-copy-btn-text');
                    if (btnText) btnText.textContent = 'COPIED! ✅';
                    this.ui.showToast('パッチJSONをクリップボードにコピーしました');
                    setTimeout(() => {
                        const bt = document.getElementById('json-copy-btn-text');
                        if (bt) bt.textContent = 'COPY TO CLIPBOARD';
                    }, 2000);
                }).catch(() => {
                    textarea.focus();
                    textarea.select();
                    document.execCommand('copy');
                    this.ui.showToast('選択部分をコピーしました');
                });
            });

            document.getElementById('json-close-btn')?.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }

        modal.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
        setTimeout(() => {
            textarea.focus();
            textarea.select();
        }, 50);
    }

    openJsonImportModal() {
        const modal = document.getElementById('json-io-modal');
        const title = document.getElementById('json-io-title');
        const icon = document.getElementById('json-io-icon');
        const textarea = document.getElementById('json-io-textarea');
        const footer = document.getElementById('json-io-footer');
        if (!modal || !textarea) return;

        if (title) title.textContent = 'PATCH JSON IMPORT';
        if (icon) icon.setAttribute('data-lucide', 'download');
        textarea.value = '';
        textarea.placeholder = 'ここにパッチの JSON テキストを貼り付けてください...';
        textarea.readOnly = false;

        if (footer) {
            footer.innerHTML = `
                <button id="json-paste-btn" class="h-6 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] rounded-lg transition border border-slate-700 flex items-center gap-1 cursor-pointer">
                    <i data-lucide="clipboard" class="w-3 h-3 pointer-events-none"></i>PASTE
                </button>
                <div class="flex items-center gap-1.5">
                    <button id="json-apply-load-btn" class="h-6 px-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[9px] rounded-lg transition flex items-center gap-1 shadow-md shadow-purple-600/30 cursor-pointer">
                        <i data-lucide="play" class="w-3 h-3 pointer-events-none"></i>
                        <span>LOAD (現在の画面に展開)</span>
                    </button>
                    <button id="json-apply-saveas-btn" class="h-6 px-2.5 bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-[9px] rounded-lg transition flex items-center gap-1 cursor-pointer">
                        <i data-lucide="file-plus" class="w-3 h-3 pointer-events-none"></i>
                        <span>SAVE AS NEW</span>
                    </button>
                </div>
            `;

            document.getElementById('json-paste-btn')?.addEventListener('click', async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                        textarea.value = text;
                        this.ui.showToast('クリップボードから貼り付けました');
                    }
                } catch (e) {
                    this.ui.showToast('貼り付けは手動 (Ctrl+V) で行ってください');
                }
            });

            const parseAndValidate = () => {
                const rawText = textarea.value.trim();
                if (!rawText) {
                    this.showImportError({
                        title: 'IMPORT ERROR: EMPTY TEXT',
                        message: 'パッチのJSONテキストが空です。',
                        details: ['インポートするパッチのJSON文字列をテキストエリアに貼り付けてください。'],
                        copyText: [
                            '[Gridsynth Patch Import Error]',
                            'エラー: パッチJSONテキストが空です。',
                            'テキストエリアにパッチJSONを貼り付けてから [LOAD] または [SAVE AS NEW] を実行してください。'
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
                        message: `JSON構文エラー: ${err.message}`,
                        details: [
                            `位置: 行 ${info.line}, 列 ${info.col}`,
                            '',
                            '--- 周辺コード ---',
                            info.snippet,
                            '',
                            '※「COPY ERROR」を押すとエラー内容とAIへの修正指示がコピーされます。そのままAIに貼り付けて修正を指示できます。'
                        ],
                        copyText: [
                            `[Gridsynth Patch Import Error - JSON Syntax]`,
                            `エラー内容: ${err.message}`,
                            `発生箇所: 行 ${info.line}, 列 ${info.col}`,
                            ``,
                            `--- 周辺コード ---`,
                            info.snippet,
                            ``,
                            `--- AIへの修正指示 ---`,
                            `GridsynthパッチJSONのパース中に構文エラーが発生しました。`,
                            `上記の行・位置にある不要なカンマや構文違反を修正し、完全なパッチJSONを再生成してください。`
                        ].join('\n')
                    });
                    return null;
                }

                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    this.showImportError({
                        title: 'IMPORT ERROR: INVALID TYPE',
                        message: 'パッチ形式が無効です (JSONオブジェクトである必要があります)',
                        details: ['パッチデータは { "bpm": 120, "pages": { ... } } のようなJSONオブジェクト形式である必要があります。'],
                        copyText: [
                            `[Gridsynth Patch Import Error - Invalid Type]`,
                            `エラー: パッチデータがオブジェクト形式ではありません。`,
                            `修正指示: Gridsynthのパッチ仕様に従い、{ "bpm": 120, "pages": { ... } } 形式のJSONオブジェクトを再生成してください。`
                        ].join('\n')
                    });
                    return null;
                }

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

            document.getElementById('json-apply-load-btn')?.addEventListener('click', () => {
                const data = parseAndValidate();
                if (data) {
                    this.ui.saveHistory();
                    this.loadPatchData(data);
                    modal.classList.add('hidden');
                    document.getElementById('preset-manager-modal')?.classList.add('hidden');
                    this.ui.showToast('パッチを読み込みました');
                }
            });

            document.getElementById('json-apply-saveas-btn')?.addEventListener('click', async () => {
                const data = parseAndValidate();
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
                        this.ui.showToast(`"${name}" として保存・展開しました`);
                    }
                }
            });
        }

        modal.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
        setTimeout(() => {
            textarea.focus();
            textarea.select();
        }, 50);
    }

    openAiSpecModal() {
        const modal = document.getElementById('json-io-modal');
        const title = document.getElementById('json-io-title');
        const icon = document.getElementById('json-io-icon');
        const textarea = document.getElementById('json-io-textarea');
        const footer = document.getElementById('json-io-footer');
        if (!modal || !textarea) return;

        const specText = AI_PATCH_SPEC_CONTENT;

        if (title) title.textContent = 'AI PATCH SPEC (Markdown)';
        if (icon) icon.setAttribute('data-lucide', 'bot');
        textarea.value = specText;
        textarea.readOnly = true;

        if (footer) {
            footer.innerHTML = `
                <div class="flex items-center gap-1.5">
                    <button id="ai-spec-dl-btn" class="h-6 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] rounded-lg transition border border-slate-700 flex items-center gap-1 cursor-pointer" title=".mdファイルとしてダウンロード">
                        <i data-lucide="download" class="w-3 h-3 pointer-events-none text-cyan-400"></i>
                        <span>DOWNLOAD .MD</span>
                    </button>
                </div>
                <div class="flex items-center gap-1.5">
                    <button id="ai-spec-copy-btn" class="h-6 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-[9px] rounded-lg transition flex items-center gap-1.5 shadow-md shadow-cyan-600/30 cursor-pointer">
                        <i data-lucide="copy" class="w-3 h-3 pointer-events-none"></i>
                        <span id="ai-spec-copy-text" class="pointer-events-none">COPY TO CLIPBOARD</span>
                    </button>
                    <button id="ai-spec-close-btn" class="h-6 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9px] rounded-lg transition border border-slate-700 cursor-pointer">
                        CLOSE
                    </button>
                </div>
            `;

            document.getElementById('ai-spec-copy-btn')?.addEventListener('click', () => {
                navigator.clipboard.writeText(specText).then(() => {
                    const btnText = document.getElementById('ai-spec-copy-text');
                    if (btnText) btnText.textContent = 'COPIED! ✅';
                    this.ui.showToast('AI仕様書プロンプトをクリップボードにコピーしました');
                    setTimeout(() => {
                        const bt = document.getElementById('ai-spec-copy-text');
                        if (bt) bt.textContent = 'COPY TO CLIPBOARD';
                    }, 2000);
                }).catch(() => {
                    textarea.focus();
                    textarea.select();
                    document.execCommand('copy');
                    this.ui.showToast('選択部分をコピーしました');
                });
            });

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

            document.getElementById('ai-spec-close-btn')?.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }

        modal.classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
        setTimeout(() => {
            textarea.focus();
            textarea.select();
        }, 50);
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
}

