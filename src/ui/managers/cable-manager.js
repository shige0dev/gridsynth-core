// src/ui/managers/cable-manager.js
import { parseConn, isSameConn, getPortSignalType, resolveConnectionSignalType, isSubModule, isSubIOModule, normalizeSubPort, getOppositeSubPort, getPortAliases, isPortMatching } from '../../core/utils.js?v=292';
import { MODULE_REGISTRY } from '../../modules/registry.js?v=292';
import { WaveCodec } from '../../audio/wave-codec.js?v=292';

export class CableManager {
    constructor(ui) {
        this.ui = ui;
        this.selectedTargetForConnection = null;
    }

    get cableCanvas() {
        return this.ui.cableCanvas;
    }

    getModuleIdByCell(cellIndex) {
        if (cellIndex === null || cellIndex === undefined) return null;
        return this.ui.gridMap[cellIndex] || null;
    }

    findPortElement(moduleId, port) {
        if (!moduleId || !port) return null;
        let el = document.querySelector(`[data-port-id="${moduleId}:${port}"]`) ||
                 document.querySelector(`[data-module-id="${moduleId}"][data-port="${port}"]`);
        if (el) return el;

        if (isSubModule(moduleId)) {
            const norm = normalizeSubPort(port, moduleId);
            el = document.querySelector(`[data-port-id="${moduleId}:${norm}"]`) ||
                 document.querySelector(`[data-module-id="${moduleId}"][data-port="${norm}"]`);
            if (el) return el;
        }

        const aliases = getPortAliases(port);
        for (const alt of aliases) {
            if (alt === port) continue;
            el = document.querySelector(`[data-port-id="${moduleId}:${alt}"]`) ||
                 document.querySelector(`[data-module-id="${moduleId}"][data-port="${alt}"]`);
            if (el) return el;
        }
        return null;
    }

    updatePortHighlight() {
        document.querySelectorAll('.port').forEach(el => {
            el.classList.remove('port-selected', 'port-connected-highlight');
            el.style.removeProperty('--conn-glow');
            el.style.removeProperty('--conn-bright');
        });
        if (this.ui.selectedModuleIds.length > 0) {
            this.selectedTargetForConnection = null;
            this.renderCables();
            return;
        }
        if (this.selectedTargetForConnection) {
            const { moduleId, port } = this.selectedTargetForConnection;
            const el = this.findPortElement(moduleId, port);
            if (el) el.classList.add('port-selected');

            // Highlight all connected opposite ports
            this.ui.connections.forEach(c => {
                const conn = typeof c === 'string' ? parseConn(c) : c;
                if (!conn) return;
                let target = null;
                const isFromSub = isSubModule(conn.from.moduleId);
                const isToSub = isSubModule(conn.to.moduleId);
                const isCurSub = isSubModule(moduleId);

                const fromMatch = conn.from.moduleId === moduleId && (conn.from.port === port || isPortMatching(conn.from.port, port) || (isFromSub && isCurSub && normalizeSubPort(conn.from.port, conn.from.moduleId) === normalizeSubPort(port, moduleId)));
                const toMatch = conn.to.moduleId === moduleId && (conn.to.port === port || isPortMatching(conn.to.port, port) || (isToSub && isCurSub && normalizeSubPort(conn.to.port, conn.to.moduleId) === normalizeSubPort(port, moduleId)));

                if (fromMatch) {
                    target = conn.to;
                } else if (toMatch) {
                    target = conn.from;
                }
                if (target) {
                    const oppEl = this.findPortElement(target.moduleId, target.port);
                    if (oppEl) {
                        const sig = resolveConnectionSignalType(conn);
                        oppEl.classList.add('port-connected-highlight');
                        oppEl.style.setProperty('--conn-glow', sig.stroke || '#38bdf8');
                        oppEl.style.setProperty('--conn-bright', sig.brightStroke || '#ffffff');
                    }
                }
            });
        }
        this.renderCables();
    }

    getSubActivePorts(m) {
        if (!m || m.type !== 'SUB') return null;
        const targetPage = String(m.targetPage ?? 1);
        const active = new Set();
        const subConns = (this.ui.currentPageId === targetPage) ? this.ui.connections : (this.ui.pagesData[targetPage]?.connections || []);
        subConns.forEach(c => {
            const o = typeof c === 'string' ? parseConn(c) : c;
            if (o) {
                if (isSubModule(o.from.moduleId)) {
                    const norm = normalizeSubPort(o.from.port, o.from.moduleId);
                    active.add(norm);
                    active.add(getOppositeSubPort(norm));
                }
                if (isSubModule(o.to.moduleId)) {
                    const norm = normalizeSubPort(o.to.port, o.to.moduleId);
                    active.add(norm);
                    active.add(getOppositeSubPort(norm));
                }
            }
        });
        return active;
    }

    cleanupOrphanSubConnections(subPageId = null) {
        const pId = String(subPageId ?? this.ui.currentPageId);
        if (pId === "0") return;

        if (this.ui.currentPageId === pId) {
            this.ui.persistCurrentPage();
        }

        const subConns = (pId === this.ui.currentPageId) ? this.ui.connections : (this.ui.pagesData[pId]?.connections || []);
        const activeIOPorts = new Set();
        subConns.forEach(c => {
            const o = typeof c === 'string' ? parseConn(c) : c;
            if (o) {
                if (isSubModule(o.from.moduleId)) {
                    const norm = normalizeSubPort(o.from.port, o.from.moduleId);
                    activeIOPorts.add(norm);
                    activeIOPorts.add(getOppositeSubPort(norm));
                }
                if (isSubModule(o.to.moduleId)) {
                    const norm = normalizeSubPort(o.to.port, o.to.moduleId);
                    activeIOPorts.add(norm);
                    activeIOPorts.add(getOppositeSubPort(norm));
                }
            }
        });

        Object.entries(this.ui.pagesData).forEach(([parentPId, pData]) => {
            if (parentPId === pId || !pData?.modules) return;
            const subMods = Object.entries(pData.modules).filter(([_, mod]) => mod.type === 'SUB' && String(mod.targetPage ?? 1) === pId);
            if (!subMods.length) return;

            let parentConns = (parentPId === this.ui.currentPageId) ? this.ui.connections : (pData.connections || []);
            const orphanConns = [];

            parentConns.forEach(c => {
                const o = typeof c === 'string' ? parseConn(c) : c;
                if (!o) return;
                for (const [subModId, _] of subMods) {
                    if (o.from.moduleId === subModId && !activeIOPorts.has(normalizeSubPort(o.from.port, 'SUB')) && !activeIOPorts.has(o.from.port)) {
                        orphanConns.push(c);
                    }
                    if (o.to.moduleId === subModId && !activeIOPorts.has(normalizeSubPort(o.to.port, 'SUB')) && !activeIOPorts.has(o.to.port)) {
                        orphanConns.push(c);
                    }
                }
            });

            if (orphanConns.length > 0) {
                orphanConns.forEach(c => {
                    const o = typeof c === 'string' ? parseConn(c) : c;
                    this.ui.synth.disconnect(`${parentPId}/${o.from.moduleId}`, o.from.port, `${parentPId}/${o.to.moduleId}`, o.to.port);
                });
                const remaining = parentConns.filter(c => !orphanConns.includes(c));
                if (parentPId === this.ui.currentPageId) {
                    this.ui.connections = remaining;
                    this.renderCables();
                    this.ui.updateAllCells();
                }
                pData.connections = remaining;
            }
        });
    }

    getConnectedPortColor(mId, portName, m) {
        const isSub = m?.type === 'SUB';
        const isSubIO = m?.type === 'SUB_IO';
        if (!isSub && !isSubIO) return 'bg-slate-500';

        const normPort = normalizeSubPort(portName, m.type);
        const oppPort = getOppositeSubPort(normPort);

        const findColorInConns = (conns, modId, targetModMap, targetPort) => {
            for (const c of conns) {
                const o = typeof c === 'string' ? parseConn(c) : c;
                if (!o) continue;
                let other = null;
                const fPortNorm = isSubModule(o.from.moduleId) ? normalizeSubPort(o.from.port, o.from.moduleId) : o.from.port;
                const tPortNorm = isSubModule(o.to.moduleId) ? normalizeSubPort(o.to.port, o.to.moduleId) : o.to.port;

                if (o.from.moduleId === modId && (fPortNorm === targetPort || o.from.port === targetPort)) {
                    other = o.to;
                } else if (o.to.moduleId === modId && (tPortNorm === targetPort || o.to.port === targetPort)) {
                    other = o.from;
                }
                if (other) {
                    const otherMod = targetModMap[other.moduleId];
                    if (otherMod) {
                        const reg = MODULE_REGISTRY[otherMod.type];
                        if (reg) {
                            const otherPorts = reg.ports(otherMod);
                            const otherNorm = isSubModule(otherMod.type) ? normalizeSubPort(other.port, otherMod.type) : other.port;
                            const match = [...(otherPorts.in || []), ...(otherPorts.out || [])].find(p => p.port === other.port || normalizeSubPort(p.port, otherMod.type) === otherNorm);
                            if (match && match.color && match.color !== 'bg-slate-500') return match.color;
                        }
                    }
                    const sig = getPortSignalType(other.port, other.moduleId);
                    if (sig.tailwind !== 'bg-slate-500') return sig.tailwind;
                }
            }
            return null;
        };

        if (isSub) {
            const p0Conns = this.ui.currentPageId === "0" ? this.ui.connections : (this.ui.pagesData["0"]?.connections || []);
            const p0Mods = this.ui.currentPageId === "0" ? this.ui.modules : (this.ui.pagesData["0"]?.modules || {});
            const c0 = findColorInConns(p0Conns, mId, p0Mods, normPort);
            if (c0) return c0;

            const targetPage = String(m?.targetPage ?? 1);
            const subConns = this.ui.currentPageId === targetPage ? this.ui.connections : (this.ui.pagesData[targetPage]?.connections || []);
            const subMods = this.ui.currentPageId === targetPage ? this.ui.modules : (this.ui.pagesData[targetPage]?.modules || {});
            const ioModId = Object.keys(subMods).find(k => subMods[k].type === 'SUB_IO') || 'SUB_IO1';
            const cSub = findColorInConns(subConns, ioModId, subMods, oppPort);
            if (cSub) return cSub;
        } else if (isSubIO) {
            const curConns = this.ui.connections;
            const curMods = this.ui.modules;
            const cCur = findColorInConns(curConns, mId, curMods, normPort);
            if (cCur) return cCur;

            const p0Conns = this.ui.pagesData["0"]?.connections || [];
            const p0Mods = this.ui.pagesData["0"]?.modules || {};
            const subModEntry = Object.entries(p0Mods).find(([_, mod]) => mod.type === 'SUB' && String(mod.targetPage ?? 1) === this.ui.currentPageId);
            if (subModEntry) {
                const c0 = findColorInConns(p0Conns, subModEntry[0], p0Mods, oppPort);
                if (c0) return c0;
            }
        }

        return 'bg-slate-500';
    }

    renderCables() {
        if (!this.cableCanvas) return;
        this.cableCanvas.innerHTML = '';
        const cr = this.cableCanvas.getBoundingClientRect();
        const sel = this.selectedTargetForConnection;
        const hasSel = !!sel;

        let hasMatchedConn = false;
        if (hasSel) {
            hasMatchedConn = this.ui.connections.some(c =>
                (c.from.moduleId === sel.moduleId && c.from.port === sel.port) ||
                (c.to.moduleId === sel.moduleId && c.to.port === sel.port)
            );
        }

        const connsToRender = [...this.ui.connections].sort((a, b) => {
            if (!hasSel || !hasMatchedConn) return 0;
            const aMatch = (a.from.moduleId === sel.moduleId && a.from.port === sel.port) || (a.to.moduleId === sel.moduleId && a.to.port === sel.port);
            const bMatch = (b.from.moduleId === sel.moduleId && b.from.port === sel.port) || (b.to.moduleId === sel.moduleId && b.to.port === sel.port);
            if (aMatch && !bMatch) return 1;
            if (!aMatch && bMatch) return -1;
            return 0;
        });

        connsToRender.forEach(conn => {
            const fromId = conn.from?.moduleId || this.getModuleIdByCell(conn.from?.cell);
            const toId = conn.to?.moduleId || this.getModuleIdByCell(conn.to?.cell);
            const fEl = this.findPortElement(fromId, conn.from?.port);
            const tEl = this.findPortElement(toId, conn.to?.port);
            if (!fEl || !tEl) return;
            const r1 = fEl.getBoundingClientRect(), r2 = tEl.getBoundingClientRect();
            const x1 = r1.left + r1.width / 2 - cr.left, y1 = r1.top + r1.height / 2 - cr.top;
            const x2 = r2.left + r2.width / 2 - cr.left, y2 = r2.top + r2.height / 2 - cr.top;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const dx = x2 - x1;
            const dy = y2 - y1;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Upper-bound capped sag: 2.5x droop (min 40px, max 70px)
            const curveY = Math.min(70, Math.max(40, (14 + dist * 0.05) * 2.5));
            const baseY = Math.max(y1, y2) + curveY;

            let cp1x, cp2x;
            if (Math.abs(dx) < 12) {
                const bulge = Math.min(28, Math.max(16, dist * 0.12));
                cp1x = x1 + bulge;
                cp2x = x2 + bulge;
            } else {
                cp1x = x1 + dx * 0.38;
                cp2x = x2 - dx * 0.38;
            }
            const cp1y = baseY;
            const cp2y = baseY;

            path.setAttribute('d', `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`);

            const sig = resolveConnectionSignalType(conn);
            const strokeColor = sig.stroke;
            const brightStrokeColor = sig.brightStroke;

            const isFromSub = isSubModule(conn.from.moduleId);
            const isToSub = isSubModule(conn.to.moduleId);
            const isSelSub = sel && isSubModule(sel.moduleId);

            const isMatched = hasSel && (
                (conn.from.moduleId === sel.moduleId && (conn.from.port === sel.port || (isFromSub && isSelSub && normalizeSubPort(conn.from.port, conn.from.moduleId) === normalizeSubPort(sel.port, sel.moduleId)))) ||
                (conn.to.moduleId === sel.moduleId && (conn.to.port === sel.port || (isToSub && isSelSub && normalizeSubPort(conn.to.port, conn.to.moduleId) === normalizeSubPort(sel.port, sel.moduleId))))
            );

            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');

            const normalOpacity = String(this.ui.cableOpacity ?? 1.0);

            if (isMatched) {
                path.setAttribute('stroke', brightStrokeColor);
                path.setAttribute('stroke-width', '5');
                path.setAttribute('stroke-opacity', '1.0');
                path.style.filter = `drop-shadow(0 0 3px ${strokeColor})`;
            } else {
                path.setAttribute('stroke', strokeColor);
                path.setAttribute('stroke-width', '4');
                path.setAttribute('stroke-opacity', normalOpacity);
            }
            this.cableCanvas.appendChild(path);
        });
    }

    handlePortTap(mId, pName) {
        const cur = { moduleId: mId, port: pName };
        const info = this.ui.getPortDisplayInfo ? this.ui.getPortDisplayInfo(mId, pName) : { label: pName, desc: null, hasAlias: false };
        if (!this.selectedTargetForConnection) {
            this.selectedTargetForConnection = cur;
            this.updatePortHighlight();
            const toastLabel = info.hasAlias ? info.label : pName;
            this.ui.showToast(`[${mId}:${toastLabel}] 接続先をタップしてください`);
        } else {
            const first = this.selectedTargetForConnection;
            if (first.moduleId === cur.moduleId && first.port === cur.port) {
                this.selectedTargetForConnection = null;
                this.updatePortHighlight();
                this.ui.showToast('接続をキャンセルしました');
                return;
            }
            if (first.moduleId === cur.moduleId) {
                this.selectedTargetForConnection = cur;
                this.updatePortHighlight();
                const toastLabel = info.hasAlias ? info.label : pName;
                this.ui.showToast(`[${mId}:${toastLabel}] 選択端子を変更しました`);
                return;
            } else {
                const m1 = this.ui.modules[first.moduleId], m2 = this.ui.modules[cur.moduleId];
                const isOut = (m, p) => {
                    if (!m) return false;
                    const ctx = {
                        id: m.id,
                        subActivePorts: m.type === 'SUB' ? this.getSubActivePorts(m) : null,
                        getPortColor: (pName) => this.getConnectedPortColor(m.id, pName, m)
                    };
                    const isSub = isSubModule(m.type);
                    const manifest = isSub ? this.ui.getSubManifest(m.id) : null;
                    const pNorm = isSub ? normalizeSubPort(p, m.type, manifest) : p;
                    return MODULE_REGISTRY[m?.type]?.ports(m, ctx)?.out?.some(x => x.port === p || (isSub && normalizeSubPort(x.port, m.type, manifest) === pNorm));
                };

                const o1 = isOut(m1, first.port), o2 = isOut(m2, cur.port);
                if (o1 === o2) {
                    this.ui.showToast('IN同士/OUT同士は接続不可');
                    this.selectedTargetForConnection = null;
                    this.updatePortHighlight();
                    return;
                }
                const src = o1 ? first : cur;
                const dst = o1 ? cur : first;

                const isSrcLink = src.port === 'link_out' || src.port === 'link_in';
                const isDstLink = dst.port === 'link_out' || dst.port === 'link_in';
                if (isSrcLink !== isDstLink) {
                    this.ui.showToast('LINK端子はWAVEのLINK端子同士のみ接続可能です');
                    this.selectedTargetForConnection = null;
                    this.updatePortHighlight();
                    return;
                }

                const cand = { from: src, to: dst };
                if (this.ui.connections.some(c => isSameConn(c, cand))) {
                    this.ui.showToast('既に接続されています');
                } else {
                    this.ui.saveHistory();
                    if (dst.port === 'link_in') {
                        // A WAVE module can only have one upstream link_in source at a time
                        this.ui.connections = this.ui.connections.filter(c => !(c.to.moduleId === dst.moduleId && c.to.port === 'link_in'));
                    }
                    this.ui.connections.push(cand);

                    const mSrc = this.ui.modules[src.moduleId];
                    const regSrc = mSrc && MODULE_REGISTRY[mSrc.type];
                    regSrc?.onConnect?.(mSrc, { port: src.port, isSource: true, otherMod: this.ui.modules[dst.moduleId], otherPort: dst.port });

                    const mDst = this.ui.modules[dst.moduleId];
                    const regDst = mDst && MODULE_REGISTRY[mDst.type];
                    regDst?.onConnect?.(mDst, { port: dst.port, isSource: false, otherMod: mSrc, otherPort: src.port });

                    this.ui.synth.connect(`${this.ui.currentPageId}/${src.moduleId}`, src.port, `${this.ui.currentPageId}/${dst.moduleId}`, dst.port);
                    const linkedWaveIds = WaveCodec.syncWaveLinks({ modules: this.ui.modules, connections: this.ui.connections }, this.ui.synth, this.ui.currentPageId);
                    this.ui.synth.updateModule(`${this.ui.currentPageId}/${src.moduleId}`, this.ui.modules[src.moduleId], this.ui.getPatchState(src.moduleId));
                    this.ui.synth.updateModule(`${this.ui.currentPageId}/${dst.moduleId}`, this.ui.modules[dst.moduleId], this.ui.getPatchState(dst.moduleId));
                    this.ui.persistCurrentPage();
                    this.cleanupOrphanSubConnections(this.ui.currentPageId);
                    this.ui.updateAllCells();
                    const affectedSet = new Set([src.moduleId, dst.moduleId, ...linkedWaveIds]);
                    const isDockAffected = Array.from(affectedSet).some(id => this.ui.modalManager?.openDocks?.has(id) || this.ui.activeDockModuleId === id);
                    if (isDockAffected) this.ui.reRenderDockModal();
                    if (this.ui.activePopupModuleId && affectedSet.has(this.ui.activePopupModuleId)) this.ui.reRenderModal();
                    this.ui.showToast('結線しました');
                }
            }
            this.selectedTargetForConnection = null;
            this.updatePortHighlight();
        }
    }

    removeConnectionsForPort(mId, port) {
        const isSub = isSubModule(mId);
        const normPort = isSub ? normalizeSubPort(port, mId) : port;

        const matches = (cMId, cPort) => {
            if (cMId !== mId) return false;
            if (cPort === port) return true;
            if (isSub && normalizeSubPort(cPort, cMId) === normPort) return true;
            return false;
        };

        const toRemove = this.ui.connections.filter(c => matches(c.to.moduleId, c.to.port) || matches(c.from.moduleId, c.from.port));
        toRemove.forEach(c => this.ui.synth.disconnect(`${this.ui.currentPageId}/${c.from.moduleId}`, c.from.port, `${this.ui.currentPageId}/${c.to.moduleId}`, c.to.port));
        this.ui.connections = this.ui.connections.filter(c => !(matches(c.to.moduleId, c.to.port) || matches(c.from.moduleId, c.from.port)));
        const affectedIds = new Set();
        toRemove.forEach(c => {
            affectedIds.add(c.from.moduleId);
            affectedIds.add(c.to.moduleId);
        });
        const linkedWaveIds = WaveCodec.syncWaveLinks({ modules: this.ui.modules, connections: this.ui.connections }, this.ui.synth, this.ui.currentPageId);
        linkedWaveIds.forEach(id => affectedIds.add(id));
        affectedIds.forEach(id => {
            if (this.ui.modules[id]) {
                this.ui.synth.updateModule(`${this.ui.currentPageId}/${id}`, this.ui.modules[id], this.ui.getPatchState(id));
            }
        });
        this.ui.persistCurrentPage();
        this.cleanupOrphanSubConnections(this.ui.currentPageId);
        this.renderCables();
        this.ui.updateAllCells();
        const isDockAffected = Array.from(this.ui.modalManager?.openDocks?.keys() || []).some(id => affectedIds.has(id)) || (this.ui.activeDockModuleId && affectedIds.has(this.ui.activeDockModuleId));
        if (isDockAffected) this.ui.reRenderDockModal();
        if (this.ui.activePopupModuleId && affectedIds.has(this.ui.activePopupModuleId)) this.ui.reRenderModal();
    }
}
