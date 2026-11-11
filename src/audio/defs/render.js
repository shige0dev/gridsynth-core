// src/audio/defs/render.js
// Audio / Engine side implementation for RENDER module
// Generates master 1:1 WebGL offscreen framebuffer from incoming 3D geometry packet (OBJECT / ROTATE)

export const RENDER = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;

        // CV input for fov (PIN1)
        const gFov = ctx.createGain();
        const anFov = ctx.createAnalyser();
        anFov.fftSize = 32;
        gFov.connect(anFov);

        if (eng?.silentSink) {
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

        // Three.js Scene Setup (High-Res 800x800 Buffer for clear 4x4 division)
        const BUFFER_SIZE = 800;
        let renderer = null;
        let scene = null;
        let camera = null;
        let mesh = null;
        let renderCanvas = null;

        const initThree = () => {
            if (typeof THREE === 'undefined') return;
            renderCanvas = document.createElement('canvas');
            renderCanvas.width = BUFFER_SIZE;
            renderCanvas.height = BUFFER_SIZE;

            renderer = new THREE.WebGLRenderer({
                canvas: renderCanvas,
                antialias: true,
                alpha: true
            });
            renderer.setSize(BUFFER_SIZE, BUFFER_SIZE, false);

            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(d.fov ?? 45, 1.0, 0.1, 100);
            camera.position.set(d.camX ?? 0, d.camY ?? 0, d.camZ ?? 5);
            camera.lookAt(d.targetX ?? 0, d.targetY ?? 0, d.targetZ ?? 0);

            // Lighting (Neutral bright white)
            const ambient = new THREE.AmbientLight(0xffffff, 0.7);
            scene.add(ambient);
            const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
            dirLight.position.set(3, 4, 5);
            scene.add(dirLight);

            // Wireframe mesh (White)
            const geom = new THREE.TorusGeometry(1.2, 0.45, 16, 32);
            const mat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                wireframe: true,
                roughness: 0.2,
                metalness: 0.5,
                side: THREE.DoubleSide
            });
            mesh = new THREE.Mesh(geom, mat);
            mesh.visible = false;
            scene.add(mesh);
        };

        initThree();

        return {
            nodes: { gFov, anFov },
            inputs: {
                obj_in: null,
                geo_in: null,
                fov_in: gFov,
                cv_fov: gFov
            },
            outputs: {
                video_out: null
            },
            data: d,
            getSharedCanvas: () => renderCanvas,
            read: () => {
                const cvFov = readCv(anFov, 0);

                if (renderer && scene && camera && mesh) {
                    // Check if obj_in / geo_in is patched and find connected geometry
                    const isGeoPatched = patchState?.has('obj_in') || patchState?.has('geo_in') ||
                        (window.__GS_APP__?.getPatchState ? (window.__GS_APP__.getPatchState(d.id)?.has('obj_in') || window.__GS_APP__.getPatchState(d.id)?.has('geo_in')) : false);
                    let geoPacket = null;

                    if (isGeoPatched && eng?.modules) {
                        const pageId = d.pageId || (window.__GS_APP__?.currentPageId ?? '0');
                        const conns = window.__GS_APP__?.connections || window.__GS_APP__?.pagesData?.[pageId]?.connections || [];
                        let connectedSourceId = null;

                        conns.forEach(c => {
                            const connObj = typeof c === 'string' ? (c.includes('>') ? {
                                from: { moduleId: c.split('>')[0].split(':')[0].trim(), port: c.split('>')[0].split(':')[1].trim() },
                                to: { moduleId: c.split('>')[1].split(':')[0].trim(), port: c.split('>')[1].split(':')[1].trim() }
                            } : null) : c;

                            if (connObj && connObj.to?.moduleId === d.id && (connObj.to?.port === 'obj_in' || connObj.to?.port === 'geo_in')) {
                                connectedSourceId = connObj.from?.moduleId;
                            }
                        });

                        if (connectedSourceId) {
                            const srcMod = eng.modules[`${pageId}/${connectedSourceId}`] || eng.modules[connectedSourceId];
                            if (srcMod?.getGeometryPacket) {
                                geoPacket = srcMod.getGeometryPacket();
                            }
                        }

                        // Fallback search across engine modules
                        if (!geoPacket) {
                            Object.values(eng.modules).forEach(mInst => {
                                if (mInst.data?.id !== d.id && mInst.getGeometryPacket) {
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
                        // Patched but geometry not ready yet
                        mesh.rotation.x += 0.01;
                        mesh.rotation.y += 0.015;
                        mesh.visible = true;
                    } else {
                        // NOT PATCHED to anything: do NOT display arbitrary objects
                        mesh.visible = false;
                    }

                    renderer.render(scene, camera);
                }

                return {
                    canvas: renderCanvas,
                    isGeoPatched: Boolean(patchState?.has('obj_in') || patchState?.has('geo_in'))
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
                try { gFov.disconnect(); } catch (e) {}
                try { anFov.disconnect(); } catch (e) {}
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

export const renderAudioDefs = {
    RENDER
};
export default renderAudioDefs;
