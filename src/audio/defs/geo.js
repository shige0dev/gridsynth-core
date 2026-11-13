// src/audio/defs/geo.js
// Audio/Engine-side representation for OBJECT
// Outputs 1:1 geometry packets with Material & Color styling

export const OBJECT = {
    create: (ctx, d, patch, eng) => {
        const geometries = {};

        // Planar subdivision helper for polyhedra: subdivides flat faces without projecting to sphere
        const subdividePlanar = (baseGeom, levels = 0) => {
            if (levels <= 0) return baseGeom;
            const nonIndexed = baseGeom.index ? baseGeom.toNonIndexed() : baseGeom.clone();
            const pos = nonIndexed.attributes.position.array;
            let triangles = [];
            for (let i = 0; i < pos.length; i += 9) {
                triangles.push([
                    pos[i], pos[i + 1], pos[i + 2],
                    pos[i + 3], pos[i + 4], pos[i + 5],
                    pos[i + 6], pos[i + 7], pos[i + 8]
                ]);
            }
            for (let l = 0; l < levels; l++) {
                const next = [];
                for (let t = 0; t < triangles.length; t++) {
                    const tr = triangles[t];
                    const ax = tr[0], ay = tr[1], az = tr[2];
                    const bx = tr[3], by = tr[4], bz = tr[5];
                    const cx = tr[6], cy = tr[7], cz = tr[8];

                    const mabx = (ax + bx) * 0.5, maby = (ay + by) * 0.5, mabz = (az + bz) * 0.5;
                    const mbcx = (bx + cx) * 0.5, mbcy = (by + cy) * 0.5, mbcz = (bz + cz) * 0.5;
                    const mcax = (cx + ax) * 0.5, mcay = (cy + ay) * 0.5, mcaz = (cz + az) * 0.5;

                    next.push([ax, ay, az, mabx, maby, mabz, mcax, mcay, mcaz]);
                    next.push([mabx, maby, mabz, bx, by, bz, mbcx, mbcy, mbcz]);
                    next.push([mcax, mcay, mcaz, mbcx, mbcy, mbcz, cx, cy, cz]);
                    next.push([mabx, maby, mabz, mbcx, mbcy, mbcz, mcax, mcay, mcaz]);
                }
                triangles = next;
            }
            const outPos = new Float32Array(triangles.length * 9);
            for (let t = 0; t < triangles.length; t++) {
                const tr = triangles[t];
                for (let k = 0; k < 9; k++) {
                    outPos[t * 9 + k] = tr[k];
                }
            }
            const geom = new THREE.BufferGeometry();
            geom.setAttribute('position', new THREE.BufferAttribute(outPos, 3));
            geom.computeVertexNormals();
            return geom;
        };

        const addBarycentric = (srcGeom) => {
            if (!srcGeom) return srcGeom;
            const g = srcGeom.index ? srcGeom.toNonIndexed() : srcGeom;
            if (g !== srcGeom) {
                try { srcGeom.dispose(); } catch (_) {}
            }
            const count = g.attributes?.position?.count || 0;
            if (count > 0 && !g.attributes.aBarycentric) {
                const bary = new Float32Array(count * 3);
                for (let i = 0; i < count; i++) {
                    const mod = i % 3;
                    bary[i * 3 + mod] = 1.0;
                }
                g.setAttribute('aBarycentric', new THREE.BufferAttribute(bary, 3));
            }
            return g;
        };

        const getGeom = (shape, detail = 'mid') => {
            if (typeof THREE === 'undefined') return null;
            const key = `${shape}_${detail}`;
            if (!geometries[key]) {
                const isLow = detail === 'low';
                const isHigh = detail === 'high';

                switch (shape) {
                    case 'cube':
                        const segs = isLow ? 1 : (isHigh ? 4 : 2);
                        geometries[key] = new THREE.BoxGeometry(1.6, 1.6, 1.6, segs, segs, segs);
                        break;
                    case 'plane':
                        const pSegs = isLow ? 2 : (isHigh ? 12 : 6);
                        geometries[key] = new THREE.PlaneGeometry(2.0, 2.0, pSegs, pSegs);
                        break;
                    case 'sphere':
                        const sSegs = isLow ? [8, 6] : (isHigh ? [32, 32] : [16, 14]);
                        geometries[key] = new THREE.SphereGeometry(1.2, sSegs[0], sSegs[1]);
                        break;
                    case 'cylinder':
                        const cSegs = isLow ? 8 : (isHigh ? 32 : 16);
                        geometries[key] = new THREE.CylinderGeometry(0.9, 0.9, 1.8, cSegs);
                        break;
                    case 'tetra': {
                        const levels = isLow ? 0 : (isHigh ? 2 : 1);
                        const base = new THREE.TetrahedronGeometry(1.3, 0);
                        geometries[key] = subdividePlanar(base, levels);
                        break;
                    }
                    case 'octa': {
                        const levels = isLow ? 0 : (isHigh ? 2 : 1);
                        const base = new THREE.OctahedronGeometry(1.3, 0);
                        geometries[key] = subdividePlanar(base, levels);
                        break;
                    }
                    case 'dodeca': {
                        const levels = isLow ? 0 : (isHigh ? 2 : 1);
                        const base = new THREE.DodecahedronGeometry(1.3, 0);
                        geometries[key] = subdividePlanar(base, levels);
                        break;
                    }
                    case 'icosa': {
                        const levels = isLow ? 0 : (isHigh ? 2 : 1);
                        const base = new THREE.IcosahedronGeometry(1.3, 0);
                        geometries[key] = subdividePlanar(base, levels);
                        break;
                    }
                    case 'cone':
                        const coneSegs = isLow ? 6 : (isHigh ? 32 : 16);
                        geometries[key] = new THREE.ConeGeometry(1.0, 1.8, coneSegs);
                        break;
                    case 'torus':
                    default:
                        const tSegs = isLow ? [6, 12] : (isHigh ? [24, 48] : [12, 24]);
                        geometries[key] = new THREE.TorusGeometry(1.2, 0.45, tSegs[0], tSegs[1]);
                        break;
                }
                if (geometries[key]) {
                    geometries[key] = addBarycentric(geometries[key]);
                }
            }
            return geometries[key];
        };

        const parseColor = (col) => {
            if (col === null || col === undefined || col === '') return 0xffffff;
            if (typeof col === 'number') return col;
            const n = parseInt(String(col).replace('#', ''), 16);
            return Number.isNaN(n) ? 0xffffff : n;
        };

        return {
            nodes: {},
            inputs: {},
            outputs: {},
            data: d,
            getGeometryPacket: () => {
                const shape = d.shape || 'torus';
                const detail = d.detail || 'mid';
                const geometry = getGeom(shape, detail);
                return {
                    type: 'GEOMETRY',
                    id: d.id,
                    shape,
                    geometry,
                    transform: {
                        position: [0, 0, 0],
                        rotation: [0, 0, 0],
                        scale: [1.0, 1.0, 1.0]
                    },
                    materialStyle: d.material || 'wire',
                    wireWidth: Number(d.wireWidth ?? 1.5),
                    pointSize: Number(d.pointSize ?? 3.0),
                    glassOpacity: Number(d.glassOpacity ?? 0.25),
                    color: parseColor(d.color)
                };
            },
            read: () => ({
                shape: d.shape || 'torus',
                detail: d.detail || 'mid',
                material: d.material || 'wire',
                wireWidth: Number(d.wireWidth ?? 1.5),
                pointSize: Number(d.pointSize ?? 3.0),
                glassOpacity: Number(d.glassOpacity ?? 0.25),
                color: d.color || '#ffffff'
            }),
            destroy: () => {
                Object.values(geometries).forEach(g => {
                    try { g.dispose(); } catch (_) {}
                });
            }
        };
    },
    update: (ctx, inst, d) => {
        inst.data = d;
    }
};

export const geoAudioDefs = {
    OBJECT
};
export default geoAudioDefs;
