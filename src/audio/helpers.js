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
        const sr = ctx.sampleRate;
        const clampedDur = Math.max(0.1, Math.min(dur, 10.0));
        const len = Math.max(128, Math.floor(sr * clampedDur));
        const b = ctx.createBuffer(2, len, sr);
        const l = b.getChannelData(0);
        const r = b.getChannelData(1);

        const cfg = {
            room:  { dec: 4.2, preMs: 6,  attMs: 4,  width: 1.2,  erGain: 0.55, tailGain: 0.9,  modDepth: 0.04, lpAlpha: 0.55 },
            hall:  { dec: 2.5, preMs: 16, attMs: 18, width: 1.45, erGain: 0.48, tailGain: 1.05, modDepth: 0.09, lpAlpha: 0.45 },
            plate: { dec: 2.0, preMs: 4,  attMs: 5,  width: 1.4,  erGain: 0.50, tailGain: 1.05, modDepth: 0.06, lpAlpha: 0.65 },
            space: { dec: 1.25, preMs: 24, attMs: 55, width: 1.75, erGain: 0.42, tailGain: 1.2, modDepth: 0.14, lpAlpha: 0.38 }
        }[mode] ?? { dec: 2.5, preMs: 16, attMs: 18, width: 1.45, erGain: 0.48, tailGain: 1.05, modDepth: 0.09, lpAlpha: 0.45 };

        // 1. Asymmetric Stereo Early Reflections (Haas effect for instant spatial width)
        const tapsL = [
            { ms: 9, g: 0.68 }, { ms: 17, g: -0.54 }, { ms: 27, g: 0.46 },
            { ms: 41, g: -0.38 }, { ms: 57, g: 0.31 }, { ms: 74, g: -0.24 }, { ms: 93, g: 0.18 }
        ];
        const tapsR = [
            { ms: 13, g: -0.66 }, { ms: 22, g: 0.53 }, { ms: 33, g: -0.45 },
            { ms: 47, g: 0.37 }, { ms: 63, g: -0.30 }, { ms: 82, g: 0.23 }, { ms: 101, g: -0.17 }
        ];
        const burstLen = Math.max(8, Math.floor(sr * 0.0028));
        const addTapBursts = (chData, taps, seedSign) => {
            for (const tap of taps) {
                const start = Math.floor((tap.ms * 0.001) * sr);
                if (start >= len) continue;
                const end = Math.min(len, start + burstLen);
                let lp = 0;
                for (let i = start; i < end; i++) {
                    const w = Math.sin(((i - start) / burstLen) * Math.PI);
                    const n = (Math.random() * 2 - 1) * seedSign;
                    lp += (n - lp) * 0.5;
                    chData[i] += lp * w * tap.g * cfg.erGain;
                }
            }
        };
        addTapBursts(l, tapsL, 1);
        addTapBursts(r, tapsR, -1);

        // 2. Wide Decorrelated Late Reverb Tail with Mid/Side Spread & Chorus Breathing
        const preSamples = Math.min(len - 1, Math.floor((cfg.preMs * 0.001) * sr));
        const attSamples = Math.max(1, Math.floor((cfg.attMs * 0.001) * sr));
        const tailLen = Math.max(1, len - preSamples);
        const normScale = 1.0 / Math.sqrt(Math.max(0.75, clampedDur * 0.42));

        let lpL = 0, lpR = 0;
        let apL = 0, apR = 0;
        for (let i = preSamples; i < len; i++) {
            const rel = i - preSamples;
            const t = rel / tailLen;
            const att = rel < attSamples ? (rel / attSamples) : 1.0;
            const endFade = t > 0.9 ? Math.cos(((t - 0.9) / 0.1) * Math.PI * 0.5) : 1.0;
            const env = att * Math.exp(-cfg.dec * t) * endFade * cfg.tailGain * normScale;

            const rawL = Math.random() * 2 - 1;
            const rawR = Math.random() * 2 - 1;
            lpL += (rawL - lpL) * cfg.lpAlpha;
            lpR += (rawR - lpR) * cfg.lpAlpha;

            // Simple allpass-like diffusion step for denser texture
            const dL = lpL - 0.35 * apL;
            apL = lpL;
            const dR = lpR - 0.35 * apR;
            apR = lpR;

            const sec = i / sr;
            const modL = 1.0 + cfg.modDepth * Math.sin(2.0 * Math.PI * 1.43 * sec);
            const modR = 1.0 + cfg.modDepth * Math.cos(2.0 * Math.PI * 1.87 * sec);

            const mid = (dL + dR) * 0.5;
            const side = (dL - dR) * 0.5 * cfg.width;

            l[i] += (mid + side) * env * modL;
            r[i] += (mid - side) * env * modR;
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

