// src/audio/defs/vmix.js
// Audio / Engine side implementation for VMIX module
// 100% GPU-native dual-texture video mixer and transition processor using Three.js GLSL shader

import { AudioHelpers } from '../helpers.js';

export const VMIX = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;
        const cvReader = AudioHelpers.createCvReader(ctx, eng);

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
            add: 3,
            slide_h: 4,
            slide_v: 5,
            blackout: 6,
            whiteout: 7,
            mosaic: 8,
            alpha: 9,
            luma: 10,
            glitch: 11,
            burn: 12
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

                float hash21(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
                }

                float vnoise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    vec2 u = f * f * (3.0 - 2.0 * f);
                    return mix(
                        mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
                        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
                        u.y
                    );
                }

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

                    // 3. Add (Additive Crossfader: 0.5 = full V1 + V2)
                    if (uMode == 3) {
                        float gainA = clamp(1.0 - max(0.0, (m - 0.5) * 2.0), 0.0, 1.0);
                        float gainB = clamp(m * 2.0, 0.0, 1.0);
                        vec3 rgb = clamp(colA.rgb * gainA + colB.rgb * gainB, 0.0, 1.0);
                        gl_FragColor = vec4(rgb, max(colA.a * gainA, colB.a * gainB));
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

                    // 10. Luma Key (Overlays bright parts of V2 over V1)
                    if (uMode == 10) {
                        float lumB = dot(colB.rgb, vec3(0.299, 0.587, 0.114));
                        float key = smoothstep(0.05, 0.35, lumB) * clamp(m * 1.35, 0.0, 1.0);
                        gl_FragColor = mix(colA, colB, key);
                        return;
                    }

                    // 11. Glitch (Horizontal slice shift + RGB split transition)
                    if (uMode == 11) {
                        float env = sin(m * 3.14159265);
                        float band = floor(uv.y * 28.0);
                        float rnd = hash21(vec2(band, floor(m * 24.0)));
                        float shift = (rnd - 0.5) * 0.18 * env * step(0.45, rnd);
                        vec2 guv = vec2(fract(uv.x + shift), uv.y);
                        float rgbOff = 0.015 * env;
                        vec4 gA = vec4(
                            texture2D(tTexA, vec2(clamp(guv.x + rgbOff, 0.0, 1.0), guv.y)).r,
                            texture2D(tTexA, guv).g,
                            texture2D(tTexA, vec2(clamp(guv.x - rgbOff, 0.0, 1.0), guv.y)).b,
                            texture2D(tTexA, guv).a
                        );
                        vec4 gB = vec4(
                            texture2D(tTexB, vec2(clamp(guv.x + rgbOff, 0.0, 1.0), guv.y)).r,
                            texture2D(tTexB, guv).g,
                            texture2D(tTexB, vec2(clamp(guv.x - rgbOff, 0.0, 1.0), guv.y)).b,
                            texture2D(tTexB, guv).a
                        );
                        float bandSwap = smoothstep(rnd * 0.65, rnd * 0.65 + 0.35, m);
                        gl_FragColor = mix(gA, gB, bandSwap);
                        return;
                    }

                    // 12. Burn (2-octave organic noise dissolve with glowing edge)
                    if (uMode == 12) {
                        float n = vnoise(uv * 7.0) * 0.65 + vnoise(uv * 15.0) * 0.35;
                        float edge = smoothstep(m - 0.06, m + 0.06, n);
                        float burnRim = smoothstep(0.0, 0.08, abs(n - m));
                        vec4 base = mix(colB, colA, edge);
                        vec3 ember = vec3(1.0, 0.45, 0.1) * (1.0 - burnRim) * sin(m * 3.14159265) * 1.4;
                        gl_FragColor = vec4(clamp(base.rgb + ember, 0.0, 1.0), base.a);
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

        let lastProcessTime = 0;
        let lastEffectiveMix = 0.5;

        const processFrame = () => {
            const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
            if (now - lastProcessTime < 4) return;
            lastProcessTime = now;

            const isCv = AudioHelpers.isPortPatched(d, patchState, 'cv_in');
            const cvVal = isCv ? cvReader.read(0) : 0;
            const manualMix = Number(d.mix ?? 0.5);
            const effMix = Math.max(0, Math.min(1.0, isCv ? cvVal : manualMix));
            lastEffectiveMix = effMix;

            if (!renderer || !shaderMaterial) return;

            const cvsA = AudioHelpers.getSourceCanvas(eng, d, ['video_in1', 'video_in']);
            const cvsB = AudioHelpers.getSourceCanvas(eng, d, ['video_in2']);

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
            nodes: { gCv: cvReader.input, anCv: cvReader.analyser },
            inputs: {
                cv_in: cvReader.input,
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
                const isCv = AudioHelpers.isPortPatched(d, patchState, 'cv_in');
                return {
                    mix: lastEffectiveMix,
                    isCvPatched: isCv,
                    mode: d.mode || 'dissolve',
                    canvas: vmixCanvas
                };
            },
            updatePatchState: (p) => {
                patchState = p;
            },
            destroy: () => {
                try {
                    if (texA) texA.dispose();
                    if (texB) texB.dispose();
                    if (shaderMaterial) shaderMaterial.dispose();
                    if (quadMesh?.geometry) quadMesh.geometry.dispose();
                    if (renderer) renderer.dispose();
                    cvReader.input.disconnect();
                    cvReader.analyser.disconnect();
                } catch (_) {}
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

export const vmixAudioDefs = {
    VMIX
};
export default vmixAudioDefs;
