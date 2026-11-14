// src/audio/defs/wave3d.js
// Audio/Engine-side representation for WAVE3D (3D Scrolling Audio Buffer / Waterfall)

import { AudioHelpers } from '../helpers.js';

export const WAVE3D = {
    create: (ctx, d, patch, eng) => {
        let patchState = patch || null;

        const waveIn = ctx.createGain();
        const an = ctx.createAnalyser();
        an.fftSize = 8192;
        an.minDecibels = -65;
        an.maxDecibels = -6;
        an.smoothingTimeConstant = 0.75;
        waveIn.connect(an);
        if (eng?.silentSink) {
            an.connect(eng.silentSink);
        }

        const sampleRate = ctx.sampleRate || 48000;
        const timeBuf = new Float32Array(an.fftSize);
        const freqBuf = new Uint8Array(an.frequencyBinCount);
        const cvReader = AudioHelpers.createCvReader(ctx, eng);

        let cachedSlices = 0;
        let cachedCols = 0;
        let cachedStyle = '';
        let history = null;
        let head = 0;
        let scrollAcc = 0;

        // Style-specific reusable Three.js buffers
        let ribbonGeoms = [];
        let ribbonPosArrays = [];
        let pointGeom = null;
        let pointPosArray = null;
        let barGeom = null;
        let barMatrices = null;
        const dummyMatrix = typeof THREE !== 'undefined' ? new THREE.Matrix4() : null;
        const dummyPos = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;
        const dummyQuat = typeof THREE !== 'undefined' ? new THREE.Quaternion() : null;
        const dummyScale = typeof THREE !== 'undefined' ? new THREE.Vector3() : null;

        const disposeGeoms = () => {
            ribbonGeoms.forEach(g => { try { g.dispose(); } catch (_) {} });
            ribbonGeoms = [];
            ribbonPosArrays = [];
            if (pointGeom) { try { pointGeom.dispose(); } catch (_) {} pointGeom = null; pointPosArray = null; }
            if (barGeom) { try { barGeom.dispose(); } catch (_) {} barGeom = null; barMatrices = null; }
        };

        const ensureBuffers = (slices, cols, style) => {
            if (typeof THREE === 'undefined') return;
            const dimsChanged = (slices !== cachedSlices || cols !== cachedCols);
            if (dimsChanged) {
                history = new Float32Array(slices * cols);
                head = 0;
                scrollAcc = 0;
                disposeGeoms();
                cachedSlices = slices;
                cachedCols = cols;
                cachedStyle = '';
            }
            if (style !== cachedStyle) {
                disposeGeoms();
                if (style === 'ribbon') {
                    for (let r = 0; r < slices; r++) {
                        const arr = new Float32Array(cols * 3);
                        const g = new THREE.BufferGeometry();
                        g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
                        ribbonGeoms.push(g);
                        ribbonPosArrays.push(arr);
                    }
                } else if (style === 'point') {
                    pointPosArray = new Float32Array(slices * cols * 3);
                    pointGeom = new THREE.BufferGeometry();
                    pointGeom.setAttribute('position', new THREE.BufferAttribute(pointPosArray, 3));
                } else if (style === 'bars') {
                    barGeom = new THREE.BoxGeometry(1, 1, 1);
                    barMatrices = new Float32Array(slices * cols * 16);
                }
                cachedStyle = style;
            }
        };

        const pushAudioSlice = (slices, cols, sourceMode, gain) => {
            const targetOffset = head * cols;
            if (sourceMode === 'spec') {
                an.getByteFrequencyData(freqBuf);
                const fftSize = freqBuf.length * 2;
                const f0 = 55; // Match SPEC module's 55Hz base (logarithmic 5-octave span: 55Hz..1760Hz)
                for (let c = 0; c < cols; c++) {
                    const u = c / Math.max(1, cols - 1);
                    const fCenter = f0 * Math.pow(2, u * 5.0);
                    const kCenterFloat = (fCenter * fftSize) / sampleRate;
                    const k0 = Math.max(0, Math.min(freqBuf.length - 1, Math.floor(kCenterFloat)));
                    const k1 = Math.min(freqBuf.length - 1, k0 + 1);
                    const frac = kCenterFloat - k0;
                    const val = (1 - frac) * freqBuf[k0] + frac * freqBuf[k1];
                    const v = Math.max(0, Math.min(1.0, val / 255.0));
                    history[targetOffset + c] = Math.pow(v, 1.4) * gain;
                }
            } else {
                an.getFloatTimeDomainData(timeBuf);
                const winLen = 1024;
                const startIdx = Math.max(0, timeBuf.length - winLen);
                for (let c = 0; c < cols; c++) {
                    const u = c / Math.max(1, cols - 1);
                    const sIdx = Math.min(timeBuf.length - 1, startIdx + Math.floor(u * (winLen - 1)));
                    const raw = timeBuf[sIdx] * gain;
                    const edge = Math.pow(Math.sin(Math.PI * u), 0.35);
                    history[targetOffset + c] = raw * edge;
                }
            }
            head = (head + 1) % slices;
        };

        return {
            nodes: { waveIn, an, gCv: cvReader.input, anCv: cvReader.analyser },
            inputs: {
                wave_in: waveIn,
                cv_in: cvReader.input
            },
            outputs: {
                obj_out: null
            },
            data: d,
            updatePatchState: (newPatch) => {
                patchState = newPatch;
            },
            getGeometryPacket: () => {
                if (typeof THREE === 'undefined') return null;

                const slices = Math.max(16, Math.min(64, Math.round(d.slices ?? 40)));
                const cols = Math.max(24, Math.min(96, Math.round(d.cols ?? 64)));
                const style = d.style || 'ribbon';
                const sourceMode = d.sourceMode || 'wave';
                const speed = Math.max(0.2, Math.min(2.0, Number(d.speed ?? 1.0)));
                const cvPatched = AudioHelpers.isPortPatched(d, patchState, 'cv_in');
                const effGain = cvPatched
                    ? Math.max(0.05, Number(d.gain ?? 1.6) * (0.2 + Math.max(0, cvReader.read(0))))
                    : Number(d.gain ?? 1.6);
                const glow = Number(d.glow ?? 0.75);
                const color = d.color || '#ffffff';

                ensureBuffers(slices, cols, style);

                scrollAcc += speed;
                const steps = Math.min(4, Math.floor(scrollAcc));
                if (steps > 0) {
                    scrollAcc -= steps;
                    for (let s = 0; s < steps; s++) {
                        pushAudioSlice(slices, cols, sourceMode, effGain);
                    }
                }

                const width = 4.8;
                const depth = 9.6;
                const zFront = depth * 0.5;
                const transform = {
                    position: [0, 0, 0],
                    rotation: [0, 0, 0],
                    scale: [1, 1, 1]
                };

                if (style === 'ribbon') {
                    const children = [];
                    for (let r = 0; r < slices; r++) {
                        // r=0 is oldest (back), r=slices-1 is newest (front)
                        const histRow = (head + r) % slices;
                        const rowOffset = histRow * cols;
                        const z = zFront - ((slices - 1 - r) / Math.max(1, slices - 1)) * depth;
                        const arr = ribbonPosArrays[r];
                        for (let c = 0; c < cols; c++) {
                            const x = -width * 0.5 + (c / Math.max(1, cols - 1)) * width;
                            const y = history[rowOffset + c];
                            const idx3 = c * 3;
                            arr[idx3] = x;
                            arr[idx3 + 1] = y;
                            arr[idx3 + 2] = z;
                        }
                        ribbonGeoms[r].attributes.position.needsUpdate = true;
                        children.push({
                            geometry: ribbonGeoms[r],
                            isLine: true,
                            materialStyle: 'line',
                            wireWidth: 1.4,
                            color,
                            glow
                        });
                    }
                    return { transform, children };
                }

                if (style === 'point') {
                    let pIdx = 0;
                    for (let r = 0; r < slices; r++) {
                        const histRow = (head + r) % slices;
                        const rowOffset = histRow * cols;
                        const z = zFront - ((slices - 1 - r) / Math.max(1, slices - 1)) * depth;
                        for (let c = 0; c < cols; c++) {
                            const x = -width * 0.5 + (c / Math.max(1, cols - 1)) * width;
                            const y = history[rowOffset + c];
                            pointPosArray[pIdx++] = x;
                            pointPosArray[pIdx++] = y;
                            pointPosArray[pIdx++] = z;
                        }
                    }
                    pointGeom.attributes.position.needsUpdate = true;
                    return {
                        geometry: pointGeom,
                        materialStyle: 'point',
                        pointSize: 2.5,
                        color,
                        glow,
                        transform
                    };
                }

                // 'bars' (GPU InstancedMesh)
                const barW = (width / cols) * 0.65;
                const barD = (depth / slices) * 0.55;
                let instIdx = 0;
                for (let r = 0; r < slices; r++) {
                    const histRow = (head + r) % slices;
                    const rowOffset = histRow * cols;
                    const z = zFront - ((slices - 1 - r) / Math.max(1, slices - 1)) * depth;
                    for (let c = 0; c < cols; c++) {
                        const x = -width * 0.5 + (c / Math.max(1, cols - 1)) * width;
                        const val = history[rowOffset + c];
                        const h = Math.max(0.02, Math.abs(val));
                        const y = sourceMode === 'spec' ? h * 0.5 : val * 0.5;
                        dummyPos.set(x, y, z);
                        dummyScale.set(barW, h, barD);
                        dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
                        dummyMatrix.toArray(barMatrices, instIdx * 16);
                        instIdx++;
                    }
                }
                return {
                    type: 'INSTANCED',
                    geometry: barGeom,
                    matrices: barMatrices,
                    count: slices * cols,
                    materialStyle: 'solid',
                    color,
                    glow,
                    transform
                };
            },
            dispose: () => {
                disposeGeoms();
                try { waveIn.disconnect(); } catch (_) {}
                try { an.disconnect(); } catch (_) {}
                try { cvReader.analyser.disconnect(); } catch (_) {}
            }
        };
    }
};

export const wave3dAudioDefs = {
    WAVE3D
};
