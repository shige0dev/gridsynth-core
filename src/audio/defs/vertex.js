// src/audio/defs/vertex.js
// Audio / Engine side implementation for VERTEX module
// Dynamic Procedural Vertex Displacement (Wave, Spike, Twist, Wobble, Pinch)

export const VERTEX = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;

        // CV input for depth modulation (PIN4)
        const gCv = ctx.createGain();
        const anCv = ctx.createAnalyser();
        anCv.fftSize = 32;
        gCv.connect(anCv);

        if (eng?.silentSink) {
            gCv.connect(eng.silentSink);
        }

        const buf = new Float32Array(32);
        const readCv = (an, def = 0) => {
            an.getFloatTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < 32; i++) sum += buf[i];
            const avg = sum / 32;
            return isNaN(avg) ? def : avg;
        };

        const getSourcePacket = () => {
            if (!eng?.modules) return null;
            const pageId = d.pageId || (window.__GS_APP__?.currentPageId ?? '0');
            const conns = window.__GS_APP__?.connections || window.__GS_APP__?.pagesData?.[pageId]?.connections || [];

            let connSrc = null;
            for (const c of conns) {
                const toMod = c.to?.moduleId || (typeof c === 'string' && c.split('>')[1]?.split(':')[0]?.trim());
                const toPort = c.to?.port || (typeof c === 'string' && c.split('>')[1]?.split(':')[1]?.trim());
                const fromMod = c.from?.moduleId || (typeof c === 'string' && c.split('>')[0]?.split(':')[0]?.trim());

                if (toMod === d.id && (toPort === 'obj_in' || toPort === 'geo_in')) {
                    connSrc = fromMod;
                    break;
                }
            }

            if (!connSrc) return null;
            const srcMod = eng.modules[`${pageId}/${connSrc}`] || eng.modules[connSrc];
            return srcMod?.getGeometryPacket ? srcMod.getGeometryPacket() : null;
        };

        let cachedBaseGeom = null;
        let origPositions = null;
        let origNormals = null;
        let workingGeom = null;

        const updateWorkingGeometry = (baseGeom) => {
            if (!baseGeom || !baseGeom.attributes || !baseGeom.attributes.position) return null;

            if (cachedBaseGeom !== baseGeom) {
                if (workingGeom) {
                    try { workingGeom.dispose(); } catch (_) {}
                }
                workingGeom = baseGeom.clone();
                origPositions = new Float32Array(baseGeom.attributes.position.array);
                if (baseGeom.attributes.normal) {
                    origNormals = new Float32Array(baseGeom.attributes.normal.array);
                } else {
                    origNormals = null;
                }
                cachedBaseGeom = baseGeom;
            }
            return workingGeom;
        };

        return {
            nodes: { gCv, anCv },
            inputs: {
                cv_in: gCv,
                obj_in: null
            },
            outputs: {
                obj_out: null
            },
            data: d,
            getGeometryPacket: () => {
                const pkt = getSourcePacket();
                if (!pkt) return null;

                const baseGeom = pkt.geometry;
                if (!baseGeom) return pkt;

                const geom = updateWorkingGeometry(baseGeom);
                if (!geom || !origPositions) return pkt;

                const isCv = Boolean(patchState?.has('cv_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('cv_in') : false));
                const cvVal = isCv ? readCv(anCv, 0) : 0;
                const manualDepth = Number(d.depth ?? 0.35);
                const effDepth = Math.max(0.0, Math.min(2.0, isCv ? cvVal : manualDepth));

                const mode = d.mode || 'wave';
                const freq = Number(d.freq ?? 3.0);
                const speed = Number(d.speed ?? 1.0);
                const time = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.003 * speed;

                const posAttr = geom.attributes.position;
                const posArr = posAttr.array;
                const count = posAttr.count;

                for (let i = 0; i < count; i++) {
                    const idx = i * 3;
                    const ox = origPositions[idx];
                    const oy = origPositions[idx + 1];
                    const oz = origPositions[idx + 2];

                    let nx = 0, ny = 1, nz = 0;
                    if (origNormals) {
                        nx = origNormals[idx];
                        ny = origNormals[idx + 1];
                        nz = origNormals[idx + 2];
                    } else {
                        const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1.0;
                        nx = ox / len; ny = oy / len; nz = oz / len;
                    }

                    if (mode === 'wave') {
                        // Sinusoidal Ripple Wave
                        const wave1 = Math.sin(ox * freq + time) * 0.4 * effDepth;
                        const wave2 = Math.cos(oz * freq + time * 1.2) * 0.4 * effDepth;
                        posArr[idx] = ox;
                        posArr[idx + 1] = oy + wave1 + wave2;
                        posArr[idx + 2] = oz;
                    } else if (mode === 'spike') {
                        // Outward Normal Spikes
                        const spk = Math.max(0.0, Math.sin(ox * freq + time) * Math.sin(oy * freq + time * 0.8) * Math.sin(oz * freq)) * 1.6 * effDepth;
                        posArr[idx] = ox + nx * spk;
                        posArr[idx + 1] = oy + ny * spk;
                        posArr[idx + 2] = oz + nz * spk;
                    } else if (mode === 'twist') {
                        // Twists around Y axis based on height
                        const angle = oy * freq * 0.5 * effDepth + time * 0.3;
                        const cosA = Math.cos(angle);
                        const sinA = Math.sin(angle);
                        posArr[idx] = ox * cosA - oz * sinA;
                        posArr[idx + 1] = oy;
                        posArr[idx + 2] = ox * sinA + oz * cosA;
                    } else if (mode === 'wobble') {
                        // 3D Organic Pulsing Noise
                        const w = (Math.sin(ox * freq + time) + Math.cos(oy * freq + time * 1.3) + Math.sin(oz * freq + time * 0.7)) * 0.25 * effDepth;
                        posArr[idx] = ox * (1.0 + w);
                        posArr[idx + 1] = oy * (1.0 + w);
                        posArr[idx + 2] = oz * (1.0 + w);
                    } else if (mode === 'pinch') {
                        // Taper / Pinch along Y axis (with freq & speed modulation)
                        const pinch = 1.0 - Math.cos(oy * freq * 0.6 + time) * 0.6 * effDepth;
                        posArr[idx] = ox * pinch;
                        posArr[idx + 1] = oy;
                        posArr[idx + 2] = oz * pinch;
                    } else {
                        posArr[idx] = ox;
                        posArr[idx + 1] = oy;
                        posArr[idx + 2] = oz;
                    }
                }

                posAttr.needsUpdate = true;
                try { geom.computeVertexNormals(); } catch (_) {}

                return {
                    ...pkt,
                    geometry: geom
                };
            },
            read: () => {
                const isCv = Boolean(patchState?.has('cv_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('cv_in') : false));
                return {
                    depth: Number(d.depth ?? 0.35),
                    mode: d.mode || 'wave',
                    freq: Number(d.freq ?? 3.0),
                    isCvPatched: isCv
                };
            },
            destroy: () => {
                if (workingGeom) {
                    try { workingGeom.dispose(); } catch (_) {}
                    workingGeom = null;
                }
            }
        };
    },
    update: (ctx, inst, d) => {
        inst.data = d;
    }
};

export const vertexAudioDefs = {
    VERTEX
};
export default vertexAudioDefs;
