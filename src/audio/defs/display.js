// src/audio/defs/display.js
// Audio / Engine side implementation for DISPLAY module
// Receives master buffer via video_in (green cable), reads CV X/Y (0-1), and computes active tile in N x N division.

export const DISPLAY = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;

        // CV inputs for cv_x (PIN4) and cv_y (PIN3)
        const gX = ctx.createGain();
        const gY = ctx.createGain();

        const anX = ctx.createAnalyser(); anX.fftSize = 32; gX.connect(anX);
        const anY = ctx.createAnalyser(); anY.fftSize = 32; gY.connect(anY);

        if (eng?.silentSink) {
            gX.connect(eng.silentSink);
            gY.connect(eng.silentSink);
        }

        const buf = new Float32Array(32);
        const readCv = (an, def = 0) => {
            an.getFloatTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < 32; i++) sum += buf[i];
            const avg = sum / 32;
            return isNaN(avg) ? def : avg;
        };

        const getRootCanvas = () => {
            if (!eng?.modules) return null;
            const pageId = d.pageId || (window.__GS_APP__?.currentPageId ?? '0');

            // 1. If resolved by WaveCodec.syncVideoLinks
            if (d._isLinked && d._linkedRootId) {
                const rootMod = eng.modules[`${pageId}/${d._linkedRootId}`] || eng.modules[d._linkedRootId];
                if (rootMod?.getSharedCanvas) return rootMod.getSharedCanvas();
            }

            // 2. Direct connection check via connections list
            const conns = window.__GS_APP__?.connections || window.__GS_APP__?.pagesData?.[pageId]?.connections || [];
            let connectedSourceId = null;

            conns.forEach(c => {
                const connObj = typeof c === 'string' ? (c.includes('>') ? {
                    from: { moduleId: c.split('>')[0].split(':')[0].trim(), port: c.split('>')[0].split(':')[1].trim() },
                    to: { moduleId: c.split('>')[1].split(':')[0].trim(), port: c.split('>')[1].split(':')[1].trim() }
                } : null) : c;

                if (connObj && connObj.to?.moduleId === d.id && connObj.to?.port === 'video_in') {
                    connectedSourceId = connObj.from?.moduleId;
                }
            });

            if (connectedSourceId) {
                const srcMod = eng.modules[`${pageId}/${connectedSourceId}`] || eng.modules[connectedSourceId];
                if (srcMod?.getSharedCanvas) {
                    return srcMod.getSharedCanvas();
                }
            }

            // 3. Fallback: Find RENDER module
            let fallbackCanvas = null;
            Object.values(eng.modules).forEach(mInst => {
                if (mInst.data?.type === 'RENDER' && mInst.getSharedCanvas) {
                    fallbackCanvas = mInst.getSharedCanvas();
                }
            });
            return fallbackCanvas;
        };

        return {
            nodes: { gX, gY, anX, anY },
            inputs: {
                cv_x: gX,
                cv_y: gY,
                video_in: null
            },
            outputs: {
                video_out: null
            },
            data: d,
            getSharedCanvas: () => getRootCanvas(),
            read: () => {
                const isCvX = patchState?.has('cv_x') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('cv_x') : false);
                const isCvY = patchState?.has('cv_y') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('cv_y') : false);

                const cvX = readCv(anX, 0);
                const cvY = readCv(anY, 0);

                // Priority: External CV if patched (clamped 0..1), otherwise manual slider
                const posX = Math.max(0, Math.min(1.0, isCvX ? cvX : Number(d.tileX ?? 0.0)));
                const posY = Math.max(0, Math.min(1.0, isCvY ? cvY : Number(d.tileY ?? 0.0)));

                const divN = Math.max(1, Math.min(4, Math.round(d.divN ?? 1)));
                const col = Math.min(divN - 1, Math.max(0, Math.floor(posX * divN)));
                const row = Math.min(divN - 1, Math.max(0, Math.floor(posY * divN)));

                const sharedCanvas = getRootCanvas();

                return {
                    canvas: sharedCanvas,
                    divN,
                    posX,
                    posY,
                    col,
                    row,
                    isCvX: Boolean(isCvX),
                    isCvY: Boolean(isCvY),
                    isLinked: Boolean(sharedCanvas)
                };
            },
            updatePatchState: (p) => {
                patchState = p;
            },
            destroy: () => {
                try { gX.disconnect(); } catch (e) {}
                try { gY.disconnect(); } catch (e) {}
                try { anX.disconnect(); } catch (e) {}
                try { anY.disconnect(); } catch (e) {}
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

export const displayAudioDefs = {
    DISPLAY
};
export default displayAudioDefs;
