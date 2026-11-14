// src/audio/defs/render.js
// Audio / Engine side implementation for RENDER module
// Generates master 1:1 WebGL offscreen framebuffer from incoming 3D geometry packet (OBJECT / ROTATE / MOVE / SCALE)
// Supports multi-cable summing, hierarchical scene graphs, and material style overriding.

import { AudioHelpers } from '../helpers.js';

export const RENDER = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;

        // CV input for fov (PIN4)
        const fovReader = AudioHelpers.createCvReader(ctx, eng);

        // Three.js Scene Setup (512x512 Buffer - Balanced for 1x1, 2x2, and 4x4; 2048x2048 in VR Stereo)
        const BUFFER_SIZE = 512;
        let currentBufferSize = BUFFER_SIZE;
        let renderer = null;
        let scene = null;
        let camera = null;
        let rootGroup = null;
        let renderCanvas = null;

        // HDR Multi-Stage Bloom & Screen-Space Refraction/Reflection Setup
        let baseTarget = null;
        let refractTarget = null;
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
                    case 'glass':
                        mat = new THREE.ShaderMaterial({
                            uniforms: {
                                uColor: { value: new THREE.Color(colorHex) },
                                uOpacity: { value: Math.max(0.05, Math.min(0.85, Number(glassOpacity) || 0.25)) },
                                uGlow: { value: gVal },
                                tRefract: { value: refractTarget ? refractTarget.texture : null },
                                uResolution: { value: new THREE.Vector2(currentBufferSize, currentBufferSize) }
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
                                uniform sampler2D tRefract;
                                uniform vec2 uResolution;
                                varying vec3 vNormal;
                                varying vec3 vViewPos;
                                void main() {
                                    vec3 V = normalize(vViewPos);
                                    vec3 N = normalize(vNormal);
                                    if (!gl_FrontFacing) N = -N;
                                    float ndotv = clamp(dot(N, V), 0.0, 1.0);
                                    float fresnel = pow(1.0 - ndotv, 2.2);

                                    // Screen-space UV of current fragment
                                    vec2 screenUv = gl_FragCoord.xy / max(uResolution, vec2(1.0));

                                    // 1. Chromatic Refraction (IOR dispersion across R/G/B)
                                    vec2 refractOffset = N.xy * (0.055 + (1.0 - ndotv) * 0.085);
                                    float r = texture2D(tRefract, clamp(screenUv - refractOffset * 1.14, 0.002, 0.998)).r;
                                    float g = texture2D(tRefract, clamp(screenUv - refractOffset * 1.00, 0.002, 0.998)).g;
                                    float b = texture2D(tRefract, clamp(screenUv - refractOffset * 0.86, 0.002, 0.998)).b;
                                    vec3 refracted = vec3(r, g, b);

                                    // 2. Screen-space Inter-Object Fresnel Reflection
                                    vec3 R = reflect(-V, N);
                                    vec2 reflUv = clamp(screenUv + R.xy * 0.16, 0.002, 0.998);
                                    vec3 reflected = texture2D(tRefract, reflUv).rgb;

                                    // 3. Specular highlights & surface tint
                                    vec3 L1 = normalize(vec3(0.5, 0.8, 0.6));
                                    vec3 L2 = normalize(vec3(-0.6, -0.4, 0.5));
                                    float spec1 = pow(max(dot(N, normalize(L1 + V)), 0.0), 48.0);
                                    float spec2 = pow(max(dot(N, normalize(L2 + V)), 0.0), 24.0) * 0.45;
                                    float sheen = smoothstep(-0.2, 0.9, N.y) * 0.14;

                                    vec3 tint = mix(vec3(1.0), uColor * 1.15, uOpacity * 0.6);
                                    vec3 col = refracted * tint * (1.0 - fresnel * 0.35)
                                             + reflected * (0.25 + fresnel * 0.95)
                                             + uColor * (uOpacity * 0.45 + fresnel * 0.75 + sheen)
                                             + vec3(1.0) * (spec1 * 0.95 + spec2 * 0.5 + fresnel * 0.30);
                                    col *= (1.0 + uGlow * 1.4);

                                    float bgLuma = max(refracted.r, max(refracted.g, refracted.b));
                                    float reflLuma = max(reflected.r, max(reflected.g, reflected.b));
                                    float alpha = clamp(max(uOpacity * 0.45 + fresnel * 0.78 + spec1 * 0.85, max(bgLuma, reflLuma) * 0.95), 0.06, 0.98);
                                    gl_FragColor = vec4(col, alpha);
                                }
                            `,
                            transparent: true,
                            depthWrite: false,
                            side: THREE.DoubleSide
                        });
                        break;
                    case 'line':
                        mat = new THREE.LineBasicMaterial({
                            color: gVal > 0.01 ? new THREE.Color(colorHex).multiplyScalar(1.0 + gVal * 1.8) : colorHex
                        });
                        break;
                    case 'wire':
                    default: {
                        const baseW = Math.max(0.5, Number(wireWidth) || 1.5);
                        const wireScale = currentBufferSize > BUFFER_SIZE ? Math.sqrt(currentBufferSize / BUFFER_SIZE) : 1.0;
                        mat = new THREE.ShaderMaterial({
                            uniforms: {
                                uColor: { value: new THREE.Color(colorHex) },
                                uWireWidth: { value: baseW * wireScale },
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
                                    float coreGlow = 1.0 + uGlow * 1.8 * smoothstep(0.1, 0.85, alpha);
                                    gl_FragColor = vec4(uColor * coreGlow, alpha);
                                }
                            `,
                            extensions: { derivatives: true },
                            transparent: true,
                            side: THREE.DoubleSide
                        });
                        mat.userData = { baseWireWidth: baseW };
                        break;
                    }
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
            refractTarget = new THREE.WebGLRenderTarget(BUFFER_SIZE, BUFFER_SIZE, rtOpts);
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
                        // 256px Mip0 の 1 テクセル内 4 象限をサンプルし、高解像度化時の細線・点の取りこぼしを防ぐ
                        vec2 o = vec2(0.25 / 256.0);
                        vec4 c0 = texture2D(tColor, clamp(vUv + vec2(-o.x, -o.y), 0.0, 1.0));
                        vec4 c1 = texture2D(tColor, clamp(vUv + vec2( o.x, -o.y), 0.0, 1.0));
                        vec4 c2 = texture2D(tColor, clamp(vUv + vec2(-o.x,  o.y), 0.0, 1.0));
                        vec4 c3 = texture2D(tColor, clamp(vUv + vec2( o.x,  o.y), 0.0, 1.0));
                        vec4 cAvg = (c0 + c1 + c2 + c3) * 0.25;
                        vec4 cMax = max(max(c0, c1), max(c2, c3));
                        vec4 c = mix(cAvg, cMax, 0.35);
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
                    tMip3: { value: bloomMips[3].texture },
                    uTexelSize: { value: new THREE.Vector2(1 / BUFFER_SIZE, 1 / BUFFER_SIZE) }
                },
                vertexShader: quadVert,
                fragmentShader: `
                    uniform sampler2D tColor;
                    uniform sampler2D tMip0;
                    uniform sampler2D tMip1;
                    uniform sampler2D tMip2;
                    uniform sampler2D tMip3;
                    uniform vec2 uTexelSize;
                    varying vec2 vUv;

                    float fxaaLuma(vec4 c) {
                        vec3 t = clamp(c.rgb * max(c.a, 0.25), 0.0, 1.0);
                        return dot(sqrt(t), vec3(0.299, 0.587, 0.114));
                    }

                    vec4 sampleFxaa(sampler2D tex, vec2 uv, vec2 px) {
                        vec4 cM  = texture2D(tex, uv);
                        vec4 cNW = texture2D(tex, clamp(uv + vec2(-px.x, -px.y), 0.0, 1.0));
                        vec4 cNE = texture2D(tex, clamp(uv + vec2( px.x, -px.y), 0.0, 1.0));
                        vec4 cSW = texture2D(tex, clamp(uv + vec2(-px.x,  px.y), 0.0, 1.0));
                        vec4 cSE = texture2D(tex, clamp(uv + vec2( px.x,  px.y), 0.0, 1.0));

                        float lM  = fxaaLuma(cM);
                        float lNW = fxaaLuma(cNW);
                        float lNE = fxaaLuma(cNE);
                        float lSW = fxaaLuma(cSW);
                        float lSE = fxaaLuma(cSE);

                        float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
                        float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
                        if (lMax - lMin < max(0.035, lMax * 0.12)) {
                            return cM;
                        }

                        vec2 dir = vec2(
                            -((lNW + lNE) - (lSW + lSE)),
                             ((lNW + lSW) - (lNE + lSE))
                        );
                        float dirReduce = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125);
                        float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
                        dir = clamp(dir * rcpDirMin, vec2(-4.0), vec2(4.0)) * px;

                        vec4 cA = 0.5 * (
                            texture2D(tex, clamp(uv + dir * (1.0 / 3.0 - 0.5), 0.0, 1.0)) +
                            texture2D(tex, clamp(uv + dir * (2.0 / 3.0 - 0.5), 0.0, 1.0))
                        );
                        vec4 cB = cA * 0.5 + 0.25 * (
                            texture2D(tex, clamp(uv + dir * -0.5, 0.0, 1.0)) +
                            texture2D(tex, clamp(uv + dir *  0.5, 0.0, 1.0))
                        );
                        float lB = fxaaLuma(cB);
                        return (lB < lMin || lB > lMax) ? cA : cB;
                    }

                    vec3 softTone(vec3 x) {
                        vec3 over = max(x - vec3(0.85), vec3(0.0));
                        return min(x, vec3(0.85)) + over / (vec3(1.0) + over * 1.15) * 0.15;
                    }

                    void main() {
                        vec4 baseCol = sampleFxaa(tColor, vUv, uTexelSize);
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
                node.userData.hasGlow = (pktGlow > 0.01);
                node.userData.isGlass = (matStyle === 'glass');
                node.position.set(...(packet.transform?.position || [0, 0, 0]));
                node.rotation.set(...(packet.transform?.rotation || [0, 0, 0]));
                node.scale.set(...(packet.transform?.scale || [1, 1, 1]));
            } else {
                // Leaf mesh / points / line
                const override = d.materialOverride || 'auto';
                const effectiveStyle = (override !== 'auto') ? override : (packet.materialStyle || 'wire');
                const effectiveColor = packet.color ?? 0xffffff;
                const pktGlow = Number(packet.glow ?? 0);
                const isPoint = effectiveStyle === 'point';
                const isLine = Boolean(packet.isLine) && !isPoint;
                const matStyle = isLine ? 'line' : effectiveStyle;
                const mat = getMaterial(matStyle, effectiveColor, packet.pointSize ?? 3.0, packet.wireWidth ?? 1.5, packet.glassOpacity ?? 0.25, pktGlow);
                const expectedType = isLine ? 'Line' : (isPoint ? 'Points' : 'Mesh');

                if (!node || node.type !== expectedType) {
                    if (node) parentThreeObj.remove(node);
                    node = isLine
                        ? new THREE.Line(packet.geometry, mat)
                        : (isPoint ? new THREE.Points(packet.geometry, mat) : new THREE.Mesh(packet.geometry, mat));
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
                node.userData.hasGlow = (pktGlow > 0.01);
                node.userData.isGlass = (matStyle === 'glass');
                node.position.set(...(packet.transform?.position || [0, 0, 0]));
                node.rotation.set(...(packet.transform?.rotation || [0, 0, 0]));
                node.scale.set(...(packet.transform?.scale || [1, 1, 1]));
            }
        };

        const prepareScene = () => {
            const cvFov = fovReader.read(0);
            const incomingPackets = AudioHelpers.getSourcePackets(eng, d, ['obj_in'], patchState, true);

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
            let hasGlass = false;
            if (rootGroup.visible) {
                rootGroup.traverse(o => {
                    if (o.visible && o.userData?.hasGlow) hasGlow = true;
                    if (o.visible && o.userData?.isGlass) hasGlass = true;
                });
            }
            return { hasGlow, hasGlass };
        };

        const renderEyePass = (flags) => {
            const hasGlow = Boolean(flags?.hasGlow);
            const hasGlass = Boolean(flags?.hasGlass);

            // Pass 0 (Refraction/Reflection Background Capture): render non-glass objects into refractTarget
            if (hasGlass && refractTarget) {
                const hiddenGlass = [];
                rootGroup.traverse(o => {
                    if (o.visible && o.userData?.isGlass) {
                        o.visible = false;
                        hiddenGlass.push(o);
                    }
                });
                renderer.setRenderTarget(refractTarget);
                renderer.clear();
                renderer.render(scene, camera);
                for (let i = 0; i < hiddenGlass.length; i++) {
                    hiddenGlass[i].visible = true;
                }
            }

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
                const flags = prepareScene();
                renderEyePass(flags);
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
            if (refractTarget) refractTarget.setSize(targetSize, targetSize);
            if (compositeMat?.uniforms?.uTexelSize) {
                compositeMat.uniforms.uTexelSize.value.set(1 / targetSize, 1 / targetSize);
            }
            // bloomMips は [256, 128, 64, 32] 固定を維持し、高解像度化しても画面に対するブラー半径を一定に保つ
            const wireScale = targetSize > BUFFER_SIZE ? Math.sqrt(targetSize / BUFFER_SIZE) : 1.0;
            materialCache.forEach(mat => {
                if (mat.uniforms?.uWireWidth && mat.userData?.baseWireWidth != null) {
                    mat.uniforms.uWireWidth.value = mat.userData.baseWireWidth * wireScale;
                }
                if (mat.uniforms?.uResolution) {
                    mat.uniforms.uResolution.value.set(targetSize, targetSize);
                }
            });
        };

        const renderStereo = (leftCtx, rightCtx, eyeSep = 0.8) => {
            if (!renderer || !scene || !camera || !rootGroup || !renderCanvas) return;
            if (currentBufferSize !== 2048) setResolution(2048);
            const flags = prepareScene();

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
                renderEyePass(flags);
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
            nodes: { gFov: fovReader.input, anFov: fovReader.analyser },
            inputs: {
                obj_in: null,
                fov_in: fovReader.input
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

                const isPatched = AudioHelpers.isPortPatched(d, patchState, 'obj_in');
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
                    isCvFov: AudioHelpers.isPortPatched(d, patchState, 'fov_in')
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
                if (refractTarget) {
                    try { refractTarget.dispose(); } catch (_) {}
                    refractTarget = null;
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
                try { fovReader.input.disconnect(); } catch (e) {}
                try { fovReader.analyser.disconnect(); } catch (e) {}
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
