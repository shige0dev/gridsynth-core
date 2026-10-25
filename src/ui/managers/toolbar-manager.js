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
        this.setCableOpacity(this.cableOpacity);
        this.bindToolbarEvents();
    }

    setCableOpacity(op) {
        this.cableOpacity = op;
        if (this.ui.cableCanvas) {
            this.ui.cableCanvas.style.opacity = '1';
        }
        const ind = document.getElementById('cable-opacity-indicator');
        if (ind) {
            ind.style.opacity = String(op);
        }
        const btn = document.getElementById('cable-opacity-btn');
        if (btn) {
            if (op < 0.5) {
                btn.classList.add('text-slate-600', 'border-slate-800');
                btn.classList.remove('text-slate-400', 'hover:text-slate-200', 'border-slate-700');
            } else {
                btn.classList.remove('text-slate-600', 'border-slate-800');
                btn.classList.add('text-slate-400', 'hover:text-slate-200', 'border-slate-700');
            }
        }
        localStorage.setItem('gridsynth_cable_opacity', String(op));
        this.ui.renderCables();
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
        document.getElementById('phone-frame')?.classList.toggle('is-performance-mode', isPerf);

        const btn = document.getElementById('perf-mode-btn');
        if (btn) {
            if (isPerf) {
                btn.className = "h-5 px-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/80 rounded flex items-center justify-center transition shadow-[0_0_8px_rgba(245,158,11,0.25)] cursor-pointer font-mono text-[7.5px] font-bold";
            } else {
                btn.className = "h-5 px-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-amber-400 rounded flex items-center justify-center transition shadow-sm cursor-pointer font-mono text-[7.5px] font-bold";
            }
        }

        if (isPerf) {
            this.ui.interactionManager?.resetAllInteractions?.({ keepSelection: false });
            if (this.ui.selectedModuleIds.length > 0) {
                this.ui.selectedModuleIds = [];
                this.ui.interactionManager?.updateSelectionClasses?.();
            }
            if (this.ui.selectedTargetForConnection) {
                this.ui.selectedTargetForConnection = null;
                this.ui.updatePortHighlight();
            }
            if (this._savedCableOpacity === undefined) {
                this._savedCableOpacity = this.cableOpacity ?? 1.0;
            }
            this.setCableOpacity(0.2);
        } else {
            if (this._savedCableOpacity !== undefined) {
                this.setCableOpacity(this._savedCableOpacity);
                this._savedCableOpacity = undefined;
            }
        }
        this.ui.renderCables();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    bindToolbarEvents() {
        document.getElementById('undo-btn')?.addEventListener('click', () => this.ui.undo());
        document.getElementById('close-modal-bg')?.addEventListener('click', () => {
            document.getElementById('shared-modal')?.classList.add('hidden');
            this.ui.activePopupModuleId = null;
        });

        document.getElementById('dock-backdrop')?.addEventListener('pointerdown', () => {
            this.ui.modalManager.closeUnlockedDocks();
        });
        document.getElementById('dock-backdrop')?.addEventListener('click', () => {
            this.ui.modalManager.closeUnlockedDocks();
        });

        // Global outside-tap dismiss for unlocked dock dialogs
        document.addEventListener('pointerdown', (e) => {
            if (this.ui.modalManager.openDocks.size === 0) return;
            const targetEl = e.target instanceof Element ? e.target : e.target?.parentElement;
            if (targetEl?.closest?.('.dock-dialog') || targetEl?.closest?.('#custom-prompt-modal') || targetEl?.closest?.('#alert-modal') || targetEl?.closest?.('#about-modal')) return;
            const hasUnlocked = Array.from(this.ui.modalManager.openDocks.values()).some(d => !d.isLocked);
            if (hasUnlocked) {
                this.ui.modalManager.closeUnlockedDocks();
            }
        });

        const frame = document.getElementById('phone-frame');
        const makeDraggable = (headerEl, contentEl, minMargin = 4, isFullWidth = false) => {
            if (!headerEl || !contentEl || !frame) return;
            let drag = false, dX = 0, dY = 0, initL = 0, initT = 0;
            headerEl.addEventListener('pointerdown', (e) => {
                if (e.target.closest('#dock-lock-btn') || e.target.closest('.dock-lock-btn')) return;
                e.preventDefault();
                drag = true;
                headerEl.setPointerCapture(e.pointerId);
                dX = e.clientX;
                dY = e.clientY;
                contentEl.style.bottom = 'auto';
                initL = parseFloat(contentEl.style.left) || contentEl.offsetLeft;
                initT = parseFloat(contentEl.style.top) || contentEl.offsetTop;
            });
            headerEl.addEventListener('pointermove', (e) => {
                if (!drag) return;
                const fR = frame.getBoundingClientRect(), cR = contentEl.getBoundingClientRect();
                const lockX = typeof isFullWidth === 'function' ? isFullWidth() : !!isFullWidth;
                if (!lockX) {
                    contentEl.style.left = `${Math.max(minMargin, Math.min(fR.width - cR.width - minMargin, initL + e.clientX - dX))}px`;
                }
                contentEl.style.top = `${Math.max(minMargin, Math.min(fR.height - cR.height - minMargin, initT + e.clientY - dY))}px`;
                contentEl.style.bottom = 'auto';
            });
            const stop = (e) => {
                if (drag) {
                    drag = false;
                    try { headerEl.releasePointerCapture(e.pointerId); } catch (_) {}
                }
            };
            headerEl.addEventListener('pointerup', stop);
            headerEl.addEventListener('pointercancel', stop);
        };

        makeDraggable(document.getElementById('modal-header'), document.getElementById('modal-content'), 6, () => {
            const titleEl = document.getElementById('modal-title');
            return titleEl?.textContent === 'ADD MODULE';
        });

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
            const nextIdx = (idx + 1) % steps.length;
            const nextOp = steps[nextIdx];
            if (this.isPerformanceMode) {
                this._savedCableOpacity = nextOp;
            }
            this.setCableOpacity(nextOp);
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
                btn.className = "h-5 w-5 bg-slate-900 text-slate-400 rounded-md border border-slate-700 flex items-center justify-center shrink-0";
                this.ui.showToast('AUDIO STOPPED');
            } else {
                this.ui.synth.resume();
                if (!this.ui.synth.hasModules()) {
                    this.ui.synth.rebuildAll(this.ui.pagesData, (pId, id) => this.ui.getPatchState(id, pId));
                }
                btn.className = "h-5 w-5 bg-red-950 text-red-400 rounded-md border border-red-500 shadow-md shadow-red-500/40 flex items-center justify-center shrink-0";
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
            document.getElementById('seq-play-btn').className = "h-5 w-5 bg-red-950 text-red-400 rounded-md border border-red-500 shadow-md shadow-red-500/40 flex items-center justify-center shrink-0";
        });

        document.getElementById('seq-stop-btn')?.addEventListener('click', () => {
            this.ui.synth.setPlaybackState(false);
            this.ui.synth.clearAllBuffers();
            document.getElementById('seq-play-btn').className = "h-5 w-5 bg-slate-900 text-slate-400 rounded-md border border-slate-700 flex items-center justify-center shrink-0";
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

        // Scrolling cancels pending long-presses without blocking the compositor thread
        document.getElementById('canvas-container')?.addEventListener('scroll', () => {
            this.ui.interactionManager?.cancelPendingPresses?.();
        }, { passive: true });

        // On mobile touch: cancel scrolling specifically when touching/swiping over a PAD module
        document.getElementById('canvas-container')?.addEventListener('touchmove', (e) => {
            if (e.target.closest('.pad-grid-container, .pad-grid-canvas')) {
                if (e.cancelable) e.preventDefault();
            }
        }, { passive: false });

        // Desktop mouse wheel scroll enhancement (smoothly scroll 32-row workspace)
        window.addEventListener('wheel', (e) => {
            const container = document.getElementById('canvas-container');
            if (!container) return;
            if (e.target.closest('.dock-dialog, .modal-content, #shared-modal, #dock-modal, #preset-manager-modal, #about-modal, #custom-alert-modal')) return;
            const activeModal = document.querySelector('#shared-modal:not(.hidden), #preset-manager-modal:not(.hidden), #custom-alert-modal:not(.hidden)');
            if (activeModal) return;
            if (e.target.closest('input, select, textarea, .overflow-y-auto:not(#canvas-container)')) return;

            container.scrollTop += e.deltaY;
        }, { passive: true });

        document.getElementById('preset-trigger-btn')?.addEventListener('click', () => {
            this.ui.renderPresetList();
            document.getElementById('preset-manager-modal').classList.remove('hidden');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
        document.getElementById('close-preset-bg')?.addEventListener('click', () => document.getElementById('preset-manager-modal').classList.add('hidden'));
        document.getElementById('close-preset-modal-btn')?.addEventListener('click', () => document.getElementById('preset-manager-modal').classList.add('hidden'));
        document.getElementById('preset-new-top-btn')?.addEventListener('click', () => this.ui.createNewPatch());
        document.getElementById('preset-save-top-btn')?.addEventListener('click', () => this.ui.saveCurrentPatch());
        document.getElementById('preset-saveas-top-btn')?.addEventListener('click', async () => {
            const name = await this.ui.openCustomPrompt('SAVE AS', `PATCH_${Date.now().toString().slice(-4)}`);
            if (name) {
                this.ui.presets[name] = this.ui.exportCurrentPreset();
                this.ui.presetOrder.unshift(name);
                this.ui.currentPresetKey = name;
                this.ui.savePresetsDB();
                this.ui.loadActivePreset();
                this.ui.renderPresetList();
                this.ui.showToast(`"${name}" を保存しました`);
            }
        });
        document.getElementById('preset-export-top-btn')?.addEventListener('click', () => this.ui.openJsonExportModal());
        document.getElementById('preset-import-top-btn')?.addEventListener('click', () => this.ui.openJsonImportModal());
        document.getElementById('preset-ai-spec-top-btn')?.addEventListener('click', () => this.ui.openAiSpecModal());
        document.getElementById('main-ai-spec-btn')?.addEventListener('click', () => this.ui.openAiSpecModal());
        document.getElementById('preset-about-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('about-modal')?.classList.remove('hidden');
        });
        const closeAboutModal = () => document.getElementById('about-modal')?.classList.add('hidden');
        document.getElementById('about-backdrop')?.addEventListener('click', closeAboutModal);
        document.getElementById('about-backdrop')?.addEventListener('pointerdown', closeAboutModal);
        document.getElementById('json-io-backdrop')?.addEventListener('click', () => document.getElementById('json-io-modal')?.classList.add('hidden'));
        document.getElementById('close-json-io-btn')?.addEventListener('click', () => document.getElementById('json-io-modal')?.classList.add('hidden'));
    }
}
