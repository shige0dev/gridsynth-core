// src/audio/defs/vfx.js
// 100% GPU Native Video Post-Processing Effects (Mosaic, CRT, Invert, RGB Split)
// Driven by Three.js GLSL Fragment Shader for Zero CPU Load & Solid 60fps

import { AudioHelpers } from '../helpers.js';

export const VFX = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;

        // CV input for effect depth/intensity (PIN4)
        const cvReader = AudioHelpers.createCvReader(ctx, eng);

        const BUFFER_SIZE = 512;
        let renderer = null;
        let scene = null;
        let camera = null;
        let quadMesh = null;
        let shaderMaterial = null;
        let inputTexture = null;
        let vfxCanvas = null;
        let lastBoundSource = null;
        let rtA = null;
        let rtB = null;
        let rtCurr = null;
        let rtPrev = null;
        let copyScene = null;
        let copyMat = null;
        let lastMode = null;
        let lastTrailType = null;

        const MODE_MAP = {
            bypass: 0,
            mosaic: 1,
            crt: 2,
            invert: 3,
            rgb: 4,
            blur: 5,
            trail: 6
        };

        const TRAIL_TYPE_MAP = {
            peak: 0,
            fade: 1,
            diffuse: 2,
            zoom: 3,
            drift: 4,
            prism: 5
        };

        const initGPU = () => {
            if (typeof THREE === 'undefined') return;
            vfxCanvas = document.createElement('canvas');
            vfxCanvas.width = BUFFER_SIZE;
            vfxCanvas.height = BUFFER_SIZE;

            renderer = new THREE.WebGLRenderer({
                canvas: vfxCanvas,
                antialias: false,
                alpha: false,
                preserveDrawingBuffer: true
            });
            renderer.setSize(BUFFER_SIZE, BUFFER_SIZE, false);
            renderer.setClearColor(0x000000, 1.0);

            const useHalfFloat = Boolean(renderer.capabilities?.isWebGL2 || renderer.extensions?.get('EXT_color_buffer_half_float'));
            const rtOpts = {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                type: useHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType,
                depthBuffer: false,
                stencilBuffer: false
            };

            rtA = new THREE.WebGLRenderTarget(BUFFER_SIZE, BUFFER_SIZE, rtOpts);
            rtB = new THREE.WebGLRenderTarget(BUFFER_SIZE, BUFFER_SIZE, rtOpts);
            rtCurr = rtA;
            rtPrev = rtB;

            copyScene = new THREE.Scene();
            copyMat = new THREE.MeshBasicMaterial({ map: null, depthTest: false, depthWrite: false });
            const copyGeo = new THREE.PlaneGeometry(2, 2);
            copyScene.add(new THREE.Mesh(copyGeo, copyMat));

            scene = new THREE.Scene();
            camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

            const vertShader = `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position.xy, 0.0, 1.0);
                }
            `;

            const fragShader = `
                uniform sampler2D tDiffuse;
                uniform sampler2D tFeedback;
                uniform int uMode;
                uniform int uTrailType;
                uniform float uAmount;
                uniform float uTime;
                uniform float uDt;
                uniform vec2 uResolution;
                varying vec2 vUv;

                vec3 sampleSrc(vec2 p) {
                    vec4 c = texture2D(tDiffuse, clamp(p, 0.0, 1.0));
                    return c.rgb * c.a;
                }

                void main() {
                    vec2 uv = vUv;

                    if (uMode == 0 || uAmount <= 0.001) {
                        gl_FragColor = vec4(sampleSrc(uv), 1.0);
                        return;
                    }

                    if (uMode == 1) {
                        // Mosaic / Pixelate (Linear block scaling: 0% = 1px, 100% = 32px / 16x16 screen grid)
                        float blockSize = mix(1.0, 32.0, clamp(uAmount, 0.0, 1.0));
                        float blocks = 512.0 / blockSize;
                        vec2 mUv = (floor(uv * blocks) + 0.5) / blocks;
                        gl_FragColor = vec4(sampleSrc(mUv), 1.0);
                        return;
                    }

                    if (uMode == 2) {
                        // CRT Scanlines & Vignette
                        vec3 col = sampleSrc(uv);
                        float scanline = sin(uv.y * 512.0 * 0.75) * 0.5 + 0.5;
                        col -= scanline * uAmount * 0.35;

                        // Vignette
                        float dist = distance(uv, vec2(0.5));
                        col *= smoothstep(0.8, 0.25 * (1.0 - uAmount * 0.5), dist);
                        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
                        return;
                    }

                    if (uMode == 3) {
                        // Invert
                        vec3 col = sampleSrc(uv);
                        vec3 inv = vec3(1.0) - col;
                        gl_FragColor = vec4(mix(col, inv, uAmount), 1.0);
                        return;
                    }

                    if (uMode == 4) {
                        // Chromatic Aberration / RGB Split
                        float shift = (uAmount * 22.0) / uResolution.x;
                        float r = sampleSrc(uv + vec2(shift, 0.0)).r;
                        float g = sampleSrc(uv).g;
                        float b = sampleSrc(uv - vec2(shift, 0.0)).b;
                        gl_FragColor = vec4(r, g, b, 1.0);
                        return;
                    }

                    if (uMode == 5) {
                        // Blur (Golden-angle spiral bokeh that smoothly melts into pure liquid wash, max radius 0.32)
                        float radius = pow(clamp(uAmount, 0.0, 1.0), 1.5) * 0.32;
                        vec3 sum = sampleSrc(uv) * 2.5;
                        float totalW = 2.5;

                        for (int i = 1; i <= 32; i++) {
                            float fi = float(i);
                            float r = sqrt(fi / 32.0) * radius;
                            float theta = fi * 2.39996323; // Golden angle
                            vec2 offset = vec2(cos(theta), sin(theta)) * r;
                            float w = 1.0 - (r / (radius + 0.0001)) * 0.35;
                            sum += sampleSrc(uv + offset) * w;
                            totalW += w;
                        }
                        gl_FragColor = vec4(sum / totalW, 1.0);
                        return;
                    }

                    if (uMode == 6) {
                        // Trail / Afterimage (Ping-Pong HalfFloat with dt-normalized decay & 6 styles)
                        vec3 cur = sampleSrc(uv);
                        float baseDecay = mix(0.60, 0.992, pow(clamp(uAmount, 0.0, 1.0), 0.75));
                        float dtFrames = clamp(uDt, 0.001, 0.1) * 60.0;
                        float decay = pow(baseDecay, dtFrames);
                        vec3 outRgb = cur;

                        if (uTrailType == 1) {
                            // FADE: Smooth motion-blur crossfade
                            vec3 prev = texture2D(tFeedback, uv).rgb * decay;
                            float curLum = max(cur.r, max(cur.g, cur.b));
                            outRgb = mix(prev, cur, clamp(curLum * 1.35 + 0.04, 0.0, 1.0));
                        } else if (uTrailType == 2) {
                            // DIFFUSE: Soft 5-tap blur decay (smoke/aura trail)
                            vec2 px = (1.6 / uResolution) * dtFrames;
                            vec3 prev = texture2D(tFeedback, uv).rgb * 0.40
                                      + texture2D(tFeedback, clamp(uv + vec2( px.x,  0.0), 0.0, 1.0)).rgb * 0.15
                                      + texture2D(tFeedback, clamp(uv + vec2(-px.x,  0.0), 0.0, 1.0)).rgb * 0.15
                                      + texture2D(tFeedback, clamp(uv + vec2( 0.0,  px.y), 0.0, 1.0)).rgb * 0.15
                                      + texture2D(tFeedback, clamp(uv + vec2( 0.0, -px.y), 0.0, 1.0)).rgb * 0.15;
                            outRgb = max(cur, prev * decay);
                        } else if (uTrailType == 3) {
                            // ZOOM: Radial outward expansion echo
                            float zoomStep = (0.004 + uAmount * 0.014) * dtFrames;
                            vec2 zUv = (uv - 0.5) * (1.0 - zoomStep) + 0.5;
                            vec3 prev = texture2D(tFeedback, clamp(zUv, 0.0, 1.0)).rgb * decay;
                            outRgb = max(cur, prev);
                        } else if (uTrailType == 4) {
                            // DRIFT: Rising heat-haze / flame trail
                            float rise = (0.002 + uAmount * 0.005) * dtFrames;
                            float sway = sin(uv.y * 18.0 + uTime * 5.0) * 0.0025 * dtFrames;
                            vec2 dUv = clamp(uv + vec2(sway, -rise), 0.0, 1.0);
                            vec3 prev = texture2D(tFeedback, dUv).rgb * decay;
                            outRgb = max(cur, prev);
                        } else if (uTrailType == 5) {
                            // PRISM: Chromatic RGB split & per-channel decay
                            vec2 shift = vec2(0.0025, 0.0012) * (0.5 + uAmount) * dtFrames;
                            float pr = texture2D(tFeedback, clamp(uv + shift, 0.0, 1.0)).r * decay;
                            float pg = texture2D(tFeedback, uv).g * pow(baseDecay * 0.988, dtFrames);
                            float pb = texture2D(tFeedback, clamp(uv - shift, 0.0, 1.0)).b * pow(baseDecay * 0.975, dtFrames);
                            outRgb = max(cur, vec3(pr, pg, pb));
                        } else {
                            // PEAK (default): Crisp peak-hold luminous trail
                            vec3 prev = texture2D(tFeedback, uv).rgb * decay;
                            outRgb = max(cur, prev);
                        }

                        // Clean floor cutoff to prevent faint ghost residue
                        outRgb *= step(0.0015, max(outRgb.r, max(outRgb.g, outRgb.b)));
                        gl_FragColor = vec4(clamp(outRgb, 0.0, 1.0), 1.0);
                        return;
                    }

                    gl_FragColor = vec4(sampleSrc(uv), 1.0);
                }
            `;

            // Initial blank texture
            const blankCvs = document.createElement('canvas');
            blankCvs.width = 1; blankCvs.height = 1;
            inputTexture = new THREE.CanvasTexture(blankCvs);
            inputTexture.minFilter = THREE.LinearFilter;
            inputTexture.magFilter = THREE.LinearFilter;

            shaderMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    tDiffuse: { value: inputTexture },
                    tFeedback: { value: rtPrev.texture },
                    uMode: { value: 1 },
                    uTrailType: { value: 0 },
                    uAmount: { value: 0.7 },
                    uTime: { value: 0.0 },
                    uDt: { value: 1 / 60 },
                    uResolution: { value: new THREE.Vector2(BUFFER_SIZE, BUFFER_SIZE) }
                },
                vertexShader: vertShader,
                fragmentShader: fragShader,
                depthTest: false,
                depthWrite: false
            });

            const geo = new THREE.PlaneGeometry(2, 2);
            quadMesh = new THREE.Mesh(geo, shaderMaterial);
            scene.add(quadMesh);
        };

        initGPU();

        let lastProcessTime = 0;
        let lastEffectiveAmt = 0.7;

        const processFrame = () => {
            const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
            if (now - lastProcessTime < 4) return;
            const dt = lastProcessTime > 0 ? Math.min(0.1, (now - lastProcessTime) * 0.001) : (1 / 60);
            lastProcessTime = now;

            const isCv = AudioHelpers.isPortPatched(d, patchState, 'cv_in');
            const cvVal = isCv ? cvReader.read(0) : 0;
            const manualAmt = Number(d.amount ?? 0.7);
            const effAmt = Math.max(0, Math.min(1.0, isCv ? cvVal : manualAmt));
            lastEffectiveAmt = effAmt;

            if (!renderer || !shaderMaterial) return;

            const srcCanvas = AudioHelpers.getSourceCanvas(eng, d, ['video_in']);
            if (!srcCanvas) return;

            // Rebind source canvas texture if changed
            if (lastBoundSource !== srcCanvas) {
                if (inputTexture) inputTexture.dispose();
                inputTexture = new THREE.CanvasTexture(srcCanvas);
                inputTexture.minFilter = THREE.LinearFilter;
                inputTexture.magFilter = THREE.LinearFilter;
                shaderMaterial.uniforms.tDiffuse.value = inputTexture;
                lastBoundSource = srcCanvas;
            } else {
                inputTexture.needsUpdate = true;
            }

            const modeId = MODE_MAP[d.mode || 'mosaic'] ?? 1;
            const trailType = d.trailType || 'peak';
            shaderMaterial.uniforms.uMode.value = modeId;
            shaderMaterial.uniforms.uTrailType.value = TRAIL_TYPE_MAP[trailType] ?? 0;
            shaderMaterial.uniforms.uAmount.value = effAmt;
            shaderMaterial.uniforms.uTime.value = now * 0.001;
            shaderMaterial.uniforms.uDt.value = dt;

            if (d.mode === 'trail') {
                if (lastMode === 'trail' && lastTrailType !== null && lastTrailType !== trailType) {
                    renderer.setRenderTarget(rtPrev);
                    renderer.clear();
                    renderer.setRenderTarget(rtCurr);
                    renderer.clear();
                }

                // 1. Bind previous GPU frame directly from VRAM (Zero-copy)
                shaderMaterial.uniforms.tFeedback.value = rtPrev.texture;

                // 2. Render blended frame into current GPU RenderTarget
                renderer.setRenderTarget(rtCurr);
                renderer.render(scene, camera);

                // 3. Fast blit to output canvas entirely on GPU
                renderer.setRenderTarget(null);
                copyMat.map = rtCurr.texture;
                renderer.render(copyScene, camera);

                // 4. Ping-Pong swap pointers (0ms pointer swap)
                const tmp = rtCurr;
                rtCurr = rtPrev;
                rtPrev = tmp;
                lastTrailType = trailType;
            } else {
                if (lastMode === 'trail') {
                    // Clear GPU render targets on mode exit
                    renderer.setRenderTarget(rtPrev);
                    renderer.clear();
                    renderer.setRenderTarget(rtCurr);
                    renderer.clear();
                }
                lastTrailType = null;
                // Direct single-pass render to output canvas
                renderer.setRenderTarget(null);
                renderer.render(scene, camera);
            }
            lastMode = d.mode;
        };

        return {
            nodes: { gCv: cvReader.input, anCv: cvReader.analyser },
            inputs: {
                cv_in: cvReader.input,
                video_in: null
            },
            outputs: {
                video_out: null
            },
            data: d,
            getSharedCanvas: () => {
                processFrame();
                return vfxCanvas;
            },
            read: () => {
                processFrame();
                const isCv = AudioHelpers.isPortPatched(d, patchState, 'cv_in');
                return {
                    canvas: vfxCanvas,
                    mode: d.mode || 'mosaic',
                    amount: d.amount ?? 0.7,
                    effectiveAmount: lastEffectiveAmt,
                    isCvPatched: isCv
                };
            },
            updatePatchState: (p) => {
                patchState = p;
            },
            destroy: () => {
                if (inputTexture) {
                    try { inputTexture.dispose(); } catch (_) {}
                    inputTexture = null;
                }
                if (rtA) {
                    try { rtA.dispose(); } catch (_) {}
                    rtA = null;
                }
                if (rtB) {
                    try { rtB.dispose(); } catch (_) {}
                    rtB = null;
                }
                if (copyMat) {
                    try { copyMat.dispose(); } catch (_) {}
                    copyMat = null;
                }
                if (shaderMaterial) {
                    try { shaderMaterial.dispose(); } catch (_) {}
                    shaderMaterial = null;
                }
                if (quadMesh) {
                    try { quadMesh.geometry?.dispose(); } catch (_) {}
                    quadMesh = null;
                }
                if (renderer) {
                    try { renderer.dispose(); } catch (_) {}
                    renderer = null;
                }
                try { cvReader.input.disconnect(); } catch (_) {}
                try { cvReader.analyser.disconnect(); } catch (_) {}
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

export const vfxAudioDefs = {
    VFX
};
export default vfxAudioDefs;
