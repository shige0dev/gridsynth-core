// src/ui/managers/row-manager.js

export class RowManager {
    constructor(ui, interactionManager = null) {
        this.ui = ui;
        this.interactionManager = interactionManager;
        this.selectedRow = null;
        this.draggingRow = null;
        this.currentTargetBoundary = null;
    }

    getRowEl(r) {
        return this.ui.rows?.[r] || document.getElementById(`grid-row-${r}`);
    }

    clearInsertBeam() {
        this.currentTargetBoundary = null;
        for (let r = 0; r < this.ui.ROWS; r++) {
            const rowEl = this.getRowEl(r);
            if (rowEl) {
                rowEl.classList.remove('row-insert-before', 'row-insert-after');
            }
        }
    }

    showInsertBeam(b) {
        this.clearInsertBeam();
        const ROWS = this.ui.ROWS;
        if (b <= 0) {
            this.getRowEl(0)?.classList.add('row-insert-before');
        } else if (b >= ROWS) {
            this.getRowEl(ROWS - 1)?.classList.add('row-insert-after');
        } else {
            this.getRowEl(b)?.classList.add('row-insert-before');
        }
    }

    clearRowSelection() {
        this.clearInsertBeam();
        for (let r = 0; r < this.ui.ROWS; r++) {
            this.getRowEl(r)?.classList.remove('row-source-dragging');
        }
        this.selectedRow = null;
        this.draggingRow = null;
        document.body.classList.remove('is-row-dragging');
        const container = document.getElementById('canvas-container');
        if (container) container.style.overflowY = 'auto';
    }

    startRowDragFromModule(r) {
        if (this.ui.isPerformanceMode) return;
        if (r === null || r === undefined || r < 0 || r >= this.ui.ROWS) return;

        // Cancel any pending module dragging or selection in InteractionManager
        if (this.interactionManager) {
            this.interactionManager.isDragging = false;
            this.interactionManager._dragCandidate = null;
            this.interactionManager.selectedModuleIds = [];
            this.interactionManager.updateSelectionClasses?.();
            this.interactionManager.clearHighlight?.();
            this.interactionManager.moduleLongPressed = false;
            this.interactionManager._isScrollDragging = false;
            this.interactionManager._isMouseScrollDragging = false;
            if (this.interactionManager._copyTimer) {
                clearTimeout(this.interactionManager._copyTimer);
                this.interactionManager._copyTimer = null;
            }
        }

        this.clearRowSelection();
        this.selectedRow = r;
        this.draggingRow = r;

        const rowEl = this.getRowEl(r);
        if (rowEl) rowEl.classList.add('row-source-dragging');

        document.body.classList.add('is-row-dragging');
        const container = document.getElementById('canvas-container');
        if (container) container.style.overflowY = 'hidden';

        if (navigator.vibrate) {
            try { navigator.vibrate([40, 50, 40]); } catch (_) {}
        }
        this.ui.showToast(`行 ${r + 1} を選択（上下ドラッグで行を移動）`);
    }

    resumeSelectedRowDrag() {
        if (this.selectedRow === null) return;
        this.draggingRow = this.selectedRow;
        this.clearInsertBeam();
        document.body.classList.add('is-row-dragging');
        const container = document.getElementById('canvas-container');
        if (container) container.style.overflowY = 'hidden';
    }

    updateBoundaryFromPointer(clientX, clientY) {
        if (this.draggingRow === null) return;
        const originalRow = this.draggingRow;

        const el = document.elementFromPoint(clientX, clientY);
        const rowEl = el?.closest?.('.grid-row');
        if (!rowEl) {
            this.clearInsertBeam();
            return;
        }

        const rowIdx = parseInt(rowEl.dataset.row, 10);
        if (isNaN(rowIdx)) {
            this.clearInsertBeam();
            return;
        }

        const rect = rowEl.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const boundary = clientY < midY ? rowIdx : rowIdx + 1;

        if (boundary !== originalRow && boundary !== originalRow + 1) {
            this.currentTargetBoundary = boundary;
            this.showInsertBeam(boundary);
        } else {
            this.clearInsertBeam();
        }
    }

    finishRowDrag() {
        if (this.draggingRow === null) return false;

        const originalRow = this.draggingRow;
        const boundary = this.currentTargetBoundary;

        this.draggingRow = null;
        document.body.classList.remove('is-row-dragging');
        const container = document.getElementById('canvas-container');
        if (container) container.style.overflowY = 'auto';

        if (boundary !== null && boundary !== originalRow && boundary !== originalRow + 1) {
            const destRow = boundary < originalRow ? boundary : (boundary - 1);
            this.clearRowSelection();
            this.moveRowTo(originalRow, destRow);
            return true;
        }

        // If user lifted finger without dragging to another row yet, keep the row selected
        this.clearInsertBeam();
        return false;
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

        Object.values(this.ui.modules).forEach(m => {
            if (m.row !== undefined && newRowForOld[m.row] !== undefined) {
                const updatedRow = newRowForOld[m.row];
                if (updatedRow !== m.row) {
                    m.row = updatedRow;
                }
            }
        });

        this.ui.syncGridMap();
        if (this.ui.pageManager) {
            this.ui.pageManager.persistCurrentPage();
        }
        this.ui.updateAllCells();

        this.ui.renderCables();
        requestAnimationFrame(() => {
            this.ui.renderCables();
        });

        this.clearRowSelection();
        if (this.interactionManager) {
            this.interactionManager.resetAllInteractions?.({ keepSelection: false });
        }
        this.ui.showToast(`行 ${sourceRow + 1} を 行 ${destRow + 1} に差し込み移動しました`);
    }
}
