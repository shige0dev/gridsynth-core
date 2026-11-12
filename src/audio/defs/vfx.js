// src/audio/defs/vfx.js
// 100% GPU Native Video Post-Processing Effects (Mosaic, CRT, Invert, RGB Split)
// Driven by Three.js GLSL Fragment Shader for Zero CPU Load & Solid 60fps

export const VFX = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;

        // CV input for effect depth/intensity (PIN4)
        const gCv = ctx.createGain();
        const anCv = ctx.createAnalyser();
        anCv.fftSize = 32;
        gCv.connect(anCv);

        if (eng?.silentSink) {
            gCv.connect(eng.silentSink);
        }

        const buf = new Float32Array(32);
        const readCv = (an, def = 0) => {
            an.getFloatTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < 32; i++) sum += buf[i];
            const avg = sum / 32;
            return isNaN(avg) ? def : avg;
        };

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

        const MODE_MAP = {
            bypass: 0,
            mosaic: 1,
            crt: 2,
            invert: 3,
            rgb: 4,
            blur: 5,
            trail: 6
        };

        const initGPU = () => {
            if (typeof THREE === 'undefined') return;
            vfxCanvas = document.createElement('canvas');
            vfxCanvas.width = BUFFER_SIZE;
            vfxCanvas.height = BUFFER_SIZE;

            rtA = new THREE.WebGLRenderTarget(BUFFER_SIZE, BUFFER_SIZE, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                depthBuffer: false,
                stencilBuffer: false
            });
            rtB = new THREE.WebGLRenderTarget(BUFFER_SIZE, BUFFER_SIZE, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                depthBuffer: false,
                stencilBuffer: false
            });
            rtCurr = rtA;
            rtPrev = rtB;

            copyScene = new THREE.Scene();
            copyMat = new THREE.MeshBasicMaterial({ map: null, depthTest: false, depthWrite: false });
            const copyGeo = new THREE.PlaneGeometry(2, 2);
            copyScene.add(new THREE.Mesh(copyGeo, copyMat));

            renderer = new THREE.WebGLRenderer({
                canvas: vfxCanvas,
                antialias: false,
                alpha: false,
                preserveDrawingBuffer: true
            });
            renderer.setSize(BUFFER_SIZE, BUFFER_SIZE, false);

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
                uniform float uAmount;
                uniform float uTime;
                uniform vec2 uResolution;
                varying vec2 vUv;

                void main() {
                    vec2 uv = vUv;

                    if (uMode == 0 || uAmount <= 0.001) {
                        gl_FragColor = texture2D(tDiffuse, uv);
                        return;
                    }

                    if (uMode == 1) {
                        // Mosaic / Pixelate (Linear block scaling: 0% = 1px, 100% = 32px / 16x16 screen grid)
                        float blockSize = mix(1.0, 32.0, clamp(uAmount, 0.0, 1.0));
                        float blocks = 512.0 / blockSize;
                        vec2 mUv = (floor(uv * blocks) + 0.5) / blocks;
                        gl_FragColor = texture2D(tDiffuse, mUv);
                        return;
                    }

                    if (uMode == 2) {
                        // CRT Scanlines & Vignette
                        vec4 col = texture2D(tDiffuse, uv);
                        float scanline = sin(uv.y * 512.0 * 0.75) * 0.5 + 0.5;
                        col.rgb -= scanline * uAmount * 0.35;

                        // Vignette
                        float dist = distance(uv, vec2(0.5));
                        col.rgb *= smoothstep(0.8, 0.25 * (1.0 - uAmount * 0.5), dist);
                        gl_FragColor = col;
                        return;
                    }

                    if (uMode == 3) {
                        // Invert
                        vec4 col = texture2D(tDiffuse, uv);
                        vec3 inv = vec3(1.0) - col.rgb;
                        gl_FragColor = vec4(mix(col.rgb, inv, uAmount), col.a);
                        return;
                    }

                    if (uMode == 4) {
                        // Chromatic Aberration / RGB Split
                        float shift = (uAmount * 22.0) / uResolution.x;
                        float r = texture2D(tDiffuse, uv + vec2(shift, 0.0)).r;
                        float g = texture2D(tDiffuse, uv).g;
                        float b = texture2D(tDiffuse, uv - vec2(shift, 0.0)).b;
                        gl_FragColor = vec4(r, g, b, 1.0);
                        return;
                    }

                    if (uMode == 5) {
                        // Blur (Golden-angle spiral bokeh that smoothly melts into pure liquid wash, max radius 0.32)
                        float radius = pow(clamp(uAmount, 0.0, 1.0), 1.5) * 0.32;
                        vec4 sum = texture2D(tDiffuse, uv) * 2.5;
                        float totalW = 2.5;

                        for (int i = 1; i <= 32; i++) {
                            float fi = float(i);
                            float r = sqrt(fi / 32.0) * radius;
                            float theta = fi * 2.39996323; // Golden angle
                            vec2 offset = vec2(cos(theta), sin(theta)) * r;
                            float w = 1.0 - (r / (radius + 0.0001)) * 0.35;
                            sum += texture2D(tDiffuse, uv + offset) * w;
                            totalW += w;
                        }
                        gl_FragColor = sum / totalW;
                        return;
                    }

                    if (uMode == 6) {
                        // Trail / Afterimage (Luminous motion persistence & ghosting)
                        vec4 cur = texture2D(tDiffuse, uv);
                        vec4 prev = texture2D(tFeedback, uv);
                        float decay = mix(0.50, 0.96, pow(clamp(uAmount, 0.0, 1.0), 0.75));
                        gl_FragColor = vec4(max(cur.rgb, prev.rgb * decay), 1.0);
                        return;
                    }

                    gl_FragColor = texture2D(tDiffuse, uv);
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
                    uAmount: { value: 0.7 },
                    uTime: { value: 0.0 },
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

        const getSourceCanvas = () => {
            if (!eng?.modules) return null;
            const pageId = d.pageId || (window.__GS_APP__?.currentPageId ?? '0');
            const conns = window.__GS_APP__?.connections || window.__GS_APP__?.pagesData?.[pageId]?.connections || [];

            let connSrc = null;
            for (const c of conns) {
                const toMod = c.to?.moduleId || (typeof c === 'string' && c.split('>')[1]?.split(':')[0]?.trim());
                const toPort = c.to?.port || (typeof c === 'string' && c.split('>')[1]?.split(':')[1]?.trim());
                if (toMod === d.id && toPort === 'video_in') {
                    connSrc = c.from?.moduleId || (typeof c === 'string' && c.split('>')[0]?.split(':')[0]?.trim());
                    break;
                }
            }

            if (!connSrc) return null;
            const srcInst = eng.modules[`${pageId}/${connSrc}`] || eng.modules[connSrc];
            return srcInst?.getSharedCanvas ? srcInst.getSharedCanvas() : null;
        };

        let lastProcessTime = 0;
        let lastEffectiveAmt = 0.7;

        const processFrame = () => {
            const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
            if (now - lastProcessTime < 4) return;
            lastProcessTime = now;

            const isCv = Boolean(patchState?.has('cv_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('cv_in') : false));
            const cvVal = isCv ? readCv(anCv, 0) : 0;
            const manualAmt = Number(d.amount ?? 0.7);
            const effAmt = Math.max(0, Math.min(1.0, isCv ? cvVal : manualAmt));
            lastEffectiveAmt = effAmt;

            if (!renderer || !shaderMaterial) return;

            const srcCanvas = getSourceCanvas();
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
            shaderMaterial.uniforms.uMode.value = modeId;
            shaderMaterial.uniforms.uAmount.value = effAmt;
            shaderMaterial.uniforms.uTime.value = now * 0.001;

            if (d.mode === 'trail') {
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
            } else {
                if (lastMode === 'trail') {
                    // Clear GPU render targets on mode exit
                    renderer.setRenderTarget(rtPrev);
                    renderer.clear();
                    renderer.setRenderTarget(rtCurr);
                    renderer.clear();
                }
                // Direct single-pass render to output canvas
                renderer.setRenderTarget(null);
                renderer.render(scene, camera);
            }
            lastMode = d.mode;
        };

        return {
            nodes: { gCv, anCv },
            inputs: {
                cv_in: gCv,
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
                const isCv = Boolean(patchState?.has('cv_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('cv_in') : false));
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
                try { gCv.disconnect(); } catch (_) {}
                try { anCv.disconnect(); } catch (_) {}
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
