// src/audio/defs/geo.js
// Audio/Engine-side representation for OBJECT
// Outputs 1:1 geometry packets with Material & Color styling

export const OBJECT = {
    create: (ctx, d, patch, eng) => {
        const geometries = {};

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
                    case 'tetra':
                        const tDetail = isLow ? 0 : (isHigh ? 2 : 1);
                        geometries[key] = new THREE.TetrahedronGeometry(1.3, tDetail);
                        break;
                    case 'octa':
                        const oDetail = isLow ? 0 : (isHigh ? 2 : 1);
                        geometries[key] = new THREE.OctahedronGeometry(1.3, oDetail);
                        break;
                    case 'dodeca':
                        const dDetail = isLow ? 0 : (isHigh ? 2 : 1);
                        geometries[key] = new THREE.DodecahedronGeometry(1.3, dDetail);
                        break;
                    case 'icosa':
                        const iDetail = isLow ? 0 : (isHigh ? 2 : 1);
                        geometries[key] = new THREE.IcosahedronGeometry(1.3, iDetail);
                        break;
                    case 'cone':
                        const coneSegs = isLow ? 6 : (isHigh ? 32 : 16);
                        geometries[key] = new THREE.ConeGeometry(1.0, 1.8, coneSegs);
                        break;
                    case 'capsule':
                        if (typeof THREE.CapsuleGeometry !== 'undefined') {
                            const capSegs = isLow ? [4, 8] : (isHigh ? [8, 24] : [6, 16]);
                            geometries[key] = new THREE.CapsuleGeometry(0.65, 0.9, capSegs[0], capSegs[1]);
                        } else {
                            const cSegs2 = isLow ? 8 : (isHigh ? 32 : 16);
                            geometries[key] = new THREE.CylinderGeometry(0.7, 0.7, 1.8, cSegs2);
                        }
                        break;
                    case 'torus':
                    default:
                        const tSegs = isLow ? [6, 12] : (isHigh ? [24, 48] : [12, 24]);
                        geometries[key] = new THREE.TorusGeometry(1.2, 0.45, tSegs[0], tSegs[1]);
                        break;
                }
            }
            return geometries[key];
        };

        const parseColor = (col) => {
            if (!col) return 0xffffff;
            if (typeof col === 'number') return col;
            return parseInt(String(col).replace('#', ''), 16) || 0xffffff;
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
                    color: parseColor(d.color)
                };
            },
            read: () => ({
                shape: d.shape || 'torus',
                detail: d.detail || 'mid',
                material: d.material || 'wire',
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
