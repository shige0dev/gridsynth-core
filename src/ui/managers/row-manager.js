// src/ui/managers/row-manager.js

export class RowManager {
    constructor(ui, interactionManager = null) {
        this.ui = ui;
        this.interactionManager = interactionManager;
        this.rowHandleOverlayEl = null;
        this.rowTracks = [];
        this.rowTargetSlotIndicatorEl = null;
        this.draggingRow = null;
        this.highlightedDestRow = null;
    }

    scheduleCableRender(animateDurationMs = 0) {
        // Cable animations during move are disabled per user request
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

    clearDropHighlights() {
        if (this.highlightedDestRow !== null) {
            for (let c = 0; c < this.ui.COLS; c++) {
                const cell = document.getElementById(`cell-${this.highlightedDestRow * this.ui.COLS + c}`);
                if (cell) cell.classList.remove('drop-highlight-valid');
            }
            this.highlightedDestRow = null;
        }
    }

    setDropHighlight(targetRow) {
        if (this.highlightedDestRow === targetRow) return;
        this.clearDropHighlights();
        if (targetRow !== null && targetRow >= 0 && targetRow < this.ui.ROWS) {
            for (let c = 0; c < this.ui.COLS; c++) {
                const cell = document.getElementById(`cell-${targetRow * this.ui.COLS + c}`);
                if (cell) cell.classList.add('drop-highlight-valid');
            }
            this.highlightedDestRow = targetRow;
        }
    }

    bindRowHandleEvents(rightHandle, r) {
        let isRowDragging = false;
        let isArming = false;
        let rowLpTimer = null;
        let startY = 0;
        let originalRow = r;
        let currentTargetRow = null;
        const gridBoard = this.ui.gridBoard;

        const cleanupDragVisuals = () => {
            this.clearDropHighlights();
            for (let c = 0; c < this.ui.COLS; c++) {
                const cell = document.getElementById(`cell-${originalRow * this.ui.COLS + c}`);
                if (cell) {
                    cell.classList.remove('row-cell-dragging', 'selected-module');
                }
            }
            gridBoard?.classList.remove('has-selected-module');
            rightHandle.classList.remove('dragging', 'row-arming');
        };

        const onPointerMove = (e) => {
            if (!isArming) return;
            const deltaY = e.clientY - startY;

            if (!isRowDragging) {
                if (Math.abs(deltaY) > 4) {
                    isRowDragging = true;
                    this.draggingRow = originalRow;
                    rightHandle.classList.add('dragging');
                    gridBoard?.classList.add('has-selected-module');

                    // Highlight all cells in source row matching selected-module styling
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
                if (pointerRow !== originalRow) {
                    currentTargetRow = pointerRow;
                    this.setDropHighlight(pointerRow);
                } else {
                    currentTargetRow = null;
                    this.clearDropHighlights();
                }
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

            const destRow = currentTargetRow;
            const didDrag = isRowDragging;

            isRowDragging = false;
            this.draggingRow = null;
            isArming = false;

            cleanupDragVisuals();

            if (didDrag && destRow !== null && destRow !== originalRow) {
                this.moveRowTo(originalRow, destRow);
            }
        };

        rightHandle.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            originalRow = parseInt(rightHandle.dataset.row);
            currentTargetRow = null;
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

    moveRowTo(sourceRow, destRow) {
        if (sourceRow < 0 || sourceRow >= this.ui.ROWS) return;
        if (destRow < 0 || destRow >= this.ui.ROWS) return;
        if (sourceRow === destRow) return;

        this.ui.saveHistory();

        const rowMap = Array.from({ length: this.ui.ROWS }, (_, i) => i);
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
        if (this.ui.pageManager) {
            this.ui.pageManager.persistCurrentPage();
        }
        this.ui.updateAllCells();

        // Render cables synchronously and in rAF to guarantee exact pixel alignment
        this.ui.renderCables();
        requestAnimationFrame(() => {
            this.ui.renderCables();
        });

        this.updateRowHandleRail();
        this.ui.showToast(`行 ${sourceRow + 1} を 行 ${destRow + 1} に差し込み移動しました`);
    }
}
