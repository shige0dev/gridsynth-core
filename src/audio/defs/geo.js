// src/audio/defs/geo.js
// Audio/Engine-side representation for OBJECT
// Outputs pure 1:1 white geometry packets (Torus, Cube, Plane, Sphere, Cylinder)

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
                        // 平面 (2.0 x 2.0, 両面可視ワイヤーフレーム)
                        geometries[shape] = new THREE.PlaneGeometry(2.0, 2.0, 8, 8);
                        break;
                    case 'sphere':
                        // 球 (半径1.2, 分割数24)
                        geometries[shape] = new THREE.SphereGeometry(1.2, 24, 24);
                        break;
                    case 'cylinder':
                        // 円筒 (上径0.9, 下径0.9, 高さ1.8, 分割数24)
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
                    color: 0xffffff // Base White
                };
            },
            read: () => ({ shape: d.shape || 'torus' }),
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
