// src/ui/managers/dock-manager.js
import { MODULE_REGISTRY } from '../../modules/registry.js?v=459';
import { UIHelpers } from '../helpers.js?v=459';

export const DOCK_TITLES = {
    KEY: 'KEYBOARD',
    PAD: 'TOUCH PAD',
    PAT: 'STRUDEL PATTERN',
    SEQ16: '16-STEP SEQUENCER',
    SEQ8: '8-STEP SEQUENCER',
    SPEC: 'SPECTRUM ANALYZER',
    SCOPE: 'OSCILLOSCOPE',
    LISS: 'LISSAJOUS (X-Y)',
    WAVE: 'WAVE RECORDER & SLICER'
};

export const DOCK_ICONS = {
    KEY: 'music',
    PAD: 'fingerprint',
    PAT: 'code',
    SEQ16: 'sliders',
    SEQ8: 'sliders',
    SPEC: 'activity',
    SCOPE: 'activity',
    LISS: 'activity',
    WAVE: 'audio-waveform'
};

export class DockManager {
    constructor(ui, modalManager) {
        this.ui = ui;
        this.modalManager = modalManager;
        this.openDocks = new Map(); // moduleId -> { moduleId, element, isLocked, zIndex }
        this.highestZIndex = 40;
    }

    get activeDockModuleId() {
        let topId = null, maxZ = -1;
        this.openDocks.forEach((info, id) => {
            if (info.zIndex > maxZ) {
                maxZ = info.zIndex;
                topId = id;
            }
        });
        return topId;
    }

    set activeDockModuleId(id) {
        if (id && this.openDocks.has(id)) {
            this.bringToFront(id);
        }
    }

    get isDockLocked() {
        if (this.openDocks.size === 0) return false;
        return Array.from(this.openDocks.values()).some(d => d.isLocked);
    }

    set isDockLocked(lock) {
        this.setDockLock(lock);
    }

    openDockModal(mId) {
        const m = this.ui.modules[mId];
        if (!m) return;

        // If dialog for this module is already open, bring to front
        if (this.openDocks.has(mId)) {
            this.bringToFront(mId);
            return;
        }

        const modal = document.getElementById('dock-modal');
        const container = document.getElementById('dock-container') || modal;
        const frame = document.getElementById('phone-frame');
        modal?.classList.remove('hidden');

        const titleText = DOCK_TITLES[m.type] || m.type;
        const iconName = DOCK_ICONS[m.type] || 'sliders';

        const dialogEl = document.createElement('div');
        dialogEl.id = `dock-dialog-${mId}`;
        dialogEl.dataset.moduleId = mId;
        dialogEl.className = "dock-dialog absolute bg-slate-900/95 border border-cyan-500/70 rounded-xl p-2 shadow-2xl backdrop-blur-md pointer-events-auto transition-none left-2 right-2 w-[calc(100%-16px)] max-h-[calc(100%-84px)] overflow-hidden flex flex-col overscroll-contain";

        dialogEl.innerHTML = `
            <div class="dock-dialog-header border-b border-slate-800 pb-1 flex items-center justify-between cursor-move touch-none select-none shrink-0">
                <div class="flex items-center gap-1.5 flex-1 min-w-0 mr-2">
                    <i data-lucide="${iconName}" class="w-3.5 h-3.5 text-cyan-400 pointer-events-none shrink-0"></i>
                    <h3 class="dock-dialog-title text-[10px] font-bold text-cyan-300 uppercase tracking-wider pointer-events-none shrink-0">${titleText}</h3>
                    ${m.type === 'PAD' ? `
                        <input type="text" class="dock-title-name-input bg-slate-950/90 border border-slate-700/80 hover:border-cyan-400 focus:border-cyan-400 rounded px-1.5 py-0 text-[9.5px] font-mono font-bold text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 h-[20px] w-28 select-text cursor-text leading-none shadow-inner ml-1" value="${m.name || 'PAD'}" placeholder="PAD" maxlength="12" title="PADの名前を編集">
                    ` : ''}
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    <button class="dock-lock-btn h-5 px-1.5 rounded text-[8.5px] font-bold flex items-center gap-1 border transition-colors bg-slate-800 text-slate-400 border-slate-700 cursor-pointer" title="ロック/ピン留め">
                        <i data-lucide="pin" class="w-2.5 h-2.5 pointer-events-none"></i>
                        <span class="pointer-events-none">LOCK</span>
                    </button>
                </div>
            </div>
            <div class="dock-dialog-body text-xs mt-1 overflow-y-auto overscroll-contain flex-1 min-h-0"></div>
        `;

        container.appendChild(dialogEl);

        const dockInfo = {
            moduleId: mId,
            element: dialogEl,
            isLocked: false,
            zIndex: ++this.highestZIndex
        };
        dialogEl.style.zIndex = dockInfo.zIndex;
        this.openDocks.set(mId, dockInfo);

        // Render content
        this.reRenderDockModal(mId);

        // Bind title name input if PAD
        if (m.type === 'PAD') {
            const titleNameInput = dialogEl.querySelector('.dock-title-name-input');
            if (titleNameInput) {
                titleNameInput.addEventListener('pointerdown', (e) => e.stopPropagation());
                titleNameInput.addEventListener('mousedown', (e) => e.stopPropagation());
                titleNameInput.addEventListener('keydown', (e) => e.stopPropagation());
                titleNameInput.addEventListener('input', (e) => {
                    m.name = e.target.value;
                    this.ui.synth.updateModule(`${this.ui.currentPageId}/${mId}`, m, this.ui.getPatchState(mId));
                    this.ui.renderCell(m.row * this.ui.COLS + m.col);
                });
                titleNameInput.addEventListener('blur', (e) => {
                    if (!m.name || !m.name.trim()) {
                        m.name = 'PAD';
                        e.target.value = 'PAD';
                        this.ui.synth.updateModule(`${this.ui.currentPageId}/${mId}`, m, this.ui.getPatchState(mId));
                        this.ui.renderCell(m.row * this.ui.COLS + m.col);
                    }
                });
            }
        }

        // Bring to front on pointerdown anywhere on this dialog, and stop propagation to prevent background grid interaction/scroll
        dialogEl.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            this.bringToFront(mId);
        });

        // Prevent wheel scrolling on dialog from propagating to background workspace
        dialogEl.addEventListener('wheel', (e) => {
            e.stopPropagation();
        }, { passive: false });

        // Lock button toggle
        const lockBtn = dialogEl.querySelector('.dock-lock-btn');
        lockBtn?.addEventListener('pointerdown', (e) => e.stopPropagation());
        lockBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDockLock(mId);
        });

        // Header draggable
        const headerEl = dialogEl.querySelector('.dock-dialog-header');
        this.makeDialogDraggable(headerEl, dialogEl);

        // Position dialog
        dialogEl.style.left = '8px';
        dialogEl.style.right = '8px';
        dialogEl.style.width = 'calc(100% - 16px)';
        dialogEl.style.maxWidth = 'none';
        dialogEl.style.margin = '0';
        dialogEl.style.bottom = 'auto';

        requestAnimationFrame(() => {
            if (!frame) return;
            const fR = frame.getBoundingClientRect();
            const cR = dialogEl.getBoundingClientRect();
            dialogEl.style.bottom = 'auto';

            const otherDocks = Array.from(this.openDocks.values()).filter(d => d.element !== dialogEl);
            if (otherDocks.length === 0) {
                dialogEl.style.top = `${Math.max(6, fR.height - cR.height - 84)}px`;
            } else {
                const lastOther = otherDocks[otherDocks.length - 1];
                const lastTop = parseFloat(lastOther.element.style.top) || lastOther.element.offsetTop;
                const targetTop = lastTop - cR.height - 8;
                if (targetTop >= 6) {
                    dialogEl.style.top = `${targetTop}px`;
                } else {
                    const cascadeTop = Math.max(6, Math.min(fR.height - cR.height - 84, lastTop + 28));
                    dialogEl.style.top = `${cascadeTop}px`;
                }
            }
        });

        this.bringToFront(mId);
        this.updateBackdrop();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    makeDialogDraggable(headerEl, dialogEl, { minMargin = 4, canMoveX = () => false } = {}) {
        const frame = document.getElementById('phone-frame');
        if (!headerEl || !dialogEl || !frame) return;
        let drag = false, dX = 0, dY = 0, initL = 0, initT = 0;
        headerEl.addEventListener('pointerdown', (e) => {
            if (e.target.closest('#dock-lock-btn') || e.target.closest('.dock-lock-btn')) return;
            e.preventDefault();
            drag = true;
            headerEl.setPointerCapture(e.pointerId);
            dX = e.clientX;
            dY = e.clientY;
            dialogEl.style.bottom = 'auto';
            initL = parseFloat(dialogEl.style.left) || dialogEl.offsetLeft;
            initT = parseFloat(dialogEl.style.top) || dialogEl.offsetTop;
        });
        headerEl.addEventListener('pointermove', (e) => {
            if (!drag) return;
            const fR = frame.getBoundingClientRect(), cR = dialogEl.getBoundingClientRect();
            if (canMoveX()) {
                dialogEl.style.left = `${Math.max(minMargin, Math.min(fR.width - cR.width - minMargin, initL + e.clientX - dX))}px`;
            }
            dialogEl.style.top = `${Math.max(minMargin, Math.min(fR.height - cR.height - minMargin, initT + e.clientY - dY))}px`;
            dialogEl.style.bottom = 'auto';
        });
        const stop = (e) => {
            if (drag) {
                drag = false;
                try { headerEl.releasePointerCapture(e.pointerId); } catch (_) {}
            }
        };
        headerEl.addEventListener('pointerup', stop);
        headerEl.addEventListener('pointercancel', stop);
    }

    bringToFront(mId) {
        const info = this.openDocks.get(mId);
        if (!info) return;
        this.highestZIndex++;
        info.zIndex = this.highestZIndex;
        info.element.style.zIndex = this.highestZIndex;

        // Visual distinction for the frontmost dialog
        this.openDocks.forEach((d, id) => {
            if (id === mId) {
                d.element.classList.remove('border-slate-700/80', 'shadow-xl');
                d.element.classList.add('border-cyan-400', 'shadow-2xl', 'ring-1', 'ring-cyan-500/40');
            } else {
                d.element.classList.remove('border-cyan-400', 'shadow-2xl', 'ring-1', 'ring-cyan-500/40');
                d.element.classList.add('border-slate-700/80', 'shadow-xl');
            }
        });
    }

    closeDockModal(mId = null) {
        if (mId) {
            const info = this.openDocks.get(mId);
            if (info) {
                info.element.remove();
                this.openDocks.delete(mId);
            }
        } else {
            this.openDocks.forEach(info => info.element.remove());
            this.openDocks.clear();
        }
        if (this.openDocks.size === 0) {
            document.getElementById('dock-modal')?.classList.add('hidden');
        } else {
            const topId = this.activeDockModuleId;
            if (topId) this.bringToFront(topId);
        }
        this.updateBackdrop();
    }

    closeUnlockedDocks() {
        const unlocked = [];
        this.openDocks.forEach((info, id) => {
            if (!info.isLocked) unlocked.push(id);
        });
        unlocked.forEach(id => this.closeDockModal(id));
    }

    toggleDockLock(mId) {
        const info = this.openDocks.get(mId);
        if (!info) return;
        info.isLocked = !info.isLocked;
        this.updateDockLockUI(mId);
        this.updateBackdrop();
    }

    setDockLock(lock, mId = null) {
        const targetId = mId || this.activeDockModuleId;
        if (targetId && this.openDocks.has(targetId)) {
            this.openDocks.get(targetId).isLocked = lock;
            this.updateDockLockUI(targetId);
        }
        this.updateBackdrop();
    }

    updateDockLockUI(mId) {
        const info = this.openDocks.get(mId);
        if (!info) return;
        const btn = info.element.querySelector('.dock-lock-btn');
        if (btn) {
            btn.className = `dock-lock-btn h-5 px-1.5 rounded text-[8.5px] font-bold flex items-center gap-1 border transition-colors ${info.isLocked ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm shadow-cyan-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}`;
            btn.title = info.isLocked ? '固定中（クリックでロック解除）' : 'ロック/ピン留め';
        }
    }

    updateBackdrop() {
        const backdrop = document.getElementById('dock-backdrop');
        if (!backdrop) return;
        const hasUnlocked = Array.from(this.openDocks.values()).some(d => !d.isLocked);
        backdrop.style.display = hasUnlocked ? 'block' : 'none';
    }

    reRenderDockModal(mId = null) {
        const targetIds = mId ? [mId] : Array.from(this.openDocks.keys());
        targetIds.forEach(id => {
            const info = this.openDocks.get(id);
            const m = this.ui.modules[id];
            if (!info || !m) return;
            const reg = MODULE_REGISTRY[m.type];
            const bodyEl = info.element.querySelector('.dock-dialog-body');
            if (!reg || !bodyEl) return;

            bodyEl.className = "dock-dialog-body text-xs mt-1";
            this.modalManager.renderAndBindModuleModal(id, m, reg, bodyEl, true);

            const headerInput = info.element.querySelector('.dock-title-name-input');
            if (headerInput && headerInput !== document.activeElement) {
                headerInput.value = m.name || 'PAD';
            }
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}
