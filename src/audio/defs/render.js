// src/audio/defs/render.js
// Audio / Engine side implementation for RENDER module
// Generates master 1:1 WebGL offscreen framebuffer from incoming 3D geometry packet (OBJECT / ROTATE / MOVE)
// Supports multi-cable summing on obj_in and hierarchical scene graphs.

export const RENDER = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;

        // CV input for fov (PIN4)
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
        let rootGroup = null;
        let wireframeMaterial = null;
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

            // Hierarchical root container and shared wireframe material
            rootGroup = new THREE.Group();
            scene.add(rootGroup);

            wireframeMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                wireframe: true,
                roughness: 0.2,
                metalness: 0.5,
                side: THREE.DoubleSide
            });
        };

        initThree();

        const getSourcePackets = () => {
            const isPatched = patchState?.has('obj_in') || patchState?.has('geo_in') ||
                (window.__GS_APP__?.getPatchState ? (window.__GS_APP__.getPatchState(d.id)?.has('obj_in') || window.__GS_APP__.getPatchState(d.id)?.has('geo_in')) : false);
            if (!isPatched || !eng?.modules) return [];

            const pageId = d.pageId || (window.__GS_APP__?.currentPageId ?? '0');
            const conns = window.__GS_APP__?.connections || window.__GS_APP__.pagesData?.[pageId]?.connections || [];
            const connectedSourceIds = [];

            conns.forEach(c => {
                const connObj = typeof c === 'string' ? (c.includes('>') ? {
                    from: { moduleId: c.split('>')[0].split(':')[0].trim(), port: c.split('>')[0].split(':')[1].trim() },
                    to: { moduleId: c.split('>')[1].split(':')[0].trim(), port: c.split('>')[1].split(':')[1].trim() }
                } : null) : c;

                if (connObj && connObj.to?.moduleId === d.id && (connObj.to?.port === 'obj_in' || connObj.to?.port === 'geo_in')) {
                    connectedSourceIds.push(connObj.from?.moduleId);
                }
            });

            const packets = [];
            connectedSourceIds.forEach(srcId => {
                const srcMod = eng.modules[`${pageId}/${srcId}`] || eng.modules[srcId];
                if (srcMod?.getGeometryPacket) {
                    const pkt = srcMod.getGeometryPacket();
                    if (pkt) packets.push(pkt);
                }
            });

            return packets;
        };

        const syncNode = (packet, parentThreeObj, idx) => {
            if (!packet) return;
            let node = parentThreeObj.children[idx];

            if (packet.children && packet.children.length > 0) {
                // Group container
                if (!node || node.type !== 'Group') {
                    if (node) parentThreeObj.remove(node);
                    node = new THREE.Group();
                    parentThreeObj.add(node);
                }
                node.visible = true;
                node.position.set(...(packet.transform?.position || [0, 0, 0]));
                node.rotation.set(...(packet.transform?.rotation || [0, 0, 0]));
                node.scale.set(...(packet.transform?.scale || [1, 1, 1]));

                for (let i = 0; i < packet.children.length; i++) {
                    syncNode(packet.children[i], node, i);
                }
                while (node.children.length > packet.children.length) {
                    node.remove(node.children[node.children.length - 1]);
                }
            } else if (packet.geometry) {
                // Single Mesh Leaf
                if (!node || node.type !== 'Mesh') {
                    if (node) parentThreeObj.remove(node);
                    node = new THREE.Mesh(packet.geometry, wireframeMaterial);
                    parentThreeObj.add(node);
                } else {
                    if (node.geometry !== packet.geometry) {
                        node.geometry = packet.geometry;
                    }
                }
                node.visible = true;
                node.position.set(...(packet.transform?.position || [0, 0, 0]));
                node.rotation.set(...(packet.transform?.rotation || [0, 0, 0]));
                node.scale.set(...(packet.transform?.scale || [1, 1, 1]));
            }
        };

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

                if (renderer && scene && camera && rootGroup) {
                    const incomingPackets = getSourcePackets();

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

                    if (incomingPackets.length > 0) {
                        rootGroup.visible = true;
                        for (let i = 0; i < incomingPackets.length; i++) {
                            syncNode(incomingPackets[i], rootGroup, i);
                        }
                        while (rootGroup.children.length > incomingPackets.length) {
                            rootGroup.remove(rootGroup.children[rootGroup.children.length - 1]);
                        }
                    } else {
                        rootGroup.visible = false;
                    }

                    renderer.render(scene, camera);
                }

                const isPatched = Boolean(patchState?.has('obj_in') || patchState?.has('geo_in'));
                return {
                    canvas: renderCanvas,
                    isGeoPatched: isPatched,
                    camX: d.camX ?? 0,
                    camY: d.camY ?? 0,
                    camZ: d.camZ ?? 5,
                    fov: Math.round(camera?.fov ?? d.fov ?? 45),
                    roll: Math.round(d.camRoll ?? 0),
                    targetX: d.targetX ?? 0,
                    targetY: d.targetY ?? 0,
                    targetZ: d.targetZ ?? 0,
                    isCvFov: Boolean(patchState?.has('fov_in') || patchState?.has('cv_fov'))
                };
            },
            updatePatchState: (p) => {
                patchState = p;
            },
            destroy: () => {
                if (rootGroup) {
                    rootGroup.traverse(obj => {
                        if (obj.isMesh) {
                            try { obj.geometry?.dispose(); } catch (_) {}
                        }
                    });
                }
                if (wireframeMaterial) {
                    try { wireframeMaterial.dispose(); } catch (_) {}
                }
                if (renderer) {
                    try { renderer.dispose(); } catch (_) {}
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
