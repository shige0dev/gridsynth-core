// src/ui/managers/interaction-manager.js
import { safeClone, parseConn, generateModuleId, HIGHLIGHT_CLASSES, isSubModule } from '../../core/utils.js?v=297';
import { MODULE_REGISTRY } from '../../modules/registry.js?v=297';
import { RowManager } from './row-manager.js?v=396';

export class InteractionManager {
    constructor(ui) {
        this.ui = ui;
        this.selectedModuleIds = [];
        this.isDragging = false;
        this.dropTargetIndex = null;
        this.dragMode = 'move';
        this.dragGroupOffsets = [];
        this.dragGroupValid = false;
        this.lastHighlightedCells = [];

        this._lastTap = 0;
        this._lastTapId = null;
        this._lastEmptyTap = 0;
        this._lastEmptyIdx = null;
        this._sX = 0;
        this._sY = 0;
        this._pTimer = null;
        this._lpTimer = null;
        this._copyTimer = null;
        this._dragCandidate = null;
        this.portLongPressed = false;
        this.moduleLongPressed = false;
        this.rowLongPressed = false;
        this._wasModuleDragging = false;

        this._rowLpTimer = null;
        this._stage2X = undefined;
        this._stage2Y = undefined;
        this._lastKnownClientX = 0;
        this._lastKnownClientY = 0;
        this._justLongPressedTimestamp = 0;

        this._isScrollDragging = false;
        this._wasScrollDragging = false;
        this._scrollStartY = 0;
        this._scrollStartTop = 0;
        this._lastScrollY = 0;
        this._lastScrollTime = 0;
        this._scrollVelocity = 0;

        // Row Movement & Handle states
        this.rowManager = new RowManager(this.ui, this);
    }

    cancelPendingPresses() {
        if (this._pTimer) {
            clearTimeout(this._pTimer);
            this._pTimer = null;
        }
        if (this._lpTimer) {
            clearTimeout(this._lpTimer);
            this._lpTimer = null;
        }
        if (this._rowLpTimer) {
            clearTimeout(this._rowLpTimer);
            this._rowLpTimer = null;
        }
        if (this._copyTimer) {
            clearTimeout(this._copyTimer);
            this._copyTimer = null;
        }
        this._dragCandidate = null;
        this._stage2X = undefined;
        this._stage2Y = undefined;
    }

    updateSelectionClasses() {
        this.ui.gridBoard?.classList.toggle('has-selected-module', this.selectedModuleIds.length > 0);
        for (let i = 0; i < (this.ui.TOTAL_SLOTS || 40); i++) {
            const cell = document.getElementById(`cell-${i}`);
            if (!cell) continue;
            const mId = this.ui.gridMap[i];
            if (mId) {
                cell.classList.toggle('selected-module', this.selectedModuleIds.includes(mId));
            }
        }
        this.ui.updatePortHighlight();
    }

    clearHighlight() {
        this.lastHighlightedCells.forEach(c => c.classList.remove('drop-highlight-valid', 'drop-highlight-invalid', 'drop-highlight-copy-valid'));
        this.lastHighlightedCells = [];
        this.dropTargetIndex = null;
    }

    resetAllInteractions({ keepSelection = false } = {}) {
        this.clearHighlight();
        if (this._pTimer) { clearTimeout(this._pTimer); this._pTimer = null; }
        if (this._lpTimer) { clearTimeout(this._lpTimer); this._lpTimer = null; }
        if (this._rowLpTimer) { clearTimeout(this._rowLpTimer); this._rowLpTimer = null; }
        if (this._copyTimer) { clearTimeout(this._copyTimer); this._copyTimer = null; }

        this.portLongPressed = false;
        this.moduleLongPressed = false;
        this.rowLongPressed = false;
        this.isDragging = false;
        this._isScrollDragging = false;
        this._scrollVelocity = 0;
        this._dragCandidate = null;
        this._stage2X = undefined;
        this._stage2Y = undefined;
        this.dropTargetIndex = null;
        this.dragGroupOffsets = [];
        if (!keepSelection) {
            this.selectedModuleIds = [];
            this.updateSelectionClasses();
            this.rowManager?.clearRowSelection?.();
        }

        document.body.classList.remove('is-module-dragging', 'is-row-dragging');
        const container = document.getElementById('canvas-container');
        if (container) {
            container.style.overflowY = 'auto';
        }
        this._justLongPressedTimestamp = 0;
    }

    updateDropHighlight() {
        this.lastHighlightedCells.forEach(c => c.classList.remove('drop-highlight-valid', 'drop-highlight-invalid', 'drop-highlight-copy-valid'));
        this.lastHighlightedCells = [];
        if (this.dropTargetIndex === null) return;
        const tR = Math.floor(this.dropTargetIndex / this.ui.COLS), tC = this.dropTargetIndex % this.ui.COLS;
        this.dragGroupValid = true;

        for (let off of this.dragGroupOffsets) {
            const r = tR + off.dRow, c = tC + off.dCol;
            if (r < 0 || r >= this.ui.ROWS || c < 0 || c >= this.ui.COLS) {
                this.dragGroupValid = false;
                break;
            }
            const occ = this.ui.gridMap[r * this.ui.COLS + c];
            if (this.dragMode === 'copy' && occ) {
                this.dragGroupValid = false;
                break;
            }
            if (this.dragMode === 'move' && occ && !this.selectedModuleIds.includes(occ)) {
                this.dragGroupValid = false;
                break;
            }
            const cell = document.getElementById(`cell-${r * this.ui.COLS + c}`);
            if (cell) this.lastHighlightedCells.push(cell);
        }

        const cls = !this.dragGroupValid ? HIGHLIGHT_CLASSES.invalid : HIGHLIGHT_CLASSES[this.dragMode];
        this.lastHighlightedCells.forEach(cell => cell.classList.add(cls));
    }

    _updateDropTargetAt(clientX, clientY) {
        if (!this.isDragging) return;
        let targetCell = document.elementFromPoint(clientX, clientY)?.closest('.grid-cell');
        if (!targetCell && this.ui.gridBoard) {
            // Check small offsets in case pointer is over a grid gap
            const offsets = [[0, 6], [0, -6], [6, 0], [-6, 0]];
            for (const [ox, oy] of offsets) {
                const el = document.elementFromPoint(clientX + ox, clientY + oy)?.closest('.grid-cell');
                if (el) {
                    targetCell = el;
                    break;
                }
            }
        }
        const nIdx = targetCell ? parseInt(targetCell.dataset.index) : null;
        if (this.dropTargetIndex !== nIdx) {
            this.dropTargetIndex = nIdx;
            if (this.dragMode !== 'move') this.dragMode = 'move';
            if (this._copyTimer) {
                clearTimeout(this._copyTimer);
                this._copyTimer = null;
            }
            if (nIdx !== null) {
                this._copyTimer = setTimeout(() => {
                    this._copyTimer = null;
                    if (this.isDragging) {
                        this.dragMode = 'copy';
                        this.updateDropHighlight();
                        if (this.dragGroupValid) {
                            if (navigator.vibrate) {
                                try { navigator.vibrate(25); } catch (_) {}
                            }
                            this.ui.showToast('複製（コピー）モード', 900);
                        }
                    }
                }, 1200);
            }
            this.updateDropHighlight();
        }
    }

    _startRowLongPress(targetRow, clientY, delay = 600) {
        if (this._rowLpTimer) {
            clearTimeout(this._rowLpTimer);
            this._rowLpTimer = null;
        }
        if (targetRow === null || targetRow === undefined || targetRow < 0 || targetRow >= this.ui.ROWS) return;

        this._rowLpTimer = setTimeout(() => {
            this._rowLpTimer = null;
            if (this.isDragging) return;

            // When transitioning to row selection at 600ms, cancel individual module selection
            this.selectedModuleIds = [];
            this.updateSelectionClasses();
            this.clearHighlight();
            this._dragCandidate = null;
            this.moduleLongPressed = false;

            this.rowLongPressed = true;
            this._justLongPressedTimestamp = Date.now();
            this.rowManager?.startRowDragFromModule(targetRow, clientY);
        }, delay);
    }

    bindGridEvents() {
        if (!this.ui.gridBoard) return;

        let currentHoverPort = null;
        let hoverPortTimer = null;

        this.ui.gridBoard.addEventListener('pointerover', (e) => {
            const port = e.target.closest('.port');
            if (!port) return;
            const mId = port.dataset.moduleId, p = port.dataset.port;
            if (!mId || !p) return;
            const portKey = `${mId}:${p}`;
            if (currentHoverPort === portKey) return;
            currentHoverPort = portKey;

            if (hoverPortTimer) {
                clearTimeout(hoverPortTimer);
                hoverPortTimer = null;
            }

            const m = this.ui.modules[mId];
            if (m) {
                hoverPortTimer = setTimeout(() => {
                    const info = this.ui.getPortDisplayInfo ? this.ui.getPortDisplayInfo(mId, p) : null;
                    const toastLabel = (info && info.hasAlias) ? info.label : p;
                    this.ui.showToast(`[${mId}:${toastLabel}]`, 1500);
                }, 50);
            }
        });

        this.ui.gridBoard.addEventListener('pointerout', (e) => {
            const port = e.target.closest('.port');
            if (port) {
                if (e.relatedTarget && e.relatedTarget.closest('.port') === port) {
                    return;
                }
                currentHoverPort = null;
                if (hoverPortTimer) {
                    clearTimeout(hoverPortTimer);
                    hoverPortTimer = null;
                }
            }
        });

        this.ui.gridBoard.addEventListener('contextmenu', (e) => {
            if (!this.ui.isPerformanceMode) {
                e.preventDefault();
            }
        });

        this.ui.gridBoard.addEventListener('click', async (e) => {
            if (this._wasScrollDragging) {
                this._wasScrollDragging = false;
                return;
            }
            if (this.ui.isPerformanceMode) {
                return;
            }
            if (this.rowManager?.selectedRow !== null && this.rowManager?.selectedRow !== undefined) {
                if (Date.now() - this._justLongPressedTimestamp < 500) {
                    return;
                }
                this.rowManager.clearRowSelection();
                return;
            }
            const port = e.target.closest('.port');
            if (port) {
                if (this.portLongPressed) {
                    this.portLongPressed = false;
                    return;
                }
                if (this.selectedModuleIds.length > 0) {
                    this.ui.selectedTargetForConnection = null;
                    this.ui.updatePortHighlight();
                    return;
                }
                let mId = port.dataset.moduleId;
                let pName = port.dataset.port;
                if (port.dataset.portId) {
                    const colonIdx = port.dataset.portId.indexOf(':');
                    if (colonIdx > 0) {
                        mId = port.dataset.portId.slice(0, colonIdx);
                        pName = port.dataset.portId.slice(colonIdx + 1);
                    }
                }
                return this.ui.handlePortTap(mId, pName);
            }
            if (this.ui.selectedTargetForConnection) {
                this.ui.selectedTargetForConnection = null;
                this.ui.updatePortHighlight();
            }
            const body = e.target.closest('.module-body');
            if (body) {
                const mId = body.dataset.moduleId;
                if (this._wasModuleDragging) {
                    this._wasModuleDragging = false;
                    return;
                }
                if (this._wasScrollDragging) {
                    return;
                }
                if (Date.now() - this._justLongPressedTimestamp < 500) {
                    return;
                }
                if (this.moduleLongPressed) {
                    this.moduleLongPressed = false;
                    return;
                }
                if (this.rowLongPressed) {
                    this.rowLongPressed = false;
                    return;
                }
                if (this.selectedModuleIds.length > 0) {
                    if (this.selectedModuleIds.includes(mId)) {
                        const hasLocked = this.selectedModuleIds.some(id => this.ui.modules[id]?.type === 'SUB_IO');
                        if (hasLocked) {
                            this.selectedModuleIds = [];
                            this.updateSelectionClasses();
                            return this.ui.showToast('SUB_IO モジュールは削除できません（保護中）');
                        }
                        this.ui.saveHistory();
                        const targets = [...this.selectedModuleIds];
                        this.selectedModuleIds = [];
                        this.updateSelectionClasses();
                        this.ui._destroyCount = 0;
                        for (const id of targets) {
                            await this.ui.destroyModule(this.ui.currentPageId, id);
                        }
                        this.ui.updateAllCells();
                        this.ui.renderCables();
                        this.ui.showToast(`モジュールを破棄しました (${this.ui._destroyCount}個)`);
                        return;
                    }
                    this.selectedModuleIds = [];
                    this.updateSelectionClasses();
                    return;
                }
                if (this.ui.modules[mId]?.type === 'SUB_IO') {
                    return;
                }
                const now = Date.now();
                const isDoubleTap = (now - this._lastTap < 350 && this._lastTapId === mId);
                this._lastTap = now;
                this._lastTapId = mId;
                if (isDoubleTap) {
                    if (this.ui.modules[mId]?.type === 'SUB') {
                        this.ui.switchPage(this.ui.modules[mId].targetPage || 1);
                        return;
                    }
                    this.ui.openSettingsModal(mId);
                    return;
                }
                if (this.ui.modules[mId]?.type === 'THROUGH') {
                    this.ui.saveHistory();
                    this.ui.modules[mId].state = !(this.ui.modules[mId].state !== false);
                    this.ui.synth.updateModule(`${this.ui.currentPageId}/${mId}`, this.ui.modules[mId], this.ui.getPatchState(mId));
                    this.ui.renderCell(this.ui.modules[mId].row * this.ui.COLS + this.ui.modules[mId].col);
                    return;
                }
                return;
            }
            const empty = e.target.closest('.empty-cell');
            if (empty) {
                if (this._wasScrollDragging) {
                    return;
                }
                if (Date.now() - this._justLongPressedTimestamp < 500) {
                    return;
                }
                if (this.rowLongPressed) {
                    this.rowLongPressed = false;
                    return;
                }
                if (this.selectedModuleIds.length > 0) {
                    this.selectedModuleIds = [];
                    this.updateSelectionClasses();
                }
                const idx = parseInt(empty.dataset.index), now = Date.now();
                if (now - this._lastEmptyTap < 350 && this._lastEmptyIdx === idx) this.ui.openAddModal(idx);
                this._lastEmptyTap = now;
                this._lastEmptyIdx = idx;
            }
        });

        this.ui.gridBoard.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.dock-dialog, .modal-content, #shared-modal, #dock-modal, #preset-manager-modal, #about-modal')) {
                return;
            }
            this._sX = e.clientX;
            this._sY = e.clientY;
            this._lastKnownClientX = e.clientX;
            this._lastKnownClientY = e.clientY;
            this._isScrollDragging = false;
            this._scrollVelocity = 0;
            this.moduleLongPressed = false;
            this.rowLongPressed = false;

            const rowEl = e.target.closest('.grid-row');
            const touchedRow = rowEl ? parseInt(rowEl.dataset.row, 10) : null;
            if (!this.ui.isPerformanceMode && this.rowManager?.selectedRow !== null && this.rowManager?.selectedRow !== undefined) {
                if (touchedRow === this.rowManager.selectedRow) {
                    this.rowLongPressed = true;
                    this.rowManager.resumeSelectedRowDrag();
                    return;
                } else {
                    this.rowManager.clearRowSelection();
                }
            }

            const container = document.getElementById('canvas-container');
            if (!this.ui.isPerformanceMode && container) {
                const isControl = e.target.closest('.port, input, button, select, textarea, .pad-grid-container, .pad-grid-canvas');
                if (!isControl) {
                    this._scrollStartY = e.clientY;
                    this._scrollStartTop = container.scrollTop;
                    this._lastScrollY = e.clientY;
                    this._lastScrollTime = Date.now();
                }
            }

            const port = e.target.closest('.port');
            if (port) {
                if (this.ui.isPerformanceMode) return;
                const mId = port.dataset.moduleId, p = port.dataset.port;
                this._pTimer = setTimeout(() => {
                    this._pTimer = null;
                    const hasConn = this.ui.connections.some(c => (c.from.moduleId === mId && c.from.port === p) || (c.to.moduleId === mId && c.to.port === p));
                    if (hasConn) {
                        this.portLongPressed = true;
                        this.ui.selectedTargetForConnection = null;
                        this.ui.saveHistory();
                        this.ui.removeConnectionsForPort(mId, p);
                        this.ui.updatePortHighlight();
                        this.ui.showToast('端子の結線を切断しました');
                    }
                }, 500);
                return;
            }

            if (this.ui.isPerformanceMode) return;
            const isControl = e.target.closest('.port, input, button, select, textarea, .pad-grid-container, .pad-grid-canvas');
            if (isControl) return;

            const body = e.target.closest('.module-body');
            if (body) {
                const mId = body.dataset.moduleId;
                this._dragCandidate = mId;
                const clientY = e.clientY;
                const mod = this.ui.modules[mId];
                const targetRow = mod?.row;

                if (!this.selectedModuleIds.includes(mId)) {
                    // Unselected module:
                    // Stage 1: 300ms hold -> selects module.
                    this._lpTimer = setTimeout(() => {
                        this._lpTimer = null;
                        this.moduleLongPressed = true;
                        this._justLongPressedTimestamp = Date.now();
                        if (!this.selectedModuleIds.includes(mId)) {
                            this.selectedModuleIds = [...this.selectedModuleIds, mId];
                        }
                        if (this.ui.selectedTargetForConnection) {
                            this.ui.selectedTargetForConnection = null;
                        }
                        this.updateSelectionClasses();
                        if (navigator.vibrate) {
                            try { navigator.vibrate(30); } catch (_) {}
                        }

                        // Stage 2 anchor: record current position so Stage 2 has its own jitter margin
                        this._stage2X = this._lastKnownClientX ?? e.clientX;
                        this._stage2Y = this._lastKnownClientY ?? e.clientY;

                        if (this.selectedModuleIds.length === 1) {
                            this.ui.showToast('モジュールを選択（さらに長押しで行移動）', 1200);
                            // Stage 2: continuing to hold for another 400ms (total 700ms from touch down) -> row reorder mode!
                            if (targetRow !== undefined) {
                                this._startRowLongPress(targetRow, this._stage2Y, 400);
                            }
                        } else {
                            this.ui.showToast(`${this.selectedModuleIds.length}個選択中（ドラッグで一括移動・複製）`, 1000);
                        }
                    }, 300);
                } else {
                    // Already selected module:
                    // If single module selected & held 700ms without moving -> triggers row reorder mode!
                    // If moved > 8px, pointermove immediately enters module/group dragging.
                    this._stage2X = e.clientX;
                    this._stage2Y = e.clientY;
                    if (this.selectedModuleIds.length === 1 && targetRow !== undefined) {
                        this._startRowLongPress(targetRow, clientY, 700);
                    }
                }
                return;
            }

            if (rowEl) {
                const targetRow = parseInt(rowEl.dataset.row, 10);
                if (!isNaN(targetRow)) {
                    // Direct row selection on empty grid space: 700ms from touch down
                    this._startRowLongPress(targetRow, e.clientY, 700);
                }
                return;
            }
        });

        window.addEventListener('pointermove', (e) => {
            if (this.rowManager?.draggingRow !== null && this.rowManager?.draggingRow !== undefined) {
                if (e.cancelable) e.preventDefault();
                this.rowManager.updateBoundaryFromPointer(e.clientX, e.clientY);
                return;
            }

            this._lastKnownClientX = e.clientX;
            this._lastKnownClientY = e.clientY;

            const dx = e.clientX - this._sX;
            const dy = e.clientY - this._sY;
            const distSq = dx * dx + dy * dy;

            if (this._pTimer && distSq > 144) {
                clearTimeout(this._pTimer);
                this._pTimer = null;
            }
            if (this._lpTimer && distSq > 144) {
                clearTimeout(this._lpTimer);
                this._lpTimer = null;
            }
            if (this._rowLpTimer) {
                const s2dx = this._stage2X !== undefined ? e.clientX - this._stage2X : dx;
                const s2dy = this._stage2Y !== undefined ? e.clientY - this._stage2Y : dy;
                const s2distSq = s2dx * s2dx + s2dy * s2dy;
                if (s2distSq > 256) {
                    clearTimeout(this._rowLpTimer);
                    this._rowLpTimer = null;
                }
            }

            const isCandidateSelected = this._dragCandidate && this.selectedModuleIds.includes(this._dragCandidate);
            const isRowBusy = this.rowLongPressed || (this.rowManager?.draggingRow !== null && this.rowManager?.draggingRow !== undefined) || (this.rowManager?.selectedRow !== null && this.rowManager?.selectedRow !== undefined);

            // Drag-to-scroll support (Touch & Mouse swipe before selection)
            // On mouse, require primary button held (e.buttons & 1); on touch, pointermove only fires when touching.
            const isButtonHeld = e.pointerType === 'mouse' ? ((e.buttons & 1) !== 0) : (e.buttons > 0 || e.pressure > 0);
            const container = document.getElementById('canvas-container');
            if (isButtonHeld && !this.ui.isPerformanceMode && !this.isDragging && !this.moduleLongPressed && !isCandidateSelected && !isRowBusy && container) {
                if (e.target.closest('.dock-dialog, .modal-content, #shared-modal, #dock-modal, #preset-manager-modal, #about-modal, .pad-grid-container, .pad-grid-canvas')) {
                    this._isScrollDragging = false;
                    return;
                }
                if (distSq > 144 || this._isScrollDragging) {
                    this._isScrollDragging = true;
                    this._wasScrollDragging = true;
                    const deltaY = e.clientY - this._scrollStartY;
                    const now = Date.now();
                    const dt = now - (this._lastScrollTime || now);
                    if (dt > 10) {
                        this._scrollVelocity = (e.clientY - (this._lastScrollY || e.clientY)) / dt;
                        this._lastScrollTime = now;
                        this._lastScrollY = e.clientY;
                    }
                    container.scrollTop = this._scrollStartTop - deltaY;
                    return;
                }
            } else if (!isButtonHeld) {
                this._isScrollDragging = false;
            }
            if (!this.isDragging && this._dragCandidate) {
                const s2dx = this._stage2X !== undefined ? e.clientX - this._stage2X : dx;
                const s2dy = this._stage2Y !== undefined ? e.clientY - this._stage2Y : dy;
                const moveDistSq = Math.max(distSq, s2dx * s2dx + s2dy * s2dy);

                if (moveDistSq > 64 && this.selectedModuleIds.includes(this._dragCandidate)) {
                    if (this._rowLpTimer) {
                        clearTimeout(this._rowLpTimer);
                        this._rowLpTimer = null;
                    }
                    if (this.ui.selectedTargetForConnection) {
                        this.ui.selectedTargetForConnection = null;
                    }
                    this.isDragging = true;
                    this._wasModuleDragging = true;
                    document.body.classList.add('is-module-dragging');
                    this.dragMode = 'move';
                    if (container) container.style.overflowY = 'hidden';

                    const baseM = this.ui.modules[this._dragCandidate];
                    this.dragGroupOffsets = this.selectedModuleIds.map(id => {
                        const mod = this.ui.modules[id];
                        return { id, dRow: mod && baseM ? mod.row - baseM.row : 0, dCol: mod && baseM ? mod.col - baseM.col : 0 };
                    });

                    this.dropTargetIndex = null;
                    this._updateDropTargetAt(e.clientX, e.clientY);
                }
            }
            if (this.isDragging) {
                if (e.cancelable) e.preventDefault();
                this._updateDropTargetAt(e.clientX, e.clientY);
            }
        });

        const stopDrag = (e) => {
            if (this.rowManager?.draggingRow !== null && this.rowManager?.draggingRow !== undefined) {
                if (e && typeof e.clientY === 'number') {
                    this.rowManager.updateBoundaryFromPointer(e.clientX, e.clientY);
                }
                this.rowManager.finishRowDrag();
            }
            this.rowLongPressed = false;
            document.body.classList.remove('is-module-dragging', 'is-row-dragging');
            const container = document.getElementById('canvas-container');
            if (container) container.style.overflowY = 'auto';
            if (this._pTimer) {
                clearTimeout(this._pTimer);
                this._pTimer = null;
            }
            if (this._lpTimer) {
                clearTimeout(this._lpTimer);
                this._lpTimer = null;
            }
            if (this._rowLpTimer) {
                clearTimeout(this._rowLpTimer);
                this._rowLpTimer = null;
            }
            if (this._copyTimer) {
                clearTimeout(this._copyTimer);
                this._copyTimer = null;
            }
            if (this._isScrollDragging) {
                const container = document.getElementById('canvas-container');
                if (container && this._scrollVelocity && Math.abs(this._scrollVelocity) > 0.25) {
                    let vel = this._scrollVelocity * 14;
                    const inertiaStep = () => {
                        if (Math.abs(vel) < 0.5) return;
                        container.scrollTop -= vel;
                        vel *= 0.90;
                        requestAnimationFrame(inertiaStep);
                    };
                    requestAnimationFrame(inertiaStep);
                }
                this._isScrollDragging = false;
                setTimeout(() => { this._wasScrollDragging = false; }, 120);
            }
            this._dragCandidate = null;
            this._stage2X = undefined;
            this._stage2Y = undefined;
            if (this.portLongPressed) {
                setTimeout(() => { this.portLongPressed = false; }, 150);
            }
            if (this.moduleLongPressed) {
                this._justLongPressedTimestamp = Date.now();
                setTimeout(() => { this.moduleLongPressed = false; }, 150);
            }
            if (this.rowLongPressed) {
                this._justLongPressedTimestamp = Date.now();
                setTimeout(() => { this.rowLongPressed = false; }, 150);
            }
            if (this.isDragging) {
                this.isDragging = false;
                this._wasModuleDragging = true;
                setTimeout(() => { this._wasModuleDragging = false; }, 250);
                const container = document.getElementById('canvas-container');
                if (container) container.style.overflowY = 'auto';
                this.lastHighlightedCells.forEach(c => c.classList.remove('drop-highlight-valid', 'drop-highlight-invalid', 'drop-highlight-copy-valid'));
                this.lastHighlightedCells = [];
                if (this.dropTargetIndex !== null && this.dragGroupValid) {
                    this.ui.saveHistory();
                    const tR = Math.floor(this.dropTargetIndex / this.ui.COLS), tC = this.dropTargetIndex % this.ui.COLS;
                    if (this.dragMode === 'copy') {
                        const idMap = {};
                        let subCopied = false;
                        let lastCopiedSubName = '';

                        this.dragGroupOffsets.forEach(off => {
                            const src = this.ui.modules[off.id];
                            const newId = generateModuleId(src.type, this.ui.modules);
                            idMap[off.id] = newId;
                            const copy = safeClone(src);
                            copy.id = newId;
                            copy.row = tR + off.dRow;
                            copy.col = tC + off.dCol;
                            MODULE_REGISTRY[copy.type]?.onClone?.(copy, src);

                            if (copy.type === 'SUB') {
                                subCopied = true;
                                const srcPageId = String(src.targetPage ?? 1);
                                const srcPageData = this.ui.pagesData[srcPageId];
                                const srcName = srcPageData?.name || `SUBPATCH ${srcPageId}`;

                                const res = this.ui.pageManager.createSubpatchInstance({
                                    pageData: srcPageData,
                                    name: srcName,
                                    subType: src.subType,
                                    manifest: src.manifest,
                                    col: tC + off.dCol,
                                    row: tR + off.dRow,
                                    moduleId: newId,
                                    skipBridgeLink: true
                                });
                                copy.targetPage = res.pageNum;
                                if (src.subType) copy.subType = src.subType;
                                if (src.manifest) copy.manifest = safeClone(src.manifest);
                                lastCopiedSubName = res.name;
                            } else {
                                this.ui.modules[newId] = copy;
                                this.ui.synth.addModule(`${this.ui.currentPageId}/${newId}`, copy.type, copy, this.ui.getPatchState(newId));
                            }
                        });

                        this.ui.connections.forEach(c => {
                            if (idMap[c.from.moduleId] && idMap[c.to.moduleId]) {
                                const nC = { from: { moduleId: idMap[c.from.moduleId], port: c.from.port }, to: { moduleId: idMap[c.to.moduleId], port: c.to.port } };
                                this.ui.connections.push(nC);
                                this.ui.synth.connect(`${this.ui.currentPageId}/${nC.from.moduleId}`, nC.from.port, `${this.ui.currentPageId}/${nC.to.moduleId}`, nC.to.port);
                            }
                        });

                        if (subCopied) {
                            this.ui.synth.linkSubBridges();
                            this.ui.showToast(`サブパッチ「${lastCopiedSubName}」を新規複製しました`);
                        } else {
                            this.ui.showToast(`${this.dragGroupOffsets.length}個コピーしました`);
                        }
                    } else {
                        this.dragGroupOffsets.forEach(off => {
                            const m = this.ui.modules[off.id];
                            m.row = tR + off.dRow;
                            m.col = tC + off.dCol;
                        });
                        this.ui.showToast(`${this.dragGroupOffsets.length}個移動しました`);
                    }
                    this.ui.syncGridMap();
                    this.ui.persistCurrentPage();
                    this.selectedModuleIds = [];
                    this.ui.updateAllCells();
                    this.ui.renderCables();
                } else {
                    // Dropped outside grid or on invalid slot: always return cleanly to normal mode
                    this.selectedModuleIds = [];
                    this.updateSelectionClasses();
                }
                this.dropTargetIndex = null;
                this.dragGroupOffsets = [];
            }
        };

        window.addEventListener('pointerup', stopDrag);
        window.addEventListener('pointercancel', (e) => {
            stopDrag(e);
            this.portLongPressed = false;
            this.moduleLongPressed = false;
            this.rowLongPressed = false;
        });
        window.addEventListener('blur', () => {
            this.resetAllInteractions({ keepSelection: false });
        });
    }
}
