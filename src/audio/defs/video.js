// src/audio/defs/video.js
// Audio / Engine side implementation for VIDEO module
// Handles Three.js rendering for Master RENDERER, or Buffer sharing for Linked VIEWER

export const VIDEO = {
    create: (ctx, d, patch, eng) => {
        // CV inputs for cv_x, cv_y, cv_w, cv_h
        const gX = ctx.createGain();
        const gY = ctx.createGain();
        const gW = ctx.createGain();
        const gH = ctx.createGain();

        const anX = ctx.createAnalyser(); anX.fftSize = 32; gX.connect(anX);
        const anY = ctx.createAnalyser(); anY.fftSize = 32; gY.connect(anY);
        const anW = ctx.createAnalyser(); anW.fftSize = 32; gW.connect(anW);
        const anH = ctx.createAnalyser(); anH.fftSize = 32; gH.connect(anH);

        if (eng?.silentSink) {
            gX.connect(eng.silentSink);
            gY.connect(eng.silentSink);
            gW.connect(eng.silentSink);
            gH.connect(eng.silentSink);
        }

        const buf = new Float32Array(32);
        const readCv = (an, def = 0) => {
            an.getFloatTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < 32; i++) sum += buf[i];
            const avg = sum / 32;
            return isNaN(avg) ? def : avg;
        };

        // Three.js Scene Setup (Master Renderer only)
        let renderer = null;
        let scene = null;
        let camera = null;
        let mesh = null;
        let renderCanvas = null;

        const initThree = () => {
            if (typeof THREE === 'undefined') return;
            renderCanvas = document.createElement('canvas');
            renderCanvas.width = 256;
            renderCanvas.height = 144;

            renderer = new THREE.WebGLRenderer({
                canvas: renderCanvas,
                antialias: true,
                alpha: true
            });
            renderer.setSize(256, 144, false);

            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(45, 256 / 144, 0.1, 100);
            camera.position.set(0, 0, 5);
            camera.lookAt(0, 0, 0);

            // Lighting
            const ambient = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambient);
            const dirLight = new THREE.DirectionalLight(0xa855f7, 1.2);
            dirLight.position.set(3, 4, 5);
            scene.add(dirLight);

            // Default wireframe Torus mesh
            const geom = new THREE.TorusGeometry(1.2, 0.45, 16, 32);
            const mat = new THREE.MeshStandardMaterial({
                color: 0xc084fc,
                wireframe: true,
                roughness: 0.3,
                metalness: 0.8
            });
            mesh = new THREE.Mesh(geom, mat);
            scene.add(mesh);
        };

        initThree();

        return {
            nodes: { gX, gY, gW, gH, anX, anY, anW, anH },
            inputs: {
                cv_x: gX,
                cv_y: gY,
                cv_w: gW,
                cv_h: gH,
                geo_in: null,
                video_in: null
            },
            outputs: {
                video_out: null
            },
            data: d,
            getSharedCanvas: () => {
                // If linked to a parent, resolve root canvas
                if (d._isLinked && d._linkedRootId && eng?.modules) {
                    const rootMod = eng.modules[`${d.pageId || '0'}/${d._linkedRootId}`] || eng.modules[d._linkedRootId];
                    if (rootMod?.getSharedCanvas) return rootMod.getSharedCanvas();
                }
                return renderCanvas;
            },
            read: () => {
                const cvX = readCv(anX, 0);
                const cvY = readCv(anY, 0);
                const cvW = readCv(anW, 0);
                const cvH = readCv(anH, 0);

                const cropX = Math.max(0, Math.min(0.9, (d.cropX ?? 0) + cvX));
                const cropY = Math.max(0, Math.min(0.9, (d.cropY ?? 0) + cvY));
                const cropW = Math.max(0.1, Math.min(1.0 - cropX, (d.cropW ?? 1.0) + cvW));
                const cropH = Math.max(0.1, Math.min(1.0 - cropY, (d.cropH ?? 1.0) + cvH));

                // If linked, do NOT render 3D! Just return shared root canvas
                if (d._isLinked && d._linkedRootId && eng?.modules) {
                    const rootMod = eng.modules[`${d.pageId || '0'}/${d._linkedRootId}`] || eng.modules[d._linkedRootId];
                    const shared = rootMod?.getSharedCanvas?.();
                    return {
                        canvas: shared,
                        crop: { x: cropX, y: cropY, w: cropW, h: cropH },
                        isLinked: true
                    };
                }

                // Master Renderer mode: Find connected GEO_PRIM
                if (renderer && scene && camera && mesh) {
                    // Check if geo_in is patched to a GEO_PRIM module
                    let geoPacket = null;
                    if (eng?.modules) {
                        // Look for a GEO_PRIM instance
                        Object.values(eng.modules).forEach(mInst => {
                            if (mInst.data?.type === 'GEO_PRIM' && mInst.getGeometryPacket) {
                                geoPacket = mInst.getGeometryPacket();
                            }
                        });
                    }

                    if (geoPacket && geoPacket.geometry) {
                        if (mesh.geometry !== geoPacket.geometry) {
                            mesh.geometry = geoPacket.geometry;
                        }
                        mesh.rotation.set(...geoPacket.transform.rotation);
                        mesh.scale.set(...geoPacket.transform.scale);
                        mesh.visible = true;
                    } else {
                        // Fallback: render default idle rotating torus
                        mesh.rotation.x += 0.01;
                        mesh.rotation.y += 0.015;
                        mesh.visible = true;
                    }

                    renderer.render(scene, camera);

                    renderer.render(scene, camera);
                }

                return {
                    canvas: renderCanvas,
                    crop: { x: cropX, y: cropY, w: cropW, h: cropH },
                    isLinked: false
                };
            },
            destroy: () => {
                if (renderer) {
                    renderer.dispose();
                    renderer = null;
                }
            }
        };
    },
    update: (ctx, inst, d) => {
        inst.data = d;
    }
};

export const videoAudioDefs = {
    VIDEO
};
export default videoAudioDefs;
