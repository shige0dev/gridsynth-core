// src/audio/defs/geo.js
// Audio/Engine-side representation for OBJECT
// Outputs 1:1 geometry packets with Material & Color styling

export const OBJECT = {
    create: (ctx, d, patch, eng) => {
        const geometries = {};

        const getGeom = (shape) => {
            if (typeof THREE === 'undefined') return null;
            if (!geometries[shape]) {
                switch (shape) {
                    case 'cube':
                        geometries[shape] = new THREE.BoxGeometry(1.6, 1.6, 1.6);
                        break;
                    case 'plane':
                        geometries[shape] = new THREE.PlaneGeometry(2.0, 2.0, 8, 8);
                        break;
                    case 'sphere':
                        geometries[shape] = new THREE.SphereGeometry(1.2, 24, 24);
                        break;
                    case 'cylinder':
                        geometries[shape] = new THREE.CylinderGeometry(0.9, 0.9, 1.8, 24);
                        break;
                    case 'torus':
                    default:
                        geometries[shape] = new THREE.TorusGeometry(1.2, 0.45, 16, 32);
                        break;
                }
            }
            return geometries[shape];
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
                const geometry = getGeom(shape);
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
