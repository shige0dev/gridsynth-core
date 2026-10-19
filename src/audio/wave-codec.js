/**
 * WAVE Module Audio Codec Utility
 * Handles decoding audio/video (MP4, MP3, WAV, etc.) via Web Audio API,
 * 16-second clipping/mono downmix, and Opus WebM Base64 encoding/decoding.
 */

export const WaveCodec = {
    MAX_DURATION: 16.0,

    /**
     * Helper to downmix AudioBuffer to mono Float32Array (max 16s) and peak-normalize.
     */
    processAudioBuffer(audioBuffer) {
        const targetDuration = Math.min(audioBuffer.duration, WaveCodec.MAX_DURATION);
        const targetSamples = Math.floor(targetDuration * audioBuffer.sampleRate);
        const monoData = new Float32Array(targetSamples);

        const numCh = audioBuffer.numberOfChannels;
        if (numCh === 1) {
            const ch0 = audioBuffer.getChannelData(0);
            monoData.set(ch0.subarray(0, targetSamples));
        } else {
            // Downmix to mono: average channels
            const ch0 = audioBuffer.getChannelData(0);
            const ch1 = audioBuffer.getChannelData(1);
            for (let i = 0; i < targetSamples; i++) {
                monoData[i] = (ch0[i] + ch1[i]) * 0.5;
            }
        }

        // Normalize peak to 0.95 to avoid distortion
        let maxPeak = 0;
        for (let i = 0; i < targetSamples; i++) {
            const abs = Math.abs(monoData[i]);
            if (abs > maxPeak) maxPeak = abs;
        }
        if (maxPeak > 0.001) {
            const normScale = 0.95 / maxPeak;
            for (let i = 0; i < targetSamples; i++) {
                monoData[i] *= normScale;
            }
        }

        const sampleRate = audioBuffer.sampleRate;
        const bpm = WaveCodec.detectBPM(monoData, sampleRate);

        return {
            buffer: monoData,
            sampleRate,
            duration: targetDuration,
            bpm
        };
    },

    /**
     * Loads an audio or video (MP4) file and decodes it to a mono Float32Array (max 16s).
     * Handles mobile browser restrictions, null AudioContexts, and falls back to HTMLVideoElement extraction.
     * @param {File} file
     * @param {AudioContext} [audioCtx]
     * @returns {Promise<{ buffer: Float32Array, sampleRate: number, duration: number }>}
     */
    async loadAudioFromFile(file, audioCtx) {
        if (!file) throw new Error('No file provided');

        // Ensure valid AudioContext
        let ctx = audioCtx;
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            ctx = new AC();
        }

        // Resume if suspended (critical on iOS Safari & mobile Chrome)
        if (ctx.state === 'suspended') {
            try {
                await ctx.resume();
            } catch (e) {
                console.warn('[WaveCodec] AudioContext resume failed:', e);
            }
        }

        const arrayBuffer = await file.arrayBuffer();

        // 1. Primary Attempt: decodeAudioData with Promise/Callback wrapper
        try {
            const copy = arrayBuffer.slice(0);
            const audioBuffer = await new Promise((resolve, reject) => {
                let resolved = false;
                const p = ctx.decodeAudioData(copy, (ab) => {
                    if (!resolved) { resolved = true; resolve(ab); }
                }, (err) => {
                    if (!resolved) { resolved = true; reject(err || new Error('decodeAudioData rejected')); }
                });
                if (p && typeof p.then === 'function') {
                    p.then(ab => { if (!resolved) { resolved = true; resolve(ab); } })
                     .catch(err => { if (!resolved) { resolved = true; reject(err); } });
                }
            });

            return WaveCodec.processAudioBuffer(audioBuffer);
        } catch (decodeErr) {
            console.warn('[WaveCodec] Direct decodeAudioData failed, attempting MediaElement extraction fallback:', decodeErr);
        }

        // 2. Secondary Fallback: Use HTMLVideoElement / HTMLAudioElement playback capture
        // (Guarantees decoding on mobile browsers where decodeAudioData does not support video/mp4 containers)
        return await WaveCodec.extractAudioViaMediaElement(file, ctx);
    },

    /**
     * Fallback extractor using HTMLVideoElement and Web Audio API streaming capture.
     * This works on all mobile platforms that can natively play the MP4 video.
     */
    async extractAudioViaMediaElement(file, audioCtx) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'auto';
            video.playsInline = true;
            video.muted = false; // Must be false for createMediaElementSource to capture audio

            const objectUrl = URL.createObjectURL(file);
            video.src = objectUrl;

            let source = null;
            let recorderNode = null;
            let zeroGain = null;
            let checkInterval = null;
            let timeoutId = null;
            let isCleanedUp = false;

            const cleanup = () => {
                if (isCleanedUp) return;
                isCleanedUp = true;
                if (checkInterval) clearInterval(checkInterval);
                if (timeoutId) clearTimeout(timeoutId);
                try { video.pause(); } catch (e) {}
                video.removeAttribute('src');
                video.load();
                URL.revokeObjectURL(objectUrl);
                try { source?.disconnect(); } catch (e) {}
                try { recorderNode?.disconnect(); } catch (e) {}
                try { zeroGain?.disconnect(); } catch (e) {}
            };

            video.onerror = () => {
                cleanup();
                reject(new Error('HTMLVideoElement cannot play this media file'));
            };

            video.onloadedmetadata = async () => {
                try {
                    if (audioCtx.state === 'suspended') {
                        await audioCtx.resume();
                    }

                    const duration = Math.min(video.duration || 16.0, WaveCodec.MAX_DURATION);
                    const sRate = audioCtx.sampleRate;
                    const totalSamples = Math.floor(duration * sRate);
                    const captured = new Float32Array(totalSamples);
                    let capturedOffset = 0;

                    source = audioCtx.createMediaElementSource(video);

                    // Silent sink so audio is processed without blasting to speakers during extraction
                    zeroGain = audioCtx.createGain();
                    zeroGain.gain.value = 0.0;
                    zeroGain.connect(audioCtx.destination);

                    // Capture PCM samples using ScriptProcessorNode
                    recorderNode = audioCtx.createScriptProcessor(4096, 1, 1);
                    recorderNode.onaudioprocess = (evt) => {
                        if (capturedOffset >= totalSamples) return;
                        const input = evt.inputBuffer.getChannelData(0);
                        const remaining = totalSamples - capturedOffset;
                        const toCopy = Math.min(input.length, remaining);
                        captured.set(input.subarray(0, toCopy), capturedOffset);
                        capturedOffset += toCopy;
                    };

                    source.connect(recorderNode);
                    recorderNode.connect(zeroGain);

                    // 4x speed playback for fast extraction (16s takes ~4s)
                    video.playbackRate = 4.0;
                    await video.play();

                    checkInterval = setInterval(() => {
                        if (capturedOffset >= totalSamples || video.ended || video.currentTime >= duration) {
                            cleanup();
                            const finalSamples = captured.subarray(0, capturedOffset);
                            // Normalize peak
                            let maxPeak = 0;
                            for (let i = 0; i < finalSamples.length; i++) {
                                const abs = Math.abs(finalSamples[i]);
                                if (abs > maxPeak) maxPeak = abs;
                            }
                            if (maxPeak > 0.001) {
                                const normScale = 0.95 / maxPeak;
                                for (let i = 0; i < finalSamples.length; i++) finalSamples[i] *= normScale;
                            }
                            resolve({
                                buffer: finalSamples,
                                sampleRate: sRate,
                                duration: capturedOffset / sRate,
                                bpm: WaveCodec.detectBPM(finalSamples, sRate)
                            });
                        }
                    }, 100);

                    // 12s safety timeout
                    timeoutId = setTimeout(() => {
                        if (!isCleanedUp) {
                            cleanup();
                            if (capturedOffset > 0) {
                                const sub = captured.subarray(0, capturedOffset);
                                resolve({
                                    buffer: sub,
                                    sampleRate: sRate,
                                    duration: capturedOffset / sRate,
                                    bpm: WaveCodec.detectBPM(sub, sRate)
                                });
                            } else {
                                reject(new Error('MediaElement extraction timed out (no audio track?)'));
                            }
                        }
                    }, 12000);
                } catch (err) {
                    cleanup();
                    reject(err);
                }
            };
        });
    },

    /**
     * Decodes Base64 string into Float32Array PCM data.
     * Supports Opus WebM Base64 or raw PCM Base64.
     * @param {string} base64Str
     * @param {AudioContext} audioCtx
     * @returns {Promise<{ buffer: Float32Array, sampleRate: number, duration: number } | null>}
     */
    async decodeFromBase64(base64Str, audioCtx) {
        if (!base64Str || typeof base64Str !== 'string') return null;

        try {
            let ctx = audioCtx;
            if (!ctx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                ctx = new AC();
            }

            // Remove data URI prefix if present
            const cleanStr = base64Str.replace(/^data:[^;]+;base64,/, '').trim();
            const binaryString = atob(cleanStr);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const audioBuffer = await new Promise((resolve, reject) => {
                let resolved = false;
                const p = ctx.decodeAudioData(bytes.buffer, (ab) => {
                    if (!resolved) { resolved = true; resolve(ab); }
                }, (err) => {
                    if (!resolved) { resolved = true; reject(err || new Error('decodeAudioData rejected')); }
                });
                if (p && typeof p.then === 'function') {
                    p.then(ab => { if (!resolved) { resolved = true; resolve(ab); } })
                     .catch(err => { if (!resolved) { resolved = true; reject(err); } });
                }
            });

            return WaveCodec.processAudioBuffer(audioBuffer);
        } catch (err) {
            console.warn('[WaveCodec] Failed to decode base64 audio:', err);
            return null;
        }
    },

    /**
     * Encodes a mono Float32Array into Opus WebM Base64 string (24kbps).
     * @param {Float32Array} float32Array
     * @param {number} sampleRate
     * @param {AudioContext} [audioCtx]
     * @returns {Promise<string>} Base64 encoded Opus audio
     */
    async encodeToOpusBase64(float32Array, sampleRate, audioCtx) {
        if (!float32Array || float32Array.length === 0) return '';

        let ctx = audioCtx;
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            ctx = new AC();
        }

        // If MediaRecorder or WebM is not supported or createMediaStreamDestination missing, fallback to simple 16-bit WAV Base64
        const mimeType = 'audio/webm; codecs=opus';
        if (typeof MediaRecorder === 'undefined' ||
            !MediaRecorder.isTypeSupported?.(mimeType) ||
            typeof ctx.createMediaStreamDestination !== 'function') {
            return WaveCodec.encodeToWavBase64(float32Array, sampleRate);
        }

        return new Promise((resolve, reject) => {
            try {
                const audioBuffer = audioCtx.createBuffer(1, float32Array.length, sampleRate);
                audioBuffer.getChannelData(0).set(float32Array);

                const src = audioCtx.createBufferSource();
                src.buffer = audioBuffer;

                const dest = audioCtx.createMediaStreamDestination();
                src.connect(dest);

                const recorder = new MediaRecorder(dest.stream, {
                    mimeType,
                    audioBitsPerSecond: 24000
                });

                const chunks = [];
                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) chunks.push(e.data);
                };

                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: mimeType });
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const result = reader.result;
                        // Strip data:audio/webm; codecs=opus;base64,
                        const base64 = typeof result === 'string' ? result.split(',')[1] : '';
                        resolve(base64);
                    };
                    reader.onerror = (err) => reject(err);
                    reader.readAsDataURL(blob);
                };

                recorder.start();
                src.start();

                // Stop recording when buffer ends
                const durMs = (float32Array.length / sampleRate) * 1000;
                setTimeout(() => {
                    try {
                        if (recorder.state === 'recording') {
                            recorder.stop();
                            src.stop();
                        }
                    } catch (e) {
                        // ignore
                    }
                }, durMs + 100);
            } catch (err) {
                console.warn('[WaveCodec] Opus encoding failed, falling back to WAV:', err);
                resolve(WaveCodec.encodeToWavBase64(float32Array, sampleRate));
            }
        });
    },

    /**
     * Fallback lightweight WAV encoder in case Opus MediaRecorder is unavailable.
     */
    encodeToWavBase64(float32Array, sampleRate) {
        const numSamples = float32Array.length;
        const buffer = new ArrayBuffer(44 + numSamples * 2);
        const view = new DataView(buffer);

        // RIFF header
        const writeStr = (offset, str) => {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + numSamples * 2, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
        view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
        view.setUint16(22, 1, true);  // NumChannels (1 mono)
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true); // ByteRate
        view.setUint16(32, 2, true);  // BlockAlign
        view.setUint16(34, 16, true); // BitsPerSample
        writeStr(36, 'data');
        view.setUint32(40, numSamples * 2, true);

        // Float to 16-bit PCM
        let offset = 44;
        for (let i = 0; i < numSamples; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }

        // Convert ArrayBuffer to Base64
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    /**
     * Downsample Float32Array to an array of peak amplitudes (0.0 - 1.0) for waveform display.
     * @param {Float32Array} buffer
     * @param {number} [numBins=64]
     * @returns {number[]}
     */
    extractPeaks(buffer, numBins = 64) {
        const peaks = new Float32Array(numBins);
        if (!buffer || buffer.length === 0) return Array.from(peaks);
        const step = Math.max(1, Math.floor(buffer.length / numBins));
        for (let b = 0; b < numBins; b++) {
            let max = 0;
            const start = b * step;
            const end = Math.min(buffer.length, start + step);
            for (let i = start; i < end; i++) {
                const abs = Math.abs(buffer[i]);
                if (abs > max) max = abs;
            }
            peaks[b] = Math.min(1.0, max);
        }
        return Array.from(peaks);
    },

    /**
     * Offline BPM estimation from a mono Float32Array buffer using log-compressed
     * onset flux envelope and comb-weighted autocorrelation in the 60..180 BPM range.
     * @param {Float32Array} buffer
     * @param {number} [sampleRate=48000]
     * @returns {number|null}
     */
    detectBPM(buffer, sampleRate = 48000) {
        if (!buffer || buffer.length < sampleRate * 0.25) return null;

        const hop = Math.max(1, Math.round(sampleRate / 200)); // ~200 Hz envelope
        const envRate = sampleRate / hop;
        const numFrames = Math.floor(buffer.length / hop);
        if (numFrames < 20) return null;

        // 1. RMS energy per frame & check for silence
        const logEnergy = new Float32Array(numFrames);
        let maxE = 0;
        for (let k = 0; k < numFrames; k++) {
            const offset = k * hop;
            let sumSq = 0;
            for (let i = 0; i < hop; i++) {
                const s = buffer[offset + i];
                sumSq += s * s;
            }
            const rms = Math.sqrt(sumSq / hop);
            if (rms > maxE) maxE = rms;
            logEnergy[k] = Math.log1p(25.0 * rms);
        }
        if (maxE < 0.008) return null;

        // 2. First-order half-wave rectified onset flux + 3-tap smoothing
        const rawFlux = new Float32Array(numFrames);
        for (let k = 1; k < numFrames; k++) {
            const diff = logEnergy[k] - logEnergy[k - 1];
            rawFlux[k] = diff > 0 ? diff : 0;
        }
        const smoothFlux = new Float32Array(numFrames);
        for (let k = 1; k < numFrames - 1; k++) {
            smoothFlux[k] = 0.25 * rawFlux[k - 1] + 0.5 * rawFlux[k] + 0.25 * rawFlux[k + 1];
        }

        // 3. Adaptive local threshold (moving average over +/-20 frames = ~200ms)
        const onset = new Float32Array(numFrames);
        const winRadius = 20;
        let onsetSum = 0;
        for (let k = 0; k < numFrames; k++) {
            const sIdx = Math.max(0, k - winRadius);
            const eIdx = Math.min(numFrames - 1, k + winRadius);
            let localSum = 0;
            for (let j = sIdx; j <= eIdx; j++) localSum += smoothFlux[j];
            const localMean = localSum / (eIdx - sIdx + 1);
            const val = smoothFlux[k] - localMean;
            onset[k] = val > 0 ? val : 0;
            onsetSum += onset[k];
        }

        const duration = buffer.length / sampleRate;
        if (onsetSum < 1e-4) {
            for (const beats of [4, 8, 16, 2, 32]) {
                const b = (60.0 * beats) / duration;
                if (b >= 60 && b <= 180) return Math.round(b);
            }
            return 120;
        }

        // 4. Normalized Autocorrelation over candidate lags (60 to 180 BPM)
        const minLag = Math.max(4, Math.floor((60.0 * envRate) / 180.0));
        const maxLag = Math.min(numFrames - 4, Math.ceil((60.0 * envRate) / 60.0));
        if (maxLag <= minLag) {
            for (const beats of [4, 8, 16, 2, 32]) {
                const b = (60.0 * beats) / duration;
                if (b >= 60 && b <= 180) return Math.round(b);
            }
            return 120;
        }

        const maxCorrLag = Math.min(numFrames - 2, maxLag * 2 + 2);
        const acf = new Float32Array(maxCorrLag + 1);
        for (let lag = 1; lag <= maxCorrLag; lag++) {
            let sum = 0;
            const limit = numFrames - lag;
            for (let k = 0; k < limit; k++) {
                sum += onset[k] * onset[k + lag];
            }
            acf[lag] = sum / limit;
        }

        // 5. Harmonic comb scoring + perceptual tempo prior centered at 120 BPM
        const combScore = new Float32Array(maxLag + 2);
        let bestLag = minLag;
        let bestWeighted = -1;

        for (let lag = minLag; lag <= maxLag; lag++) {
            let c = acf[lag];
            if (lag * 2 <= maxCorrLag) c += 0.5 * acf[lag * 2];
            const halfLag = Math.round(lag * 0.5);
            if (halfLag >= 1) c += 0.3 * acf[halfLag];
            combScore[lag] = c;

            const bpm = (60.0 * envRate) / lag;
            const logDiff = Math.log2(bpm / 120.0);
            const prior = Math.exp(-0.5 * (logDiff / 0.75) * (logDiff / 0.75));
            const wScore = c * prior;
            if (wScore > bestWeighted) {
                bestWeighted = wScore;
                bestLag = lag;
            }
        }

        // 6. Parabolic interpolation around bestLag
        let fineLag = bestLag;
        if (bestLag > minLag && bestLag < maxLag) {
            const y0 = combScore[bestLag - 1];
            const y1 = combScore[bestLag];
            const y2 = combScore[bestLag + 1];
            const denom = 2 * (y0 - 2 * y1 + y2);
            if (Math.abs(denom) > 1e-9) {
                const delta = (y0 - y2) / denom;
                if (delta >= -0.5 && delta <= 0.5) fineLag = bestLag + delta;
            }
        }

        let estBpm = (60.0 * envRate) / fineLag;
        while (estBpm < 60.0) estBpm *= 2.0;
        while (estBpm > 180.0) estBpm *= 0.5;

        return Math.round(estBpm);
    },

    /**
     * Resolves WAVE link_out -> link_in chains (both star and daisy-chain topologies)
     * within a page and propagates the root WAVE's waveform table and chop settings
     * to all downstream linked WAVE modules.
     */
    syncWaveLinks(pageData, synth = null, pageId = '0') {
        if (!pageData || !pageData.modules) return [];
        const mods = pageData.modules;
        const conns = pageData.connections || [];

        const parentMap = {};
        conns.forEach(c => {
            if (!c) return;
            const fM = typeof c === 'object' ? c.from?.moduleId : c.split('>')[0]?.split(':')[0]?.trim();
            const fP = typeof c === 'object' ? c.from?.port : c.split('>')[0]?.split(':')[1]?.trim();
            const tM = typeof c === 'object' ? c.to?.moduleId : c.split('>')[1]?.split(':')[0]?.trim();
            const tP = typeof c === 'object' ? c.to?.port : c.split('>')[1]?.split(':')[1]?.trim();
            if (fM && tM && fP === 'link_out' && tP === 'link_in') {
                if (mods[fM]?.type === 'WAVE' && mods[tM]?.type === 'WAVE') {
                    parentMap[tM] = fM;
                }
            }
        });

        const findRootId = (startId) => {
            let cur = startId;
            const visited = new Set([cur]);
            while (parentMap[cur]) {
                const next = parentMap[cur];
                if (visited.has(next)) break;
                visited.add(next);
                cur = next;
            }
            return cur !== startId ? cur : null;
        };

        const affectedIds = [];
        Object.entries(mods).forEach(([mId, m]) => {
            if (!m || m.type !== 'WAVE') return;
            const rootId = findRootId(mId);
            if (rootId && mods[rootId]) {
                const rootMod = mods[rootId];
                const prevChopMode = m.chopMode;
                m._isLinked = true;
                m._linkedRootId = rootId;
                m.name = rootMod.name || 'Wave 1';
                m.duration = rootMod.duration ?? 1.5;
                m.sampleRate = rootMod.sampleRate ?? 48000;
                m.bpm = rootMod.bpm ?? null;
                const rootPeaks = rootMod.peaks || rootMod._peaks;
                m.peaks = Array.isArray(rootPeaks) ? [...rootPeaks] : null;
                m._peaks = m.peaks || [];
                m._buffer = rootMod._buffer || null;
                m.chopMode = rootMod.chopMode ?? 'off';
                m.chops = Array.isArray(rootMod.chops) ? [...rootMod.chops] : [];
                if (prevChopMode !== m.chopMode) {
                    if (m.chopMode !== 'off' && prevChopMode === 'off') {
                        m.snapMode = true;
                    } else if (m.chopMode === 'off') {
                        m.snapMode = false;
                    }
                }

                if (synth?.modules) {
                    const inst = synth.modules[`${pageId}/${mId}`] || synth.modules[mId];
                    if (inst) {
                        if (m._buffer) {
                            inst.setAudioBuffer?.(m._buffer, m.sampleRate);
                        }
                        inst.update?.(synth.ctx, inst, m);
                    }
                }
                affectedIds.push(mId);
            } else {
                const wasLinked = Boolean(m._isLinked);
                m._isLinked = false;
                m._linkedRootId = null;
                if (wasLinked) affectedIds.push(mId);
            }
        });

        return affectedIds;
    }
};

export default WaveCodec;

