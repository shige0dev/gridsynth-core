// src/audio/defs/geo.js
// Audio/DSP-side representation for GEO_PRIM
// Holds the canonical 3D Geometry packet and listens to incoming CV for rot/scale

export const GEO_PRIM = {
    create: (ctx, d, patch, eng) => {
        // CV inputs for rot_x, rot_y, rot_z, scale
        const gRx = ctx.createGain();
        const gRy = ctx.createGain();
        const gRz = ctx.createGain();
        const gScale = ctx.createGain();

        // Audio worklet or analyser could read continuous values; for lightweight CV monitoring:
        // Use an AudioWorklet or ScriptProcessor/Analyser to sample CV at 60Hz
        const anRx = ctx.createAnalyser(); anRx.fftSize = 32; gRx.connect(anRx);
        const anRy = ctx.createAnalyser(); anRy.fftSize = 32; gRy.connect(anRy);
        const anRz = ctx.createAnalyser(); anRz.fftSize = 32; gRz.connect(anRz);
        const anScale = ctx.createAnalyser(); anScale.fftSize = 32; gScale.connect(anScale);

        if (eng?.silentSink) {
            gRx.connect(eng.silentSink);
            gRy.connect(eng.silentSink);
            gRz.connect(eng.silentSink);
            gScale.connect(eng.silentSink);
        }

        const buf = new Float32Array(32);
        const readCv = (an, def = 0) => {
            an.getFloatTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < 32; i++) sum += buf[i];
            const avg = sum / 32;
            return isNaN(avg) ? def : avg;
        };

        // THREE.js Geometry packet
        let geometry = null;
        if (typeof THREE !== 'undefined') {
            geometry = new THREE.TorusGeometry(1.2, 0.45, 16, 32);
        }

        return {
            nodes: { gRx, gRy, gRz, gScale, anRx, anRy, anRz, anScale },
            inputs: {
                rot_x: gRx,
                rot_y: gRy,
                rot_z: gRz,
                scale_cv: gScale,
                scale: gScale
            },
            outputs: {},
            getGeometryPacket: () => {
                if (!geometry && typeof THREE !== 'undefined') {
                    geometry = new THREE.TorusGeometry(1.2, 0.45, 16, 32);
                }
                const rx = (d.rotX ?? 0) + readCv(anRx, 0);
                const ry = (d.rotY ?? 0) + readCv(anRy, 0);
                const rz = (d.rotZ ?? 0) + readCv(anRz, 0);
                const scl = Math.max(0.01, (d.scale ?? 1.0) + readCv(anScale, 0));
                return {
                    type: 'GEOMETRY',
                    id: d.id,
                    shape: 'torus',
                    geometry,
                    transform: {
                        rotation: [rx * Math.PI, ry * Math.PI, rz * Math.PI],
                        scale: [scl, scl, scl]
                    }
                };
            },
            read: () => {
                const rx = (d.rotX ?? 0) + readCv(anRx, 0);
                const ry = (d.rotY ?? 0) + readCv(anRy, 0);
                const rz = (d.rotZ ?? 0) + readCv(anRz, 0);
                const scl = Math.max(0.01, (d.scale ?? 1.0) + readCv(anScale, 0));
                return { rx, ry, rz, scale: scl };
            }
        };
    },
    update: (ctx, inst, d) => {
        // Config update
    },
    destroy: (inst) => {
        // Cleanup geometry if needed
    }
};

export const geoAudioDefs = {
    GEO_PRIM
};
export default geoAudioDefs;
