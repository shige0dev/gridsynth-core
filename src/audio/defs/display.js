// src/audio/defs/display.js
// Audio / Engine side implementation for DISPLAY module
// Pure Daisy-Chain Video Tile Viewport (CV-free, Auto-Indexing N x N Division)

export const DISPLAY = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;

        const resolveChain = () => {
            if (!eng?.modules) return { sharedCanvas: null, hop: 0, rootDivN: d.divN ?? 2 };
            const pageId = d.pageId || (window.__GS_APP__?.currentPageId ?? '0');
            const conns = window.__GS_APP__?.connections || window.__GS_APP__?.pagesData?.[pageId]?.connections || [];

            let curId = d.id;
            let hop = 0;
            const visited = new Set();
            let rootCanvas = null;
            let rootDivN = d.divN ?? 2;

            while (curId && !visited.has(curId)) {
                visited.add(curId);
                // Find connection going to curId's video_in
                let connSrc = null;
                for (const c of conns) {
                    const toMod = c.to?.moduleId || (typeof c === 'string' && c.split('>')[1]?.split(':')[0]?.trim());
                    const toPort = c.to?.port || (typeof c === 'string' && c.split('>')[1]?.split(':')[1]?.trim());
                    if (toMod === curId && toPort === 'video_in') {
                        connSrc = c.from?.moduleId || (typeof c === 'string' && c.split('>')[0]?.split(':')[0]?.trim());
                        break;
                    }
                }

                if (!connSrc) break;

                const srcInst = eng.modules[`${pageId}/${connSrc}`] || eng.modules[connSrc];
                const srcData = srcInst?.data || window.__GS_APP__?.modules?.[connSrc];
                const srcType = srcData?.type;

                if (srcType === 'RENDER') {
                    // Reached Root RENDER
                    if (srcInst?.getSharedCanvas) {
                        rootCanvas = srcInst.getSharedCanvas();
                    }
                    break;
                } else if (srcType === 'DISPLAY') {
                    // Intermediate DISPLAY in daisy-chain
                    hop++;
                    curId = connSrc;
                    if (srcData?.divN) {
                        rootDivN = srcData.divN;
                    }
                    if (!rootCanvas && srcInst?.getSharedCanvas) {
                        rootCanvas = srcInst.getSharedCanvas();
                    }
                } else {
                    break;
                }
            }

            return { sharedCanvas: rootCanvas, hop, rootDivN };
        };

        const getRootCanvas = () => {
            return resolveChain().sharedCanvas;
        };

        return {
            nodes: {},
            inputs: {
                video_in: null
            },
            outputs: {
                video_out: null
            },
            data: d,
            getSharedCanvas: () => getRootCanvas(),
            read: () => {
                const { sharedCanvas, hop, rootDivN } = resolveChain();

                // Inherit root divN or use local setting
                const divN = Math.max(1, Math.min(4, Math.round(d.divN ?? rootDivN ?? 2)));
                const totalTiles = divN * divN;

                // Daisy-chain tile index: 0-indexed, wrapping around totalTiles
                const tileIdx = hop % totalTiles;
                const col = tileIdx % divN;
                const row = Math.floor(tileIdx / divN);

                return {
                    canvas: sharedCanvas,
                    divN,
                    hop,
                    tileNum: tileIdx + 1,
                    totalTiles,
                    col,
                    row,
                    isLinked: Boolean(sharedCanvas)
                };
            },
            updatePatchState: (p) => {
                patchState = p;
            },
            destroy: () => {}
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
