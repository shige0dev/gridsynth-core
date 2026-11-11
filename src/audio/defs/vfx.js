// src/audio/defs/vfx.js
// Audio / Engine side implementation for VFX module
// 1:1 Video Framebuffer Post-Processing Effects (Mosaic, CRT, Invert, RGB Split)

export const VFX = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;

        // CV input for effect depth/intensity (PIN4)
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

        const BUFFER_SIZE = 800;
        const vfxCanvas = document.createElement('canvas');
        vfxCanvas.width = BUFFER_SIZE;
        vfxCanvas.height = BUFFER_SIZE;
        const vfxCtx = vfxCanvas.getContext('2d');

        // Small temporary buffer for mosaic scaling
        const tmpCanvas = document.createElement('canvas');
        const tmpCtx = tmpCanvas.getContext('2d');

        const getSourceCanvas = () => {
            if (!eng?.modules) return null;
            const pageId = d.pageId || (window.__GS_APP__?.currentPageId ?? '0');
            const conns = window.__GS_APP__?.connections || window.__GS_APP__?.pagesData?.[pageId]?.connections || [];

            let connSrc = null;
            for (const c of conns) {
                const toMod = c.to?.moduleId || (typeof c === 'string' && c.split('>')[1]?.split(':')[0]?.trim());
                const toPort = c.to?.port || (typeof c === 'string' && c.split('>')[1]?.split(':')[1]?.trim());
                if (toMod === d.id && toPort === 'video_in') {
                    connSrc = c.from?.moduleId || (typeof c === 'string' && c.split('>')[0]?.split(':')[0]?.trim());
                    break;
                }
            }

            if (!connSrc) return null;
            const srcInst = eng.modules[`${pageId}/${connSrc}`] || eng.modules[connSrc];
            return srcInst?.getSharedCanvas ? srcInst.getSharedCanvas() : null;
        };

        let lastProcessTime = 0;
        let lastEffectiveAmt = 0.7;

        const processFrame = () => {
            const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
            if (now - lastProcessTime < 4) return;
            lastProcessTime = now;

            const isCv = Boolean(patchState?.has('cv_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('cv_in') : false));
            const cvVal = isCv ? readCv(anCv, 0) : 0;
            const manualAmt = Number(d.amount ?? 0.7);
            const effAmt = Math.max(0, Math.min(1.0, isCv ? cvVal : manualAmt));
            lastEffectiveAmt = effAmt;

            const srcCanvas = getSourceCanvas();
            vfxCtx.fillStyle = '#000000';
            vfxCtx.fillRect(0, 0, BUFFER_SIZE, BUFFER_SIZE);

            if (!srcCanvas) return;

            const mode = d.mode || 'mosaic';

            if (mode === 'bypass' || effAmt <= 0.001) {
                vfxCtx.drawImage(srcCanvas, 0, 0, BUFFER_SIZE, BUFFER_SIZE);
            } else if (mode === 'mosaic') {
                // Mosaic / Pixelate
                // scale: 1.0 (no mosaic) down to 0.02 (super chunky 16x16 pixels)
                const scale = Math.max(0.015, Math.min(1.0, 1.0 - (effAmt * 0.985)));
                const smallW = Math.max(4, Math.floor(BUFFER_SIZE * scale));
                const smallH = Math.max(4, Math.floor(BUFFER_SIZE * scale));

                tmpCanvas.width = smallW;
                tmpCanvas.height = smallH;
                tmpCtx.imageSmoothingEnabled = false;
                tmpCtx.drawImage(srcCanvas, 0, 0, smallW, smallH);

                vfxCtx.imageSmoothingEnabled = false;
                vfxCtx.drawImage(tmpCanvas, 0, 0, smallW, smallH, 0, 0, BUFFER_SIZE, BUFFER_SIZE);
            } else if (mode === 'crt') {
                // CRT Scanlines & Phosphor Bloom
                vfxCtx.drawImage(srcCanvas, 0, 0, BUFFER_SIZE, BUFFER_SIZE);

                // Overlay scanlines
                const step = 8;
                vfxCtx.fillStyle = `rgba(0, 0, 0, ${effAmt * 0.85})`;
                for (let y = 0; y < BUFFER_SIZE; y += step) {
                    vfxCtx.fillRect(0, y, BUFFER_SIZE, step * 0.5);
                }

                // Vignette
                const grad = vfxCtx.createRadialGradient(BUFFER_SIZE / 2, BUFFER_SIZE / 2, BUFFER_SIZE * 0.35, BUFFER_SIZE / 2, BUFFER_SIZE / 2, BUFFER_SIZE * 0.7);
                grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
                grad.addColorStop(1, `rgba(0, 0, 0, ${effAmt * 0.9})`);
                vfxCtx.fillStyle = grad;
                vfxCtx.fillRect(0, 0, BUFFER_SIZE, BUFFER_SIZE);
            } else if (mode === 'invert') {
                // Negative Invert
                vfxCtx.save();
                vfxCtx.filter = `invert(${Math.round(effAmt * 100)}%)`;
                vfxCtx.drawImage(srcCanvas, 0, 0, BUFFER_SIZE, BUFFER_SIZE);
                vfxCtx.restore();
            } else if (mode === 'rgb') {
                // Chromatic Aberration / RGB Split
                const shift = Math.round(effAmt * 35);
                vfxCtx.save();
                // Base
                vfxCtx.drawImage(srcCanvas, 0, 0, BUFFER_SIZE, BUFFER_SIZE);
                // Shifted Cyan Overlay
                vfxCtx.globalCompositeOperation = 'screen';
                vfxCtx.filter = 'drop-shadow(0 0 2px #22d3ee)';
                vfxCtx.drawImage(srcCanvas, shift, 0, BUFFER_SIZE, BUFFER_SIZE);
                // Shifted Red Overlay
                vfxCtx.filter = 'drop-shadow(0 0 2px #fb7185)';
                vfxCtx.drawImage(srcCanvas, -shift, 0, BUFFER_SIZE, BUFFER_SIZE);
                vfxCtx.restore();
            }
        };

        return {
            nodes: { gCv, anCv },
            inputs: {
                cv_in: gCv,
                video_in: null
            },
            outputs: {
                video_out: null
            },
            data: d,
            getSharedCanvas: () => {
                processFrame();
                return vfxCanvas;
            },
            read: () => {
                processFrame();
                const isCv = Boolean(patchState?.has('cv_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('cv_in') : false));
                return {
                    canvas: vfxCanvas,
                    mode: d.mode || 'mosaic',
                    amount: d.amount ?? 0.7,
                    effectiveAmount: lastEffectiveAmt,
                    isCvPatched: isCv
                };
            },
            updatePatchState: (p) => {
                patchState = p;
            },
            destroy: () => {
                try { gCv.disconnect(); } catch (_) {}
                try { anCv.disconnect(); } catch (_) {}
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

export const vfxAudioDefs = {
    VFX
};
export default vfxAudioDefs;
