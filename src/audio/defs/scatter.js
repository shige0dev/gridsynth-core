// src/audio/defs/scatter.js
// Audio / Engine side implementation for SCATTER module
// Instantiates child 3D objects onto the vertices of a base mesh geometry

import { AudioHelpers } from '../helpers.js';

export const SCATTER = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;
        const cvReader = AudioHelpers.createCvReader(ctx, eng);

        const extractAllVertices = (rootPacket) => {
            if (!rootPacket) return [];
            const unique = [];
            const seen = new Set();

            const hasThree = typeof THREE !== 'undefined';
            const vPos = hasThree ? new THREE.Vector3() : null;
            const vNorm = hasThree ? new THREE.Vector3() : null;
            const normalMat = hasThree ? new THREE.Matrix3() : null;
            const tmpPos = hasThree ? new THREE.Vector3() : null;
            const tmpEuler = hasThree ? new THREE.Euler() : null;
            const tmpQuat = hasThree ? new THREE.Quaternion() : null;
            const tmpScale = hasThree ? new THREE.Vector3() : null;

            const traverse = (pkt, parentMat) => {
                if (!pkt) return;
                let worldMat = parentMat;

                if (hasThree) {
                    const t = pkt.transform;
                    tmpPos.set(...(t?.position || [0, 0, 0]));
                    tmpEuler.set(...(t?.rotation || [0, 0, 0]), 'XYZ');
                    tmpQuat.setFromEuler(tmpEuler);
                    tmpScale.set(...(t?.scale || [1, 1, 1]));
                    const localMat = new THREE.Matrix4().compose(tmpPos, tmpQuat, tmpScale);
                    worldMat = parentMat ? parentMat.clone().multiply(localMat) : localMat;
                }

                if (pkt.geometry?.attributes?.position) {
                    const posAttr = pkt.geometry.attributes.position;
                    const normAttr = pkt.geometry.attributes.normal;
                    const count = posAttr.count;
                    if (hasThree && worldMat) {
                        normalMat.getNormalMatrix(worldMat);
                    }

                    for (let i = 0; i < count; i++) {
                        let x = posAttr.getX(i);
                        let y = posAttr.getY(i);
                        let z = posAttr.getZ(i);

                        let nx = 0, ny = 1, nz = 0;
                        if (normAttr) {
                            nx = normAttr.getX(i);
                            ny = normAttr.getY(i);
                            nz = normAttr.getZ(i);
                        } else {
                            const len = Math.sqrt(x * x + y * y + z * z) || 1.0;
                            nx = x / len;
                            ny = y / len;
                            nz = z / len;
                        }

                        if (hasThree && worldMat) {
                            vPos.set(x, y, z).applyMatrix4(worldMat);
                            x = vPos.x; y = vPos.y; z = vPos.z;
                            vNorm.set(nx, ny, nz).applyMatrix3(normalMat).normalize();
                            nx = vNorm.x; ny = vNorm.y; nz = vNorm.z;
                        }

                        // Spatial quantization key to deduplicate identical vertices
                        const key = `${Math.round(x * 100)},${Math.round(y * 100)},${Math.round(z * 100)}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            unique.push({ pos: [x, y, z], norm: [nx, ny, nz] });
                        }
                    }
                }

                if (pkt.children && pkt.children.length > 0) {
                    for (let c = 0; c < pkt.children.length; c++) {
                        traverse(pkt.children[c], worldMat);
                    }
                }
            };

            traverse(rootPacket, null);
            return unique;
        };

        const clonePacket = (pkt) => {
            if (!pkt) return null;
            if (pkt.type === 'GROUP' && pkt.children) {
                return {
                    ...pkt,
                    transform: {
                        position: [...(pkt.transform?.position || [0, 0, 0])],
                        rotation: [...(pkt.transform?.rotation || [0, 0, 0])],
                        scale: [...(pkt.transform?.scale || [1, 1, 1])]
                    },
                    children: pkt.children.map(clonePacket)
                };
            }
            return {
                ...pkt,
                transform: {
                    position: [...(pkt.transform?.position || [0, 0, 0])],
                    rotation: [...(pkt.transform?.rotation || [0, 0, 0])],
                    scale: [...(pkt.transform?.scale || [1, 1, 1])]
                }
            };
        };

        const hasThreeGlobal = typeof THREE !== 'undefined';
        const instPos = hasThreeGlobal ? new THREE.Vector3() : null;
        const instEuler = hasThreeGlobal ? new THREE.Euler() : null;
        const instQuat = hasThreeGlobal ? new THREE.Quaternion() : null;
        const instScale = hasThreeGlobal ? new THREE.Vector3() : null;
        const instMat = hasThreeGlobal ? new THREE.Matrix4() : null;

        return {
            nodes: { gCv, anCv },
            inputs: {
                base_in: null,
                child_in: null,
                cv_in: cvReader.input
            },
            outputs: {
                obj_out: null
            },
            data: d,
            getGeometryPacket: () => {
                const basePkt = AudioHelpers.getSourcePacket(eng, d, ['base_in']);
                if (!basePkt) return null;

                const childPkt = AudioHelpers.getSourcePacket(eng, d, ['child_in']);
                if (!childPkt) {
                    // No child attached: passthrough base
                    return basePkt;
                }

                // Extract all vertices recursively from all meshes in base packet
                const vertices = extractAllVertices(basePkt);
                if (vertices.length === 0) return basePkt;

                const isCv = AudioHelpers.isPortPatched(d, patchState, 'cv_in');
                const cvVal = isCv ? cvReader.read(0) : 0;
                const manualScale = Number(d.scale ?? 0.25);
                const effScale = Math.max(0.02, Math.min(2.0, isCv ? (manualScale + cvVal * 0.5) : manualScale));

                const alignNorm = d.alignNormal !== false;

                // Fast GPU InstancedMesh path for single-mesh child objects
                if (hasThreeGlobal && childPkt.geometry && (!childPkt.children || childPkt.children.length === 0) && childPkt.materialStyle !== 'point') {
                    const count = vertices.length;
                    const matrices = new Float32Array(count * 16);
                    const baseS = childPkt.transform?.scale || [1, 1, 1];
                    const baseR = childPkt.transform?.rotation || [0, 0, 0];
                    const sx = baseS[0] * effScale;
                    const sy = baseS[1] * effScale;
                    const sz = baseS[2] * effScale;
                    instScale.set(sx, sy, sz);

                    for (let i = 0; i < count; i++) {
                        const v = vertices[i];
                        instPos.set(v.pos[0], v.pos[1], v.pos[2]);
                        if (alignNorm) {
                            const nx = v.norm[0];
                            const ny = v.norm[1];
                            const nz = v.norm[2];
                            const pitch = -Math.atan2(ny, Math.sqrt(nx * nx + nz * nz)) + Math.PI / 2;
                            const yaw = Math.atan2(nx, nz);
                            instEuler.set(pitch, yaw, 0, 'XYZ');
                        } else {
                            instEuler.set(baseR[0], baseR[1], baseR[2], 'XYZ');
                        }
                        instQuat.setFromEuler(instEuler);
                        instMat.compose(instPos, instQuat, instScale);
                        instMat.toArray(matrices, i * 16);
                    }

                    const instancedPkt = {
                        type: 'INSTANCED',
                        geometry: childPkt.geometry,
                        materialStyle: childPkt.materialStyle,
                        color: childPkt.color,
                        wireWidth: childPkt.wireWidth,
                        pointSize: childPkt.pointSize,
                        glassOpacity: childPkt.glassOpacity,
                        glow: childPkt.glow,
                        count,
                        matrices,
                        transform: {
                            position: [0, 0, 0],
                            rotation: [0, 0, 0],
                            scale: [1.0, 1.0, 1.0]
                        }
                    };

                    if (d.showBase !== false) {
                        return {
                            type: 'GROUP',
                            id: d.id,
                            transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1.0, 1.0, 1.0] },
                            children: [clonePacket(basePkt), instancedPkt]
                        };
                    }
                    return instancedPkt;
                }

                const children = [];

                // 1. Optionally include base mesh
                if (d.showBase !== false) {
                    children.push(clonePacket(basePkt));
                }

                // 2. Clone child onto each vertex
                vertices.forEach(v => {
                    const childCopy = clonePacket(childPkt);
                    if (!childCopy) return;

                    // Set position to vertex
                    childCopy.transform.position = [v.pos[0], v.pos[1], v.pos[2]];

                    // Apply scale
                    const baseS = childCopy.transform.scale || [1, 1, 1];
                    childCopy.transform.scale = [baseS[0] * effScale, baseS[1] * effScale, baseS[2] * effScale];

                    // Align to normal orientation if enabled
                    if (alignNorm) {
                        const nx = v.norm[0];
                        const ny = v.norm[1];
                        const nz = v.norm[2];
                        const pitch = -Math.atan2(ny, Math.sqrt(nx * nx + nz * nz)) + Math.PI / 2;
                        const yaw = Math.atan2(nx, nz);
                        childCopy.transform.rotation = [pitch, yaw, 0];
                    }

                    children.push(childCopy);
                });

                return {
                    type: 'GROUP',
                    id: d.id,
                    transform: {
                        position: [0, 0, 0],
                        rotation: [0, 0, 0],
                        scale: [1.0, 1.0, 1.0]
                    },
                    children
                };
            },
            read: () => {
                const isCv = AudioHelpers.isPortPatched(d, patchState, 'cv_in');
                return {
                    scale: Number(d.scale ?? 0.25),
                    isCvPatched: isCv,
                    showBase: d.showBase !== false,
                    alignNormal: d.alignNormal !== false
                };
            },
            updatePatchState: (p) => {
                patchState = p;
            },
            destroy: () => {
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

export const scatterAudioDefs = {
    SCATTER
};
export default scatterAudioDefs;
