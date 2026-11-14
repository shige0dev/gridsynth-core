// src/audio/defs/particle.js
// Audio / Engine side implementation for PARTICLE module
// Generates or samples 3D point clouds with CV & Gate trigger support

import { AudioHelpers } from '../helpers.js';

export const PARTICLE = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;

        // CV input (PIN4) & Gate/Trigger input (PIN6)
        const cvReader = AudioHelpers.createCvReader(ctx, eng);
        const gateReader = AudioHelpers.createCvReader(ctx, eng);

        // Deterministic PRNG (Mulberry32)
        const mulberry32 = (seed) => {
            let a = seed >>> 0;
            return () => {
                a |= 0;
                a = (a + 0x6D2B79F5) | 0;
                let t = Math.imul(a ^ (a >>> 15), 1 | a);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        };

        const parseColor = (col) => {
            if (!col) return 0x22d3ee;
            if (typeof col === 'number') return col;
            return parseInt(String(col).replace('#', ''), 16) || 0x22d3ee;
        };

        let geom = null;
        let posArray = null;
        let baseData = null; // Float32Array [x, y, z, phaseX, phaseY, phaseZ] per particle
        let cachedCount = 0;
        let cachedDist = '';
        let cachedSeed = -1;
        let seedOffset = 0;
        let prevGateHigh = false;
        let phaseTime = 0;
        let lastTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();

        const buildBaseData = (count, dist, seed) => {
            const rng = mulberry32(1337 + seed * 7919);
            const data = new Float32Array(count * 6);
            for (let i = 0; i < count; i++) {
                let x = 0, y = 0, z = 0;
                if (dist === 'cube') {
                    x = rng() * 2 - 1;
                    y = rng() * 2 - 1;
                    z = rng() * 2 - 1;
                } else if (dist === 'ring') {
                    const ang = rng() * Math.PI * 2;
                    const r = 0.72 + (rng() - 0.5) * 0.36;
                    x = Math.cos(ang) * r;
                    z = Math.sin(ang) * r;
                    y = (rng() - 0.5) * 0.25;
                } else if (dist === 'spiral') {
                    const t = i / Math.max(1, count - 1);
                    const ang = t * Math.PI * 8 + rng() * 0.35;
                    const r = 0.1 + t * 0.95;
                    x = Math.cos(ang) * r;
                    z = Math.sin(ang) * r;
                    y = (t - 0.5) * 1.4 + (rng() - 0.5) * 0.15;
                } else {
                    // 'sphere' (uniform volume)
                    const u = rng();
                    const v = rng();
                    const theta = u * Math.PI * 2;
                    const phi = Math.acos(2 * v - 1);
                    const r = Math.cbrt(rng());
                    const sinPhi = Math.sin(phi);
                    x = r * sinPhi * Math.cos(theta);
                    y = r * sinPhi * Math.sin(theta);
                    z = r * Math.cos(phi);
                }
                const o = i * 6;
                data[o] = x;
                data[o + 1] = y;
                data[o + 2] = z;
                data[o + 3] = rng() * Math.PI * 2;
                data[o + 4] = rng() * Math.PI * 2;
                data[o + 5] = rng() * Math.PI * 2;
            }
            return data;
        };

        const extractObjVertices = (rootPkt) => {
            if (!rootPkt || typeof THREE === 'undefined') return [];
            const verts = [];
            const vPos = new THREE.Vector3();
            const tmpPos = new THREE.Vector3();
            const tmpEuler = new THREE.Euler();
            const tmpQuat = new THREE.Quaternion();
            const tmpScale = new THREE.Vector3();

            const traverse = (pkt, parentMat) => {
                if (!pkt) return;
                const t = pkt.transform;
                tmpPos.set(...(t?.position || [0, 0, 0]));
                tmpEuler.set(...(t?.rotation || [0, 0, 0]), 'XYZ');
                tmpQuat.setFromEuler(tmpEuler);
                tmpScale.set(...(t?.scale || [1, 1, 1]));
                const localMat = new THREE.Matrix4().compose(tmpPos, tmpQuat, tmpScale);
                const worldMat = parentMat ? parentMat.clone().multiply(localMat) : localMat;

                if (pkt.geometry?.attributes?.position) {
                    const posAttr = pkt.geometry.attributes.position;
                    for (let i = 0; i < posAttr.count; i++) {
                        vPos.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).applyMatrix4(worldMat);
                        verts.push(vPos.x, vPos.y, vPos.z);
                    }
                }
                if (pkt.children?.length) {
                    for (let c = 0; c < pkt.children.length; c++) {
                        traverse(pkt.children[c], worldMat);
                    }
                }
            };
            traverse(rootPkt, null);
            return verts;
        };

        const ensureBuffers = (count, dist) => {
            if (typeof THREE === 'undefined') return;
            if (!geom || cachedCount !== count) {
                if (geom) {
                    try { geom.dispose(); } catch (_) {}
                }
                posArray = new Float32Array(count * 3);
                geom = new THREE.BufferGeometry();
                geom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
                cachedCount = count;
                cachedDist = '';
            }
            if (cachedDist !== dist || cachedSeed !== seedOffset || !baseData) {
                baseData = buildBaseData(count, dist, seedOffset);
                cachedDist = dist;
                cachedSeed = seedOffset;
            }
        };

        return {
            nodes: { gCv: cvReader.input, anCv: cvReader.analyser, gGate: gateReader.input, anGate: gateReader.analyser },
            inputs: {
                cv_in: cvReader.input,
                obj_in: null,
                gate_in: gateReader.input
            },
            outputs: {
                obj_out: null
            },
            data: d,
            updatePatchState: (newPatch) => {
                patchState = newPatch;
            },
            getGeometryPacket: () => {
                if (typeof THREE === 'undefined') return null;

                // Gate trigger rising-edge detection -> re-seed burst
                if (AudioHelpers.isPortPatched(d, patchState, 'gate_in')) {
                    const gateVal = gateReader.read(0);
                    const gateHigh = gateVal > 0.5;
                    if (gateHigh && !prevGateHigh) {
                        seedOffset = (seedOffset + 1) & 0xffff;
                    }
                    prevGateHigh = gateHigh;
                } else {
                    prevGateHigh = false;
                }

                const cvPatched = AudioHelpers.isPortPatched(d, patchState, 'cv_in');
                const cvVal = cvPatched ? cvReader.read(0) : 0;
                const cvTarget = d.cvTarget || 'spread';

                const count = Math.max(1, Math.min(2000, Math.round(Number(d.count ?? 400))));
                const dist = d.dist || 'sphere';
                const baseSpread = Number(d.spread ?? 1.5);
                const baseSize = Number(d.pointSize ?? 3.0);
                const baseSpeed = Number(d.speed ?? 0.4);

                const effSpread = Math.max(0.0, (cvPatched && cvTarget === 'spread') ? baseSpread + cvVal * 1.2 : baseSpread);
                const effSize = Math.max(0.5, Math.min(16.0, (cvPatched && cvTarget === 'size') ? baseSize + cvVal * 3.0 : baseSize));
                const effSpeed = Math.max(0.0, (cvPatched && cvTarget === 'speed') ? baseSpeed + cvVal * 1.0 : baseSpeed);

                const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
                const dt = Math.min(0.1, Math.max(0, (now - lastTime) * 0.001));
                lastTime = now;
                phaseTime += dt * effSpeed * 2.5;

                ensureBuffers(count, dist);

                const objPkt = AudioHelpers.isPortPatched(d, patchState, 'obj_in') ? AudioHelpers.getSourcePacket(eng, d, ['obj_in']) : null;
                const objVerts = objPkt ? extractObjVertices(objPkt) : null;
                const vertCount = objVerts ? Math.floor(objVerts.length / 3) : 0;

                const driftAmp = effSpeed > 0.001 ? 0.14 : 0.0;
                for (let i = 0; i < count; i++) {
                    const b = i * 6;
                    const p = i * 3;
                    const dx = driftAmp * Math.sin(phaseTime + baseData[b + 3]);
                    const dy = driftAmp * Math.cos(phaseTime * 0.87 + baseData[b + 4]);
                    const dz = driftAmp * Math.sin(phaseTime * 1.13 + baseData[b + 5]);

                    if (vertCount > 0) {
                        const vi = (i % vertCount) * 3;
                        const jitterScale = effSpread * 0.15;
                        posArray[p] = objVerts[vi] + baseData[b] * jitterScale + dx;
                        posArray[p + 1] = objVerts[vi + 1] + baseData[b + 1] * jitterScale + dy;
                        posArray[p + 2] = objVerts[vi + 2] + baseData[b + 2] * jitterScale + dz;
                    } else {
                        posArray[p] = baseData[b] * effSpread + dx;
                        posArray[p + 1] = baseData[b + 1] * effSpread + dy;
                        posArray[p + 2] = baseData[b + 2] * effSpread + dz;
                    }
                }

                geom.attributes.position.needsUpdate = true;
                geom.computeBoundingSphere();

                return {
                    type: 'GEOMETRY',
                    id: d.id,
                    shape: 'particle',
                    geometry: geom,
                    transform: {
                        position: [0, 0, 0],
                        rotation: [0, 0, 0],
                        scale: [1.0, 1.0, 1.0]
                    },
                    materialStyle: 'point',
                    pointSize: effSize,
                    color: parseColor(d.color)
                };
            },
            read: () => ({
                dist: d.dist || 'sphere',
                count: Number(d.count ?? 400),
                spread: Number(d.spread ?? 1.5),
                pointSize: Number(d.pointSize ?? 3.0),
                speed: Number(d.speed ?? 0.4),
                cvTarget: d.cvTarget || 'spread',
                color: d.color || '#22d3ee'
            }),
            destroy: () => {
                if (geom) {
                    try { geom.dispose(); } catch (_) {}
                    geom = null;
                }
                try { cvReader.input.disconnect(); } catch (_) {}
                try { cvReader.analyser.disconnect(); } catch (_) {}
                try { gateReader.input.disconnect(); } catch (_) {}
                try { gateReader.analyser.disconnect(); } catch (_) {}
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

export const particleAudioDefs = {
    PARTICLE
};
export default particleAudioDefs;
