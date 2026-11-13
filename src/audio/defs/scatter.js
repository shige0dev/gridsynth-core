// src/audio/defs/scatter.js
// Audio / Engine side implementation for SCATTER module
// Instantiates child 3D objects onto the vertices of a base mesh geometry

export const SCATTER = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;

        // CV input for child object scale modulation (PIN5)
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

        const getSourcePacket = (portName) => {
            if (!eng?.modules) return null;
            const pageId = d.pageId || (window.__GS_APP__?.currentPageId ?? '0');
            const conns = window.__GS_APP__?.connections || window.__GS_APP__?.pagesData?.[pageId]?.connections || [];

            let connSrc = null;
            for (const c of conns) {
                const toMod = c.to?.moduleId || (typeof c === 'string' && c.split('>')[1]?.split(':')[0]?.trim());
                const toPort = c.to?.port || (typeof c === 'string' && c.split('>')[1]?.split(':')[1]?.trim());
                const fromMod = c.from?.moduleId || (typeof c === 'string' && c.split('>')[0]?.split(':')[0]?.trim());

                if (toMod === d.id && toPort === portName) {
                    connSrc = fromMod;
                    break;
                }
            }

            if (!connSrc) return null;
            const srcMod = eng.modules[`${pageId}/${connSrc}`] || eng.modules[connSrc];
            return srcMod?.getGeometryPacket ? srcMod.getGeometryPacket() : null;
        };

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

        return {
            nodes: { gCv, anCv },
            inputs: {
                base_in: null,
                child_in: null,
                cv_in: gCv
            },
            outputs: {
                obj_out: null
            },
            data: d,
            getGeometryPacket: () => {
                const basePkt = getSourcePacket('base_in');
                if (!basePkt) return null;

                const childPkt = getSourcePacket('child_in');
                if (!childPkt) {
                    // No child attached: passthrough base
                    return basePkt;
                }

                // Extract all vertices recursively from all meshes in base packet
                const vertices = extractAllVertices(basePkt);
                if (vertices.length === 0) return basePkt;

                const isCv = Boolean(patchState?.has('cv_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('cv_in') : false));
                const cvVal = isCv ? readCv(anCv, 0) : 0;
                const manualScale = Number(d.scale ?? 0.25);
                const effScale = Math.max(0.02, Math.min(2.0, isCv ? (manualScale + cvVal * 0.5) : manualScale));

                const alignNorm = d.alignNormal !== false;
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
                const isCv = Boolean(patchState?.has('cv_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('cv_in') : false));
                return {
                    scale: Number(d.scale ?? 0.25),
                    isCvPatched: isCv,
                    showBase: d.showBase !== false,
                    alignNormal: d.alignNormal !== false
                };
            },
            destroy: () => {}
        };
    },
    update: (ctx, inst, d) => {
        inst.data = d;
    }
};

export const scatterAudioDefs = {
    SCATTER
};
export default scatterAudioDefs;
