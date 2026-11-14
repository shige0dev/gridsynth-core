// src/audio/defs/path.js
// Audio/Engine-side representation for PATH (2D Line, Arc/Circle, Polygon & Planar Geometry)

import { AudioHelpers } from '../helpers.js';

export const PATH = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;

        const cvReader = AudioHelpers.createCvReader(ctx, eng);

        const RADIUS = 1.2;
        let cachedKey = '';
        let cachedGeom = null;

        const buildLineGeom = (shape, points, edgeSubdiv, effArc, effSides) => {
            const posList = [];
            const normList = [];

            if (shape === 'line') {
                const n = Math.max(2, points);
                for (let i = 0; i < n; i++) {
                    const t = i / (n - 1);
                    const x = -RADIUS + t * (RADIUS * 2);
                    posList.push(x, 0, 0);
                    normList.push(0, 1, 0);
                }
            } else if (shape === 'arc') {
                const n = Math.max(3, points);
                const isClosed = effArc >= 0.999;
                const totalAngle = Math.PI * 2 * Math.max(0.02, Math.min(1.0, effArc));
                if (isClosed) {
                    for (let i = 0; i <= n; i++) {
                        const a = (i % n) / n * Math.PI * 2;
                        const c = Math.cos(a);
                        const s = Math.sin(a);
                        posList.push(RADIUS * c, RADIUS * s, 0);
                        normList.push(c, s, 0);
                    }
                } else {
                    for (let i = 0; i < n; i++) {
                        const a = (i / (n - 1)) * totalAngle;
                        const c = Math.cos(a);
                        const s = Math.sin(a);
                        posList.push(RADIUS * c, RADIUS * s, 0);
                        normList.push(c, s, 0);
                    }
                }
            } else {
                // poly (sides 2..16; 2 = straight line)
                const S = Math.max(2, Math.min(16, Math.round(effSides)));
                const sub = Math.max(1, Math.min(8, Math.round(edgeSubdiv)));
                if (S === 2) {
                    const n = Math.max(2, sub + 1);
                    for (let i = 0; i < n; i++) {
                        const t = i / (n - 1);
                        posList.push(RADIUS - t * (RADIUS * 2), 0, 0);
                        normList.push(0, 1, 0);
                    }
                } else {
                    const verts = [];
                    for (let k = 0; k < S; k++) {
                        const a = (k / S) * Math.PI * 2;
                        verts.push([RADIUS * Math.cos(a), RADIUS * Math.sin(a)]);
                    }
                    for (let k = 0; k < S; k++) {
                        const p0 = verts[k];
                        const p1 = verts[(k + 1) % S];
                        for (let s = 0; s < sub; s++) {
                            const t = s / sub;
                            const x = p0[0] + (p1[0] - p0[0]) * t;
                            const y = p0[1] + (p1[1] - p0[1]) * t;
                            const len = Math.hypot(x, y) || 1;
                            posList.push(x, y, 0);
                            normList.push(x / len, y / len, 0);
                        }
                    }
                    // Close loop back to first vertex
                    posList.push(verts[0][0], verts[0][1], 0);
                    const len0 = Math.hypot(verts[0][0], verts[0][1]) || 1;
                    normList.push(verts[0][0] / len0, verts[0][1] / len0, 0);
                }
            }

            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(posList, 3));
            g.setAttribute('normal', new THREE.Float32BufferAttribute(normList, 3));
            return g;
        };

        const buildFillGeom = (shape, points, edgeSubdiv, effArc, effSides) => {
            if (shape === 'line') {
                const segX = Math.max(1, points - 1);
                return AudioHelpers.addBarycentric(new THREE.PlaneGeometry(RADIUS * 2, 0.08, segX, 1));
            }
            if (shape === 'arc') {
                const segs = Math.max(3, points);
                const totalAngle = Math.PI * 2 * Math.max(0.02, Math.min(1.0, effArc));
                return AudioHelpers.addBarycentric(new THREE.CircleGeometry(RADIUS, segs, 0, totalAngle));
            }
            // poly
            const S = Math.max(2, Math.min(16, Math.round(effSides)));
            if (S === 2) {
                return AudioHelpers.addBarycentric(new THREE.PlaneGeometry(RADIUS * 2, 0.08, Math.max(1, edgeSubdiv), 1));
            }
            return AudioHelpers.addBarycentric(new THREE.CircleGeometry(RADIUS, S, 0, Math.PI * 2));
        };

        const getEffectiveParams = () => {
            const isCv = AudioHelpers.isPortPatched(d, patchState, 'cv_in');
            const cvVal = isCv ? Math.max(0, Math.min(1, cvReader.read(0))) : 0;
            const effArc = isCv ? Math.max(0.02, cvVal) : Math.max(0.02, Math.min(1.0, Number(d.arc ?? 1.0)));
            const effSides = isCv ? Math.max(2, Math.min(16, Math.round(2 + cvVal * 14))) : Math.max(2, Math.min(16, Math.round(d.sides ?? 6)));
            return { isCv, effArc, effSides };
        };

        const getGeom = (shape, renderMode, points, edgeSubdiv, effArc, effSides) => {
            if (typeof THREE === 'undefined') return null;
            const key = `${shape}_${renderMode}_${points}_${edgeSubdiv}_${effArc.toFixed(3)}_${effSides}`;
            if (cachedKey !== key || !cachedGeom) {
                if (cachedGeom) {
                    try { cachedGeom.dispose(); } catch (_) {}
                }
                cachedGeom = (renderMode === 'fill')
                    ? buildFillGeom(shape, points, edgeSubdiv, effArc, effSides)
                    : buildLineGeom(shape, points, edgeSubdiv, effArc, effSides);
                cachedKey = key;
            }
            return cachedGeom;
        };

        const getGeometryPacket = () => {
            const shape = d.shape || 'arc';
            const renderMode = d.renderMode || 'line';
            const points = Math.round(d.points ?? 32);
            const edgeSubdiv = Math.round(d.edgeSubdiv ?? 1);
            const { effArc, effSides } = getEffectiveParams();
            const geom = getGeom(shape, renderMode, points, edgeSubdiv, effArc, effSides);

            return {
                geometry: geom,
                isLine: renderMode !== 'fill',
                materialStyle: renderMode === 'fill' ? (d.material || 'wire') : 'line',
                wireWidth: 1.5,
                pointSize: 3.0,
                glassOpacity: 0.25,
                glow: Number(d.glow ?? 0.0),
                color: new THREE.Color(d.color || '#ffffff').getHex(),
                transform: {
                    position: [0, 0, 0],
                    rotation: [0, 0, 0],
                    scale: [1, 1, 1]
                }
            };
        };

        return {
            nodes: { gCv: cvReader.input, anCv: cvReader.analyser },
            inputs: { cv_in: cvReader.input },
            outputs: { obj_out: null },
            data: d,
            getGeometryPacket,
            read: () => {
                const { isCv, effArc, effSides } = getEffectiveParams();
                return {
                    shape: d.shape || 'arc',
                    renderMode: d.renderMode || 'line',
                    points: Math.round(d.points ?? 32),
                    edgeSubdiv: Math.round(d.edgeSubdiv ?? 1),
                    effectiveArc: effArc,
                    effectiveSides: effSides,
                    glow: Number(d.glow ?? 0.0),
                    isCvPatched: isCv
                };
            },
            updatePatchState: (p) => {
                patchState = p;
            },
            destroy: () => {
                if (cachedGeom) {
                    try { cachedGeom.dispose(); } catch (_) {}
                    cachedGeom = null;
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

export const pathAudioDefs = {
    PATH
};
export default pathAudioDefs;
