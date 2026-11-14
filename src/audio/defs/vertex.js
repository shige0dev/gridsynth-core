// src/audio/defs/vertex.js
// Audio / Engine side implementation for VERTEX module
// Dynamic Procedural Vertex Displacement (Wave, Spike, Twist, Wobble, Pinch)

import { AudioHelpers } from '../helpers.js';

export const VERTEX = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;
        const cvReader = AudioHelpers.createCvReader(ctx, eng);

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
            nodes: { gCv: cvReader.input, anCv: cvReader.analyser },
            inputs: {
                cv_in: cvReader.input,
                obj_in: null
            },
            outputs: {
                obj_out: null
            },
            data: d,
            getGeometryPacket: () => {
                const pkt = AudioHelpers.getSourcePacket(eng, d, ['obj_in']);
                if (!pkt) return null;

                const baseGeom = pkt.geometry;
                if (!baseGeom) return pkt;

                const geom = updateWorkingGeometry(baseGeom);
                if (!geom || !origPositions) return pkt;

                const isCv = AudioHelpers.isPortPatched(d, patchState, 'cv_in');
                const cvVal = isCv ? cvReader.read(0) : 0;
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
                const isCv = AudioHelpers.isPortPatched(d, patchState, 'cv_in');
                return {
                    depth: Number(d.depth ?? 0.35),
                    mode: d.mode || 'wave',
                    freq: Number(d.freq ?? 3.0),
                    isCvPatched: isCv
                };
            },
            updatePatchState: (p) => {
                patchState = p;
            },
            destroy: () => {
                if (workingGeom) {
                    try { workingGeom.dispose(); } catch (_) {}
                    workingGeom = null;
                }
                try { cvReader.input.disconnect(); } catch (_) {}
                try { cvReader.analyser.disconnect(); } catch (_) {}
            }
        };
    },
    update: (ctx, inst, d, patch) => {
        inst.data = d;
        if (patch !== undefined && inst.updatePatchState) {
            inst.updatePatchState(patch);
        }
    }
};

export const vertexAudioDefs = {
    VERTEX
};
export default vertexAudioDefs;
