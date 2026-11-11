// src/audio/defs/rotate.js
// Audio / Engine side implementation for ROTATE module
// Modifies geometry transform rotation around selectable X, Y, or Z axis in radians.
// Driven by manual slider or external CV (PIN4).

export const ROTATE = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;

        // CV input for cv_in / cv_x (PIN4)
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

        const getSourcePacket = () => {
            const isGeoPatched = patchState?.has('geo_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('geo_in') : false);
            if (!isGeoPatched || !eng?.modules) return null;

            const pageId = d.pageId || (window.__GS_APP__?.currentPageId ?? '0');
            const conns = window.__GS_APP__?.connections || window.__GS_APP__?.pagesData?.[pageId]?.connections || [];
            let connectedSourceId = null;

            conns.forEach(c => {
                const connObj = typeof c === 'string' ? (c.includes('>') ? {
                    from: { moduleId: c.split('>')[0].split(':')[0].trim(), port: c.split('>')[0].split(':')[1].trim() },
                    to: { moduleId: c.split('>')[1].split(':')[0].trim(), port: c.split('>')[1].split(':')[1].trim() }
                } : null) : c;

                if (connObj && connObj.to?.moduleId === d.id && connObj.to?.port === 'geo_in') {
                    connectedSourceId = connObj.from?.moduleId;
                }
            });

            if (connectedSourceId) {
                const srcMod = eng.modules[`${pageId}/${connectedSourceId}`] || eng.modules[connectedSourceId];
                if (srcMod?.getGeometryPacket) {
                    return srcMod.getGeometryPacket();
                }
            }

            // Fallback search across engine modules
            let fallbackPacket = null;
            Object.values(eng.modules).forEach(mInst => {
                if (mInst.data?.id !== d.id && mInst.getGeometryPacket && mInst.data?.type !== 'VIDEO') {
                    if (!fallbackPacket) fallbackPacket = mInst.getGeometryPacket();
                }
            });
            return fallbackPacket;
        };

        return {
            nodes: { gIn, anIn },
            inputs: {
                cv_in: gIn,
                cv_x: gIn,
                geo_in: null
            },
            outputs: {
                geo_out: null
            },
            data: d,
            getGeometryPacket: () => {
                const sourcePacket = getSourcePacket();
                if (!sourcePacket) return null;

                // Priority: External CV if patched, otherwise internal slider (radians)
                const isCvPatched = patchState?.has('cv_in') || patchState?.has('cv_x') || (window.__GS_APP__?.getPatchState ? (window.__GS_APP__.getPatchState(d.id)?.has('cv_in') || window.__GS_APP__.getPatchState(d.id)?.has('cv_x')) : false);
                let angle = 0;
                if (isCvPatched) {
                    const cvVal = readCv(anIn, 0);
                    // 1.0V = 2*PI radians (360 degrees)
                    angle = cvVal * (2 * Math.PI);
                } else {
                    angle = Number(d.angle ?? d.rotX ?? 0.0);
                }

                const axis = (d.axis || 'x').toLowerCase();
                const axisIdx = axis === 'y' ? 1 : (axis === 'z' ? 2 : 0);

                const prevRot = [...(sourcePacket.transform?.rotation || [0, 0, 0])];
                prevRot[axisIdx] += angle;

                return {
                    type: 'GEOMETRY',
                    id: d.id,
                    shape: sourcePacket.shape,
                    geometry: sourcePacket.geometry,
                    transform: {
                        rotation: prevRot,
                        scale: sourcePacket.transform?.scale ? [...sourcePacket.transform.scale] : [1.0, 1.0, 1.0]
                    },
                    color: sourcePacket.color || 0xffffff
                };
            },
            read: () => {
                const isCvPatched = patchState?.has('cv_in') || patchState?.has('cv_x') || (window.__GS_APP__?.getPatchState ? (window.__GS_APP__.getPatchState(d.id)?.has('cv_in') || window.__GS_APP__.getPatchState(d.id)?.has('cv_x')) : false);
                const isGeoPatched = patchState?.has('geo_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('geo_in') : false);
                let angle = 0;
                if (isCvPatched) {
                    const cvVal = readCv(anIn, 0);
                    angle = cvVal * (2 * Math.PI);
                } else {
                    angle = Number(d.angle ?? d.rotX ?? 0.0);
                }

                return {
                    axis: d.axis || 'x',
                    angle,
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

export const rotateAudioDefs = {
    ROTATE
};
export default rotateAudioDefs;
