// src/ui/managers/row-manager.js

export class RowManager {
    constructor(ui, interactionManager = null) {
        this.ui = ui;
        this.interactionManager = interactionManager;
        this.rowHandleOverlayEl = null;
        this.rowTracks = [];
        this.rowTargetSlotIndicatorEl = null;
        this.rowInsertBeamEl = null;
        this.draggingRow = null;
        this._ro = null;
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
            rightHandle.title = `行 ${r + 1}（ドラッグで行を差し込み移動）`;
            rightHandle.innerHTML = `<span class="row-handle-bar pointer-events-none"></span>`;

            this.bindRowHandleEvents(rightHandle, r);
            track.appendChild(rightHandle);
            overlay.appendChild(track);
            this.rowTracks[r] = track;
        }

        // Inter-row insertion guide line (simple thin white line)
        let beam = document.getElementById('row-insert-beam');
        if (!beam) {
            beam = document.createElement('div');
            beam.id = 'row-insert-beam';
            beam.className = 'row-insert-beam';
            beam.innerHTML = `<div class="row-insert-line"></div>`;
            overlay.appendChild(beam);
        }
        this.rowInsertBeamEl = beam;

        // Keep overlay tracks aligned on resize and layout changes
        window.addEventListener('resize', () => {
            this.updateRowHandleRail();
        });

        if (window.ResizeObserver && gridBoard && !this._ro) {
            this._ro = new ResizeObserver(() => {
                this.updateRowHandleRail();
            });
            this._ro.observe(gridBoard);
        }

        this.updateRowHandleRail();
    }

    updateRowHandleRail() {
        const overlay = this.rowHandleOverlayEl || document.getElementById('row-handle-overlay');
        if (!overlay) {
            this.initRowHandleUI();
            return;
        }

        const cell0 = document.getElementById('cell-0');
        const cellLast = document.getElementById(`cell-${(this.ui.ROWS - 1) * this.ui.COLS}`);
        // If grid cells are not yet laid out (height 0 or offsetTop uncomputed)
        if (!cell0 || cell0.offsetHeight === 0 || (this.ui.ROWS > 1 && cellLast && cellLast.offsetTop === 0)) {
            overlay.style.opacity = '0';
            requestAnimationFrame(() => this.updateRowHandleRail());
            return;
        }

        overlay.style.display = 'block';
        overlay.style.opacity = '1';

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

    // Candidate boundary detection: candidate row gap ± 1/2 grid (上下1/2グリッド)
    getNearestBoundary(clientY) {
        const ROWS = this.ui.ROWS;
        const COLS = this.ui.COLS;

        const cell0 = document.getElementById('cell-0');
        if (!cell0) return null;
        const r0 = cell0.getBoundingClientRect();
        const mid0 = r0.top + (r0.height / 2);

        // Above midpoint of row 0: boundary 0 (upper 1/2 of row 0 and above)
        if (clientY < mid0) return 0;

        // Between midpoints of row b-1 and row b (captures lower 1/2 of row b-1 and upper 1/2 of row b)
        for (let b = 1; b < ROWS; b++) {
            const cell = document.getElementById(`cell-${b * COLS}`);
            if (cell) {
                const rect = cell.getBoundingClientRect();
                const mid = rect.top + (rect.height / 2);
                if (clientY < mid) {
                    return b;
                }
            }
        }

        // Below midpoint of last row: boundary ROWS (lower 1/2 of last row and below)
        return ROWS;
    }

    showInsertBeam(b) {
        if (!this.rowInsertBeamEl) return;
        const gridBoard = this.ui.gridBoard;
        if (!gridBoard) return;
        const boardRect = gridBoard.getBoundingClientRect();

        let beamClientY = 0;
        const ROWS = this.ui.ROWS;
        const COLS = this.ui.COLS;

        if (b <= 0) {
            const cell0 = document.getElementById('cell-0');
            if (cell0) {
                const r0 = cell0.getBoundingClientRect();
                beamClientY = r0.top - 3;
            }
        } else if (b >= ROWS) {
            const cellLast = document.getElementById(`cell-${(ROWS - 1) * COLS}`);
            if (cellLast) {
                const rLast = cellLast.getBoundingClientRect();
                beamClientY = rLast.bottom + 3;
            }
        } else {
            const cellAbove = document.getElementById(`cell-${(b - 1) * COLS}`);
            const cellBelow = document.getElementById(`cell-${b * COLS}`);
            if (cellAbove && cellBelow) {
                const rAbove = cellAbove.getBoundingClientRect();
                const rBelow = cellBelow.getBoundingClientRect();
                beamClientY = (rAbove.bottom + rBelow.top) / 2;
            }
        }

        const beamTop = beamClientY - boardRect.top;
        this.rowInsertBeamEl.style.top = `${beamTop}px`;
        this.rowInsertBeamEl.classList.add('active');
    }

    hideInsertBeam() {
        if (!this.rowInsertBeamEl) return;
        this.rowInsertBeamEl.classList.remove('active');
    }

    bindRowHandleEvents(rightHandle, r) {
        let isRowDragging = false;
        let startY = 0;
        let originalRow = r;
        let currentTargetBoundary = null;

        const cleanupDragVisuals = () => {
            this.hideInsertBeam();
            rightHandle.classList.remove('dragging');
            this.rowTracks?.forEach(t => t?.classList.remove('row-source-dragging'));
        };

        const onPointerMove = (e) => {
            const deltaY = e.clientY - startY;

            if (!isRowDragging) {
                // Immediate response without long-press: start drag on 3px movement
                if (Math.abs(deltaY) > 3) {
                    isRowDragging = true;
                    this.draggingRow = originalRow;
                    rightHandle.classList.add('dragging');
                    const sourceTrack = this.rowTracks?.[originalRow];
                    if (sourceTrack) sourceTrack.classList.add('row-source-dragging');
                    if (navigator.vibrate) {
                        try { navigator.vibrate(15); } catch (_) {}
                    }
                }
            }

            if (isRowDragging) {
                const boundary = this.getNearestBoundary(e.clientY);

                // Boundaries originalRow (above originalRow) and originalRow + 1 (below originalRow)
                // represent no change in position. Outside of those, light up the boundary line!
                if (boundary !== null && boundary !== originalRow && boundary !== originalRow + 1) {
                    currentTargetBoundary = boundary;
                    this.showInsertBeam(boundary);
                } else {
                    currentTargetBoundary = null;
                    this.hideInsertBeam();
                }
            }
        };

        const onPointerUp = (e) => {
            try { rightHandle.releasePointerCapture(e.pointerId); } catch (_) {}
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);

            const boundary = currentTargetBoundary;
            const didDrag = isRowDragging;

            isRowDragging = false;
            this.draggingRow = null;

            cleanupDragVisuals();

            if (didDrag && boundary !== null && boundary !== originalRow && boundary !== originalRow + 1) {
                const destRow = (boundary < originalRow) ? boundary : (boundary - 1);
                this.moveRowTo(originalRow, destRow);
            }
        };

        rightHandle.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            originalRow = parseInt(rightHandle.dataset.row);
            currentTargetBoundary = null;
            startY = e.clientY;
            isRowDragging = false;
            const sourceTrack = this.rowTracks?.[originalRow];
            if (sourceTrack) sourceTrack.classList.add('row-source-dragging');
            rightHandle.classList.add('dragging');

            try { rightHandle.setPointerCapture(e.pointerId); } catch (_) {}
            window.addEventListener('pointermove', onPointerMove, { passive: false });
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);
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
