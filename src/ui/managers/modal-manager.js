// src/ui/managers/modal-manager.js
import { MODULE_REGISTRY } from '../../modules/registry.js?v=619';
import { UIHelpers } from '../helpers.js?v=619';
import { openAddModal } from '../dialogs/add-module-dialog.js?v=679';
import { openNumpadPrompt } from '../dialogs/numpad-dialog.js?v=679';
import { openCustomAlert } from '../dialogs/alert-dialog.js?v=679';

export const MODAL_WIDTHS = {
    // Complex Synthesizers
    FMx3: 'w-[390px]',
    FMCORE: 'w-[250px]',

    // Sequencing & Arpeggiation
    DIST4: 'w-[230px]',
    SLCT4: 'w-[230px]',
    CHORD: 'w-[240px]',
    MARKOV: 'w-[260px]',

    // Logic & Math
    MATH1: 'w-[230px]',
    MATH2: 'w-[260px]',
    SH: 'w-[200px]',
    CLK: 'w-[200px]',
    COUNT: 'w-[200px]',
    SWITCH: 'w-[170px]',
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
    LAG: 'w-[190px]',
    CVDELAY: 'w-[190px]',
    REVERB: 'w-[210px]',

    // Modulation & Envelopes
    ADSR: 'w-[215px]',
    RF: 'w-[210px]',
    AR: 'w-[210px]',
    LFO: 'w-[250px]',

    // IO & Monitoring
    SPK: 'w-[185px]',
    SUB: 'w-[240px]',
    GSENSOR: 'w-[180px]',
    TILT: 'w-[180px]',
    OBJECT: 'w-[190px]',
    ROTATE: 'w-[190px]',
    MOVE: 'w-[190px]',
    SCALE: 'w-[190px]',
    RENDER: 'w-[calc(100%-16px)]',
    VFX: 'w-[190px]',
    VMIX: 'w-[200px]',
    DISPLAY: 'w-[200px]'
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
        const isFull = isAdd || (widthCls && widthCls.includes('calc(100%'));
        Object.assign(content.style, isFull
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

            if (!isFull) {
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
            numpad: (t, init, min, max) => this.openNumpadPrompt(t, init, min, max),
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
        return openAddModal(slotIdx, this, this.ui);
    }

    openCustomPrompt(title, init) {
        return new Promise(res => {
            const md = document.getElementById('custom-prompt-modal');
            const inp = document.getElementById('prompt-input');
            const backdrop = document.getElementById('prompt-backdrop');
            const okBtn = document.getElementById('prompt-ok-btn');
            const cancelBtn = document.getElementById('prompt-cancel-btn');
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
                if (okBtn) okBtn.onclick = null;
                if (cancelBtn) cancelBtn.onclick = null;
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
            if (okBtn) okBtn.onclick = () => finish(inp.value.trim());
            if (cancelBtn) cancelBtn.onclick = () => finish(null);
            backdrop.onclick = () => finish(null);
        });
    }

    openNumpadPrompt(title, init, min = -10.0, max = 10.0) {
        return openNumpadPrompt(title, init, min, max);
    }

    openCustomAlert(title, message, details = [], options = {}) {
        return openCustomAlert(title, message, details, options, this.ui);
    }
}

