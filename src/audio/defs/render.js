// src/audio/defs/render.js
// Audio / Engine side implementation for RENDER module
// Generates master 1:1 WebGL offscreen framebuffer from incoming 3D geometry packet (OBJECT / ROTATE / MOVE / SCALE)
// Supports multi-cable summing, hierarchical scene graphs, and material style overriding.

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

        // Three.js Scene Setup (512x512 Buffer - Balanced for 1x1, 2x2, and 4x4; 2048x2048 in VR Stereo)
        const BUFFER_SIZE = 512;
        let currentBufferSize = BUFFER_SIZE;
        let renderer = null;
        let scene = null;
        let camera = null;
        let rootGroup = null;
        let renderCanvas = null;

        // HDR Multi-Stage Bloom Post-Processing Setup (supports faces, wireframes & points)
        let baseTarget = null;
        let bloomMips = [];
        let bloomScene = null;
        let bloomCamera = null;
        let bloomQuad = null;
        let prefilterMat = null;
        let downsampleMat = null;
        let compositeMat = null;
        let bloomGeo = null;

        // Material Cache (Key: `${style}_${colorHex}`)
        const materialCache = new Map();
        let pointTexture = null;

        const getPointTexture = () => {
            if (pointTexture || typeof document === 'undefined' || typeof THREE === 'undefined') return pointTexture;
            const c = document.createElement('canvas');
            c.width = 64;
            c.height = 64;
            const g = c.getContext('2d');
            if (g) {
                const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
                grad.addColorStop(0.0, 'rgba(255,255,255,1.0)');
                grad.addColorStop(0.55, 'rgba(255,255,255,0.92)');
                grad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
                g.fillStyle = grad;
                g.fillRect(0, 0, 64, 64);
            }
            pointTexture = new THREE.CanvasTexture(c);
            return pointTexture;
        };

        const getMaterial = (style, colorHex, pointSize = 3.0, wireWidth = 1.5, glassOpacity = 0.25, glow = 0.0) => {
            if (typeof THREE === 'undefined') return null;
            const gVal = Math.max(0, Number(glow) || 0);
            const extraKey = style === 'point'
                ? `_${Number(pointSize).toFixed(1)}`
                : (style === 'wire'
                    ? `_${Number(wireWidth).toFixed(1)}`
                    : (style === 'glass' ? `_${Number(glassOpacity).toFixed(2)}` : ''));
            const key = `${style}_${colorHex}${extraKey}_g${gVal.toFixed(1)}`;
            if (!materialCache.has(key)) {
                let mat;
                switch (style) {
                    case 'point':
                        mat = new THREE.PointsMaterial({
                            color: gVal > 0.01 ? new THREE.Color(colorHex).multiplyScalar(1.0 + gVal * 1.6) : colorHex,
                            size: Math.max(0.015, Number(pointSize) * 0.03),
                            map: getPointTexture(),
                            transparent: true,
                            alphaTest: 0.25,
                            depthWrite: true,
                            sizeAttenuation: true
                        });
                        break;
                    case 'solid':
                        mat = new THREE.MeshStandardMaterial({
                            color: colorHex,
                            emissive: gVal > 0.01 ? colorHex : 0x000000,
                            emissiveIntensity: gVal > 0.01 ? gVal * 1.6 : 0.0,
                            roughness: 0.3,
                            metalness: 0.4,
                            side: THREE.DoubleSide
                        });
                        break;
                    case 'normal':
                        mat = new THREE.MeshNormalMaterial({
                            side: THREE.DoubleSide
                        });
                        break;
                    case 'toon':
                        mat = new THREE.MeshToonMaterial({
                            color: colorHex,
                            emissive: gVal > 0.01 ? colorHex : 0x000000,
                            emissiveIntensity: gVal > 0.01 ? gVal * 1.6 : 0.0,
                            side: THREE.DoubleSide
                        });
                        break;
                    case 'neon':
                        mat = new THREE.MeshStandardMaterial({
                            color: colorHex,
                            emissive: colorHex,
                            emissiveIntensity: Math.max(2.0, 2.0 + gVal),
                            roughness: 0.1,
                            metalness: 0.1,
                            side: THREE.DoubleSide
                        });
                        break;
                    case 'glass':
                        mat = new THREE.ShaderMaterial({
                            uniforms: {
                                uColor: { value: new THREE.Color(colorHex) },
                                uOpacity: { value: Math.max(0.05, Math.min(0.85, Number(glassOpacity) || 0.25)) },
                                uGlow: { value: gVal }
                            },
                            vertexShader: `
                                varying vec3 vNormal;
                                varying vec3 vViewPos;
                                void main() {
                                    #ifdef USE_INSTANCING
                                        vec4 mvPos = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
                                        vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
                                    #else
                                        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                                        vNormal = normalize(normalMatrix * normal);
                                    #endif
                                    vViewPos = -mvPos.xyz;
                                    gl_Position = projectionMatrix * mvPos;
                                }
                            `,
                            fragmentShader: `
                                uniform vec3 uColor;
                                uniform float uOpacity;
                                uniform float uGlow;
                                varying vec3 vNormal;
                                varying vec3 vViewPos;
                                void main() {
                                    vec3 V = normalize(vViewPos);
                                    vec3 N = normalize(vNormal);
                                    if (!gl_FrontFacing) N = -N;
                                    float ndotv = clamp(dot(N, V), 0.0, 1.0);
                                    float fresnel = pow(1.0 - ndotv, 2.4);

                                    vec3 L1 = normalize(vec3(0.5, 0.8, 0.6));
                                    vec3 L2 = normalize(vec3(-0.6, -0.4, 0.5));
                                    float spec1 = pow(max(dot(N, normalize(L1 + V)), 0.0), 48.0);
                                    float spec2 = pow(max(dot(N, normalize(L2 + V)), 0.0), 24.0) * 0.45;
                                    float sheen = smoothstep(-0.2, 0.9, N.y) * 0.14;

                                    vec3 col = uColor * (uOpacity * 0.75 + fresnel * 0.95 + sheen)
                                             + vec3(1.0) * (spec1 * 0.95 + spec2 * 0.5 + fresnel * 0.35);
                                    col *= (1.0 + uGlow * 1.4);
                                    float alpha = clamp(uOpacity * 0.45 + fresnel * 0.78 + spec1 * 0.85, 0.04, 0.96);
                                    gl_FragColor = vec4(col, alpha);
                                }
                            `,
                            transparent: true,
                            depthWrite: false,
                            side: THREE.DoubleSide
                        });
                        break;
                    case 'wire':
                    default:
                        mat = new THREE.ShaderMaterial({
                            uniforms: {
                                uColor: { value: new THREE.Color(colorHex) },
                                uWireWidth: { value: Math.max(0.5, Number(wireWidth) || 1.5) },
                                uGlow: { value: gVal }
                            },
                            vertexShader: `
                                attribute vec3 aBarycentric;
                                varying vec3 vBarycentric;
                                void main() {
                                    vBarycentric = aBarycentric;
                                    #ifdef USE_INSTANCING
                                        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
                                    #else
                                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                                    #endif
                                }
                            `,
                            fragmentShader: `
                                uniform vec3 uColor;
                                uniform float uWireWidth;
                                uniform float uGlow;
                                varying vec3 vBarycentric;
                                void main() {
                                    vec3 d = fwidth(vBarycentric);
                                    vec3 a3 = smoothstep(vec3(0.0), d * uWireWidth, vBarycentric);
                                    float edgeFactor = min(min(a3.x, a3.y), a3.z);
                                    float alpha = 1.0 - edgeFactor;
                                    if (alpha < 0.02) discard;
                                    gl_FragColor = vec4(uColor * (1.0 + uGlow * 1.8), alpha);
                                }
                            `,
                            extensions: { derivatives: true },
                            transparent: true,
                            side: THREE.DoubleSide
                        });
                        break;
                }
                materialCache.set(key, mat);
            }
            return materialCache.get(key);
        };

        const initThree = () => {
            if (typeof THREE === 'undefined') return;
            renderCanvas = document.createElement('canvas');
            renderCanvas.width = BUFFER_SIZE;
            renderCanvas.height = BUFFER_SIZE;

            renderer = new THREE.WebGLRenderer({
                canvas: renderCanvas,
                antialias: true,
                alpha: true,
                preserveDrawingBuffer: true
            });
            renderer.setSize(BUFFER_SIZE, BUFFER_SIZE, false);
            renderer.setClearColor(0x000000, 0.0);

            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(d.fov ?? 45, 1.0, 0.1, 100);
            camera.position.set(d.camX ?? 0, d.camY ?? 0, d.camZ ?? 5);
            camera.lookAt(d.targetX ?? 0, d.targetY ?? 0, d.targetZ ?? 0);

            // Lighting (Neutral bright white ambient + directional)
            const ambient = new THREE.AmbientLight(0xffffff, 0.8);
            scene.add(ambient);
            const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
            dirLight.position.set(4, 5, 6);
            scene.add(dirLight);

            rootGroup = new THREE.Group();
            scene.add(rootGroup);

            // HDR Multi-Stage Bloom Post-Processor (Threshold + 4-stage Downsample + Composite)
            const useHalfFloat = Boolean(renderer.capabilities?.isWebGL2 || renderer.extensions?.get('EXT_color_buffer_half_float'));
            const rtOpts = {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: useHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType
            };

            baseTarget = new THREE.WebGLRenderTarget(BUFFER_SIZE, BUFFER_SIZE, rtOpts);
            bloomMips = [256, 128, 64, 32].map(sz => new THREE.WebGLRenderTarget(sz, sz, rtOpts));

            bloomScene = new THREE.Scene();
            bloomCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

            const quadVert = `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position.xy, 0.0, 1.0);
                }
            `;

            prefilterMat = new THREE.ShaderMaterial({
                uniforms: {
                    tColor: { value: baseTarget.texture }
                },
                vertexShader: quadVert,
                fragmentShader: `
                    uniform sampler2D tColor;
                    varying vec2 vUv;
                    void main() {
                        vec4 c = texture2D(tColor, vUv);
                        float br = max(c.r, max(c.g, c.b));
                        float contrib = smoothstep(0.95, 1.25, br);
                        gl_FragColor = vec4(c.rgb * c.a * contrib, c.a * contrib);
                    }
                `,
                depthTest: false,
                depthWrite: false
            });

            downsampleMat = new THREE.ShaderMaterial({
                uniforms: {
                    tInput: { value: null },
                    uTexelSize: { value: new THREE.Vector2(1 / 256, 1 / 256) }
                },
                vertexShader: quadVert,
                fragmentShader: `
                    uniform sampler2D tInput;
                    uniform vec2 uTexelSize;
                    varying vec2 vUv;
                    void main() {
                        vec2 o = uTexelSize * 1.5;
                        vec4 s = texture2D(tInput, vUv) * 0.25;
                        s += texture2D(tInput, clamp(vUv + vec2(-o.x,  0.0), 0.0, 1.0)) * 0.125;
                        s += texture2D(tInput, clamp(vUv + vec2( o.x,  0.0), 0.0, 1.0)) * 0.125;
                        s += texture2D(tInput, clamp(vUv + vec2( 0.0, -o.y), 0.0, 1.0)) * 0.125;
                        s += texture2D(tInput, clamp(vUv + vec2( 0.0,  o.y), 0.0, 1.0)) * 0.125;
                        s += texture2D(tInput, clamp(vUv + vec2(-o.x, -o.y), 0.0, 1.0)) * 0.0625;
                        s += texture2D(tInput, clamp(vUv + vec2( o.x, -o.y), 0.0, 1.0)) * 0.0625;
                        s += texture2D(tInput, clamp(vUv + vec2(-o.x,  o.y), 0.0, 1.0)) * 0.0625;
                        s += texture2D(tInput, clamp(vUv + vec2( o.x,  o.y), 0.0, 1.0)) * 0.0625;
                        gl_FragColor = s;
                    }
                `,
                depthTest: false,
                depthWrite: false
            });

            compositeMat = new THREE.ShaderMaterial({
                uniforms: {
                    tColor: { value: baseTarget.texture },
                    tMip0: { value: bloomMips[0].texture },
                    tMip1: { value: bloomMips[1].texture },
                    tMip2: { value: bloomMips[2].texture },
                    tMip3: { value: bloomMips[3].texture }
                },
                vertexShader: quadVert,
                fragmentShader: `
                    uniform sampler2D tColor;
                    uniform sampler2D tMip0;
                    uniform sampler2D tMip1;
                    uniform sampler2D tMip2;
                    uniform sampler2D tMip3;
                    varying vec2 vUv;

                    vec3 softTone(vec3 x) {
                        vec3 over = max(x - vec3(0.85), vec3(0.0));
                        return min(x, vec3(0.85)) + over / (vec3(1.0) + over * 1.15) * 0.15;
                    }

                    void main() {
                        vec4 baseCol = texture2D(tColor, vUv);
                        vec3 bloom = texture2D(tMip0, vUv).rgb * 0.45
                                   + texture2D(tMip1, vUv).rgb * 0.35
                                   + texture2D(tMip2, vUv).rgb * 0.25
                                   + texture2D(tMip3, vUv).rgb * 0.20;
                        vec3 hdr = baseCol.rgb + bloom * 1.15;
                        vec3 outRgb = clamp(softTone(hdr), 0.0, 1.0);
                        float bloomLum = dot(bloom, vec3(0.299, 0.587, 0.114));
                        float outAlpha = clamp(baseCol.a + bloomLum * 0.85, 0.0, 1.0);
                        gl_FragColor = vec4(outRgb, outAlpha);
                    }
                `,
                depthTest: false,
                depthWrite: false
            });

            bloomGeo = new THREE.PlaneGeometry(2, 2);
            bloomQuad = new THREE.Mesh(bloomGeo, compositeMat);
            bloomScene.add(bloomQuad);
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

                for (let cIdx = 0; cIdx < packet.children.length; cIdx++) {
                    syncNode(packet.children[cIdx], node, cIdx);
                }
                while (node.children.length > packet.children.length) {
                    node.remove(node.children[node.children.length - 1]);
                }
            } else if (packet.type === 'INSTANCED' && packet.matrices && packet.count > 0) {
                // GPU InstancedMesh container
                const override = d.materialOverride || 'auto';
                let effectiveStyle = (override !== 'auto') ? override : (packet.materialStyle || 'wire');
                if (effectiveStyle === 'point') effectiveStyle = packet.materialStyle || 'wire';
                const effectiveColor = packet.color ?? 0xffffff;
                const pktGlow = Number(packet.glow ?? 0);
                const effGlow = (effectiveStyle === 'neon') ? Math.max(2.0, pktGlow + 2.0) : pktGlow;
                const mat = getMaterial(effectiveStyle, effectiveColor, packet.pointSize ?? 3.0, packet.wireWidth ?? 1.5, packet.glassOpacity ?? 0.25, pktGlow);

                const needsNew = !node || !node.isInstancedMesh || node.geometry !== packet.geometry || node.instanceMatrix.count < packet.count;
                if (needsNew) {
                    if (node) parentThreeObj.remove(node);
                    const cap = Math.max(packet.count, 64);
                    node = new THREE.InstancedMesh(packet.geometry, mat, cap);
                    node.frustumCulled = false;
                    parentThreeObj.add(node);
                } else if (node.material !== mat) {
                    node.material = mat;
                }

                node.count = packet.count;
                node.instanceMatrix.array.set(packet.matrices);
                node.instanceMatrix.needsUpdate = true;
                node.visible = true;
                node.userData.hasGlow = (effGlow > 0.01);
                node.position.set(...(packet.transform?.position || [0, 0, 0]));
                node.rotation.set(...(packet.transform?.rotation || [0, 0, 0]));
                node.scale.set(...(packet.transform?.scale || [1, 1, 1]));
            } else {
                // Leaf mesh / points
                const override = d.materialOverride || 'auto';
                const effectiveStyle = (override !== 'auto') ? override : (packet.materialStyle || 'wire');
                const effectiveColor = packet.color ?? 0xffffff;
                const pktGlow = Number(packet.glow ?? 0);
                const effGlow = (effectiveStyle === 'neon') ? Math.max(2.0, pktGlow + 2.0) : pktGlow;
                const isPoint = effectiveStyle === 'point';
                const mat = getMaterial(effectiveStyle, effectiveColor, packet.pointSize ?? 3.0, packet.wireWidth ?? 1.5, packet.glassOpacity ?? 0.25, pktGlow);
                const expectedType = isPoint ? 'Points' : 'Mesh';

                if (!node || node.type !== expectedType) {
                    if (node) parentThreeObj.remove(node);
                    node = isPoint
                        ? new THREE.Points(packet.geometry, mat)
                        : new THREE.Mesh(packet.geometry, mat);
                    parentThreeObj.add(node);
                } else {
                    if (node.geometry !== packet.geometry) {
                        node.geometry = packet.geometry;
                    }
                    if (node.material !== mat) {
                        node.material = mat;
                    }
                }
                node.visible = true;
                node.userData.hasGlow = (effGlow > 0.01);
                node.position.set(...(packet.transform?.position || [0, 0, 0]));
                node.rotation.set(...(packet.transform?.rotation || [0, 0, 0]));
                node.scale.set(...(packet.transform?.scale || [1, 1, 1]));
            }
        };

        const prepareScene = () => {
            const cvFov = readCv(anFov, 0);
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

            let hasGlow = false;
            if (rootGroup.visible) {
                rootGroup.traverse(o => {
                    if (o.visible && o.userData?.hasGlow) hasGlow = true;
                });
            }
            return hasGlow;
        };

        const renderEyePass = (hasGlow) => {
            if (hasGlow && baseTarget && bloomMips.length === 4 && bloomQuad && prefilterMat && downsampleMat && compositeMat) {
                // 1. Single-pass HDR Scene Render
                renderer.setRenderTarget(baseTarget);
                renderer.clear();
                renderer.render(scene, camera);

                // 2. Threshold Prefilter -> Mip 0
                bloomQuad.material = prefilterMat;
                renderer.setRenderTarget(bloomMips[0]);
                renderer.clear();
                renderer.render(bloomScene, bloomCamera);

                // 3. Multi-Stage Downsampled Gaussian Blur (Mip 0 -> 1 -> 2 -> 3)
                bloomQuad.material = downsampleMat;
                for (let i = 1; i < bloomMips.length; i++) {
                    const prev = bloomMips[i - 1];
                    downsampleMat.uniforms.tInput.value = prev.texture;
                    downsampleMat.uniforms.uTexelSize.value.set(1 / prev.width, 1 / prev.height);
                    renderer.setRenderTarget(bloomMips[i]);
                    renderer.clear();
                    renderer.render(bloomScene, bloomCamera);
                }

                // 4. Composite HDR + Multi-Mip Bloom -> Screen
                bloomQuad.material = compositeMat;
                renderer.setRenderTarget(null);
                renderer.render(bloomScene, bloomCamera);
            } else {
                renderer.setRenderTarget(null);
                renderer.render(scene, camera);
            }
        };

        let lastRenderTime = 0;
        const renderFrame = () => {
            const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
            if (now - lastRenderTime < 4) return;
            lastRenderTime = now;

            if (renderer && scene && camera && rootGroup) {
                const hasNeon = prepareScene();
                renderEyePass(hasNeon);
            }
        };

        const setResolution = (size) => {
            const targetSize = (size === 2048) ? 2048 : BUFFER_SIZE;
            if (!renderer || !renderCanvas || currentBufferSize === targetSize) return;
            currentBufferSize = targetSize;
            renderCanvas.width = targetSize;
            renderCanvas.height = targetSize;
            renderer.setSize(targetSize, targetSize, false);
            if (baseTarget) baseTarget.setSize(targetSize, targetSize);
            for (let i = 0; i < bloomMips.length; i++) {
                const sz = Math.max(16, targetSize >> (i + 1));
                bloomMips[i].setSize(sz, sz);
            }
        };

        const renderStereo = (leftCtx, rightCtx, eyeSep = 0.8) => {
            if (!renderer || !scene || !camera || !rootGroup || !renderCanvas) return;
            if (currentBufferSize !== 2048) setResolution(2048);
            const hasNeon = prepareScene();

            const basePos = new THREE.Vector3(d.camX ?? 0, d.camY ?? 0, d.camZ ?? 5);
            const targetVec = new THREE.Vector3(d.targetX ?? 0, d.targetY ?? 0, d.targetZ ?? 0);
            camera.updateMatrixWorld();
            const rightVec = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
            const halfSep = Math.max(0, Number(eyeSep) || 0) * 0.5;
            const rollRad = d.camRoll ? (d.camRoll * Math.PI) / 180 : 0;

            const drawEye = (offset, outCtx) => {
                if (!outCtx) return;
                camera.position.copy(basePos).addScaledVector(rightVec, offset);
                camera.up.set(0, 1, 0);
                camera.lookAt(targetVec);
                if (rollRad) camera.rotateZ(rollRad);
                renderEyePass(hasNeon);
                outCtx.clearRect(0, 0, outCtx.canvas.width, outCtx.canvas.height);
                outCtx.drawImage(renderCanvas, 0, 0, outCtx.canvas.width, outCtx.canvas.height);
            };

            drawEye(-halfSep, leftCtx);
            drawEye(+halfSep, rightCtx);

            // Restore center camera
            camera.position.copy(basePos);
            camera.up.set(0, 1, 0);
            camera.lookAt(targetVec);
            if (rollRad) camera.rotateZ(rollRad);
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
            getSharedCanvas: () => {
                renderFrame();
                return renderCanvas;
            },
            renderStereo,
            setResolution,
            read: () => {
                renderFrame();

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
                    materialOverride: d.materialOverride || 'auto',
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
                materialCache.forEach(mat => {
                    try { mat.dispose(); } catch (_) {}
                });
                materialCache.clear();
                if (pointTexture) {
                    try { pointTexture.dispose(); } catch (_) {}
                    pointTexture = null;
                }
                if (bloomGeo) {
                    try { bloomGeo.dispose(); } catch (_) {}
                    bloomGeo = null;
                }
                if (baseTarget) {
                    try { baseTarget.dispose(); } catch (_) {}
                    baseTarget = null;
                }
                for (let i = 0; i < bloomMips.length; i++) {
                    try { bloomMips[i].dispose(); } catch (_) {}
                }
                bloomMips = [];
                if (prefilterMat) {
                    try { prefilterMat.dispose(); } catch (_) {}
                    prefilterMat = null;
                }
                if (downsampleMat) {
                    try { downsampleMat.dispose(); } catch (_) {}
                    downsampleMat = null;
                }
                if (compositeMat) {
                    try { compositeMat.dispose(); } catch (_) {}
                    compositeMat = null;
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
