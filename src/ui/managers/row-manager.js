// src/ui/managers/row-manager.js

export class RowManager {
    constructor(ui, interactionManager = null) {
        this.ui = ui;
        this.interactionManager = interactionManager;
        this.rowHandleOverlayEl = null;
        this.rowTracks = [];
        this.rowTargetSlotIndicatorEl = null;
        this.draggingRow = null;
    }

    scheduleCableRender(animateDurationMs = 0) {
        if (this.interactionManager) {
            this.interactionManager.scheduleCableRender(animateDurationMs);
        } else {
            this.ui.renderCables();
        }
    }

    cancelCableRender() {
        if (this.interactionManager) {
            this.interactionManager.cancelCableRender();
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
            overlay.style.display = 'block';
            gridBoard.appendChild(overlay);
        }
        this.rowHandleOverlayEl = overlay;

        // Build 8 row overlay tracks with permanently displayed right handles
        overlay.innerHTML = '';
        this.rowTracks = [];
        for (let r = 0; r < this.ui.ROWS; r++) {
            const track = document.createElement('div');
            track.id = `row-overlay-track-${r}`;
            track.className = 'row-overlay-track';
            track.dataset.row = String(r);

            const rightHandle = document.createElement('div');
            rightHandle.id = `row-handle-right-${r}`;
            rightHandle.className = 'row-handle-btn row-handle-right';
            rightHandle.dataset.row = String(r);
            rightHandle.title = `行 ${r + 1}（長押しで行を差し込み移動）`;
            rightHandle.innerHTML = `<span class="row-handle-bar pointer-events-none"></span>`;

            this.bindRowHandleEvents(rightHandle, r);
            track.appendChild(rightHandle);
            overlay.appendChild(track);
            this.rowTracks[r] = track;
        }

        // Keep overlay tracks aligned on resize
        window.addEventListener('resize', () => {
            this.updateRowHandleRail();
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
                    <div class="drop-highlight-valid aspect-square"></div>
                    <div class="drop-highlight-valid aspect-square"></div>
                    <div class="drop-highlight-valid aspect-square"></div>
                    <div class="drop-highlight-valid aspect-square"></div>
                    <div class="drop-highlight-valid aspect-square"></div>
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

        overlay.style.display = 'block';

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

    bindRowHandleEvents(rightHandle, r) {
        let isRowDragging = false;
        let isArming = false;
        let rowLpTimer = null;
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
                const otherTrack = this.rowTracks?.[rowIdx] || document.getElementById(`row-overlay-track-${rowIdx}`);
                if (otherTrack) {
                    otherTrack.classList.add('row-cell-shifting');
                    otherTrack.style.transform = shiftY !== 0 ? `translateY(${shiftY}px)` : '';
                }
            }

            // Highlight destination row slot
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
                const rH = document.getElementById(`row-handle-right-${rowIdx}`);
                if (rH) rH.classList.remove('dragging', 'row-arming');
            }
        };

        const onPointerMove = (e) => {
            if (!isArming) return;
            const deltaY = e.clientY - startY;

            if (!isRowDragging) {
                if (Math.abs(deltaY) > 4) {
                    isRowDragging = true;
                    this.draggingRow = originalRow;
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

                const pointerRow = Math.max(0, Math.min(this.ui.ROWS - 1, Math.floor(relY / rowHeight)));
                let insertIdx;
                if (pointerRow < originalRow) {
                    insertIdx = pointerRow;
                } else if (pointerRow > originalRow) {
                    insertIdx = pointerRow + 1;
                } else {
                    insertIdx = originalRow;
                }
                currentTargetRow = insertIdx;

                updateDynamicRowShifts(insertIdx, deltaY);
            }
        };

        const onPointerUp = (e) => {
            if (rowLpTimer) {
                clearTimeout(rowLpTimer);
                rowLpTimer = null;
            }
            try { rightHandle.releasePointerCapture(e.pointerId); } catch (_) {}
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);

            resetAllRowTransforms();

            if (isRowDragging) {
                isRowDragging = false;
                this.draggingRow = null;
                this.moveRowTo(originalRow, currentTargetRow);
            }
            isArming = false;
        };

        rightHandle.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            originalRow = parseInt(rightHandle.dataset.row);
            startY = e.clientY;
            isArming = false;
            isRowDragging = false;

            try { rightHandle.setPointerCapture(e.pointerId); } catch (_) {}
            window.addEventListener('pointermove', onPointerMove, { passive: false });
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);

            // Arm row movement on long-press (300ms)
            rowLpTimer = setTimeout(() => {
                rowLpTimer = null;
                isArming = true;
                rightHandle.classList.add('row-arming');
                if (navigator.vibrate) {
                    try { navigator.vibrate(25); } catch (_) {}
                }
            }, 300);
        });
    }

    moveRowTo(sourceRow, targetInsertRow) {
        if (sourceRow < 0 || sourceRow >= this.ui.ROWS) return;
        if (targetInsertRow < 0 || targetInsertRow > this.ui.ROWS) return;

        if (targetInsertRow === sourceRow || targetInsertRow === sourceRow + 1) {
            return;
        }

        this.ui.saveHistory();

        const destRow = targetInsertRow > sourceRow ? targetInsertRow - 1 : targetInsertRow;
        const rowMap = new Array(this.ui.ROWS);
        for (let r = 0; r < this.ui.ROWS; r++) rowMap[r] = r;

        const [removedRow] = rowMap.splice(sourceRow, 1);
        rowMap.splice(destRow, 0, removedRow);

        const newRowForOld = new Array(this.ui.ROWS);
        for (let newR = 0; newR < this.ui.ROWS; newR++) {
            const oldR = rowMap[newR];
            newRowForOld[oldR] = newR;
        }

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

