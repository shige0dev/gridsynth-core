// src/audio/defs/scale.js
// Audio / Engine side implementation for SCALE module
// Modifies geometry transform scale (ALL axes, X, Y, or Z).
// Centers on the topmost object local axis.
// Supports multi-cable summing on obj_in (groups multiple objects automatically).
// Driven by manual slider or external CV (PIN4).

export const SCALE = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;

        // CV input for cv_in (PIN4)
        const gIn = ctx.createGain();
        const anIn = ctx.createAnalyser();
        anIn.fftSize = 32;
        gIn.connect(anIn);

        if (eng?.silentSink) {
            gIn.connect(eng.silentSink);
        }

        const buf = new Float32Array(32);
        const readCv = (an, def = 0) => {
            an.getFloatTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < 32; i++) sum += buf[i];
            const avg = sum / 32;
            return isNaN(avg) ? def : avg;
        };

        const getSourcePackets = () => {
            const isPatched = patchState?.has('obj_in') || patchState?.has('geo_in') ||
                (window.__GS_APP__?.getPatchState ? (window.__GS_APP__.getPatchState(d.id)?.has('obj_in') || window.__GS_APP__.getPatchState(d.id)?.has('geo_in')) : false);
            if (!isPatched || !eng?.modules) return [];

            const pageId = d.pageId || (window.__GS_APP__?.currentPageId ?? '0');
            const conns = window.__GS_APP__?.connections || window.__GS_APP__.pagesData?.[pageId]?.connections || [];
            const connectedSourceIds = [];

            conns.forEach(c => {
                const connObj = typeof c === 'string' ? (c.includes('>') ? {
                    from: { moduleId: c.split('>')[0].split(':')[0].trim(), port: c.split('>')[0].split(':')[1].trim() },
                    to: { moduleId: c.split('>')[1].split(':')[0].trim(), port: c.split('>')[1].split(':')[1].trim() }
                } : null) : c;

                if (connObj && connObj.to?.moduleId === d.id && (connObj.to?.port === 'obj_in' || connObj.to?.port === 'geo_in')) {
                    connectedSourceIds.push(connObj.from?.moduleId);
                }
            });

            const packets = [];
            connectedSourceIds.forEach(srcId => {
                const srcMod = eng.modules[`${pageId}/${srcId}`] || eng.modules[srcId];
                if (srcMod?.getGeometryPacket) {
                    const pkt = srcMod.getGeometryPacket();
                    if (pkt) packets.push(pkt);
                }
            });

            return packets;
        };

        return {
            nodes: { gIn, anIn },
            inputs: {
                cv_in: gIn,
                obj_in: null
            },
            outputs: {
                obj_out: null
            },
            data: d,
            getGeometryPacket: () => {
                const incoming = getSourcePackets();
                if (incoming.length === 0) return null;

                // Priority: External CV if patched, otherwise internal slider
                const isCvPatched = patchState?.has('cv_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('cv_in') : false);
                let scaleFactor = 1.0;
                if (isCvPatched) {
                    const cvVal = readCv(anIn, 0);
                    // 1.0V = 1.0x scale (direct CV value)
                    scaleFactor = Math.max(0.001, cvVal);
                } else {
                    scaleFactor = Math.max(0.001, Number(d.scale ?? 1.0));
                }

                const axis = (d.axis || 'all').toLowerCase();
                const axisIdx = axis === 'y' ? 1 : (axis === 'z' ? 2 : (axis === 'x' ? 0 : -1));

                if (incoming.length === 1) {
                    const pkt = incoming[0];
                    const prevScale = [...(pkt.transform?.scale || [1.0, 1.0, 1.0])];

                    if (axis === 'all' || axisIdx === -1) {
                        prevScale[0] *= scaleFactor;
                        prevScale[1] *= scaleFactor;
                        prevScale[2] *= scaleFactor;
                    } else {
                        prevScale[axisIdx] *= scaleFactor;
                    }

                    return {
                        ...pkt,
                        transform: {
                            ...pkt.transform,
                            position: pkt.transform?.position ? [...pkt.transform.position] : [0, 0, 0],
                            rotation: pkt.transform?.rotation ? [...pkt.transform.rotation] : [0, 0, 0],
                            scale: prevScale
                        }
                    };
                }

                // Multiple cables: automatic container group centered on topmost local axis
                const groupScale = [1.0, 1.0, 1.0];
                if (axis === 'all' || axisIdx === -1) {
                    groupScale[0] = scaleFactor;
                    groupScale[1] = scaleFactor;
                    groupScale[2] = scaleFactor;
                } else {
                    groupScale[axisIdx] = scaleFactor;
                }

                return {
                    type: 'GROUP',
                    id: d.id,
                    transform: {
                        position: [0, 0, 0],
                        rotation: [0, 0, 0],
                        scale: groupScale
                    },
                    children: incoming
                };
            },
            read: () => {
                const isCvPatched = patchState?.has('cv_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('cv_in') : false);
                const isGeoPatched = patchState?.has('obj_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('obj_in') : false);
                let scaleFactor = 1.0;
                if (isCvPatched) {
                    const cvVal = readCv(anIn, 0);
                    scaleFactor = Math.max(0.001, cvVal);
                } else {
                    scaleFactor = Math.max(0.001, Number(d.scale ?? 1.0));
                }

                return {
                    axis: d.axis || 'all',
                    scale: scaleFactor,
                    isCvPatched,
                    isGeoPatched
                };
            },
            updatePatchState: (p) => {
                patchState = p;
            },
            destroy: () => {
                try { gIn.disconnect(); } catch (e) {}
                try { anIn.disconnect(); } catch (e) {}
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

export const scaleAudioDefs = {
    SCALE
};
export default scaleAudioDefs;
