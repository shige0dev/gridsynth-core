// src/audio/defs/geo.js
// Audio/Engine-side representation for OBJECT
// Outputs pure 1:1 white geometry packets (Torus or Cube)

export const OBJECT = {
    create: (ctx, d, patch, eng) => {
        let torusGeom = null;
        let cubeGeom = null;

        const getGeom = (shape) => {
            if (typeof THREE === 'undefined') return null;
            if (shape === 'cube') {
                if (!cubeGeom) cubeGeom = new THREE.BoxGeometry(1.6, 1.6, 1.6);
                return cubeGeom;
            } else {
                if (!torusGeom) torusGeom = new THREE.TorusGeometry(1.2, 0.45, 16, 32);
                return torusGeom;
            }
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
                        rotation: [0, 0, 0],
                        scale: [1.0, 1.0, 1.0]
                    },
                    color: 0xffffff // Base White
                };
            },
            read: () => ({ shape: d.shape || 'torus' }),
            destroy: () => {
                if (torusGeom) { torusGeom.dispose(); torusGeom = null; }
                if (cubeGeom) { cubeGeom.dispose(); cubeGeom = null; }
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
