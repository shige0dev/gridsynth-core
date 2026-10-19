// src/ui/managers/interaction-manager.js
import { safeClone, parseConn, generateModuleId, HIGHLIGHT_CLASSES, isSubModule } from '../../core/utils.js?v=263';
import { MODULE_REGISTRY } from '../../modules/registry.js?v=263';

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
        this.rowInsertIndicatorEl = null;

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
                return this.ui.handlePortTap(port.dataset.moduleId, port.dataset.port);
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
        this.updateRowHandleRail();
        this.ui.showToast(this.isRowHandleMode ? 'ROW MODE: 行ハンドル表示中（ドラッグで上下差し込み）' : 'ROW MODE: 解除（セル固定）');
    }

    initRowHandleUI() {
        const gridBoard = this.ui.gridBoard;
        if (!gridBoard) return;

        let rail = document.getElementById('row-handle-rail');
        if (!rail) {
            rail = document.createElement('div');
            rail.id = 'row-handle-rail';
            rail.className = 'row-handle-rail';
            rail.style.display = 'none';
            // Append rail directly inside grid-board or canvas-container
            gridBoard.parentElement.appendChild(rail);
        }

        let indicator = document.getElementById('row-insert-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'row-insert-indicator';
            indicator.className = 'row-insert-line hidden';
            gridBoard.parentElement.appendChild(indicator);
        }
        this.rowInsertIndicatorEl = indicator;

        // Build 8 row handle buttons
        rail.innerHTML = '';
        for (let r = 0; r < this.ui.ROWS; r++) {
            const handle = document.createElement('div');
            handle.className = 'row-handle-btn';
            handle.dataset.row = String(r);
            handle.title = `行 ${r + 1} をドラッグして上下に差し込み移動`;
            handle.innerHTML = `<svg viewBox="0 0 16 16" class="w-3 h-3 pointer-events-none opacity-80" fill="currentColor"><circle cx="5.5" cy="4" r="1.3"/><circle cx="10.5" cy="4" r="1.3"/><circle cx="5.5" cy="8" r="1.3"/><circle cx="10.5" cy="8" r="1.3"/><circle cx="5.5" cy="12" r="1.3"/><circle cx="10.5" cy="12" r="1.3"/></svg>`;

            this.bindRowHandleEvents(handle, r);
            rail.appendChild(handle);
        }

        // Align rail heights on resize
        window.addEventListener('resize', () => {
            if (this.isRowHandleMode) this.updateRowHandleRail();
        });
    }

    updateRowHandleRail() {
        const rail = document.getElementById('row-handle-rail');
        const gridBoard = this.ui.gridBoard;
        if (!rail || !gridBoard) return;

        if (!this.isRowHandleMode) {
            rail.style.display = 'none';
            if (this.rowInsertIndicatorEl) this.rowInsertIndicatorEl.classList.add('hidden');
            return;
        }

        rail.style.display = 'block';

        const handles = rail.querySelectorAll('.row-handle-btn');
        const parentRect = gridBoard.parentElement.getBoundingClientRect();
        const boardRect = gridBoard.getBoundingClientRect();

        for (let r = 0; r < this.ui.ROWS; r++) {
            const firstCellInRow = document.getElementById(`cell-${r * this.ui.COLS}`);
            const handle = handles[r];
            if (firstCellInRow && handle) {
                const cellRect = firstCellInRow.getBoundingClientRect();
                const topOffset = cellRect.top - parentRect.top;
                const leftOffset = cellRect.left - parentRect.left;
                handle.style.top = `${topOffset + 2}px`;
                handle.style.left = `${leftOffset + 2}px`;
                handle.style.height = '18px';
                handle.style.width = '18px';
            }
        }
    }

    bindRowHandleEvents(handle, r) {
        let isRowDragging = false;
        let startY = 0;
        let originalRow = r;
        let currentTargetRow = r;

        const onPointerMove = (e) => {
            if (!isRowDragging) {
                if (Math.abs(e.clientY - startY) > 5) {
                    isRowDragging = true;
                    this.draggingRow = originalRow;
                    handle.classList.add('dragging');

                    // Highlight all cells in source row
                    for (let c = 0; c < this.ui.COLS; c++) {
                        const cell = document.getElementById(`cell-${originalRow * this.ui.COLS + c}`);
                        if (cell) cell.classList.add('row-cell-dragging');
                    }
                }
            }

            if (isRowDragging) {
                const gridBoard = this.ui.gridBoard;
                const parentRect = gridBoard.parentElement.getBoundingClientRect();
                const boardRect = gridBoard.getBoundingClientRect();
                const rowHeight = boardRect.height / this.ui.ROWS;
                const relY = e.clientY - boardRect.top;

                // Determine target insertion index (0 to ROWS)
                let insertIdx = Math.round(relY / rowHeight);
                insertIdx = Math.max(0, Math.min(this.ui.ROWS, insertIdx));
                currentTargetRow = insertIdx;

                if (this.rowInsertIndicatorEl) {
                    this.rowInsertIndicatorEl.classList.remove('hidden');
                    const targetTop = (boardRect.top - parentRect.top) + (insertIdx / this.ui.ROWS) * boardRect.height;
                    this.rowInsertIndicatorEl.style.top = `${targetTop}px`;
                    this.rowInsertIndicatorEl.style.left = `${boardRect.left - parentRect.left}px`;
                    this.rowInsertIndicatorEl.style.width = `${boardRect.width}px`;
                }
            }
        };

        const onPointerUp = (e) => {
            try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);

            if (this.rowInsertIndicatorEl) {
                this.rowInsertIndicatorEl.classList.add('hidden');
            }

            for (let c = 0; c < this.ui.COLS; c++) {
                const cell = document.getElementById(`cell-${originalRow * this.ui.COLS + c}`);
                if (cell) cell.classList.remove('row-cell-dragging');
            }
            handle.classList.remove('dragging');

            if (isRowDragging) {
                isRowDragging = false;
                this.draggingRow = null;
                // Execute row reorder / insertion if target is different
                this.moveRowTo(originalRow, currentTargetRow);
            }
        };

        handle.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            originalRow = parseInt(handle.dataset.row);
            startY = e.clientY;
            try { handle.setPointerCapture(e.pointerId); } catch (_) {}
            window.addEventListener('pointermove', onPointerMove, { passive: false });
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);
        });
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

