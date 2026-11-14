export const AudioHelpers = {
    set: (p, v, ctx, t = 0.015) => {
        if (!p || !ctx) return;
        try {
            const now = ctx.currentTime;
            if (typeof p.cancelScheduledValues === 'function') {
                p.cancelScheduledValues(now);
            }
            p.setTargetAtTime(v, now, t);
        } catch (e) {
            try {
                if (typeof p.cancelScheduledValues === 'function') {
                    p.cancelScheduledValues(ctx.currentTime);
                }
                p.setValueAtTime(v, ctx.currentTime);
            } catch (_) {
                try { p.value = v; } catch (__) {}
            }
        }
    },
    cleanup: (nodes) => {
        if (!nodes) return;
        const cleanItem = (n) => {
            if (!n) return;
            if (typeof n.stop === 'function') { try { n.stop(); } catch(e){} }
            if (typeof n.disconnect === 'function') { try { n.disconnect(); } catch(e){} }
            if (typeof n === 'object' && !n.connect && !n.disconnect) {
                Object.values(n).forEach(cleanItem);
            }
        };
        Object.values(nodes).forEach(cleanItem);
    },
    buildReverbBuffer: (ctx, dur, mode = 'hall') => {
        const sr = ctx.sampleRate, len = Math.max(128, Math.floor(sr * Math.max(0.1, Math.min(dur, 6.0))));
        const b = ctx.createBuffer(2, len, sr), l = b.getChannelData(0), r = b.getChannelData(1);
        const dec = { room: 5.2, hall: 3.2, plate: 2.4 }[mode] ?? 3.2;
        const decayCoeff = Math.exp((-dec * 3.0) / len);
        let env = 1.0;
        for (let i = 0; i < len; i++) {
            l[i] = (Math.random() * 2 - 1) * env;
            r[i] = (Math.random() * 2 - 1) * env;
            env *= decayCoeff;
        }
        return b;
    },
    createCvReader: (ctx, eng, initialGain = 1.0) => {
        const input = ctx.createGain();
        input.gain.value = initialGain;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 32;
        input.connect(analyser);
        if (eng && eng.silentSink) input.connect(eng.silentSink);
        const buf = new Float32Array(32);
        const read = (def = 0) => {
            analyser.getFloatTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < 32; i++) sum += buf[i];
            const avg = sum / 32;
            return Number.isNaN(avg) ? def : avg;
        };
        const readPeak = () => {
            analyser.getFloatTimeDomainData(buf);
            let peak = 0;
            for (let i = 0; i < 32; i++) {
                const a = Math.abs(buf[i]);
                if (a > peak) peak = a;
            }
            return peak;
        };
        return { input, analyser, read, readPeak, nodes: [input, analyser] };
    },
    isPortPatched: (d, patchState, port) => {
        if (patchState?.has(port)) return true;
        return Boolean(typeof window !== 'undefined' && window.__GS_APP__?.getPatchState?.(d.id)?.has(port));
    },
    getUpstreamModules: (eng, d, targetPorts = ['obj_in'], patchState = null, requirePatch = false) => {
        const res = [];
        if (!eng?.modules || !d) return res;
        const portList = Array.isArray(targetPorts) ? targetPorts : [targetPorts];
        if (requirePatch) {
            const anyPatched = portList.some(p => AudioHelpers.isPortPatched(d, patchState, p));
            if (!anyPatched) return res;
        }
        const pageId = d.pageId || (typeof window !== 'undefined' ? (window.__GS_APP__?.currentPageId ?? '0') : '0');
        const conns = (typeof window !== 'undefined' && (window.__GS_APP__?.connections || window.__GS_APP__?.pagesData?.[pageId]?.connections)) || [];
        for (const c of conns) {
            let fromModId = null;
            let toModId = null;
            let toPort = null;
            if (typeof c === 'string') {
                const parts = c.split('>');
                if (parts.length === 2) {
                    fromModId = parts[0].split(':')[0].trim();
                    const toParts = parts[1].split(':');
                    toModId = toParts[0].trim();
                    toPort = (toParts[1] || '').trim();
                }
            } else if (c && c.from && c.to) {
                fromModId = c.from.moduleId;
                toModId = c.to.moduleId;
                toPort = c.to.port;
            }
            if (toModId === d.id && portList.includes(toPort) && fromModId) {
                const mod = eng.modules[`${pageId}/${fromModId}`] || eng.modules[fromModId];
                if (mod) res.push(mod);
            }
        }
        return res;
    },
    getSourcePackets: (eng, d, targetPorts = ['obj_in'], patchState = null, requirePatch = false) => {
        const mods = AudioHelpers.getUpstreamModules(eng, d, targetPorts, patchState, requirePatch);
        const pkts = [];
        for (const mod of mods) {
            if (typeof mod.getGeometryPacket === 'function') {
                const p = mod.getGeometryPacket();
                if (p) pkts.push(p);
            }
        }
        return pkts;
    },
    getSourcePacket: (eng, d, targetPorts = ['obj_in'], patchState = null, requirePatch = false) => {
        const mods = AudioHelpers.getUpstreamModules(eng, d, targetPorts, patchState, requirePatch);
        for (const mod of mods) {
            if (typeof mod.getGeometryPacket === 'function') {
                const p = mod.getGeometryPacket();
                if (p) return p;
            }
        }
        return null;
    },
    getSourceCanvas: (eng, d, targetPorts = ['video_in']) => {
        const mods = AudioHelpers.getUpstreamModules(eng, d, targetPorts);
        for (const mod of mods) {
            if (typeof mod.getSharedCanvas === 'function') {
                const cvs = mod.getSharedCanvas();
                if (cvs) return cvs;
            }
        }
        return null;
    },
    addBarycentric: (srcGeom) => {
        const THREE = window.THREE;
        const g = srcGeom.index ? srcGeom.toNonIndexed() : srcGeom.clone();
        const count = g.attributes.position.count;
        const centers = new Float32Array(count * 3);
        for (let i = 0; i < count; i += 3) {
            centers[i * 3 + 0] = 1; centers[i * 3 + 1] = 0; centers[i * 3 + 2] = 0;
            centers[(i + 1) * 3 + 0] = 0; centers[(i + 1) * 3 + 1] = 1; centers[(i + 1) * 3 + 2] = 0;
            centers[(i + 2) * 3 + 0] = 0; centers[(i + 2) * 3 + 1] = 0; centers[(i + 2) * 3 + 2] = 1;
        }
        g.setAttribute('aBarycentric', new THREE.BufferAttribute(centers, 3));
        if (!g.attributes.normal) g.computeVertexNormals();
        if (srcGeom !== g) srcGeom.dispose();
        return g;
    }
};

if (typeof window !== 'undefined') {
    window.AudioHelpers = AudioHelpers;
}

