// src/ui/managers/modal-manager.js
import { MODULE_REGISTRY } from '../../modules/registry.js?v=620';
import { FACTORY_SUBPATCHES } from '../../presets/subpatches.js';
import { UIHelpers } from '../helpers.js?v=620';
import { AddModuleDialog } from './add-module-dialog.js?v=620';

export const MODAL_WIDTHS = {
    // Complex Synthesizers
    FMx3: 'w-[390px]',
    FMCORE: 'w-[250px]',

    // Sequencing & Arpeggiation
    DIST4: 'w-[230px]',
    ARP: 'w-[230px]',
    CHORD: 'w-[240px]',
    MARKOV: 'w-[260px]',

    // Logic & Math
    SCALE: 'w-[260px]',
    MATH1: 'w-[220px]',
    MATH2: 'w-[230px]',
    SH: 'w-[200px]',
    CLK: 'w-[200px]',
    COUNT: 'w-[200px]',
    THROUGH: 'w-[170px]',

    // Sound Generation & Processing
    VCO: 'w-[235px]',
    NOISE: 'w-[185px]',
    VCF: 'w-[210px]',
    FOLD: 'w-[220px]',
    VCA: 'w-[185px]',
    MIX: 'w-[230px]',

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
    SPK: 'w-[185px]',
    SUB: 'w-[240px]'
};

import { DockManager, DOCK_TITLES } from './dock-manager.js?v=618';

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

    bindModalEvents() {
        document.getElementById('close-modal-bg')?.addEventListener('click', () => {
            document.getElementById('shared-modal')?.classList.add('hidden');
            this.activePopupModuleId = null;
        });

        document.getElementById('dock-backdrop')?.addEventListener('pointerdown', () => {
            this.closeUnlockedDocks();
        });
        document.getElementById('dock-backdrop')?.addEventListener('click', () => {
            this.closeUnlockedDocks();
        });

        // Global outside-tap dismiss for unlocked dock dialogs
        document.addEventListener('pointerdown', (e) => {
            if (this.openDocks.size === 0) return;
            const targetEl = e.target instanceof Element ? e.target : e.target?.parentElement;
            if (targetEl?.closest?.('.dock-dialog') || targetEl?.closest?.('#custom-prompt-modal') || targetEl?.closest?.('#alert-modal') || targetEl?.closest?.('#about-modal')) return;
            const hasUnlocked = Array.from(this.openDocks.values()).some(d => !d.isLocked);
            if (hasUnlocked) {
                this.closeUnlockedDocks();
            }
        });

        this.makeDialogDraggable(
            document.getElementById('modal-header'),
            document.getElementById('modal-content'),
            { minMargin: 6, canMoveX: () => document.getElementById('modal-title')?.textContent !== 'ADD MODULE' }
        );

        const closeAboutModal = () => document.getElementById('about-modal')?.classList.add('hidden');
        document.getElementById('about-backdrop')?.addEventListener('click', closeAboutModal);
        document.getElementById('about-backdrop')?.addEventListener('pointerdown', closeAboutModal);
        document.getElementById('json-io-backdrop')?.addEventListener('click', () => document.getElementById('json-io-modal')?.classList.add('hidden'));
        document.getElementById('close-json-io-btn')?.addEventListener('click', () => document.getElementById('json-io-modal')?.classList.add('hidden'));
    }

    showToast(msg, duration = 1800, position = 'top') {
        const t = document.getElementById('toast');
        if (!t) return Promise.resolve();
        t.textContent = msg;
        if (position === 'center') {
            t.classList.remove('top-[26px]');
            t.classList.add('top-1/2', '-translate-y-1/2');
        } else {
            t.classList.remove('top-1/2', '-translate-y-1/2');
            t.classList.add('top-[26px]');
        }
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
        if (this.ui.isPerformanceMode) return;
        const modal = document.getElementById('shared-modal');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;

        const isAdd = title === 'ADD MODULE';
        Object.assign(content.style, isAdd
            ? { width: 'calc(100% - 16px)', maxWidth: 'none', left: '8px', right: '8px', margin: '0', bottom: 'auto' }
            : { width: '', maxWidth: '', right: 'auto', bottom: 'auto', margin: '0' }
        );

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

            if (!isAdd) {
                const idealLeft = (cR.left - fR.left) + (cR.width - pR.width) / 2;
                content.style.left = `${Math.max(6, Math.min(fR.width - pR.width - 6, idealLeft))}px`;
            }
            const idealTop = (cR.top - fR.top) - pR.height - 8;
            const topPos = idealTop < 10 ? (cR.bottom - fR.top + 8) : idealTop;
            content.style.top = `${Math.max(6, Math.min(fR.height - pR.height - 52, topPos))}px`;
        });
    }

    openSettingsModal(mId) {
        if (this.ui.isPerformanceMode) return;
        const m = this.ui.modules[mId];
        if (!m || m.type === 'SUB_IO') return;
        if (DOCK_TITLES[m.type]) {
            this.openDockModal(mId);
            return;
        }
        this.activePopupModuleId = mId;
        const widthCls = MODAL_WIDTHS[m.type] || 'w-[180px]';
        this.openModal(m.row * this.ui.COLS + m.col, m.type, widthCls, () => this.reRenderModal());
    }

    openDockModal(mId) { return this.dockManager.openDockModal(mId); }
    makeDialogDraggable(headerEl, dialogEl, opts) { return this.dockManager.makeDialogDraggable(headerEl, dialogEl, opts); }
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
            closeDockModal: () => this.closeDockModal(id),
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

    renderAndBindModuleModal(id, m, reg, containerEl, isDock = false, afterChange = null) {
        const ctx = this.createModuleContext(id, isDock);
        const onChange = () => {
            this.ui.synth.updateModule(`${this.ui.currentPageId}/${id}`, m, this.ui.getPatchState(id));
            this.ui.renderCell(m.row * this.ui.COLS + m.col);
            if (afterChange) afterChange();
        };
        UIHelpers._activeRoot = containerEl;
        try {
            if (reg.renderModal) containerEl.innerHTML = reg.renderModal(m, ctx);
            else if (reg.schema) containerEl.innerHTML = UIHelpers.renderSchemaModal(m, ctx, reg.schema);

            if (reg.bindEvents) reg.bindEvents(m, ctx, onChange);
            else if (reg.schema) UIHelpers.bindSchemaEvents(m, ctx, reg.schema, onChange);
        } finally {
            UIHelpers._activeRoot = null;
        }
    }

    reRenderModal() {
        const id = this.activePopupModuleId;
        const m = this.ui.modules[id];
        if (!m) return;
        const reg = MODULE_REGISTRY[m.type];
        const b = document.getElementById('modal-body');
        if (!reg || !b) return;

        b.className = "text-xs mt-1";

        const updateModalTitle = () => {
            const titleEl = document.getElementById('modal-title');
            if (!titleEl) return;
            titleEl.className = "text-[10px] font-bold text-cyan-300 uppercase tracking-wider pointer-events-none";
            titleEl.textContent = m.name || m.type;
        };

        updateModalTitle();
        this.renderAndBindModuleModal(id, m, reg, b, false, updateModalTitle);
    }

    openAddModal(slotIdx) {
        this.openModal(slotIdx, 'ADD MODULE', 'w-[calc(100%-16px)]', (body) => {
            AddModuleDialog.render(this, slotIdx, body);
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

