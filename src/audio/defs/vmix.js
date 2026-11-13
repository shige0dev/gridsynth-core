// src/audio/defs/vmix.js
// Audio / Engine side implementation for VMIX module
// 100% GPU-native dual-texture video mixer and transition processor using Three.js GLSL shader

export const VMIX = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;

        // CV input for transition mix modulation (PIN4)
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
        let vmixCanvas = null;
        let renderer = null;
        let scene = null;
        let camera = null;
        let shaderMaterial = null;
        let quadMesh = null;
        let texA = null;
        let texB = null;
        let lastBoundSourceA = null;
        let lastBoundSourceB = null;

        const MODE_MAP = {
            dissolve: 1,
            blur: 2,
            zoom: 3,
            slide_h: 4,
            slide_v: 5,
            blackout: 6,
            whiteout: 7,
            mosaic: 8,
            alpha: 9
        };

        const initGPU = () => {
            if (typeof THREE === 'undefined') return;
            vmixCanvas = document.createElement('canvas');
            vmixCanvas.width = BUFFER_SIZE;
            vmixCanvas.height = BUFFER_SIZE;

            renderer = new THREE.WebGLRenderer({
                canvas: vmixCanvas,
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
                uniform sampler2D tTexA;
                uniform sampler2D tTexB;
                uniform int uMode;
                uniform float uMix;
                uniform vec2 uResolution;
                varying vec2 vUv;

                vec4 sampleDeepBlur(sampler2D tex, vec2 uv, float radius) {
                    if (radius <= 0.001) return texture2D(tex, uv);
                    vec4 sum = texture2D(tex, uv) * 2.5;
                    float total = 2.5;
                    for (int i = 1; i <= 24; i++) {
                        float fi = float(i);
                        float r = sqrt(fi / 24.0) * radius;
                        float theta = fi * 2.39996323; // Golden angle
                        vec2 offset = vec2(cos(theta), sin(theta)) * r;
                        float w = 1.0 - (r / (radius + 0.0001)) * 0.4;
                        sum += texture2D(tex, uv + offset) * w;
                        total += w;
                    }
                    return sum / total;
                }

                void main() {
                    vec2 uv = vUv;
                    float m = clamp(uMix, 0.0, 1.0);

                    vec4 colA = texture2D(tTexA, uv);
                    vec4 colB = texture2D(tTexB, uv);

                    if (m <= 0.001) {
                        gl_FragColor = colA;
                        return;
                    }
                    if (m >= 0.999) {
                        gl_FragColor = colB;
                        return;
                    }

                    // 1. Dissolve / Crossfade
                    if (uMode == 1) {
                        gl_FragColor = mix(colA, colB, m);
                        return;
                    }

                    // 2. Heavy Liquid Blur Dissolve (Dramatic bokeh melt peaking at mid-transition)
                    if (uMode == 2) {
                        float blurRad = sin(m * 3.14159265) * 0.16;
                        vec4 bA = sampleDeepBlur(tTexA, uv, blurRad);
                        vec4 bB = sampleDeepBlur(tTexB, uv, blurRad);
                        gl_FragColor = mix(bA, bB, m);
                        return;
                    }

                    // 3. Zoom / Shrink Dissolve (Dramatically shrinks down to a miniature dot, then expands)
                    if (uMode == 3) {
                        float sA = max(0.015, pow(clamp((0.55 - m) / 0.55, 0.0, 1.0), 2.2));
                        float sB = max(0.015, pow(clamp((m - 0.45) / 0.55, 0.0, 1.0), 2.2));

                        vec2 uvA = (uv - 0.5) / sA + 0.5;
                        vec2 uvB = (uv - 0.5) / sB + 0.5;

                        bool inA = (uvA.x >= 0.0 && uvA.x <= 1.0 && uvA.y >= 0.0 && uvA.y <= 1.0) && (m < 0.55);
                        bool inB = (uvB.x >= 0.0 && uvB.x <= 1.0 && uvB.y >= 0.0 && uvB.y <= 1.0) && (m > 0.45);

                        vec4 zA = inA ? texture2D(tTexA, uvA) : vec4(0.0);
                        vec4 zB = inB ? texture2D(tTexB, uvB) : vec4(0.0);

                        float blend = smoothstep(0.45, 0.55, m);
                        gl_FragColor = mix(zA, zB, blend);
                        return;
                    }

                    // 4. Slide H (Horizontal stationary in-place wipe: reveals V2 over V1)
                    if (uMode == 4) {
                        float edge = smoothstep(m - 0.003, m + 0.003, uv.x);
                        gl_FragColor = mix(colB, colA, edge);
                        return;
                    }

                    // 5. Slide V (Vertical stationary in-place wipe: reveals V2 over V1)
                    if (uMode == 5) {
                        float edge = smoothstep((1.0 - m) - 0.003, (1.0 - m) + 0.003, uv.y);
                        gl_FragColor = mix(colA, colB, edge);
                        return;
                    }

                    // 6. Blackout
                    if (uMode == 6) {
                        if (m < 0.5) {
                            gl_FragColor = vec4(colA.rgb * (1.0 - m * 2.0), colA.a);
                        } else {
                            gl_FragColor = vec4(colB.rgb * ((m - 0.5) * 2.0), colB.a);
                        }
                        return;
                    }

                    // 7. Whiteout
                    if (uMode == 7) {
                        if (m < 0.5) {
                            gl_FragColor = vec4(mix(colA.rgb, vec3(1.0), m * 2.0), colA.a);
                        } else {
                            gl_FragColor = vec4(mix(vec3(1.0), colB.rgb, (m - 0.5) * 2.0), colB.a);
                        }
                        return;
                    }

                    // 8. Mosaic Block Swap (High-resolution buffers swapping via fine mosaic blocks)
                    if (uMode == 8) {
                        float blocks = 40.0;
                        vec2 bCoord = floor(uv * blocks);
                        float rnd = fract(sin(dot(bCoord, vec2(127.1, 311.7))) * 43758.5453123);
                        float swap = smoothstep(rnd - 0.015, rnd + 0.015, m);
                        gl_FragColor = mix(colA, colB, swap);
                        return;
                    }

                    // 9. Alpha / Transparency (Channel 1 transparency increases over Channel 2 background)
                    if (uMode == 9) {
                        float aA = clamp(colA.a, 0.0, 1.0) * (1.0 - m);
                        gl_FragColor = vec4(mix(colB.rgb, colA.rgb, aA), 1.0);
                        return;
                    }

                    gl_FragColor = mix(colA, colB, m);
                }
            `;

            const blankCvs = document.createElement('canvas');
            blankCvs.width = 1; blankCvs.height = 1;
            texA = new THREE.CanvasTexture(blankCvs);
            texB = new THREE.CanvasTexture(blankCvs);
            texA.minFilter = THREE.LinearFilter;
            texB.minFilter = THREE.LinearFilter;

            shaderMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    tTexA: { value: texA },
                    tTexB: { value: texB },
                    uMode: { value: 1 },
                    uMix: { value: 0.5 },
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

        const getSourceCanvases = () => {
            if (!eng?.modules) return { cvsA: null, cvsB: null };
            const pageId = d.pageId || (window.__GS_APP__?.currentPageId ?? '0');
            const conns = window.__GS_APP__?.connections || window.__GS_APP__?.pagesData?.[pageId]?.connections || [];

            let connSrcA = null;
            let connSrcB = null;

            for (const c of conns) {
                const toMod = c.to?.moduleId || (typeof c === 'string' && c.split('>')[1]?.split(':')[0]?.trim());
                const toPort = c.to?.port || (typeof c === 'string' && c.split('>')[1]?.split(':')[1]?.trim());
                const fromMod = c.from?.moduleId || (typeof c === 'string' && c.split('>')[0]?.split(':')[0]?.trim());

                if (toMod === d.id) {
                    if (toPort === 'video_in1' || toPort === 'video_in') {
                        connSrcA = fromMod;
                    } else if (toPort === 'video_in2') {
                        connSrcB = fromMod;
                    }
                }
            }

            const getCvs = (srcId) => {
                if (!srcId) return null;
                const inst = eng.modules[`${pageId}/${srcId}`] || eng.modules[srcId];
                return inst?.getSharedCanvas ? inst.getSharedCanvas() : null;
            };

            return {
                cvsA: getCvs(connSrcA),
                cvsB: getCvs(connSrcB)
            };
        };

        let lastProcessTime = 0;
        let lastEffectiveMix = 0.5;

        const processFrame = () => {
            const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
            if (now - lastProcessTime < 4) return;
            lastProcessTime = now;

            const isCv = Boolean(patchState?.has('cv_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('cv_in') : false));
            const cvVal = isCv ? readCv(anCv, 0) : 0;
            const manualMix = Number(d.mix ?? 0.5);
            const effMix = Math.max(0, Math.min(1.0, isCv ? cvVal : manualMix));
            lastEffectiveMix = effMix;

            if (!renderer || !shaderMaterial) return;

            const { cvsA, cvsB } = getSourceCanvases();

            // Bind Texture A
            if (cvsA && cvsA !== lastBoundSourceA) {
                if (texA) texA.dispose();
                texA = new THREE.CanvasTexture(cvsA);
                texA.minFilter = THREE.LinearFilter;
                shaderMaterial.uniforms.tTexA.value = texA;
                lastBoundSourceA = cvsA;
            } else if (!cvsA && lastBoundSourceA) {
                if (texA) texA.dispose();
                const bCvs = document.createElement('canvas'); bCvs.width = 1; bCvs.height = 1;
                texA = new THREE.CanvasTexture(bCvs);
                shaderMaterial.uniforms.tTexA.value = texA;
                lastBoundSourceA = null;
            } else if (texA) {
                texA.needsUpdate = true;
            }

            // Bind Texture B
            if (cvsB && cvsB !== lastBoundSourceB) {
                if (texB) texB.dispose();
                texB = new THREE.CanvasTexture(cvsB);
                texB.minFilter = THREE.LinearFilter;
                shaderMaterial.uniforms.tTexB.value = texB;
                lastBoundSourceB = cvsB;
            } else if (!cvsB && lastBoundSourceB) {
                if (texB) texB.dispose();
                const bCvs = document.createElement('canvas'); bCvs.width = 1; bCvs.height = 1;
                texB = new THREE.CanvasTexture(bCvs);
                shaderMaterial.uniforms.tTexB.value = texB;
                lastBoundSourceB = null;
            } else if (texB) {
                texB.needsUpdate = true;
            }

            const modeId = MODE_MAP[d.mode || 'dissolve'] ?? 1;
            shaderMaterial.uniforms.uMode.value = modeId;
            shaderMaterial.uniforms.uMix.value = effMix;

            // 100% GPU Render
            renderer.render(scene, camera);
        };

        return {
            nodes: { gCv, anCv },
            inputs: {
                cv_in: gCv,
                video_in1: null,
                video_in2: null
            },
            outputs: {
                video_out: null
            },
            data: d,
            getSharedCanvas: () => {
                processFrame();
                return vmixCanvas;
            },
            read: () => {
                processFrame();
                const isCv = Boolean(patchState?.has('cv_in') || (window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(d.id)?.has('cv_in') : false));
                return {
                    mix: lastEffectiveMix,
                    isCvPatched: isCv,
                    mode: d.mode || 'dissolve',
                    canvas: vmixCanvas
                };
            },
            destroy: () => {
                try {
                    if (texA) texA.dispose();
                    if (texB) texB.dispose();
                    if (shaderMaterial) shaderMaterial.dispose();
                    if (quadMesh?.geometry) quadMesh.geometry.dispose();
                    if (renderer) renderer.dispose();
                } catch (_) {}
            }
        };
    },
    update: (ctx, inst, d) => {
        inst.data = d;
    },
    updatePatchState: (ctx, inst, patch) => {
        // Handled dynamically via engine patchState
    }
};

export const vmixAudioDefs = {
    VMIX
};
export default vmixAudioDefs;
