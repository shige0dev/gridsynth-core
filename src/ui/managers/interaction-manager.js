// src/ui/managers/interaction-manager.js
import { safeClone, parseConn, generateModuleId, HIGHLIGHT_CLASSES, isSubModule } from '../../core/utils.js?v=268';
import { MODULE_REGISTRY } from '../../modules/registry.js?v=268';

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

        // Row Handle Mode & Row Movement states
        this.isRowHandleMode = false;
        this.draggingRow = null;
        this.rowInsertTargetIndex = null;
        this.rowHandleOverlayEl = null;
        this.rowTracks = [];
        this.rowTargetSlotIndicatorEl = null;
        this._cableRafId = null;

        // Ready for future modes: 'edit', 'performance', 'visualizer'
        this.mode = 'edit';
    }

    updateSelectionClasses() {
        this.ui.gridBoard?.classList.toggle('has-selected-module', this.selectedModuleIds.length > 0);
        for (let i = 0; i < 40; i++) {
            const cell = document.getElementById(`cell-${i}`);
            if (!cell) continue;
            const mId = this.ui.gridMap[i];
            if (mId) {
                cell.classList.toggle('selected-module', this.selectedModuleIds.includes(mId));
            }
        }
        this.ui.updatePortHighlight();
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

    bindGridEvents() {
        if (!this.ui.gridBoard) return;

        let hoverPortTimer = null;
        this.ui.gridBoard.addEventListener('pointerover', (e) => {
            const port = e.target.closest('.port');
            if (hoverPortTimer) {
                clearTimeout(hoverPortTimer);
                hoverPortTimer = null;
            }
            if (!port) return;
            const mId = port.dataset.moduleId, p = port.dataset.port;
            if (!mId || !p) return;
            const m = this.ui.modules[mId];
            if (m && isSubModule(m.type)) {
                hoverPortTimer = setTimeout(() => {
                    const info = this.ui.getPortDisplayInfo ? this.ui.getPortDisplayInfo(mId, p) : null;
                    if (info) {
                        const toastLabel = info.hasAlias ? info.label : p;
                        this.ui.showToast(`[${mId}] ${toastLabel}`, 1200);
                    }
                }, 300);
            }
        });
        this.ui.gridBoard.addEventListener('pointerout', (e) => {
            if (e.target.closest('.port')) {
                if (hoverPortTimer) {
                    clearTimeout(hoverPortTimer);
                    hoverPortTimer = null;
                }
            }
        });

        this.ui.gridBoard.addEventListener('click', async (e) => {
            if (this.isRowHandleMode) return;
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
                if (this.moduleLongPressed) {
                    this.moduleLongPressed = false;
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
                if (this.selectedModuleIds.length > 0) {
                    this.selectedModuleIds = [];
                    this.updateSelectionClasses();
                    return;
                }
                const idx = parseInt(empty.dataset.index), now = Date.now();
                if (now - this._lastEmptyTap < 350 && this._lastEmptyIdx === idx) this.ui.openAddModal(idx);
                this._lastEmptyTap = now;
                this._lastEmptyIdx = idx;
            }
        });

        this.ui.gridBoard.addEventListener('pointerdown', (e) => {
            if (this.isRowHandleMode) return;
            this._sX = e.clientX;
            this._sY = e.clientY;
            const port = e.target.closest('.port');
            if (port) {
                const mId = port.dataset.moduleId, p = port.dataset.port;
                this._pTimer = setTimeout(() => {
                    this._pTimer = null;
                    const toRemove = this.ui.connections.filter(c => (c.from.moduleId === mId && c.from.port === p) || (c.to.moduleId === mId && c.to.port === p));
                    if (toRemove.length > 0) {
                        this.portLongPressed = true;
                        this.ui.selectedTargetForConnection = null;
                        this.ui.updatePortHighlight();
                        this.ui.saveHistory();
                        toRemove.forEach(c => {
                            this.ui.synth.disconnect(`${this.ui.currentPageId}/${c.from.moduleId}`, c.from.port, `${this.ui.currentPageId}/${c.to.moduleId}`, c.to.port);
                        });
                        this.ui.connections = this.ui.connections.filter(c => !((c.from.moduleId === mId && c.from.port === p) || (c.to.moduleId === mId && c.to.port === p)));

                        const affectedIds = new Set();
                        toRemove.forEach(c => {
                            affectedIds.add(c.from.moduleId);
                            affectedIds.add(c.to.moduleId);
                        });
                        affectedIds.forEach(id => {
                            if (this.ui.modules[id]) {
                                this.ui.synth.updateModule(`${this.ui.currentPageId}/${id}`, this.ui.modules[id], this.ui.getPatchState(id));
                            }
                        });

                        this.ui.persistCurrentPage();
                        if (this.ui.currentPageId !== 'PAGE 0' && this.ui.currentPageId !== '0') {
                            this.ui.cleanupOrphanSubConnections(this.ui.currentPageId);
                        }
                        this.ui.renderCables();
                        affectedIds.forEach(id => {
                            const mod = this.ui.modules[id];
                            if (mod) this.ui.renderCell(mod.row * this.ui.COLS + mod.col);
                        });
                        const isDockAffected = Array.from(this.ui.modalManager?.openDocks?.keys() || []).some(id => affectedIds.has(id)) || (this.ui.activeDockModuleId && affectedIds.has(this.ui.activeDockModuleId));
                        if (isDockAffected) this.ui.reRenderDockModal();
                        if (this.ui.activePopupModuleId && affectedIds.has(this.ui.activePopupModuleId)) this.ui.reRenderModal();
                        this.ui.updatePortHighlight();
                        this.ui.showToast('端子の結線を切断しました');
                    }
                }, 500);
                return;
            }
            const body = e.target.closest('.module-body');
            if (!body) return;
            const mId = body.dataset.moduleId;
            this._dragCandidate = mId;
            this._lpTimer = setTimeout(() => {
                this._lpTimer = null;
                this.moduleLongPressed = true;
                this.selectedModuleIds = this.selectedModuleIds.includes(mId) ? this.selectedModuleIds.filter(x => x !== mId) : [...this.selectedModuleIds, mId];
                if (this.ui.selectedTargetForConnection) {
                    this.ui.selectedTargetForConnection = null;
                }
                this.updateSelectionClasses();
            }, 400);
        });

        window.addEventListener('pointermove', (e) => {
            if (this._pTimer && (Math.abs(e.clientX - this._sX) > 8 || Math.abs(e.clientY - this._sY) > 8)) {
                clearTimeout(this._pTimer);
                this._pTimer = null;
            }
            if (!this.isDragging && this._dragCandidate && (Math.abs(e.clientX - this._sX) > 8 || Math.abs(e.clientY - this._sY) > 8)) {
                if (this._lpTimer) {
                    clearTimeout(this._lpTimer);
                    this._lpTimer = null;
                }
                if (!this.selectedModuleIds.includes(this._dragCandidate)) this.selectedModuleIds = [this._dragCandidate];
                if (this.ui.selectedTargetForConnection) {
                    this.ui.selectedTargetForConnection = null;
                }
                this.updateSelectionClasses();
                this.isDragging = true;
                this.dragMode = 'move';

                const baseM = this.ui.modules[this._dragCandidate];
                this.dragGroupOffsets = this.selectedModuleIds.map(id => {
                    const mod = this.ui.modules[id];
                    return { id, dRow: mod && baseM ? mod.row - baseM.row : 0, dCol: mod && baseM ? mod.col - baseM.col : 0 };
                });

                this._copyTimer = setTimeout(() => {
                    if (this.isDragging) {
                        this.dragMode = 'copy';
                        this.updateDropHighlight();
                    }
                }, 1200);
            }
            if (this.isDragging) {
                const targetCell = document.elementFromPoint(e.clientX, e.clientY)?.closest('.grid-cell');
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
                            if (this.isDragging) {
                                this.dragMode = 'copy';
                                this.updateDropHighlight();
                            }
                        }, 1200);
                    }
                    this.updateDropHighlight();
                }
            }
        });

        const stopDrag = () => {
            if (this._pTimer) {
                clearTimeout(this._pTimer);
                this._pTimer = null;
            }
            if (this._lpTimer) {
                clearTimeout(this._lpTimer);
                this._lpTimer = null;
            }
            if (this._copyTimer) {
                clearTimeout(this._copyTimer);
                this._copyTimer = null;
            }
            this._dragCandidate = null;
            if (this.portLongPressed) {
                setTimeout(() => { this.portLongPressed = false; }, 80);
            }
            if (this.moduleLongPressed) {
                setTimeout(() => { this.moduleLongPressed = false; }, 80);
            }
            if (this.isDragging) {
                this.isDragging = false;
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
                    this.selectedModuleIds = [];
                    this.ui.updateAllCells();
                    this.ui.renderCables();
                }
            }
        };

        window.addEventListener('pointerup', stopDrag);
        window.addEventListener('pointercancel', () => {
            stopDrag();
            this.portLongPressed = false;
            this.moduleLongPressed = false;
        });

        // Initialize Row Handle UI elements
        this.initRowHandleUI();
    }

    toggleRowHandleMode() {
        this.isRowHandleMode = !this.isRowHandleMode;
        const btn = document.getElementById('row-handle-mode-btn');
        if (btn) {
            if (this.isRowHandleMode) {
                btn.classList.add('bg-cyan-950/90', 'border-cyan-500/80', 'text-cyan-300', 'shadow-cyan-500/20');
                btn.classList.remove('bg-slate-900', 'border-slate-700', 'text-slate-400');
            } else {
                btn.classList.remove('bg-cyan-950/90', 'border-cyan-500/80', 'text-cyan-300', 'shadow-cyan-500/20');
                btn.classList.add('bg-slate-900', 'border-slate-700', 'text-slate-400');
            }
        }
        if (this.isRowHandleMode) {
            // Deselect any selected modules or connection targets
            if (this.selectedModuleIds.length > 0) {
                this.selectedModuleIds = [];
                this.updateSelectionClasses();
            }
            if (this.ui.selectedTargetForConnection) {
                this.ui.selectedTargetForConnection = null;
                this.ui.updatePortHighlight();
            }
        }
        this.ui.gridBoard?.classList.toggle('row-handle-mode-active', this.isRowHandleMode);
        this.updateRowHandleRail();
        this.ui.showToast(this.isRowHandleMode ? 'ROW MODE: 行ハンドル表示中（モジュール操作ロック）' : 'ROW MODE: 解除（モジュール操作アンロック）');
    }

    scheduleCableRender(animateDurationMs = 0) {
        if (this._cableRafId) return;
        const startTime = performance.now();
        const renderLoop = (now) => {
            this.ui.renderCables();
            if (animateDurationMs > 0 && (now - startTime) < animateDurationMs) {
                this._cableRafId = requestAnimationFrame(renderLoop);
            } else {
                this._cableRafId = null;
            }
        };
        this._cableRafId = requestAnimationFrame(renderLoop);
    }

    cancelCableRender() {
        if (this._cableRafId) {
            cancelAnimationFrame(this._cableRafId);
            this._cableRafId = null;
        }
    }

    initRowHandleUI() {
        const gridBoard = this.ui.gridBoard;
        if (!gridBoard) return;

        let overlay = document.getElementById('row-handle-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'row-handle-overlay';
            overlay.className = 'absolute inset-0 pointer-events-none z-40';
            overlay.style.display = 'none';
            gridBoard.appendChild(overlay);
        }
        this.rowHandleOverlayEl = overlay;

        // Build 8 row overlay tracks, each with a left and right protruding handle
        overlay.innerHTML = '';
        this.rowTracks = [];
        for (let r = 0; r < this.ui.ROWS; r++) {
            const track = document.createElement('div');
            track.id = `row-overlay-track-${r}`;
            track.className = 'row-overlay-track';
            track.dataset.row = String(r);

            const leftHandle = document.createElement('div');
            leftHandle.id = `row-handle-left-${r}`;
            leftHandle.className = 'row-handle-btn row-handle-left';
            leftHandle.dataset.row = String(r);
            leftHandle.title = `行 ${r + 1} をドラッグして上下に差し込み移動`;
            leftHandle.innerHTML = `<svg viewBox="0 0 16 16" class="w-3 h-3 pointer-events-none opacity-80" fill="currentColor"><circle cx="5.5" cy="4" r="1.3"/><circle cx="10.5" cy="4" r="1.3"/><circle cx="5.5" cy="8" r="1.3"/><circle cx="10.5" cy="8" r="1.3"/><circle cx="5.5" cy="12" r="1.3"/><circle cx="10.5" cy="12" r="1.3"/></svg>`;

            const rightHandle = document.createElement('div');
            rightHandle.id = `row-handle-right-${r}`;
            rightHandle.className = 'row-handle-btn row-handle-right';
            rightHandle.dataset.row = String(r);
            rightHandle.title = `行 ${r + 1} をドラッグして上下に差し込み移動`;
            rightHandle.innerHTML = `<svg viewBox="0 0 16 16" class="w-3 h-3 pointer-events-none opacity-80" fill="currentColor"><circle cx="5.5" cy="4" r="1.3"/><circle cx="10.5" cy="4" r="1.3"/><circle cx="5.5" cy="8" r="1.3"/><circle cx="10.5" cy="8" r="1.3"/><circle cx="5.5" cy="12" r="1.3"/><circle cx="10.5" cy="12" r="1.3"/></svg>`;

            this.bindRowHandleEvents(leftHandle, rightHandle, r);
            track.appendChild(leftHandle);
            track.appendChild(rightHandle);
            overlay.appendChild(track);
            this.rowTracks[r] = track;
        }

        // Keep overlay tracks aligned on resize
        window.addEventListener('resize', () => {
            if (this.isRowHandleMode) this.updateRowHandleRail();
        });

        // Candidate destination row highlight indicator (5 cell slots with .drop-highlight-valid)
        let slotIndicator = document.getElementById('row-target-slot-indicator');
        if (!slotIndicator) {
            slotIndicator = document.createElement('div');
            slotIndicator.id = 'row-target-slot-indicator';
            slotIndicator.className = 'absolute pointer-events-none transition-all duration-150 z-30';
            slotIndicator.style.display = 'none';
            slotIndicator.innerHTML = `
                <div class="grid grid-cols-5 gap-1.5 w-full h-full">
                    <div class="drop-highlight-valid rounded border border-white aspect-square"></div>
                    <div class="drop-highlight-valid rounded border border-white aspect-square"></div>
                    <div class="drop-highlight-valid rounded border border-white aspect-square"></div>
                    <div class="drop-highlight-valid rounded border border-white aspect-square"></div>
                    <div class="drop-highlight-valid rounded border border-white aspect-square"></div>
                </div>`;
            gridBoard.appendChild(slotIndicator);
        }
        this.rowTargetSlotIndicatorEl = slotIndicator;

        this.updateRowHandleRail();
    }

    updateRowHandleRail() {
        const overlay = this.rowHandleOverlayEl || document.getElementById('row-handle-overlay');
        if (!overlay) {
            this.initRowHandleUI();
            return;
        }

        overlay.style.display = this.isRowHandleMode ? 'block' : 'none';
        if (!this.isRowHandleMode) {
            if (this.rowTargetSlotIndicatorEl) this.rowTargetSlotIndicatorEl.style.display = 'none';
            return;
        }

        // Align each row track to the physical position of row r
        for (let r = 0; r < this.ui.ROWS; r++) {
            const track = this.rowTracks?.[r] || document.getElementById(`row-overlay-track-${r}`);
            const firstCell = document.getElementById(`cell-${r * this.ui.COLS}`);
            if (track && firstCell) {
                track.style.top = `${firstCell.offsetTop}px`;
                track.style.height = `${firstCell.offsetHeight}px`;
            }
        }
    }

    bindRowHandleEvents(leftHandle, rightHandle, r) {
        let isRowDragging = false;
        let startY = 0;
        let originalRow = r;
        let currentTargetRow = r;
        const gridBoard = this.ui.gridBoard;

        const updateDynamicRowShifts = (targetInsertIdx, currentDeltaY) => {
            const cell0 = document.getElementById('cell-0');
            const cell5 = document.getElementById(`cell-${this.ui.COLS}`);
            const rowHeightWithGap = (cell0 && cell5) ? (cell5.offsetTop - cell0.offsetTop) : (cell0 ? (cell0.offsetHeight + 6) : 56);

            // Animate dragging row elements following pointer
            for (let c = 0; c < this.ui.COLS; c++) {
                const cell = document.getElementById(`cell-${originalRow * this.ui.COLS + c}`);
                if (cell) {
                    cell.style.transform = `translateY(${currentDeltaY}px) scale(1.02)`;
                }
            }
            const dragTrack = this.rowTracks?.[originalRow] || document.getElementById(`row-overlay-track-${originalRow}`);
            if (dragTrack) {
                dragTrack.style.transform = `translateY(${currentDeltaY}px) scale(1.02)`;
            }

            // Calculate shift for every other row: does it need to slide up or down?
            for (let rowIdx = 0; rowIdx < this.ui.ROWS; rowIdx++) {
                if (rowIdx === originalRow) continue;

                let shiftY = 0;
                if (targetInsertIdx > originalRow) {
                    if (rowIdx > originalRow && rowIdx < targetInsertIdx) {
                        shiftY = -rowHeightWithGap;
                    }
                } else if (targetInsertIdx < originalRow) {
                    if (rowIdx >= targetInsertIdx && rowIdx < originalRow) {
                        shiftY = rowHeightWithGap;
                    }
                }

                // Apply transform to all 5 cells of rowIdx
                for (let c = 0; c < this.ui.COLS; c++) {
                    const otherCell = document.getElementById(`cell-${rowIdx * this.ui.COLS + c}`);
                    if (otherCell) {
                        otherCell.classList.add('row-cell-shifting');
                        otherCell.style.transform = shiftY !== 0 ? `translateY(${shiftY}px)` : '';
                    }
                }

                // Apply transform to row track overlay
                const otherTrack = this.rowTracks?.[rowIdx] || document.getElementById(`row-overlay-track-${rowIdx}`);
                if (otherTrack) {
                    otherTrack.classList.add('row-cell-shifting');
                    otherTrack.style.transform = shiftY !== 0 ? `translateY(${shiftY}px)` : '';
                }
            }

            // Highlight the candidate destination row slot in clean white (matching normal move)
            const destRow = targetInsertIdx > originalRow ? targetInsertIdx - 1 : targetInsertIdx;
            const slotIndicator = this.rowTargetSlotIndicatorEl || document.getElementById('row-target-slot-indicator');
            if (slotIndicator) {
                if (destRow >= 0 && destRow < this.ui.ROWS && destRow !== originalRow) {
                    const destFirstCell = document.getElementById(`cell-${destRow * this.ui.COLS}`);
                    const destLastCell = document.getElementById(`cell-${destRow * this.ui.COLS + this.ui.COLS - 1}`);
                    if (destFirstCell) {
                        const width = destLastCell ? (destLastCell.offsetLeft + destLastCell.offsetWidth - destFirstCell.offsetLeft) : gridBoard.clientWidth;
                        slotIndicator.style.top = `${destFirstCell.offsetTop}px`;
                        slotIndicator.style.left = `${destFirstCell.offsetLeft}px`;
                        slotIndicator.style.width = `${width}px`;
                        slotIndicator.style.height = `${destFirstCell.offsetHeight}px`;
                        slotIndicator.style.display = 'block';
                    } else {
                        slotIndicator.style.display = 'none';
                    }
                } else {
                    slotIndicator.style.display = 'none';
                }
            }

            // Real-time cable follow during row drag and row shift animation
            this.scheduleCableRender(240);
        };

        const resetAllRowTransforms = () => {
            this.cancelCableRender();
            this.ui.renderCables();
            const slotIndicator = this.rowTargetSlotIndicatorEl || document.getElementById('row-target-slot-indicator');
            if (slotIndicator) {
                slotIndicator.style.display = 'none';
            }
            for (let idx = 0; idx < 40; idx++) {
                const cell = document.getElementById(`cell-${idx}`);
                if (cell) {
                    cell.classList.remove('row-cell-dragging', 'row-cell-shifting');
                    cell.style.transform = '';
                    cell.style.zIndex = '';
                }
            }
            for (let rowIdx = 0; rowIdx < this.ui.ROWS; rowIdx++) {
                const track = this.rowTracks?.[rowIdx] || document.getElementById(`row-overlay-track-${rowIdx}`);
                if (track) {
                    track.classList.remove('row-cell-shifting');
                    track.style.transform = '';
                }
                const lH = document.getElementById(`row-handle-left-${rowIdx}`);
                const rH = document.getElementById(`row-handle-right-${rowIdx}`);
                if (lH) lH.classList.remove('dragging');
                if (rH) rH.classList.remove('dragging');
            }
        };

        const onPointerMove = (e) => {
            const deltaY = e.clientY - startY;

            if (!isRowDragging) {
                if (Math.abs(deltaY) > 5) {
                    isRowDragging = true;
                    this.draggingRow = originalRow;
                    leftHandle.classList.add('dragging');
                    rightHandle.classList.add('dragging');

                    // Highlight all cells in source row
                    for (let c = 0; c < this.ui.COLS; c++) {
                        const cell = document.getElementById(`cell-${originalRow * this.ui.COLS + c}`);
                        if (cell) {
                            cell.classList.add('row-cell-dragging');
                        }
                    }
                }
            }

            if (isRowDragging) {
                const boardRect = gridBoard.getBoundingClientRect();
                const rowHeight = boardRect.height / this.ui.ROWS;
                const relY = e.clientY - boardRect.top;

                // Determine target insertion index (0 to ROWS)
                let insertIdx = Math.round(relY / rowHeight);
                insertIdx = Math.max(0, Math.min(this.ui.ROWS, insertIdx));
                currentTargetRow = insertIdx;

                // Dynamically open gap by shifting other rows
                updateDynamicRowShifts(insertIdx, deltaY);
            }
        };

        const bindHandle = (h) => {
            const onPointerUp = (e) => {
                try { h.releasePointerCapture(e.pointerId); } catch (_) {}
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                window.removeEventListener('pointercancel', onPointerUp);

                resetAllRowTransforms();

                if (isRowDragging) {
                    isRowDragging = false;
                    this.draggingRow = null;
                    // Execute row reorder / insertion if target is different
                    this.moveRowTo(originalRow, currentTargetRow);
                }
            };

            h.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                originalRow = parseInt(h.dataset.row);
                startY = e.clientY;
                try { h.setPointerCapture(e.pointerId); } catch (_) {}
                window.addEventListener('pointermove', onPointerMove, { passive: false });
                window.addEventListener('pointerup', onPointerUp);
                window.addEventListener('pointercancel', onPointerUp);
            });
        };

        bindHandle(leftHandle);
        bindHandle(rightHandle);
    }

    moveRowTo(sourceRow, targetInsertRow) {
        if (sourceRow < 0 || sourceRow >= this.ui.ROWS) return;
        if (targetInsertRow < 0 || targetInsertRow > this.ui.ROWS) return;

        // If targetInsertRow is either sourceRow or sourceRow + 1, order remains identical
        if (targetInsertRow === sourceRow || targetInsertRow === sourceRow + 1) {
            return;
        }

        this.ui.saveHistory();

        // Calculate destination row index (0-indexed)
        const destRow = targetInsertRow > sourceRow ? targetInsertRow - 1 : targetInsertRow;

        // Build mapping from old row index to new row index
        const rowMap = new Array(this.ui.ROWS);
        for (let r = 0; r < this.ui.ROWS; r++) rowMap[r] = r;

        // Splice source row and insert at destRow
        const [removedRow] = rowMap.splice(sourceRow, 1);
        rowMap.splice(destRow, 0, removedRow);

        // Invert to get for each old row: where does it go?
        const newRowForOld = new Array(this.ui.ROWS);
        for (let newR = 0; newR < this.ui.ROWS; newR++) {
            const oldR = rowMap[newR];
            newRowForOld[oldR] = newR;
        }

        // Update row of all modules
        let movedCount = 0;
        Object.values(this.ui.modules).forEach(m => {
            if (m.row !== undefined && newRowForOld[m.row] !== undefined) {
                const updatedRow = newRowForOld[m.row];
                if (updatedRow !== m.row) {
                    m.row = updatedRow;
                    movedCount++;
                }
            }
        });

        this.ui.syncGridMap();
        this.ui.updateAllCells();
        this.ui.renderCables();
        this.updateRowHandleRail();

        this.ui.showToast(`行 ${sourceRow + 1} を 行 ${destRow + 1} に差し込み移動しました`);
    }
}

