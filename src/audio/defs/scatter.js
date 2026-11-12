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

        const extractVertices = (geometry, maxVertices = 128) => {
            if (!geometry || !geometry.attributes || !geometry.attributes.position) return [];
            const posAttr = geometry.attributes.position;
            const normAttr = geometry.attributes.normal;
            const count = posAttr.count;

            const unique = [];
            const seen = new Set();

            for (let i = 0; i < count; i++) {
                const x = posAttr.getX(i);
                const y = posAttr.getY(i);
                const z = posAttr.getZ(i);

                // Spatial quantization key to deduplicate identical vertices
                const key = `${Math.round(x * 100)},${Math.round(y * 100)},${Math.round(z * 100)}`;
                if (!seen.has(key)) {
                    seen.add(key);

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

                    unique.push({ pos: [x, y, z], norm: [nx, ny, nz] });
                    if (unique.length >= maxVertices) break;
                }
            }

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

                // Extract geometry from base packet
                const geom = basePkt.geometry || (basePkt.children && basePkt.children[0]?.geometry);
                if (!geom) return basePkt;

                const vertices = extractVertices(geom, 128);
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
