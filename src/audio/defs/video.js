// src/audio/defs/video.js
// Audio / Engine side implementation for VIDEO module
// Handles Three.js rendering for Master RENDERER, or Buffer sharing for Linked VIEWER

export const VIDEO = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;
        // CV inputs for cv_x, cv_y, cv_size, cv_fov
        const gX = ctx.createGain();
        const gY = ctx.createGain();
        const gSize = ctx.createGain();
        const gFov = ctx.createGain();

        const anX = ctx.createAnalyser(); anX.fftSize = 32; gX.connect(anX);
        const anY = ctx.createAnalyser(); anY.fftSize = 32; gY.connect(anY);
        const anSize = ctx.createAnalyser(); anSize.fftSize = 32; gSize.connect(anSize);
        const anFov = ctx.createAnalyser(); anFov.fftSize = 32; gFov.connect(anFov);

        if (eng?.silentSink) {
            gX.connect(eng.silentSink);
            gY.connect(eng.silentSink);
            gSize.connect(eng.silentSink);
            gFov.connect(eng.silentSink);
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
            // Strict 1:1 Aspect Ratio (200x200) for un-distorted geometry
            renderCanvas.width = 200;
            renderCanvas.height = 200;

            renderer = new THREE.WebGLRenderer({
                canvas: renderCanvas,
                antialias: true,
                alpha: true
            });
            renderer.setSize(200, 200, false);

            scene = new THREE.Scene();
            // 1:1 Aspect ratio (aspect = 1.0)
            camera = new THREE.PerspectiveCamera(d.fov ?? 45, 1.0, 0.1, 100);
            camera.position.set(d.camX ?? 0, d.camY ?? 0, d.camZ ?? 5);
            camera.lookAt(d.targetX ?? 0, d.targetY ?? 0, d.targetZ ?? 0);

            // Lighting (Neutral bright white)
            const ambient = new THREE.AmbientLight(0xffffff, 0.7);
            scene.add(ambient);
            const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
            dirLight.position.set(3, 4, 5);
            scene.add(dirLight);

            // Wireframe Torus mesh (White)
            const geom = new THREE.TorusGeometry(1.2, 0.45, 16, 32);
            const mat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                wireframe: true,
                roughness: 0.2,
                metalness: 0.5
            });
            mesh = new THREE.Mesh(geom, mat);
            mesh.visible = false;
            scene.add(mesh);
        };

        initThree();

        return {
            nodes: { gX, gY, gSize, gFov, anX, anY, anSize, anFov },
            inputs: {
                cv_x: gX,
                cv_y: gY,
                cv_size: gSize,
                cv_fov: gFov,
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
                const cvSize = readCv(anSize, 0);
                const cvFov = readCv(anFov, 0);

                const cropX = Math.max(0, Math.min(0.9, (d.cropX ?? 0) + cvX));
                const cropY = Math.max(0, Math.min(0.9, (d.cropY ?? 0) + cvY));
                const cropSize = Math.max(0.1, Math.min(1.0 - Math.max(cropX, cropY), (d.cropSize ?? 1.0) + cvSize));

                // If linked, do NOT render 3D! Just return shared root canvas
                if (d._isLinked && d._linkedRootId && eng?.modules) {
                    const rootMod = eng.modules[`${d.pageId || '0'}/${d._linkedRootId}`] || eng.modules[d._linkedRootId];
                    const shared = rootMod?.getSharedCanvas?.();
                    return {
                        canvas: shared,
                        crop: { x: cropX, y: cropY, size: cropSize, w: cropSize, h: cropSize },
                        isLinked: true
                    };
                }

                // Master Renderer mode: Find connected OBJECT ONLY IF geo_in IS PATCHED
                if (renderer && scene && camera && mesh) {
                    const isGeoPatched = patchState?.has('geo_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('geo_in') : false);
                    let geoPacket = null;
                    if (isGeoPatched && eng?.modules) {
                        // Check connections to find exactly which OBJECT is patched to geo_in
                        const pageId = d.pageId || (window.__GS_APP__?.currentPageId ?? '0');
                        const conns = window.__GS_APP__?.connections || window.__GS_APP__?.pagesData?.[pageId]?.connections || [];
                        let connectedSourceId = null;
                        conns.forEach(c => {
                            const connObj = typeof c === 'string' ? (c.includes('>') ? { from: { moduleId: c.split('>')[0].split(':')[0].trim(), port: c.split('>')[0].split(':')[1].trim() }, to: { moduleId: c.split('>')[1].split(':')[0].trim(), port: c.split('>')[1].split(':')[1].trim() } } : null) : c;
                            if (connObj && connObj.to?.moduleId === d.id && connObj.to?.port === 'geo_in') {
                                connectedSourceId = connObj.from?.moduleId;
                            }
                        });

                        if (connectedSourceId) {
                            const srcMod = eng.modules[`${pageId}/${connectedSourceId}`] || eng.modules[connectedSourceId];
                            if (srcMod?.getGeometryPacket) {
                                geoPacket = srcMod.getGeometryPacket();
                            }
                        }

                        // Fallback if not resolved via conns list
                        if (!geoPacket) {
                            Object.values(eng.modules).forEach(mInst => {
                                if (mInst.data?.type === 'OBJECT' && mInst.getGeometryPacket) {
                                    geoPacket = mInst.getGeometryPacket();
                                }
                            });
                        }
                    }

                    // Apply Camera, Target, FOV & Roll parameters
                    const fov = Math.max(10, Math.min(120, (d.fov ?? 45) + cvFov * 10));
                    if (camera.fov !== fov) {
                        camera.fov = fov;
                        camera.updateProjectionMatrix();
                    }
                    camera.position.set(d.camX ?? 0, d.camY ?? 0, d.camZ ?? 5);
                    camera.up.set(0, 1, 0);
                    camera.lookAt(d.targetX ?? 0, d.targetY ?? 0, d.targetZ ?? 0);
                    if (d.camRoll) {
                        camera.rotateZ((d.camRoll * Math.PI) / 180);
                    }

                    if (isGeoPatched && geoPacket && geoPacket.geometry) {
                        if (mesh.geometry !== geoPacket.geometry) {
                            mesh.geometry = geoPacket.geometry;
                        }
                        mesh.rotation.set(...geoPacket.transform.rotation);
                        mesh.scale.set(...geoPacket.transform.scale);
                        mesh.visible = true;
                    } else if (isGeoPatched) {
                        // Patched but no geometry ready yet: idle rotating
                        mesh.rotation.x += 0.01;
                        mesh.rotation.y += 0.015;
                        mesh.visible = true;
                    } else {
                        // NOT PATCHED to anything: do NOT display arbitrary objects!
                        mesh.visible = false;
                    }

                    renderer.render(scene, camera);
                }

                return {
                    canvas: renderCanvas,
                    crop: { x: cropX, y: cropY, size: cropSize, w: cropSize, h: cropSize },
                    isLinked: false
                };
            },
            updatePatchState: (p) => {
                patchState = p;
            },
            destroy: () => {
                if (renderer) {
                    renderer.dispose();
                    renderer = null;
                }
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

export const videoAudioDefs = {
    VIDEO
};
export default videoAudioDefs;
