import { isSubModule } from '../core/utils.js?v=459';
import { parsePatch } from '../core/patch.js?v=459';
import { MODULE_REGISTRY } from '../modules/registry.js?v=459';
import { UIHelpers } from './helpers.js?v=459';
import { PresetManager } from './managers/preset-manager.js?v=459';
import { ModalManager } from './managers/modal-manager.js?v=459';
import { CableManager } from './managers/cable-manager.js?v=459';
import { PageManager } from './managers/page-manager.js?v=459';
import { InteractionManager } from './managers/interaction-manager.js?v=459';
import { ToolbarManager } from './managers/toolbar-manager.js?v=459';

export const LIVE_TYPES = ['VCA', 'MATH1', 'MATH2', 'SH', 'SCOPE', 'LISS', 'SPEC', 'SEQ8', 'SEQ16', 'ADSR', 'PAT', 'MARKOV', 'SPK', 'CHORD', 'MIX', 'DIST4', 'ARP', 'SCALE', 'RF', 'AR', 'WAVE', 'PAD'];

export class UIController {
    constructor(synth) {
        this.synth = synth;
        this.COLS = 4;
        this.ROWS = 32;
        this.TOTAL_SLOTS = this.COLS * this.ROWS;
        this.gridMap = Array(this.TOTAL_SLOTS).fill(null);
        this.rows = new Array(this.ROWS);
        this.cells = new Array(this.TOTAL_SLOTS);
        this._lastUiUpdate = 0;

        this.presetManager = new PresetManager(this);
        this.modalManager = new ModalManager(this);
        this.cableManager = new CableManager(this);
        this.pageManager = new PageManager(this);
        this.interactionManager = new InteractionManager(this);
        this.toolbarManager = new ToolbarManager(this);

        this.initDOM();
        this.bindGlobalEvents();
        this.loadActivePreset();
        this.uiUpdateLoop(0);
    }

    get modules() { return this.pageManager.currentPageData.modules; }
    set modules(v) { this.pageManager.currentPageData.modules = v || {}; }
    get connections() { return this.pageManager.currentPageData.connections; }
    set connections(v) { this.pageManager.currentPageData.connections = v || []; }

    get presets() { return this.presetManager.presets; }
    get presetOrder() { return this.presetManager.presetOrder; }
    set presetOrder(v) { this.presetManager.presetOrder = v; }
    get currentPresetKey() { return this.presetManager.currentPresetKey; }
    set currentPresetKey(v) { this.presetManager.currentPresetKey = v; }
    get userSubpatches() { return this.presetManager.userSubpatches; }
    set userSubpatches(v) { this.presetManager.userSubpatches = v; }
    get activePopupModuleId() { return this.modalManager.activePopupModuleId; }
    set activePopupModuleId(v) { this.modalManager.activePopupModuleId = v; }
    get activeDockModuleId() { return this.modalManager.activeDockModuleId; }
    set activeDockModuleId(v) { this.modalManager.activeDockModuleId = v; }
    get selectedTargetForConnection() { return this.cableManager.selectedTargetForConnection; }
    set selectedTargetForConnection(v) { this.cableManager.selectedTargetForConnection = v; }
    get pagesData() { return this.pageManager.pagesData; }
    set pagesData(v) { this.pageManager.pagesData = v; }
    get currentPageId() { return this.pageManager.currentPageId; }
    set currentPageId(v) { this.pageManager.currentPageId = v; }
    get pageStack() { return this.pageManager.pageStack; }
    set pageStack(v) { this.pageManager.pageStack = v; }
    get historyStack() { return this.pageManager.historyStack; }
    set historyStack(v) { this.pageManager.historyStack = v; }
    get selectedModuleIds() { return this.interactionManager.selectedModuleIds; }
    set selectedModuleIds(v) { this.interactionManager.selectedModuleIds = v; }
    get isPerformanceMode() { return this.toolbarManager.isPerformanceMode; }
    set isPerformanceMode(v) { this.toolbarManager.isPerformanceMode = v; }
    get cableOpacity() { return this.toolbarManager.cableOpacity; }
    set cableOpacity(v) { this.toolbarManager.cableOpacity = v; }

    static parsePatch(patchData, cols = 4, userSubpatches = null, errorSink = null) {
        return parsePatch(patchData, cols, userSubpatches, errorSink);
    }

    initDOM() {
        this.gridBoard = document.getElementById('grid-board');
        this.cableCanvas = document.getElementById('cable-canvas');
        const baseGrid = document.getElementById('base-grid');

        if (baseGrid) {
            baseGrid.innerHTML = '';
            const fragment = document.createDocumentFragment();
            for (let i = 0; i < this.TOTAL_SLOTS; i++) {
                const bgCell = document.createElement('div');
                bgCell.className = 'aspect-square border border-solid border-slate-700/50 rounded-xs';
                fragment.appendChild(bgCell);
            }
            baseGrid.appendChild(fragment);
        }

        if (this.gridBoard) {
            this.gridBoard.innerHTML = '';
            const boardFragment = document.createDocumentFragment();
            for (let r = 0; r < this.ROWS; r++) {
                const rowEl = document.createElement('div');
                rowEl.id = `grid-row-${r}`;
                rowEl.className = 'grid-row grid grid-cols-4 gap-1.5 w-full relative';
                rowEl.dataset.row = String(r);
                this.rows[r] = rowEl;

                for (let col = 0; col < this.COLS; col++) {
                    const i = r * this.COLS + col;
                    const c = document.createElement('div');
                    c.id = `cell-${i}`;
                    c.dataset.index = String(i);
                    c.dataset.row = String(r);
                    c.dataset.col = String(col);
                    this.cells[i] = c;
                    rowEl.appendChild(c);
                }
                boardFragment.appendChild(rowEl);
            }
            this.gridBoard.appendChild(boardFragment);
        }
    }

    bindGlobalEvents() {
        this.toolbarManager.init();
        this.modalManager.bindModalEvents();
        this.presetManager.bindPresetEvents();
        this.interactionManager.bindGridEvents();
    }

    updatePresetDisplay(name, bpm) {
        if (name) {
            const nameEl = document.getElementById('current-preset-name');
            if (nameEl) nameEl.textContent = name;
        }
        if (bpm) {
            const bpmDisp = document.getElementById('master-bpm-disp');
            if (bpmDisp) bpmDisp.textContent = bpm;
        }
    }

    syncGridMap() {
        this.gridMap.fill(null);
        Object.entries(this.modules).forEach(([id, m]) => {
            const idx = m.row * this.COLS + m.col;
            if (idx >= 0 && idx < this.TOTAL_SLOTS) this.gridMap[idx] = id;
        });
    }

    renderCell(idx, skipPortHighlight = false) {
        const cell = this.cells[idx] || document.getElementById(`cell-${idx}`);
        if (!cell) return;
        const mId = this.gridMap[idx], m = mId ? this.modules[mId] : null;
        cell.className = `grid-cell relative aspect-square border transition-all select-none ${m ? `border-slate-600 bg-white/10 backdrop-blur-sm shadow-md shadow-black/50 ${this.selectedModuleIds.includes(mId) ? 'selected-module' : ''}` : 'border-transparent cursor-default empty-cell'}`;
        if (m) {
            cell.dataset.renderedState = 'module';
            const reg = MODULE_REGISTRY[m.type];
            if (!reg) return;
            const ctx = {
                id: mId,
                patched: this.getPatchState(mId),
                bpm: this.synth.masterBPM,
                subActivePorts: m.type === 'SUB' ? this.getSubActivePorts(m) : null,
                getPortColor: (portName) => this.getConnectedPortColor(mId, portName, m),
                pageName: this.pagesData[this.currentPageId]?.name || '',
                pagesData: this.pagesData
            };
            const ports = reg.ports(m, ctx);
            const renderP = (arr) => arr.map(p => {
                let portTitle = `${mId}:${p.port}`;
                if (isSubModule(m.type)) {
                    const info = this.getPortDisplayInfo(mId, p.port);
                    portTitle = `${mId}:${info.label}`;
                }
                const dimCls = p.dimmed ? 'opacity-35 grayscale' : '';
                const extraCls = p.extraClass || '';
                const portEl = `<div class="w-2 h-2 rounded-full ${p.color} border border-slate-950/90 shadow-sm shadow-black/60 port cursor-pointer hover:scale-150 transition relative z-10 flex items-center justify-center before:absolute before:inset-[-6px] before:content-[''] ${dimCls} ${extraCls}" data-module-id="${mId}" data-port="${p.port}" data-port-id="${mId}:${p.port}" title="${portTitle}"></div>`;
                if (p.badgeColor) {
                    return `<div class="relative inline-flex items-center justify-center"><span class="port-badge absolute -top-[1.5px] -left-[1.5px] w-[3.5px] h-[3.5px] rounded-full ${p.badgeColor} pointer-events-none z-0 ring-[0.5px] ring-black/70"></span>${portEl}</div>`;
                }
                return portEl;
            }).join('');

            const portsHTML = reg.renderPorts ? reg.renderPorts(m, renderP, ports) : UIHelpers.renderStandardPorts(renderP, ports.in || [], ports.out || []);

            let titleHTML = '';
            if (m.type === 'SUB' || m.type === 'SUB_IO') {
                const displayName = m.type === 'SUB'
                    ? (ctx?.pagesData ? ctx.pagesData[String(m.targetPage ?? 1)]?.name : null) || `SUBPATCH ${m.targetPage ?? 1}`
                    : (ctx?.pageName || `SUBPATCH ${this.currentPageId}`);
                titleHTML = `
                    <div class="absolute top-[2px] left-0 right-0 px-1 flex justify-center items-center pointer-events-none z-20">
                        <span class="w-full text-center font-bold text-[7.5px] tracking-tight text-white truncate select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">${displayName}</span>
                    </div>`;
            } else if (m.type === 'PAD' || m.type === 'SCOPE' || m.type === 'LISS' || m.type === 'SPEC') {
                const displayName = m.name || m.type;
                titleHTML = `
                    <div class="absolute top-[2px] left-[2px] right-[2px] flex justify-center items-center pointer-events-none z-20">
                        <span class="text-slate-700 font-bold text-[8px] tracking-wider select-none truncate">${displayName}</span>
                    </div>`;
            } else {
                let titleClass = 'text-slate-400 font-bold';
                let extraTitleAttrs = '';
                if (m.type === 'MARKOV') {
                    const weights = Array.isArray(m.weights) ? m.weights : [10, 0, 0, 0];
                    const patched = ctx.patched;
                    const isConnected = patched && patched.size > 0;
                    // weights[0] is SELF (internal normalized), weights[1..3] map to trans_out1..3
                    const hasUnconnected = [1, 2, 3].some(idx => Number(weights[idx] || 0) > 0 && !patched.has(`trans_out${idx}`));
                    if (!isConnected || hasUnconnected) {
                        titleClass = 'text-slate-600 font-semibold';
                        extraTitleAttrs = hasUnconnected ? 'title="未結線の出力端子にウエイトが設定されています"' : 'title="未結線モジュール"';
                    } else {
                        titleClass = 'text-slate-400 font-bold';
                    }
                }
                titleHTML = `
                    <div class="absolute top-[2px] left-[2px] right-[2px] flex justify-center items-center pointer-events-none z-20">
                        <span class="${titleClass} text-[8px] tracking-wider select-none truncate" ${extraTitleAttrs}>${m.type}</span>
                    </div>`;
            }
            cell.innerHTML = `
                ${titleHTML}
                <div class="absolute inset-0 flex flex-col items-center justify-center module-body cursor-default p-1 z-0 overflow-hidden" data-module-id="${mId}">${reg.renderGrid(m, ctx)}</div>
                ${portsHTML}`;
            if (reg.bindGridEvents) {
                reg.bindGridEvents(cell, m, this);
            }
            if (!skipPortHighlight && this.selectedTargetForConnection) {
                this.updatePortHighlight();
            }
        } else {
            if (cell.dataset.renderedState !== 'empty') {
                cell.dataset.renderedState = 'empty';
                cell.innerHTML = `<div class="absolute inset-0 flex items-center justify-center font-mono font-medium text-xs text-slate-700 pointer-events-none select-none tracking-wider">${String(idx).padStart(3, '0')}</div>`;
            }
        }
    }

    updateAllCells() {
        this.gridBoard?.classList.toggle('has-selected-module', this.selectedModuleIds.length > 0);
        for (let i = 0; i < this.TOTAL_SLOTS; i++) this.renderCell(i, true);
        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.updatePortHighlight();
    }

    collectLiveStates() {
        const states = {};
        if (!this.synth.audioWorkletReady && !this.synth.ctx) return states;

        Object.values(this.modules).forEach(m => {
            if (!LIVE_TYPES.includes(m.type) && !MODULE_REGISTRY[m.type]?.updateLive) return;
            const fullId = `${this.currentPageId}/${m.id}`;
            const inst = this.synth.modules[fullId] || this.synth.modules[m.id];
            if (inst?.read) {
                states[m.id] = inst.read();
            }
        });
        return states;
    }

    renderLiveGrid(liveStates) {
        Object.values(this.modules).forEach(m => {
            const readData = liveStates[m.id];
            if (!readData) return;
            const reg = MODULE_REGISTRY[m.type];
            if (reg?.updateLive) {
                const idx = m.row * this.COLS + m.col;
                const cell = this.cells[idx] || document.getElementById(`cell-${idx}`);
                const targetModal = this.modalManager.getDialogElement(m.id);
                if (cell) reg.updateLive(cell, readData, this.synth.isPlaying, targetModal, m, this.getPatchState(m.id));
            }
        });
    }

    uiUpdateLoop(timestamp = 0) {
        requestAnimationFrame((t) => this.uiUpdateLoop(t));

        if (timestamp - this._lastUiUpdate < 15) return;
        this._lastUiUpdate = timestamp;

        const liveStates = this.collectLiveStates();
        this.renderLiveGrid(liveStates);

        if (typeof this.onLiveFrame === 'function') {
            this.onLiveFrame(liveStates, this.synth.isPlaying);
        }
    }

    // --- Manager Delegators ---
    setCableOpacity(op, persist = true) { return this.toolbarManager.setCableOpacity(op, persist); }
    togglePerformanceMode(force = null, silent = false) { return this.toolbarManager.togglePerformanceMode(force, silent); }
    applyPerformanceMode() { return this.toolbarManager.applyPerformanceMode(); }

    getSubManifest(moduleId, pageId = null) { return this.cableManager.getSubManifest(moduleId, pageId); }
    getPortDisplayInfo(moduleId, port, pageId = null) { return this.cableManager.getPortDisplayInfo(moduleId, port, pageId); }
    getPatchState(mId, pageId = this.currentPageId) { return this.cableManager.getPatchState(mId, pageId); }
    updatePortHighlight(skipCableRender = false) { return this.cableManager.updatePortHighlight(skipCableRender); }
    getSubActivePorts(m) { return this.cableManager.getSubActivePorts(m); }
    cleanupOrphanSubConnections(subPageId = null) { return this.cableManager.cleanupOrphanSubConnections(subPageId); }
    getConnectedPortColor(mId, portName, m) { return this.cableManager.getConnectedPortColor(mId, portName, m); }
    renderCables() { return this.cableManager.renderCables(); }
    handlePortTap(mId, pName) { return this.cableManager.handlePortTap(mId, pName); }
    removeConnectionsForPort(mId, port) { return this.cableManager.removeConnectionsForPort(mId, port); }

    getNestingDepth(pageId) { return this.pageManager.getNestingDepth(pageId); }
    getNextAvailablePageId() { return this.pageManager.getNextAvailablePageId(); }
    persistCurrentPage() { return this.pageManager.persistCurrentPage(); }
    switchPage(pageId, isBackAction = false) { return this.pageManager.switchPage(pageId, isBackAction); }
    updatePageNavUI() { return this.pageManager.updatePageNavUI(); }
    saveHistory() { return this.pageManager.saveHistory(); }
    undo() { return this.pageManager.undo(); }
    rebuildModule(id) { return this.pageManager.rebuildModule(id); }
    destroyModule(pageId, moduleId) { return this.pageManager.destroyModule(pageId, moduleId); }
    destroyPage(targetPageId) { return this.pageManager.destroyPage(targetPageId); }
    instantiateSubpatch(subpatchId, slotIdx) { return this.pageManager.instantiateSubpatch(subpatchId, slotIdx); }

    updateSelectionClasses() { return this.interactionManager.updateSelectionClasses(); }

    showToast(msg, duration = 1800) { return this.modalManager.showToast(msg, duration); }
    openModal(idx, title, widthCls, renderFn) { return this.modalManager.openModal(idx, title, widthCls, renderFn); }
    openSettingsModal(mId) { return this.modalManager.openSettingsModal(mId); }
    openDockModal(mId) { return this.modalManager.openDockModal(mId); }
    closeDockModal(mId = null) { return this.modalManager.closeDockModal(mId); }
    setDockLock(lock, mId = null) { return this.modalManager.setDockLock(lock, mId); }
    createModuleContext(id, isDock = false) { return this.modalManager.createModuleContext(id, isDock); }
    reRenderDockModal() { return this.modalManager.reRenderDockModal(); }
    reRenderModal() { return this.modalManager.reRenderModal(); }
    openAddModal(slotIdx) { return this.modalManager.openAddModal(slotIdx); }
    openCustomPrompt(title, init) { return this.modalManager.openCustomPrompt(title, init); }
    openCustomAlert(title, message, details = [], options = {}) { return this.modalManager.openCustomAlert(title, message, details, options); }

    getUserSubpatches() { return this.presetManager.getUserSubpatches(); }
    saveUserSubpatch(template, isOverwrite = false) { return this.presetManager.saveUserSubpatch(template, isOverwrite); }
    deleteUserSubpatch(id) { return this.presetManager.deleteUserSubpatch(id); }
    saveCurrentSubpatchToLibrary(customName) { return this.presetManager.saveCurrentSubpatchToLibrary(customName); }
    openSubpatchExportModal(template) { return this.presetManager.openSubpatchExportModal(template); }
    openSubpatchImportModal(onImported) { return this.presetManager.openSubpatchImportModal(onImported); }
    exportCurrentPreset() { return this.presetManager.exportCurrentPreset(); }
    loadPatchData(p, name = null) { return this.presetManager.loadPatchData(p, name); }
    loadActivePreset() { return this.presetManager.loadActivePreset(); }
    savePresetsDB() { return this.presetManager.savePresetsDB(); }
    saveCurrentPatch() { return this.presetManager.saveCurrentPatch(); }
    createNewPatch() { return this.presetManager.createNewPatch(); }
    openJsonExportModal() { return this.presetManager.openJsonExportModal(); }
    openJsonImportModal() { return this.presetManager.openJsonImportModal(); }
    openAiSpecModal() { return this.presetManager.openAiSpecModal(); }
    renderPresetList() { return this.presetManager.renderPresetList(); }
}
