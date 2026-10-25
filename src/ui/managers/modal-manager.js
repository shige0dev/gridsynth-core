// src/ui/managers/modal-manager.js
import { MODULE_REGISTRY } from '../../modules/registry.js?v=397';
import { FACTORY_SUBPATCHES } from '../../presets/subpatches.js';
import { UIHelpers } from '../helpers.js?v=187';
import { generateModuleId } from '../../core/utils.js?v=297';

export const MODAL_WIDTHS = {
    // Complex Synthesizers
    FM: 'w-[390px]',
    FM3OP: 'w-[390px]',
    FMx3: 'w-[390px]',
    FMCORE: 'w-[250px]',

    // Sequencing & Arpeggiation
    GATE4: 'w-[230px]',
    ARP: 'w-[230px]',
    CHORD: 'w-[240px]',
    MARKOV: 'w-[260px]',

    // Logic & Math
    SCALE: 'w-[260px]',
    MATH1: 'w-[220px]',
    MATH2: 'w-[230px]',
    SH: 'w-[200px]',
    CLK: 'w-[200px]',
    THROUGH: 'w-[170px]',

    // Sound Generation & Processing
    VCO: 'w-[235px]',
    WAVE: 'w-[360px]',
    NOISE: 'w-[185px]',
    VCF: 'w-[210px]',
    FOLD: 'w-[220px]',
    VCA: 'w-[185px]',
    MIX: 'w-[230px]',
    SLIDER: 'w-[165px]',

    // Effects
    DELAY: 'w-[200px]',
    CVDELAY: 'w-[190px]',
    REVERB: 'w-[210px]',

    // Modulation & Envelopes
    ADSR: 'w-[215px]',
    RF: 'w-[210px]',
    AR: 'w-[210px]',
    LFO: 'w-[250px]',

    // IO & Monitoring
    SCOPE: 'w-[235px]',
    LISS: 'w-[235px]',
    SPEC: 'w-[235px]',
    SPK: 'w-[185px]',
    SUB: 'w-[240px]'
};

import { DockManager } from './dock-manager.js?v=396';

export class ModalManager {
    constructor(ui) {
        this.ui = ui;
        this.activePopupModuleId = null;
        this.dockManager = new DockManager(this.ui, this);
        this._toastTimer = null;
    }

    get openDocks() { return this.dockManager.openDocks; }
    get highestZIndex() { return this.dockManager.highestZIndex; }
    set highestZIndex(v) { this.dockManager.highestZIndex = v; }
    get activeDockModuleId() { return this.dockManager.activeDockModuleId; }
    set activeDockModuleId(v) { this.dockManager.activeDockModuleId = v; }
    get isDockLocked() { return this.dockManager.isDockLocked; }
    set isDockLocked(v) { this.dockManager.isDockLocked = v; }

    getDialogElement(mId) {
        if (!mId) return null;
        if (this.openDocks.has(mId)) {
            return this.openDocks.get(mId).element;
        }
        if (this.activePopupModuleId === mId) {
            return document.getElementById('modal-content');
        }
        return null;
    }

    showToast(msg, duration = 1800) {
        const t = document.getElementById('toast');
        if (!t) return Promise.resolve();
        t.textContent = msg;
        t.classList.remove('opacity-0');
        if (this._toastTimer) clearTimeout(this._toastTimer);
        return new Promise(resolve => {
            this._toastTimer = setTimeout(() => {
                t.classList.add('opacity-0');
                setTimeout(resolve, 150);
            }, duration);
        });
    }

    openModal(idx, title, widthCls, renderFn) {
        const modal = document.getElementById('shared-modal');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;

        if (title === 'ADD MODULE') {
            content.style.width = 'calc(100% - 16px)';
            content.style.maxWidth = 'none';
            content.style.left = '8px';
            content.style.right = '8px';
            content.style.margin = '0';
            content.style.bottom = 'auto';
        } else {
            content.style.width = '';
            content.style.maxWidth = '';
            content.style.right = 'auto';
            content.style.bottom = 'auto';
            content.style.margin = '0';
        }

        content.className = `absolute bg-slate-900/95 border border-slate-700 rounded-xl ${widthCls} p-2 shadow-2xl backdrop-blur-md`;
        const titleEl = document.getElementById('modal-title');
        if (titleEl) titleEl.textContent = title;
        renderFn(document.getElementById('modal-body'));
        modal.classList.remove('hidden');

        requestAnimationFrame(() => {
            const cell = document.getElementById(`cell-${idx}`);
            const frame = document.getElementById('phone-frame');
            if (!cell || !frame) return;
            const cR = cell.getBoundingClientRect();
            const fR = frame.getBoundingClientRect();
            const pR = content.getBoundingClientRect();

            if (title === 'ADD MODULE') {
                content.style.left = '8px';
                content.style.right = '8px';
                content.style.width = 'calc(100% - 16px)';
                content.style.maxWidth = 'none';
                content.style.margin = '0';
                content.style.bottom = 'auto';
                const idealTop = (cR.top - fR.top) - pR.height - 8;
                const topPos = idealTop < 10 ? (cR.bottom - fR.top + 8) : idealTop;
                content.style.top = `${Math.max(6, Math.min(fR.height - pR.height - 52, topPos))}px`;
            } else {
                content.style.width = '';
                content.style.maxWidth = '';
                content.style.right = 'auto';
                content.style.margin = '0';
                content.style.bottom = 'auto';
                const idealLeft = (cR.left - fR.left) + (cR.width - pR.width) / 2;
                content.style.left = `${Math.max(6, Math.min(fR.width - pR.width - 6, idealLeft))}px`;

                const idealTop = (cR.top - fR.top) - pR.height - 8;
                const topPos = idealTop < 10 ? (cR.bottom - fR.top + 8) : idealTop;
                content.style.top = `${Math.max(6, Math.min(fR.height - pR.height - 52, topPos))}px`;
            }
        });
    }

    openSettingsModal(mId) {
        const m = this.ui.modules[mId];
        if (!m || m.type === 'SUB_IO') return;
        if (['KEY', 'SEQ8', 'SEQ16', 'PAT', 'SPEC', 'SCOPE', 'LISS', 'WAVE', 'PAD'].includes(m.type)) {
            this.openDockModal(mId);
            return;
        }
        this.activePopupModuleId = mId;
        const widthCls = MODAL_WIDTHS[m.type] || 'w-[180px]';
        this.openModal(m.row * this.ui.COLS + m.col, m.type, widthCls, () => this.reRenderModal());
    }

    openDockModal(mId) { return this.dockManager.openDockModal(mId); }
    makeDialogDraggable(headerEl, dialogEl) { return this.dockManager.makeDialogDraggable(headerEl, dialogEl); }
    bringToFront(mId) { return this.dockManager.bringToFront(mId); }
    closeDockModal(mId = null) { return this.dockManager.closeDockModal(mId); }
    closeUnlockedDocks() { return this.dockManager.closeUnlockedDocks(); }
    toggleDockLock(mId) { return this.dockManager.toggleDockLock(mId); }
    setDockLock(lock, mId = null) { return this.dockManager.setDockLock(lock, mId); }
    updateDockLockUI(mId) { return this.dockManager.updateDockLockUI(mId); }
    updateBackdrop() { return this.dockManager.updateBackdrop(); }
    createModuleContext(id, isDock = false) {
        return {
            id,
            synth: this.ui.synth,
            ui: this.ui,
            patched: this.ui.getPatchState(id),
            getPatchState: (modId, pId) => this.ui.getPatchState(modId ?? id, pId),
            bpm: this.ui.synth.masterBPM,
            currentPageId: this.ui.currentPageId,
            getDialogElement: () => this.getDialogElement(id),
            showToast: (msg) => this.showToast(msg),
            reRenderModal: isDock ? () => this.reRenderDockModal(id) : () => this.reRenderModal(),
            rebuildModule: () => this.ui.rebuildModule(id),
            removeConnectionsForPort: (p) => this.ui.removeConnectionsForPort(id, p),
            sendControl: (event) => this.ui.synth.sendControlEvent(id, event),
            sendKeyNote: (midi, isDown) => this.ui.synth.sendControlEvent(id, { type: 'NOTE', midi, isDown }),
            triggerManualSample: () => this.ui.synth.sendControlEvent(id, { type: 'TRIG' }),
            prompt: (t, init) => this.openCustomPrompt(t, init),
            openSubpage: (pId) => this.ui.switchPage(pId),
            saveSubpatchToLibrary: (name) => this.ui.saveCurrentSubpatchToLibrary(name),
            getPageName: () => this.ui.pagesData[this.ui.currentPageId]?.name || `SUBPATCH ${this.ui.currentPageId}`,
            setPageName: (name) => {
                if (!this.ui.pagesData[this.ui.currentPageId]) {
                    this.ui.pagesData[this.ui.currentPageId] = { slots: {}, modules: {}, connections: [] };
                }
                this.ui.pagesData[this.ui.currentPageId].name = name;
                this.ui.updatePageNavUI();
                this.ui.updateAllCells();
                this.showToast(`サブパッチ名を「${name}」に変更しました`);
            },
            pagesData: this.ui.pagesData
        };
    }

    reRenderDockModal(mId = null) { return this.dockManager.reRenderDockModal(mId); }

    reRenderModal() {
        const id = this.activePopupModuleId;
        const m = this.ui.modules[id];
        if (!m) return;
        const reg = MODULE_REGISTRY[m.type];
        const b = document.getElementById('modal-body');
        if (!reg || !b) return;

        b.className = "text-xs mt-1";
        const ctx = this.createModuleContext(id, false);

        const updateModalTitle = () => {
            const titleEl = document.getElementById('modal-title');
            if (!titleEl) return;
            titleEl.className = "text-[10px] font-bold text-cyan-300 uppercase tracking-wider pointer-events-none";
            titleEl.textContent = (m.type === 'PAD' && m.name) ? `PAD: ${m.name}` : (m.name || m.type);
        };

        const onChange = () => {
            this.ui.synth.updateModule(`${this.ui.currentPageId}/${id}`, m, this.ui.getPatchState(id));
            this.ui.renderCell(m.row * this.ui.COLS + m.col);
            updateModalTitle();
        };

        updateModalTitle();

        if (reg.renderModal) {
            b.innerHTML = reg.renderModal(m, ctx);
        } else if (reg.schema) {
            b.innerHTML = UIHelpers.renderSchemaModal(m, ctx, reg.schema);
        }

        if (reg.bindEvents) {
            reg.bindEvents(m, ctx, onChange);
        } else if (reg.schema) {
            UIHelpers.bindSchemaEvents(m, ctx, reg.schema, onChange);
        }
    }

    openAddModal(slotIdx) {
        this.openModal(slotIdx, 'ADD MODULE', 'w-[calc(100%-16px)]', (body) => {
            const isMain = this.ui.currentPageId === "0";
            const depth = this.ui.getNestingDepth(this.ui.currentPageId);
            const allowSub = depth < 3;

            const renderContent = () => {
                const basicTypes = Object.keys(MODULE_REGISTRY).filter(t => {
                    if (t === 'SUB') return false; // Placed under User Subpatch area
                    if (t === 'SUB_IO') return !isMain;
                    if (t === 'FM' || t === 'FM3OP' || t === 'XY') return false; // Aliases for FMx3, LISS
                    return true;
                });

                const userSubs = Object.values(this.ui.getUserSubpatches());
                const factorySubs = Object.values(FACTORY_SUBPATCHES);

                const CATEGORIES = [
                    {
                        name: 'SOUND',
                        sub: 'サウンド (音源・音響・出力)',
                        color: 'cyan',
                        types: ['VCO', 'WAVE', 'NOISE', 'FMx3', 'FMCORE', 'FOLD', 'VCF', 'VCA', 'MIX', 'DELAY', 'REVERB', 'SPK', 'SCOPE', 'LISS', 'SPEC']
                    },
                    {
                        name: 'TRIGGER',
                        sub: 'トリガ (クロック・シーケンサー)',
                        color: 'rose',
                        types: ['CLK', 'SEQ8', 'SEQ16', 'PAT', 'MARKOV', 'GATE4', 'ARP', 'KEY', 'PAD']
                    },
                    {
                        name: 'CV',
                        sub: 'CV (変調・演算・エンベロープ)',
                        color: 'purple',
                        types: ['LFO', 'ADSR', 'RF', 'AR', 'CHORD', 'SCALE', 'MATH1', 'MATH2', 'SH', 'CVDELAY', 'SLIDER', 'THROUGH', 'SUB_IO']
                    }
                ];

                const categorizedSet = new Set(CATEGORIES.flatMap(c => c.types));
                const uncategorized = basicTypes.filter(t => !categorizedSet.has(t));
                if (uncategorized.length > 0) {
                    CATEGORIES.push({
                        name: 'OTHER',
                        sub: 'その他',
                        color: 'slate',
                        types: uncategorized
                    });
                }

                const categorySectionsHtml = CATEGORIES.map((cat, catIdx) => {
                    const items = cat.types.filter(t => basicTypes.includes(t));
                    if (items.length === 0) return '';
                    return `
                        <div class="${catIdx > 0 ? 'border-t border-slate-800/80 pt-1.5 mt-0.5' : ''}">
                            <div class="text-[8.5px] font-bold text-${cat.color}-400 uppercase tracking-wider mb-1 px-0.5 flex items-center justify-between">
                                <span class="flex items-center gap-1.5">
                                    <span class="w-1.5 h-1.5 rounded-full bg-${cat.color}-400"></span>
                                    <span>${cat.name}</span>
                                    <span class="text-[7.5px] text-slate-400 font-normal">/ ${cat.sub}</span>
                                </span>
                                <div class="flex items-center gap-1">
                                    ${!isMain && cat.name === 'CV' ? '<span class="text-[7px] text-emerald-400 font-mono">SUBPAGE</span>' : ''}
                                    <span class="text-[7px] text-slate-500 font-mono">${items.length}</span>
                                </div>
                            </div>
                            <div class="grid grid-cols-8 gap-1">
                                ${items.map(type => {
                                    const col = MODULE_REGISTRY[type]?.color || 'cyan';
                                    return `<button data-type="${type}" class="h-6 py-0.5 px-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-${col}-500/60 rounded text-center text-${col}-300 text-[7.5px] font-bold tracking-tight transition truncate flex items-center justify-center">${type}</button>`;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('');

                body.className = "flex flex-col gap-2 mt-0.5 max-h-[78vh] overflow-y-auto pr-0.5";
                body.innerHTML = `
                    <!-- 1. CATEGORIZED BASIC MODULES (SOUND, TRIGGER, CV) -->
                    ${categorySectionsHtml}

                    <!-- 2. FACTORY SUBPATCHES (4-column Grid, 2x width of basic modules) -->
                    ${allowSub ? `
                    <div class="border-t border-slate-800 pt-1.5 mt-0.5">
                        <div class="text-[8.5px] font-bold text-purple-300 uppercase tracking-wider mb-1 px-0.5 flex items-center">
                            <span>FACTORY SUBPATCH</span>
                        </div>
                        <div class="grid grid-cols-4 gap-1">
                            ${factorySubs.map(sub => `
                                <div class="h-6 bg-slate-800/90 hover:bg-purple-950/60 border border-slate-700/80 hover:border-purple-500/80 rounded flex items-center justify-between px-1 transition cursor-pointer factory-sub-item" data-id="${sub.id}">
                                    <span class="text-[7.5px] font-bold text-purple-300 truncate pointer-events-none">${sub.name}</span>
                                    <div class="flex items-center gap-0.5 shrink-0 ml-0.5">
                                        <button class="export-factory-sub-btn w-3.5 h-3.5 flex items-center justify-center bg-slate-900 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 text-[6.5px]" data-id="${sub.id}" title="JSONエクスポート(コピー)">📋</button>
                                        <button class="sub-info-btn w-3.5 h-3.5 flex items-center justify-center text-slate-400 hover:text-purple-300 rounded text-[7px] hover:bg-slate-700/80" data-id="${sub.id}" title="説明">ℹ️</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}

                    <!-- 3. USER SUBPATCHES & HEADER NEW SUBPATCH BUTTON -->
                    ${allowSub ? `
                    <div class="border-t border-slate-800 pt-1.5 mt-0.5">
                        <div class="text-[8.5px] font-bold text-emerald-300 uppercase tracking-wider mb-1 px-0.5 flex items-center justify-between">
                            <span>USER STOCK (SUBPATCH)</span>
                            <div class="flex items-center gap-1">
                                <button class="import-user-sub-btn h-5 px-2 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/70 hover:border-purple-400 text-purple-300 rounded text-[8px] font-bold transition flex items-center gap-1 shadow-sm cursor-pointer" title="サブパッチJSONをインポートしてストックに登録">
                                    <span>📥 IMPORT</span>
                                </button>
                                <button data-type="SUB" class="h-5 px-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/70 hover:border-emerald-400 text-emerald-300 rounded text-[8px] font-bold transition flex items-center gap-1 shadow-sm">
                                    <span>➕ 新規作成</span>
                                </button>
                            </div>
                        </div>
                        ${userSubs.length > 0 ? `
                        <div class="grid grid-cols-4 gap-1 mt-1">
                            ${userSubs.map(sub => `
                                <div class="h-6 bg-slate-800/90 hover:bg-emerald-950/60 border border-slate-700/80 hover:border-emerald-500/80 rounded flex items-center justify-between px-1 transition cursor-pointer user-sub-item select-user-sub" data-id="${sub.id}">
                                    <span class="text-[7.5px] font-bold text-emerald-300 truncate pointer-events-none">${sub.name}</span>
                                    <div class="flex items-center gap-0.5 shrink-0 ml-0.5">
                                        <button class="export-user-sub-btn w-3.5 h-3.5 flex items-center justify-center bg-slate-900 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 text-[6.5px]" data-id="${sub.id}" title="JSONエクスポート(コピー)">📋</button>
                                        <button class="edit-user-sub-btn w-3.5 h-3.5 flex items-center justify-center bg-slate-900 hover:bg-slate-700 text-emerald-300 rounded border border-slate-700 text-[6.5px]" data-id="${sub.id}" title="中身を編集">✏️</button>
                                        <button class="delete-user-sub-btn w-3.5 h-3.5 flex items-center justify-center bg-red-950/70 hover:bg-red-900 text-red-300 rounded border border-red-700/60 text-[6.5px]" data-id="${sub.id}" title="削除">🗑️</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}
                `;

                // Basic module & SUB click
                body.querySelectorAll('[data-type]').forEach(btn => btn.addEventListener('click', () => {
                    this.ui.saveHistory();
                    const type = btn.dataset.type;

                    if (type === 'SUB') {
                        const res = this.ui.pageManager.createSubpatchInstance({ slotIdx });
                        document.getElementById('shared-modal')?.classList.add('hidden');
                        this.ui.renderCell(slotIdx);
                        if (typeof lucide !== 'undefined') lucide.createIcons();
                        this.ui.updatePageNavUI();
                        this.showToast(`SUBPATCH「${res.name}」を追加しました`);
                        return;
                    }

                    const d = MODULE_REGISTRY[type].defaults();
                    const newId = generateModuleId(type, this.ui.modules);
                    d.id = newId;
                    d.col = slotIdx % this.ui.COLS;
                    d.row = Math.floor(slotIdx / this.ui.COLS);

                    this.ui.modules[newId] = d;
                    this.ui.syncGridMap();
                    this.ui.synth.addModule(`${this.ui.currentPageId}/${newId}`, type, d, this.ui.getPatchState(newId));

                    document.getElementById('shared-modal')?.classList.add('hidden');
                    this.ui.renderCell(slotIdx);
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                    this.ui.updatePageNavUI();
                    this.showToast(`${type} を追加しました`);
                }));

                // Factory subpatch click (Direct place)
                body.querySelectorAll('.factory-sub-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        if (e.target.closest('.sub-info-btn') || e.target.closest('.export-factory-sub-btn')) return;
                        const subId = item.dataset.id;
                        this.ui.instantiateSubpatch(subId, slotIdx);
                        document.getElementById('shared-modal')?.classList.add('hidden');
                    });
                });

                // Factory subpatch export
                body.querySelectorAll('.export-factory-sub-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const subId = btn.dataset.id;
                        const sub = FACTORY_SUBPATCHES[subId];
                        if (sub) this.ui.openSubpatchExportModal(sub);
                    });
                });

                // Factory subpatch info button click (Toast description)
                body.querySelectorAll('.sub-info-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const subId = btn.dataset.id;
                        const sub = FACTORY_SUBPATCHES[subId] || (this.ui.userSubpatches && this.ui.userSubpatches[subId]);
                        if (sub) {
                            this.showToast(`【${sub.name}】${sub.description || '説明なし'}`, 3000);
                        }
                    });
                });

                // User subpatch click (Direct place)
                body.querySelectorAll('.select-user-sub').forEach(item => {
                    item.addEventListener('click', (e) => {
                        if (e.target.closest('.edit-user-sub-btn') || e.target.closest('.delete-user-sub-btn') || e.target.closest('.export-user-sub-btn')) return;
                        const subId = item.dataset.id;
                        this.ui.instantiateSubpatch(subId, slotIdx);
                        document.getElementById('shared-modal')?.classList.add('hidden');
                    });
                });

                // User subpatch export
                body.querySelectorAll('.export-user-sub-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const subId = btn.dataset.id;
                        const sub = this.ui.getUserSubpatches()[subId];
                        if (sub) this.ui.openSubpatchExportModal(sub);
                    });
                });

                // User subpatch import
                body.querySelector('.import-user-sub-btn')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.ui.openSubpatchImportModal(() => renderContent());
                });

                // User subpatch edit (Place and immediately open internal subpatch page)
                body.querySelectorAll('.edit-user-sub-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const subId = btn.dataset.id;
                        const res = this.ui.instantiateSubpatch(subId, slotIdx);
                        if (res && res.success) {
                            document.getElementById('shared-modal')?.classList.add('hidden');
                            this.ui.switchPage(res.page);
                            this.showToast(`サブパッチ「${res.subpatch}」の編集画面を開きました（上部の STOCK ボタンで更新可能）`);
                        }
                    });
                });

                // User subpatch delete
                body.querySelectorAll('.delete-user-sub-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const subId = btn.dataset.id;
                        const sub = this.ui.userSubpatches[subId];
                        if (!sub) return;
                        if (confirm(`サブパッチ「${sub.name}」をライブラリから削除しますか？\n（※配置済みのモジュールには影響しません）`)) {
                            this.ui.deleteUserSubpatch(subId);
                            renderContent();
                        }
                    });
                });
            };

            renderContent();
        });
    }

    openCustomPrompt(title, init) {
        return new Promise(res => {
            const md = document.getElementById('custom-prompt-modal');
            const inp = document.getElementById('prompt-input');
            const backdrop = document.getElementById('prompt-backdrop');
            if (!md || !inp || !backdrop) return res(null);

            document.getElementById('prompt-title')?.querySelector('span')?.replaceChildren(document.createTextNode(title));
            inp.value = init || '';
            md.classList.remove('hidden');
            inp.focus();
            inp.select();

            const finish = (val) => {
                md.classList.add('hidden');
                inp.onkeydown = null;
                backdrop.onclick = null;
                res(val);
            };

            inp.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    finish(inp.value.trim());
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    finish(null);
                }
            };
            backdrop.onclick = () => finish(null);
        });
    }

    openCustomAlert(title, message, details = [], options = {}) {
        return new Promise(res => {
            const md = document.getElementById('custom-alert-modal');
            const dialogBox = document.getElementById('alert-dialog-box');
            const titleEl = document.getElementById('alert-title');
            const msgEl = document.getElementById('alert-message');
            const detailsEl = document.getElementById('alert-details');
            const okBtn = document.getElementById('alert-ok-btn');
            const backdrop = document.getElementById('alert-backdrop');
            const copyBtn = document.getElementById('alert-copy-btn');
            const copyBtnText = document.getElementById('alert-copy-btn-text');
            const iconEl = document.getElementById('alert-icon');

            const isError = options.isError ?? (title.toUpperCase().includes('ERROR') || title.includes('エラー'));
            const showCopy = options.showCopy ?? true;
            const copyBtnLabel = options.copyBtnLabel || (isError ? 'COPY ERROR' : 'COPY REPORT');

            // Build copyable text
            let copyText = options.copyText;
            if (!copyText) {
                const parts = [
                    `[${title}]`,
                    message
                ];
                if (details && details.length > 0) {
                    parts.push('', '--- DETAILS ---');
                    const arr = Array.isArray(details) ? details : [details];
                    arr.forEach(d => parts.push(typeof d === 'string' ? d : JSON.stringify(d)));
                }
                copyText = parts.filter(Boolean).join('\n');
            }

            if (!md) {
                alert(`${title}\n\n${copyText}`);
                return res();
            }

            if (titleEl) {
                titleEl.textContent = title;
                titleEl.classList.remove('text-amber-300', 'text-rose-300');
                titleEl.classList.add(isError ? 'text-rose-300' : 'text-amber-300');
            }
            if (msgEl) msgEl.textContent = message;

            if (dialogBox) {
                dialogBox.classList.remove('border-amber-500/80', 'border-rose-500/80');
                dialogBox.classList.add(isError ? 'border-rose-500/80' : 'border-amber-500/80');
            }
            if (iconEl) {
                iconEl.classList.remove('text-amber-400', 'text-rose-400');
                iconEl.classList.add(isError ? 'text-rose-400' : 'text-amber-400');
            }
            if (okBtn) {
                okBtn.classList.remove('bg-amber-600', 'hover:bg-amber-500', 'shadow-amber-600/30', 'bg-rose-600', 'hover:bg-rose-500', 'shadow-rose-600/30');
                if (isError) {
                    okBtn.classList.add('bg-rose-600', 'hover:bg-rose-500', 'shadow-rose-600/30');
                } else {
                    okBtn.classList.add('bg-amber-600', 'hover:bg-amber-500', 'shadow-amber-600/30');
                }
            }

            if (detailsEl) {
                if (details && (Array.isArray(details) ? details.length > 0 : !!details)) {
                    detailsEl.classList.remove('hidden');
                    const lines = Array.isArray(details) ? details : [details];
                    detailsEl.innerHTML = lines.map(d => {
                        const line = typeof d === 'string' ? d : JSON.stringify(d);
                        const safe = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        return `<div class="py-0.5 border-b border-slate-800/60 last:border-0 font-mono">${safe}</div>`;
                    }).join('');
                } else {
                    detailsEl.classList.add('hidden');
                }
            }

            let copyTimer = null;
            if (copyBtn) {
                if (showCopy) {
                    copyBtn.classList.remove('hidden');
                    if (copyBtnText) copyBtnText.textContent = copyBtnLabel;
                    copyBtn.onclick = async (e) => {
                        e.stopPropagation();
                        let copied = false;
                        if (navigator?.clipboard?.writeText) {
                            try {
                                await navigator.clipboard.writeText(copyText);
                                copied = true;
                            } catch (err) {}
                        }
                        if (!copied) {
                            try {
                                const ta = document.createElement('textarea');
                                ta.value = copyText;
                                ta.style.position = 'fixed';
                                ta.style.opacity = '0';
                                document.body.appendChild(ta);
                                ta.focus();
                                ta.select();
                                copied = document.execCommand('copy');
                                document.body.removeChild(ta);
                            } catch (err) {}
                        }
                        if (copyBtnText) copyBtnText.textContent = 'COPIED! ✅';
                        copyBtn.classList.add('bg-emerald-800', 'text-emerald-200', 'border-emerald-500');
                        if (copyTimer) clearTimeout(copyTimer);
                        copyTimer = setTimeout(() => {
                            if (copyBtnText) copyBtnText.textContent = copyBtnLabel;
                            copyBtn.classList.remove('bg-emerald-800', 'text-emerald-200', 'border-emerald-500');
                        }, 1800);
                        this.ui?.showToast?.('クリップボードにコピーしました');
                    };
                } else {
                    copyBtn.classList.add('hidden');
                }
            }

            md.classList.remove('hidden');
            if (typeof lucide !== 'undefined') lucide.createIcons();

            let keyHandler = null;
            const finish = () => {
                md.classList.add('hidden');
                if (okBtn) okBtn.onclick = null;
                if (backdrop) backdrop.onclick = null;
                if (copyBtn) copyBtn.onclick = null;
                if (copyTimer) clearTimeout(copyTimer);
                if (keyHandler) window.removeEventListener('keydown', keyHandler);
                res();
            };

            keyHandler = (e) => {
                if (e.key === 'Escape' || e.key === 'Enter') {
                    e.preventDefault();
                    finish();
                }
            };

            if (okBtn) okBtn.onclick = finish;
            if (backdrop) backdrop.onclick = finish;
            window.addEventListener('keydown', keyHandler);
        });
    }
}

