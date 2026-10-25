// src/ui/managers/toolbar-manager.js

export class ToolbarManager {
    constructor(ui) {
        this.ui = ui;
        this.isPerformanceMode = localStorage.getItem('gridsynth_perf_mode') === 'true';
        this._savedCableOpacity = undefined;

        const savedOp = parseFloat(localStorage.getItem('gridsynth_cable_opacity'));
        this.cableOpacity = (!isNaN(savedOp) && [1.0, 0.2].some(s => Math.abs(s - savedOp) < 0.05)) ? savedOp : 1.0;
    }

    init() {
        this.setCableOpacity(this.cableOpacity, false);
        this.bindToolbarEvents();
    }

    setCableOpacity(op, persist = true) {
        this.cableOpacity = op;
        if (this.ui.cableCanvas) {
            this.ui.cableCanvas.style.setProperty('--cable-opacity', String(op));
            this.ui.cableCanvas.querySelectorAll('path:not(.cable-highlighted)').forEach(p => {
                p.setAttribute('stroke-opacity', String(op));
            });
        }
        const ind = document.getElementById('cable-opacity-indicator');
        if (ind) {
            ind.style.opacity = String(op);
        }
        document.getElementById('cable-opacity-btn')?.classList.toggle('is-dim', op < 0.5);
        if (persist) {
            localStorage.setItem('gridsynth_cable_opacity', String(op));
        }
    }

    togglePerformanceMode(force = null) {
        this.isPerformanceMode = (typeof force === 'boolean') ? force : !this.isPerformanceMode;
        localStorage.setItem('gridsynth_perf_mode', String(this.isPerformanceMode));
        this.applyPerformanceMode();
        this.ui.showToast(this.isPerformanceMode ? 'パフォーマンスモード: ON' : 'パフォーマンスモード: OFF');
    }

    applyPerformanceMode() {
        const isPerf = Boolean(this.isPerformanceMode);
        document.documentElement.classList.toggle('is-performance-mode', isPerf);
        document.getElementById('perf-mode-btn')?.classList.toggle('is-active', isPerf);

        if (isPerf) {
            this.ui.interactionManager?.resetAllInteractions?.({ keepSelection: false });
            if (this.ui.selectedTargetForConnection) {
                this.ui.selectedTargetForConnection = null;
                this.ui.updatePortHighlight();
            }
            if (this._savedCableOpacity === undefined) {
                this._savedCableOpacity = this.cableOpacity ?? 1.0;
            }
            this.setCableOpacity(0.2, false);
        } else if (this._savedCableOpacity !== undefined) {
            this.setCableOpacity(this._savedCableOpacity, false);
            this._savedCableOpacity = undefined;
        }
    }

    bindToolbarEvents() {
        document.getElementById('undo-btn')?.addEventListener('click', () => this.ui.undo());

        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', async () => {
                const root = document.documentElement;
                const isFs = !!document.fullscreenElement || !!document.webkitFullscreenElement;
                if (!isFs) {
                    if (root.requestFullscreen) {
                        try { await root.requestFullscreen(); this.ui.showToast('FULLSCREEN'); } catch (_) {}
                    } else if (root.webkitRequestFullscreen) {
                        try { root.webkitRequestFullscreen(); this.ui.showToast('FULLSCREEN'); } catch (_) {}
                    } else {
                        this.ui.showToast('iOS: 共有メニューの「ホーム画面に追加」で全画面化できます', 3000);
                    }
                } else {
                    if (document.exitFullscreen) {
                        try { await document.exitFullscreen(); this.ui.showToast('WINDOW MODE'); } catch (_) {}
                    } else if (document.webkitExitFullscreen) {
                        try { document.webkitExitFullscreen(); this.ui.showToast('WINDOW MODE'); } catch (_) {}
                    }
                }
            });

            const onFsChange = () => {
                const isFs = !!document.fullscreenElement || !!document.webkitFullscreenElement;
                const icon = document.getElementById('fullscreen-icon');
                if (icon) {
                    icon.setAttribute('data-lucide', isFs ? 'minimize' : 'maximize');
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
                setTimeout(() => this.ui.renderCables(), 100);
            };
            document.addEventListener('fullscreenchange', onFsChange);
            document.addEventListener('webkitfullscreenchange', onFsChange);
        }

        document.getElementById('cable-opacity-btn')?.addEventListener('click', () => {
            const steps = [1.0, 0.2];
            let idx = steps.findIndex(s => Math.abs(s - this.cableOpacity) < 0.05);
            if (idx === -1) idx = 0;
            const nextOp = steps[(idx + 1) % steps.length];
            if (this.isPerformanceMode) {
                this._savedCableOpacity = nextOp;
            }
            this.setCableOpacity(nextOp, true);
            this.ui.showToast(nextOp < 0.5 ? 'CABLE: DIM (20%)' : 'CABLE: BRIGHT (100%)');
        });

        document.getElementById('perf-mode-btn')?.addEventListener('click', () => {
            this.togglePerformanceMode();
        });
        this.applyPerformanceMode();

        document.getElementById('audio-power-btn')?.addEventListener('click', async () => {
            await this.ui.synth.init();
            const btn = document.getElementById('audio-power-btn');
            if (this.ui.synth.isRunning()) {
                this.ui.synth.suspend();
                this.ui.synth.clearAllBuffers();
                btn?.classList.remove('is-active');
                this.ui.showToast('AUDIO STOPPED');
            } else {
                this.ui.synth.resume();
                if (!this.ui.synth.hasModules()) {
                    this.ui.synth.rebuildAll(this.ui.pagesData, (pId, id) => this.ui.getPatchState(id, pId));
                }
                btn?.classList.add('is-active');
                this.ui.showToast('AUDIO RUNNING');
            }
        });

        document.getElementById('seq-play-btn')?.addEventListener('click', async () => {
            await this.ui.synth.init();
            this.ui.synth.resume();
            if (!this.ui.synth.hasModules()) {
                this.ui.synth.rebuildAll(this.ui.pagesData, (pId, id) => this.ui.getPatchState(id, pId));
            }
            this.ui.synth.setPlaybackState(true);
            document.getElementById('seq-play-btn')?.classList.add('is-active');
        });

        document.getElementById('seq-stop-btn')?.addEventListener('click', () => {
            this.ui.synth.setPlaybackState(false);
            this.ui.synth.clearAllBuffers();
            document.getElementById('seq-play-btn')?.classList.remove('is-active');
        });

        document.getElementById('seq-reset-btn')?.addEventListener('click', () => {
            this.ui.synth.resetSequencers();
            this.ui.synth.clearAllBuffers();
            this.ui.showToast('RESET (Step 1)');
        });

        const bpmBox = document.getElementById('master-bpm-container'), bpmDisp = document.getElementById('master-bpm-disp');
        let bpmDrag = false, startY = 0, startBpm = 120;

        const onBpmMove = (e) => {
            if (!bpmDrag) return;
            e.preventDefault();
            const delta = Math.round((startY - e.clientY) / 5);
            const n = Math.max(40, Math.min(260, startBpm + delta));
            bpmDisp.textContent = n;
            this.ui.synth.setBPM(n);
            Object.values(this.ui.modules).forEach(m => {
                if (m.type === 'CLK') this.ui.renderCell(m.row * this.ui.COLS + m.col);
            });
            if (this.ui.activePopupModuleId && this.ui.modules[this.ui.activePopupModuleId]?.type === 'CLK') {
                this.ui.reRenderModal();
            }
        };

        const stopBpm = (e) => {
            if (bpmDrag) {
                bpmDrag = false;
                window.removeEventListener('pointermove', onBpmMove);
                window.removeEventListener('pointerup', stopBpm);
                window.removeEventListener('pointercancel', stopBpm);
                try { bpmBox.releasePointerCapture(e.pointerId); } catch (_) {}
            }
        };

        bpmBox?.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            bpmDrag = true;
            startY = e.clientY;
            startBpm = this.ui.synth.masterBPM || 120;
            try { bpmBox.setPointerCapture(e.pointerId); } catch (_) {}
            window.addEventListener('pointermove', onBpmMove, { passive: false });
            window.addEventListener('pointerup', stopBpm);
            window.addEventListener('pointercancel', stopBpm);
        });

        document.getElementById('page-nav-back-btn')?.addEventListener('click', () => {
            if (!this.ui.pageStack) this.ui.pageStack = [];
            const prevPage = this.ui.pageStack.length > 0 ? this.ui.pageStack.pop() : "0";
            this.ui.switchPage(prevPage, true);
        });

        const handleRenameSubpatch = async () => {
            if (this.ui.currentPageId === "0") return;
            const curName = this.ui.pagesData[this.ui.currentPageId]?.name || `SUBPATCH ${this.ui.currentPageId}`;
            const res = await this.ui.openCustomPrompt('SUBPATCH NAME', curName);
            if (res !== null && res.trim() !== '') {
                this.ui.saveHistory();
                if (!this.ui.pagesData[this.ui.currentPageId]) this.ui.pagesData[this.ui.currentPageId] = { slots: {}, modules: {}, connections: [] };
                this.ui.pagesData[this.ui.currentPageId].name = res.trim();
                this.ui.updatePageNavUI();
                this.ui.updateAllCells();
                this.ui.showToast(`サブパッチ名を「${res.trim()}」に変更しました`);
            }
        };
        document.getElementById('page-nav-title')?.addEventListener('click', handleRenameSubpatch);
        document.getElementById('page-nav-rename-btn')?.addEventListener('click', handleRenameSubpatch);
        document.getElementById('page-nav-save-btn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (this.ui.currentPageId === "0") return;
            const curName = this.ui.pagesData[this.ui.currentPageId]?.name || `SUBPATCH_${Date.now().toString().slice(-4)}`;
            const res = await this.ui.openCustomPrompt('STOCK SUBPATCH', curName);
            if (res !== null && res.trim() !== '') {
                this.ui.saveCurrentSubpatchToLibrary(res.trim());
            }
        });
    }
}
