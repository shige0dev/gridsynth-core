/**
 * TAPE Module Audio Codec Utility
 * Handles decoding audio/video (MP4, MP3, WAV, etc.) via Web Audio API,
 * 16-second clipping/mono downmix, and Opus WebM Base64 encoding/decoding.
 */

export const TapeCodec = {
    MAX_DURATION: 16.0,

    /**
     * Loads an audio or video (MP4) file and decodes it to a mono Float32Array (max 16s).
     * @param {File} file
     * @param {AudioContext} audioCtx
     * @returns {Promise<{ buffer: Float32Array, sampleRate: number, duration: number }>}
     */
    async loadAudioFromFile(file, audioCtx) {
        if (!file) throw new Error('No file provided');
        const arrayBuffer = await file.arrayBuffer();

        // decodeAudioData automatically extracts audio tracks from MP4, WebM, MP3, WAV, etc.
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        const targetDuration = Math.min(audioBuffer.duration, TapeCodec.MAX_DURATION);
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

        return {
            buffer: monoData,
            sampleRate: audioBuffer.sampleRate,
            duration: targetDuration
        };
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
            // Remove data URI prefix if present
            const cleanStr = base64Str.replace(/^data:[^;]+;base64,/, '').trim();
            const binaryString = atob(cleanStr);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer);
            const targetDuration = Math.min(audioBuffer.duration, TapeCodec.MAX_DURATION);
            const targetSamples = Math.floor(targetDuration * audioBuffer.sampleRate);
            const monoData = new Float32Array(targetSamples);

            if (audioBuffer.numberOfChannels === 1) {
                monoData.set(audioBuffer.getChannelData(0).subarray(0, targetSamples));
            } else {
                const ch0 = audioBuffer.getChannelData(0);
                const ch1 = audioBuffer.getChannelData(1);
                for (let i = 0; i < targetSamples; i++) {
                    monoData[i] = (ch0[i] + ch1[i]) * 0.5;
                }
            }

            return {
                buffer: monoData,
                sampleRate: audioBuffer.sampleRate,
                duration: targetDuration
            };
        } catch (err) {
            console.warn('[TapeCodec] Failed to decode base64 audio:', err);
            return null;
        }
    },

    /**
     * Encodes a mono Float32Array into Opus WebM Base64 string (24kbps).
     * @param {Float32Array} float32Array
     * @param {number} sampleRate
     * @param {AudioContext} audioCtx
     * @returns {Promise<string>} Base64 encoded Opus audio
     */
    async encodeToOpusBase64(float32Array, sampleRate, audioCtx) {
        if (!float32Array || float32Array.length === 0) return '';

        // If MediaRecorder or WebM is not supported, fallback to simple 16-bit WAV Base64
        const mimeType = 'audio/webm; codecs=opus';
        if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported?.(mimeType)) {
            return TapeCodec.encodeToWavBase64(float32Array, sampleRate);
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
                console.warn('[TapeCodec] Opus encoding failed, falling back to WAV:', err);
                resolve(TapeCodec.encodeToWavBase64(float32Array, sampleRate));
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
     * Generates a default 1-second clean test sample (sine beep / tape chirp) for newly created TAPE instances.
     */
    createDefaultSample(sampleRate = 48000) {
        const len = Math.floor(sampleRate * 1.5);
        const buf = new Float32Array(len);
        for (let i = 0; i < len; i++) {
            const t = i / sampleRate;
            // Warm vintage tape sweep with harmonic decay
            const freq = 220 + 110 * Math.exp(-t * 3);
            const env = Math.exp(-t * 2);
            buf[i] = Math.sin(2 * Math.PI * freq * t) * 0.7 * env;
        }
        return buf;
    }
};

