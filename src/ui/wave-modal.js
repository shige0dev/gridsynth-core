// src/ui/wave-modal.js
import { UIHelpers } from './helpers.js?v=277';
import { WaveCodec } from '../audio/wave-codec.js?v=277';
import { WaveView } from './wave-view.js?v=277';
import { JsonIoDialog } from './json-io-dialog.js?v=277';

/**
 * WAVE Module Modal Renderer & Event Controller
 */
export const WaveModal = {
    getActiveInst(ctx, m) {
        const s = ctx?.synth || window.__GS_SYNTH__;
        if (!s || !s.modules) return null;
        const pId = ctx?.currentPageId ?? '0';
        for (const k of [`${pId}/${m.id}`, m.id, `0/${m.id}`]) {
            if (s.modules[k]) return s.modules[k];
        }
        for (const k in s.modules) {
            const inst = s.modules[k];
            if (inst && typeof inst.setAudioBuffer === 'function') return inst;
        }
        return null;
    },

    async ensureSynthReady(ctx, m) {
        const synth = ctx?.synth || window.__GS_SYNTH__;
        const ui = ctx?.ui || window.__GS_UI__;
        if (synth) {
            await synth.init();
            synth.resume?.();
            if (synth.ctx && synth.ctx.state === 'suspended') {
                try { await synth.ctx.resume(); } catch (_) {}
            }
            const pagesData = ctx?.pagesData || ui?.pagesData;
            if ((!synth.hasModules() || !this.getActiveInst(ctx, m)) && pagesData) {
                const resolvePatch = (pId, id) => {
                    if (typeof ui?.getPatchState === 'function') return ui.getPatchState(id, pId);
                    if (typeof ctx?.getPatchState === 'function') return ctx.getPatchState(id, pId);
                    return new Set();
                };
                synth.rebuildAll(pagesData, resolvePatch);
            }
        }
        const pwrBtn = document.getElementById('audio-power-btn');
        if (pwrBtn && !pwrBtn.classList.contains('border-red-500')) {
            pwrBtn.className = "h-7 w-7 bg-red-950 text-red-400 rounded-lg border border-red-500 shadow-md shadow-red-500/40 flex items-center justify-center shrink-0";
        }
        return this.getActiveInst(ctx, m);
    },

    extractWavePayload(parsed) {
        if (!parsed || typeof parsed !== 'object') return null;
        if (parsed.type === 'WAVE' || typeof parsed.data === 'string' || Array.isArray(parsed.peaks)) {
            return parsed;
        }
        // Check if it's a keyed object like { "WAVE1": { type: "WAVE", ... } }
        for (const val of Object.values(parsed)) {
            if (val && typeof val === 'object' && (val.type === 'WAVE' || typeof val.data === 'string')) {
                return val;
            }
        }
        // Check if it's a full patch JSON with pages
        if (parsed.pages && typeof parsed.pages === 'object') {
            for (const p of Object.values(parsed.pages)) {
                if (p?.modules && typeof p.modules === 'object') {
                    for (const mod of Object.values(p.modules)) {
                        if (mod && mod.type === 'WAVE') return mod;
                    }
                }
            }
        }
        return null;
    },

    async openWaveExport(m, ctx, cb) {
        const synth = ctx?.synth || window.__GS_SYNTH__;
        if (!m.data && m._buffer?.length > 0) {
            ctx.showToast?.('ENCODING AUDIO TO JSON...');
            try {
                m.data = await WaveCodec.encodeToOpusBase64(m._buffer, m.sampleRate || 48000, synth?.ctx);
                cb?.();
            } catch (_) {}
        }
        const exportObj = JsonIoDialog.exportModuleData(m);
        const jsonStr = JSON.stringify(exportObj, null, 2);
        const durStr = `${(m.duration ?? 1.5).toFixed(2)}s`;
        const kbStr = `${(jsonStr.length / 1024).toFixed(1)} KB`;

        JsonIoDialog.openExport({
            title: `WAVE JSON EXPORT (${m.id || 'WAVE'})`,
            icon: 'upload',
            jsonStr,
            infoBadges: [
                `NAME: ${m.name || 'Wave 1'}`,
                `DURATION: ${durStr}`,
                `SIZE: ${kbStr}`
            ],
            copyToast: 'WAVE JSONをクリップボードにコピーしました',
            showToast: (msg) => ctx.showToast?.(msg)
        });
    },

    openWaveImport(m, ctx, cb, redrawSvg) {
        JsonIoDialog.openImport({
            title: `WAVE JSON IMPORT (${m.id || 'WAVE'})`,
            icon: 'download',
            placeholder: 'ここに WAVE モジュールの JSON テキストを貼り付けてください...',
            showToast: (msg) => ctx.showToast?.(msg),
            actions: [
                {
                    id: 'json-wave-import-btn',
                    label: 'LOAD (このWAVEに適用)',
                    icon: 'check',
                    cls: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30',
                    onClick: async (rawText, modal) => {
                        const res = JsonIoDialog.parseJsonText(rawText);
                        if (res.empty) {
                            ctx.showToast?.('JSONテキストが空です');
                            return;
                        }
                        if (res.syntaxError) {
                            const info = res.info;
                            alert(`【JSON構文エラー】\n${info.line}行目・${info.col}文字目付近に文法ミス（カンマや括弧の過不足など）があります。\n\n詳細: ${info.message}\n\n${info.snippet}`);
                            return;
                        }
                        const waveData = this.extractWavePayload(res.data);
                        if (!waveData) {
                            alert('【インポートエラー】\n有効な WAVE モジュールデータが見つかりません。');
                            return;
                        }

                        // Apply WAVE module properties
                        const allowedKeys = [
                            'name', 'codec', 'sampleRate', 'maxDuration', 'duration', 'bpm',
                            'start', 'end', 'speed', 'pitchMode', 'semiMode', 'loop', 'retrigger',
                            'chopMode', 'chops', 'snapMode', 'rangeLock',
                            'data', 'peaks'
                        ];
                        allowedKeys.forEach(k => {
                            if (waveData[k] !== undefined) {
                                m[k] = Array.isArray(waveData[k]) ? [...waveData[k]] : waveData[k];
                            }
                        });
                        m.speedCv = Math.log2(Math.max(0.0625, m.speed || 1.0));
                        m._peaks = Array.isArray(m.peaks) ? [...m.peaks] : [];
                        m._lockDelta = (m.end ?? 1.0) - (m.start ?? 0.0);

                        modal.classList.add('hidden');

                        const activeInst = await this.ensureSynthReady(ctx, m);
                        const synth = ctx?.synth || window.__GS_SYNTH__;

                        if (m.data) {
                            try {
                                ctx.showToast?.('DECODING WAVE JSON...');
                                const decoded = await WaveCodec.decodeFromBase64(m.data, synth?.ctx || null);
                                if (decoded?.buffer) {
                                    m._buffer = decoded.buffer;
                                    m.duration = decoded.duration;
                                    m.sampleRate = decoded.sampleRate;
                                    m.bpm = decoded.bpm || WaveCodec.detectBPM(decoded.buffer, decoded.sampleRate);
                                    if (!m.peaks?.length) {
                                        m.peaks = WaveCodec.extractPeaks(decoded.buffer, 64);
                                    }
                                    m._peaks = m.peaks;
                                    (activeInst || this.getActiveInst(ctx, m))?.setAudioBuffer?.(decoded.buffer, decoded.sampleRate);
                                }
                            } catch (err) {
                                ctx.showToast?.(`DECODE ERROR: ${(err?.message || String(err)).slice(0, 28)}`);
                            }
                        }

                        const inst = activeInst || this.getActiveInst(ctx, m);
                        inst?.update?.(synth?.ctx, inst, m);
                        this.propagateLinks(ctx);
                        redrawSvg?.();
                        ctx.reRenderModal?.();
                        cb?.();
                        ctx.showToast?.(`WAVE JSON IMPORTED: ${m.name || 'Wave'}`);
                    }
                },
                {
                    id: 'json-close-btn',
                    label: 'CANCEL',
                    cls: 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700',
                    onClick: (_, modal) => modal.classList.add('hidden')
                }
            ]
        });
    },

    propagateLinks(ctx) {
        const ui = ctx?.ui || window.__GS_UI__;
        const synth = ctx?.synth || window.__GS_SYNTH__;
        const pId = String(ctx?.currentPageId ?? ui?.currentPageId ?? '0');
        const pData = ui?.pagesData?.[pId] || ctx?.pagesData?.[pId] || (ui ? { modules: ui.modules, connections: ui.connections } : null);
        if (!pData) return [];
        const affected = WaveCodec.syncWaveLinks(pData, synth, pId);
        if (affected.length > 0 && ui) {
            ui.updateAllCells?.();
            ui.reRenderDockModal?.();
        }
        return affected;
    },

    formatRecName(date = new Date()) {
        const pad2 = (n) => String(n).padStart(2, '0');
        const yyyy = date.getFullYear();
        const mm = pad2(date.getMonth() + 1);
        const dd = pad2(date.getDate());
        const hh = pad2(date.getHours());
        const min = pad2(date.getMinutes());
        return `REC ${yyyy}${mm}${dd}${hh}${min}`;
    },

    stopActiveRecording(cancelOnly = false) {
        if (this._activeRec) {
            const rec = this._activeRec;
            this._activeRec = null;
            rec.finish(cancelOnly);
        }
    },

    async toggleMicRecording(m, ctx, cb, redrawSvg) {
        if (this._activeRec) {
            this.stopActiveRecording(false);
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
            ctx.showToast?.('MIC RECORDING NOT SUPPORTED');
            return;
        }

        try {
            const activeInst = await this.ensureSynthReady(ctx, m);
            const synth = ctx?.synth || window.__GS_SYNTH__;
            const audioCtx = synth?.ctx || new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') {
                try { await audioCtx.resume(); } catch (_) {}
            }

            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
                });
            } catch (_) {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            }

            const sRate = audioCtx.sampleRate || 48000;
            const maxSec = WaveCodec.MAX_DURATION || 16.0;
            const maxSamples = Math.floor(maxSec * sRate);
            const captured = new Float32Array(maxSamples);
            let capturedOffset = 0;
            const recName = this.formatRecName(new Date());

            m._isRecording = true;
            m.name = recName;
            ctx.reRenderModal?.();
            ctx.showToast?.('RECORDING... (CLICK STOP TO FINISH)');

            const source = audioCtx.createMediaStreamSource(stream);
            const recorderNode = audioCtx.createScriptProcessor(2048, 1, 1);
            const zeroGain = audioCtx.createGain();
            zeroGain.gain.value = 0.0;

            let uiTick = 0;
            recorderNode.onaudioprocess = (evt) => {
                if (!this._activeRec) return;
                const input = evt.inputBuffer.getChannelData(0);
                const remaining = maxSamples - capturedOffset;
                if (remaining <= 0) {
                    this.stopActiveRecording(false);
                    return;
                }
                const toCopy = Math.min(input.length, remaining);
                captured.set(input.subarray(0, toCopy), capturedOffset);
                capturedOffset += toCopy;

                uiTick++;
                if (uiTick % 4 === 0 && capturedOffset > 0) {
                    const curSlice = captured.subarray(0, capturedOffset);
                    m.duration = capturedOffset / sRate;
                    m.peaks = WaveCodec.extractPeaks(curSlice, 64);
                    m._peaks = m.peaks;
                    redrawSvg?.();
                }

                if (capturedOffset >= maxSamples) {
                    this.stopActiveRecording(false);
                }
            };

            source.connect(recorderNode);
            recorderNode.connect(zeroGain);
            zeroGain.connect(audioCtx.destination);

            let finished = false;
            this._activeRec = {
                finish: (cancelOnly = false) => {
                    if (finished) return;
                    finished = true;
                    m._isRecording = false;

                    try { source.disconnect(); } catch (_) {}
                    try { recorderNode.disconnect(); } catch (_) {}
                    try { zeroGain.disconnect(); } catch (_) {}
                    try { stream.getTracks().forEach(t => t.stop()); } catch (_) {}

                    if (cancelOnly || capturedOffset < Math.floor(sRate * 0.05)) {
                        ctx.reRenderModal?.();
                        ctx.showToast?.('RECORDING CANCELLED');
                        return;
                    }

                    const finalBuf = new Float32Array(capturedOffset);
                    finalBuf.set(captured.subarray(0, capturedOffset));

                    // Peak normalize to 0.95
                    let maxPeak = 0;
                    for (let i = 0; i < finalBuf.length; i++) {
                        const abs = Math.abs(finalBuf[i]);
                        if (abs > maxPeak) maxPeak = abs;
                    }
                    if (maxPeak > 0.001) {
                        const scale = 0.95 / maxPeak;
                        for (let i = 0; i < finalBuf.length; i++) finalBuf[i] *= scale;
                    }

                    m.name = recName;
                    m.duration = finalBuf.length / sRate;
                    m.sampleRate = sRate;
                    m.bpm = WaveCodec.detectBPM(finalBuf, sRate);
                    m.peaks = WaveCodec.extractPeaks(finalBuf, 64);
                    m._peaks = m.peaks;
                    m._buffer = finalBuf;

                    const inst = activeInst || this.getActiveInst(ctx, m);
                    inst?.setAudioBuffer?.(finalBuf, sRate);
                    inst?.update?.(audioCtx, inst, m);

                    this.propagateLinks(ctx);
                    redrawSvg?.();
                    ctx.reRenderModal?.();
                    cb?.();
                    ctx.showToast?.(`RECORDED: ${m.name} (${m.duration.toFixed(1)}s)`);

                    WaveCodec.encodeToOpusBase64(finalBuf, sRate, audioCtx).then(b64 => {
                        m.data = b64;
                        cb?.();
                    }).catch(() => {});
                }
            };
        } catch (err) {
            m._isRecording = false;
            ctx.reRenderModal?.();
            ctx.showToast?.(`MIC ERROR: ${(err?.message || String(err)).slice(0, 28)}`);
        }
    },

    renderModal(m, ctx) {
        const isLinked = Boolean(ctx?.patched?.has('link_in') || m._isLinked);
        m._isLinked = isLinked;
        const isRecording = Boolean(m._isRecording);
        if (!m.bpm && m._buffer?.length > 0) {
            m.bpm = WaveCodec.detectBPM(m._buffer, m.sampleRate || 48000);
        }

        const isStartPatched = Boolean(ctx?.patched?.has('start_cv'));
        const isEndPatched = Boolean(ctx?.patched?.has('end_cv'));
        const isSpeedPatched = Boolean(ctx?.patched?.has('speed_cv'));
        const isAnyRangePatched = Boolean(isStartPatched || isEndPatched);
        const lockActive = Boolean(m.rangeLock) && !isAnyRangePatched;
        const pitchActive = Boolean(m.pitchMode);
        const semiActive = Boolean(m.semiMode);

        const curState = this.getActiveInst(ctx, m)?.read?.();
        const curPlayhead = curState?.playhead ?? 0.0;
        const curIsPlaying = Boolean(curState?.isPlaying);
        const rawS = isStartPatched ? (curState?.rawStart ?? m.start ?? 0.0) : (m.start ?? 0.0);
        const rawE = isEndPatched ? (curState?.rawEnd ?? m.end ?? 1.0) : (m.end ?? 1.0);

        const bounds = WaveView.resolveEffectiveBounds(m, rawS, rawE);
        const startDisp = WaveView.formatBoundDisp(m, bounds.rawStart, bounds.effStart, isStartPatched);
        const endDisp = WaveView.formatBoundDisp(m, bounds.rawEnd, bounds.effEnd, isEndPatched);
        const rawSpeedCv = m.speedCv !== undefined ? m.speedCv : Math.log2(m.speed || 1.0);
        const semiInt = Math.max(-24, Math.min(24, Math.round(rawSpeedCv * 12)));
        const speedCvVal = semiActive ? (semiInt / 12) : rawSpeedCv;
        const speedDisp = isSpeedPatched ? 'EXT' : (semiActive ? WaveView.formatSemi(semiInt) : (pitchActive ? WaveView.formatPitch(speedCvVal) : WaveView.formatSpeed(speedCvVal)));
        const durStr = `${(m.duration ?? 1.5).toFixed(2)}s`;
        const loopActive = Boolean(m.loop);
        const retriggerActive = m.retrigger !== false;

        const chopBtnCls = (mode) =>
            `px-1.5 py-0.5 rounded border ${(m.chopMode ?? 'off') === mode ? 'bg-amber-950 text-amber-300 border-amber-500 font-bold shadow-sm shadow-amber-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'} transition ${isLinked ? 'cursor-not-allowed' : 'cursor-pointer'}`;

        const ioDisabledCls = isLinked ? 'opacity-30 pointer-events-none cursor-not-allowed' : '';
        const ioDisabledAttr = isLinked ? 'disabled' : '';

        return `
            <div class="space-y-2 p-1 text-slate-200 w-full">
                <!-- Header / REC, File Loader & JSON I/O -->
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 gap-1 select-none">
                    <div class="flex items-center gap-1 overflow-hidden">
                        ${isLinked ? '<span class="px-1 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-300 text-[7px] font-mono font-bold shrink-0">LINKED</span>' : ''}
                        <span class="text-[9.5px] font-bold ${isLinked ? 'text-slate-300' : 'text-cyan-300'} truncate max-w-[105px]">${m.name || 'Wave 1'}</span>
                        <span id="wave-header-dur" class="text-[8px] font-mono text-slate-400 font-bold shrink-0">(${durStr})</span>
                    </div>
                    <div class="flex items-center gap-1 shrink-0 ${ioDisabledCls}">
                        <button id="wave-rec-btn" class="px-1.5 py-1 ${isRecording ? 'bg-red-600 hover:bg-red-500 border-red-400 text-white animate-pulse shadow-md shadow-red-600/40' : 'bg-red-950 hover:bg-red-900 border-red-500/70 text-red-200'} border rounded text-[8px] font-bold cursor-pointer transition shadow-sm flex items-center gap-0.5 shrink-0" title="${isRecording ? '録音を停止' : 'マイクからダイレクト録音 (最大16秒)'}" ${ioDisabledAttr}>
                            <i data-lucide="${isRecording ? 'square' : 'mic'}" class="w-2.5 h-2.5 pointer-events-none"></i>
                            <span>${isRecording ? 'STOP' : 'REC'}</span>
                        </button>
                        <label class="px-1.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/70 text-cyan-200 rounded text-[8px] font-bold cursor-pointer transition shadow-sm flex items-center gap-0.5 shrink-0" title="音声/動画ファイルを読み込む">
                            <i data-lucide="folder-open" class="w-2.5 h-2.5"></i>
                            <span>LOAD</span>
                            <input type="file" id="wave-file-input" accept="audio/*, video/mp4, video/*" class="hidden" ${ioDisabledAttr}>
                        </label>
                        <button id="wave-json-export-btn" class="px-1.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 rounded text-[8px] font-bold cursor-pointer transition shadow-sm flex items-center gap-0.5 shrink-0" title="WAVEデータをJSONテキストとしてエクスポート" ${ioDisabledAttr}>
                            <i data-lucide="upload" class="w-2.5 h-2.5 pointer-events-none"></i>
                            <span>EXP</span>
                        </button>
                        <button id="wave-json-import-btn" class="px-1.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 rounded text-[8px] font-bold cursor-pointer transition shadow-sm flex items-center gap-0.5 shrink-0" title="JSONテキストからWAVEデータをインポート" ${ioDisabledAttr}>
                            <i data-lucide="download" class="w-2.5 h-2.5 pointer-events-none"></i>
                            <span>IMP</span>
                        </button>
                    </div>
                </div>

                <!-- Oscilloscope-sized Waveform Display -->
                <div id="wave-waveform-wrap" class="w-full">
                    ${WaveView.renderWaveformSVG(m, curPlayhead, curIsPlaying, bounds.effStart, bounds.effEnd, bounds.rawStart, bounds.rawEnd)}
                </div>

                <!-- Unified Controls: PLAY/LOOP/RETRIG (Left) + SPEED Slider (Center) + CHOP & SNAP (Right) -->
                <div class="flex items-center justify-between gap-1.5 px-2 py-1.5 bg-slate-950/70 rounded-xl border border-slate-800 text-[8.5px]">
                    <!-- Left: Playback controls (Text on top, Small buttons on bottom) -->
                    <div class="flex items-center gap-1 shrink-0">
                        <div class="flex flex-col items-center gap-1">
                            <span class="text-[7px] font-mono font-bold leading-tight text-slate-400">PLAY</span>
                            <button id="wave-play-btn" class="h-5 w-6 rounded ${curIsPlaying ? 'bg-red-600 hover:bg-red-500' : 'bg-cyan-600 hover:bg-cyan-500'} text-white font-bold transition flex items-center justify-center shadow-sm active:scale-95 cursor-pointer shrink-0" title="PLAY / STOP">
                                <i id="wave-play-icon" data-lucide="${curIsPlaying ? 'square' : 'play'}" class="w-3 h-3"></i>
                            </button>
                        </div>
                        <div class="flex flex-col items-center gap-1">
                            <span class="text-[7px] font-mono font-bold leading-tight text-slate-400">LOOP</span>
                            <button id="wave-loop-btn" class="h-5 w-6 rounded border ${loopActive ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'} font-bold transition flex items-center justify-center cursor-pointer shrink-0" title="LOOP (ループ再生 ON/OFF)">
                                <i data-lucide="repeat" class="w-3 h-3"></i>
                            </button>
                        </div>
                        <div class="flex flex-col items-center gap-1">
                            <span class="text-[7px] font-mono font-bold leading-tight text-slate-400">RETR</span>
                            <button id="wave-retrigger-btn" class="h-5 w-6 rounded border ${retriggerActive ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'} font-bold transition flex items-center justify-center cursor-pointer shrink-0" title="RETRIGGER (ON: 毎回先頭から再生 / OFF: 完走するまでトリガー無視)">
                                <i data-lucide="rotate-ccw" class="w-3 h-3"></i>
                            </button>
                        </div>
                    </div>

                    <div class="w-[1px] h-8 bg-slate-800 shrink-0"></div>

                    <!-- Center: SPEED & Pitch Mode / QTZ Quantize Slider (Two-tier) -->
                    <div class="flex-1 min-w-[105px] flex flex-col justify-center gap-1">
                        <!-- Top Text Area -->
                        <div class="flex items-center justify-between text-[8px] font-mono font-bold leading-tight">
                            <div class="flex items-center gap-1">
                                <button id="wave-pitch-mode-btn" class="px-1.5 py-0.5 rounded border ${pitchActive ? 'bg-purple-950 text-purple-300 border-purple-500 shadow-sm shadow-purple-500/20' : 'bg-slate-900 text-cyan-400 border-slate-700 hover:border-cyan-500/60'} text-[7.5px] font-mono font-bold transition cursor-pointer leading-none" title="クリックでモード切替: normal (再生速度＆ピッチ連動) ⇔ PITCH (WSOLA位相合わせグレイン・再生時間固定)">
                                    ${pitchActive ? 'PITCH' : 'normal'}
                                </button>
                                <button id="wave-semi-mode-btn" class="px-1.5 py-0.5 rounded border ${semiActive ? 'bg-amber-950 text-amber-300 border-amber-500 shadow-sm shadow-amber-500/20' : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-amber-500/60'} text-[7.5px] font-mono font-bold transition cursor-pointer leading-none" title="クオンタイズ (ON: 半音=1/12oct単位でステップ調整 / OFF: 無段階調整)">
                                    QTZ
                                </button>
                            </div>
                            <span id="wave-slider-speed-disp" class="${semiActive ? 'text-amber-300' : (pitchActive ? 'text-purple-300' : 'text-cyan-300')} font-mono text-[8.5px] ${isSpeedPatched ? 'opacity-40 pointer-events-none' : 'cursor-ns-resize hover:bg-slate-800/80'} px-1 rounded leading-none">${speedDisp}</span>
                        </div>
                        <!-- Bottom Slider Area -->
                        <div class="${isSpeedPatched ? 'opacity-30 pointer-events-none' : ''} flex flex-col gap-0.5">
                            <input type="range" id="wave-slider-speed" min="${semiActive ? -24 : -2.0}" max="${semiActive ? 24 : 2.0}" step="${semiActive ? 1 : 0.05}" value="${semiActive ? semiInt : speedCvVal}" class="w-full h-1.5 bg-slate-800 rounded-lg ${semiActive ? 'accent-amber-400' : (pitchActive ? 'accent-purple-400' : 'accent-cyan-400')} cursor-pointer" ${isSpeedPatched ? 'disabled' : ''} title="${semiActive ? '半音ステップ (-24semi 〜 +24semi / 1/12oct刻み)' : (pitchActive ? 'ピッチシフト (-24st 〜 +24st / 再生時間固定)' : '再生速度 (/4, /2, x1, x2, x4)')}">
                            <div class="flex justify-between px-0.5 text-[6.5px] font-mono text-slate-500 font-bold select-none pointer-events-none -mt-0.5">
                                ${semiActive
                                    ? '<span>-24</span><span>-12</span><span class="text-amber-400">0semi</span><span>+12</span><span>+24</span>'
                                    : (pitchActive
                                        ? '<span>-24</span><span>-12</span><span class="text-purple-400">0st</span><span>+12</span><span>+24</span>'
                                        : '<span>/4</span><span>/2</span><span class="text-cyan-400">x1</span><span>x2</span><span>x4</span>')}
                            </div>
                        </div>
                    </div>

                    <div class="w-[1px] h-8 bg-slate-800 shrink-0"></div>

                    <!-- Right: CHOP & SNAP Controls (Text on top, Buttons on bottom) -->
                    <div class="flex flex-col justify-center gap-1 shrink-0 ${isLinked ? 'opacity-30 pointer-events-none' : ''}">
                        <!-- Top Text Area -->
                        <div class="flex items-center justify-between text-[7px] font-mono font-bold leading-tight px-0.5">
                            <span class="text-amber-400">CHOP</span>
                            <span class="text-slate-400">SNAP</span>
                        </div>
                        <!-- Bottom Button Area -->
                        <div class="flex items-center gap-1">
                            <div class="flex items-center gap-0.5">
                                <button id="wave-chop-off" class="${chopBtnCls('off')}" ${ioDisabledAttr}>—</button>
                                <button id="wave-chop-4" class="${chopBtnCls('4')}" ${ioDisabledAttr}>4</button>
                                <button id="wave-chop-8" class="${chopBtnCls('8')}" ${ioDisabledAttr}>8</button>
                                <button id="wave-chop-16" class="${chopBtnCls('16')}" ${ioDisabledAttr}>16</button>
                            </div>
                            <div class="w-px h-5 bg-slate-800 mx-0.5"></div>
                            <button id="wave-snap-btn" class="px-1.5 py-0.5 rounded border ${m.snapMode ? 'bg-emerald-950 text-emerald-300 border-emerald-500 font-bold shadow-sm shadow-emerald-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'} transition cursor-pointer font-bold text-[7.5px]">
                                ${m.snapMode ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Row 2: START, Center TIME LOCK, & END Sliders -->
                <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-950/70 rounded-xl border border-slate-800 shadow-sm">
                    <div class="flex-1 min-w-0 flex flex-col gap-0.5 ${isStartPatched ? 'opacity-30 pointer-events-none' : ''}">
                        <div class="flex items-center justify-between gap-1 text-[8px] font-mono font-bold leading-tight whitespace-nowrap overflow-hidden">
                            <span class="text-[8.5px] text-emerald-400 shrink-0">START</span>
                            <span id="wave-slider-start-disp" class="text-emerald-300 font-mono text-[8px] font-bold cursor-ns-resize hover:bg-slate-800/80 px-1 py-0.5 rounded leading-none truncate">${startDisp}</span>
                        </div>
                        <input type="range" id="wave-slider-start" min="0.0" max="1.0" step="0.005" value="${m.start ?? 0.0}" class="w-full h-2.5 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer" ${isStartPatched ? 'disabled' : ''} title="開始CV位置 (0%〜100%)">
                    </div>

                    <button id="wave-range-lock-btn" class="h-6 w-6 rounded-lg border ${lockActive ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'} transition flex items-center justify-center shrink-0 ${isAnyRangePatched ? 'opacity-30 pointer-events-none cursor-not-allowed' : 'cursor-pointer active:scale-95'}" ${isAnyRangePatched ? 'disabled' : ''} title="TIME LOCK (START/END CV差分ロック)">
                        <i data-lucide="${lockActive ? 'lock' : 'unlock'}" class="w-3 h-3 pointer-events-none"></i>
                    </button>

                    <div class="flex-1 min-w-0 flex flex-col gap-0.5 ${isEndPatched ? 'opacity-30 pointer-events-none' : ''}">
                        <div class="flex items-center justify-between gap-1 text-[8px] font-mono font-bold leading-tight whitespace-nowrap overflow-hidden">
                            <span class="text-[8.5px] text-emerald-400 shrink-0">END</span>
                            <span id="wave-slider-end-disp" class="text-emerald-300 font-mono text-[8px] font-bold cursor-ns-resize hover:bg-slate-800/80 px-1 py-0.5 rounded leading-none truncate">${endDisp}</span>
                        </div>
                        <input type="range" id="wave-slider-end" min="0.0" max="1.0" step="0.005" value="${m.end ?? 1.0}" class="w-full h-2.5 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer" ${isEndPatched ? 'disabled' : ''} title="終了CV位置 (0%〜100%)">
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents(m, ctx, onChange) {
        const root = ctx.getDialogElement?.() || document;
        const cb = typeof onChange === 'function' ? onChange : () => {};
        const svgWrap = root.querySelector('#wave-waveform-wrap');

        const isLinked = Boolean(ctx?.patched?.has('link_in') || m._isLinked);
        m._isLinked = isLinked;
        const isStartPatched = Boolean(ctx?.patched?.has('start_cv'));
        const isEndPatched = Boolean(ctx?.patched?.has('end_cv'));
        const isSpeedPatched = Boolean(ctx?.patched?.has('speed_cv'));
        const isAnyRangePatched = isStartPatched || isEndPatched;

        if (m._lockDelta === undefined) m._lockDelta = (m.end ?? 1.0) - (m.start ?? 0.0);
        if (window.lucide?.createIcons) { try { window.lucide.createIcons({ root }); } catch (_) {} }

        const redrawSvg = () => {
            const liveRoot = ctx.getDialogElement?.() || document;
            const liveWrap = liveRoot.querySelector('#wave-waveform-wrap') || svgWrap;
            const durEl = liveRoot.querySelector('#wave-header-dur');
            if (durEl) durEl.textContent = `(${(m.duration ?? 1.5).toFixed(2)}s)`;
            const st = this.getActiveInst(ctx, m)?.read?.();
            const rawS = isStartPatched ? (st?.rawStart ?? m.start ?? 0.0) : (m.start ?? 0.0);
            const rawE = isEndPatched ? (st?.rawEnd ?? m.end ?? 1.0) : (m.end ?? 1.0);
            const bounds = WaveView.resolveEffectiveBounds(m, rawS, rawE);
            if (liveWrap) {
                liveWrap.innerHTML = WaveView.renderWaveformSVG(m, st?.playhead ?? 0.0, Boolean(st?.isPlaying), bounds.effStart, bounds.effEnd, bounds.rawStart, bounds.rawEnd);
            }
        };

        // Ensure PCM buffer is loaded into AudioWorklet
        const initialInst = this.getActiveInst(ctx, m);
        if (m._buffer && initialInst?.setAudioBuffer) {
            if (!m.bpm) m.bpm = WaveCodec.detectBPM(m._buffer, m.sampleRate || 48000);
            initialInst.setAudioBuffer(m._buffer, m.sampleRate || 48000);
        } else if (m.data && (!m.peaks?.length || !m._buffer)) {
            const synth = ctx?.synth || window.__GS_SYNTH__;
            WaveCodec.decodeFromBase64(m.data, synth?.ctx).then(res => {
                if (res?.buffer) {
                    m._buffer = res.buffer;
                    m.duration = res.duration;
                    m.sampleRate = res.sampleRate;
                    m.bpm = res.bpm || WaveCodec.detectBPM(res.buffer, res.sampleRate);
                    if (!m.peaks?.length) m.peaks = WaveCodec.extractPeaks(res.buffer, 64);
                    m._peaks = m.peaks;
                    this.getActiveInst(ctx, m)?.setAudioBuffer?.(res.buffer, res.sampleRate);
                    this.propagateLinks(ctx);
                    redrawSvg();
                    cb();
                }
            }).catch(() => {});
        }

        const syncRangeAndAudio = () => {
            const activeInst = this.getActiveInst(ctx, m);
            const st = activeInst?.read?.();
            WaveView.syncModalDOM(root, m, {
                playhead: st?.playhead ?? 0.0,
                isPlaying: Boolean(st?.isPlaying),
                startPatched: isStartPatched,
                endPatched: isEndPatched
            });
            const synth = ctx?.synth || window.__GS_SYNTH__;
            activeInst?.update?.(synth?.ctx, activeInst, m);
            cb();
        };

        // Direct Mic Recording
        root.querySelector('#wave-rec-btn')?.addEventListener('click', () => {
            if (isLinked) return;
            this.toggleMicRecording(m, ctx, cb, redrawSvg);
        });

        // File Input
        const fileInput = root.querySelector('#wave-file-input');
        fileInput?.addEventListener('click', (e) => {
            if (isLinked) { e.preventDefault(); return; }
            this.ensureSynthReady(ctx, m).catch(() => {});
        });
        fileInput?.addEventListener('change', async (e) => {
            if (isLinked) return;
            const file = e.target.files?.[0];
            if (!file) return;
            try {
                ctx.showToast?.('DECODING AUDIO / MP4...');
                const activeInst = await this.ensureSynthReady(ctx, m);
                const synth = ctx?.synth || window.__GS_SYNTH__;
                const res = await WaveCodec.loadAudioFromFile(file, synth?.ctx || null);

                m.name = file.name.replace(/\.[^/.]+$/, '').slice(0, 24);
                m.duration = res.duration;
                m.sampleRate = res.sampleRate;
                m.bpm = res.bpm || WaveCodec.detectBPM(res.buffer, res.sampleRate);
                m.peaks = WaveCodec.extractPeaks(res.buffer, 64);
                m._peaks = m.peaks;
                m._buffer = res.buffer;
                (activeInst || this.getActiveInst(ctx, m))?.setAudioBuffer?.(res.buffer, res.sampleRate);

                this.propagateLinks(ctx);
                redrawSvg();
                ctx.reRenderModal?.();
                cb();
                ctx.showToast?.(`LOADED: ${res.duration.toFixed(1)}s`);

                WaveCodec.encodeToOpusBase64(res.buffer, res.sampleRate, synth?.ctx).then(b64 => {
                    m.data = b64;
                    cb();
                }).catch(() => {});
            } catch (err) {
                ctx.showToast?.(`LOAD FAILED: ${(err?.message || String(err)).slice(0, 32)}`);
            } finally {
                fileInput.value = '';
            }
        });

        // JSON Export / Import
        root.querySelector('#wave-json-export-btn')?.addEventListener('click', () => {
            if (isLinked) return;
            this.openWaveExport(m, ctx, cb);
        });
        root.querySelector('#wave-json-import-btn')?.addEventListener('click', () => {
            if (isLinked) return;
            this.openWaveImport(m, ctx, cb, redrawSvg);
        });

        // Play / Stop
        const playBtn = root.querySelector('#wave-play-btn');
        playBtn?.addEventListener('click', async () => {
            const activeInst = await this.ensureSynthReady(ctx, m);
            if (!activeInst) { ctx.showToast?.('ENGINE NOT READY'); return; }
            if (m._buffer && activeInst.setAudioBuffer) activeInst.setAudioBuffer(m._buffer, m.sampleRate || 48000);

            const peaks = m._peaks || m.peaks || [];
            if (!peaks.some(p => p > 0.005) && !(m._buffer?.length > 0)) {
                ctx.showToast?.('NO AUDIO LOADED (PLEASE LOAD FILE)');
                return;
            }
            const st = activeInst.read?.();
            if (st?.isPlaying) activeInst.stop?.();
            else activeInst.testPlay?.();
            WaveView.syncModalDOM(root, m, { playhead: m.start ?? 0.0, isPlaying: !st?.isPlaying, startPatched: isStartPatched, endPatched: isEndPatched });
        });

        // Loop & Retrigger
        const toggleBtnCls = (on) => `h-6 w-7 rounded border ${on ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'} font-bold transition flex items-center justify-center cursor-pointer shrink-0`;
        root.querySelector('#wave-loop-btn')?.addEventListener('click', (e) => {
            m.loop = !m.loop;
            e.currentTarget.className = toggleBtnCls(m.loop);
            syncRangeAndAudio();
        });
        root.querySelector('#wave-retrigger-btn')?.addEventListener('click', (e) => {
            m.retrigger = !(m.retrigger !== false);
            e.currentTarget.className = toggleBtnCls(m.retrigger !== false);
            syncRangeAndAudio();
        });

        // CHOP & SNAP
        const setChop = (mode) => {
            if (isLinked) return;
            m.chopMode = mode;
            const n = mode === '4' ? 4 : mode === '8' ? 8 : mode === '16' ? 16 : 0;
            if (n > 0) {
                m.chops = Array.from({ length: n - 1 }, (_, i) => parseFloat(((i + 1) / n).toFixed(4)));
                m.snapMode = true;
                m.start = 0.0;
                m.end = 1 / n;
            } else {
                m.chopMode = 'off';
                m.chops = [];
                m.snapMode = false;
                m.start = 0.0;
                m.end = 1.0;
            }
            m._lockDelta = (m.end ?? 1.0) - (m.start ?? 0.0);
            syncRangeAndAudio();
            this.propagateLinks(ctx);
            ctx.reRenderModal?.();
        };
        ['off', '4', '8', '16'].forEach(mode => {
            root.querySelector(`#wave-chop-${mode}`)?.addEventListener('click', () => setChop(mode));
        });
        root.querySelector('#wave-snap-btn')?.addEventListener('click', () => {
            m.snapMode = !m.snapMode;
            syncRangeAndAudio();
            ctx.reRenderModal?.();
        });

        // SVG Click to select slice or move locked CV window
        svgWrap?.addEventListener('click', (e) => {
            if (isAnyRangePatched) return;
            const svgEl = svgWrap.querySelector('#wave-waveform-svg');
            if (!svgEl) return;
            const rect = svgEl.getBoundingClientRect();
            const normX = ((e.clientX - rect.left) / rect.width) * WaveView.W;
            const pct = Math.max(0.0, Math.min(1.0, (normX - WaveView.PAD_X) / WaveView.INNER_W));

            if (m.rangeLock) {
                const delta = m._lockDelta ?? ((m.end ?? 1.0) - (m.start ?? 0.0));
                let targetStart = pct;
                if (m.snapMode && m.chops?.length > 0) {
                    const allPts = [0.0, ...m.chops, 1.0].sort((a, b) => a - b);
                    const N = allPts.length - 1;
                    targetStart = allPts[Math.min(N - 1, Math.max(0, Math.floor(Math.min(0.999999, pct) * N)))];
                }
                const clampedStart = Math.max(Math.max(0.0, -delta), Math.min(Math.min(1.0, 1.0 - delta), targetStart));
                m.start = parseFloat(clampedStart.toFixed(4));
                m.end = parseFloat(Math.max(0.0, Math.min(1.0, clampedStart + delta)).toFixed(4));
                syncRangeAndAudio();
            } else if (m.chops?.length > 0) {
                const allPts = [0.0, ...m.chops, 1.0].sort((a, b) => a - b);
                const idx = Math.max(0, allPts.findIndex((p, i) => i < allPts.length - 1 && pct >= p && (i === allPts.length - 2 || pct < allPts[i + 1])));
                m.start = allPts[idx];
                m.end = allPts[idx + 1];
                m._lockDelta = m.end - m.start;
                syncRangeAndAudio();
            }
        });

        // Center Time Lock Button
        const lockBtn = root.querySelector('#wave-range-lock-btn');
        if (lockBtn && !isAnyRangePatched) {
            lockBtn.addEventListener('click', () => {
                m.rangeLock = !m.rangeLock;
                m._lockDelta = (m.end ?? 1.0) - (m.start ?? 0.0);
                const on = Boolean(m.rangeLock);
                lockBtn.className = `h-6 w-6 rounded-lg border ${on ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'} transition flex items-center justify-center shrink-0 cursor-pointer active:scale-95`;
                lockBtn.innerHTML = `<i data-lucide="${on ? 'lock' : 'unlock'}" class="w-3 h-3 pointer-events-none"></i>`;
                if (window.lucide) window.lucide.createIcons({ root: lockBtn });
                cb();
            });
        }

        // Unified Start / End / Speed Sliders
        const applyRangeCv = (side, v) => {
            const rawV = Math.max(0.0, Math.min(1.0, v));
            const delta = m._lockDelta ?? ((m.end ?? 1.0) - (m.start ?? 0.0));
            if (side === 'start') {
                if (m.rangeLock && !isEndPatched) {
                    const clamped = Math.max(Math.max(0.0, -delta), Math.min(Math.min(1.0, 1.0 - delta), rawV));
                    m.start = parseFloat(clamped.toFixed(4));
                    m.end = parseFloat(Math.max(0.0, Math.min(1.0, clamped + delta)).toFixed(4));
                } else {
                    m.start = parseFloat(rawV.toFixed(4));
                    m._lockDelta = (m.end ?? 1.0) - m.start;
                }
            } else {
                if (m.rangeLock && !isStartPatched) {
                    const clamped = Math.max(Math.max(0.0, delta), Math.min(Math.min(1.0, 1.0 + delta), rawV));
                    m.end = parseFloat(clamped.toFixed(4));
                    m.start = parseFloat(Math.max(0.0, Math.min(1.0, clamped - delta)).toFixed(4));
                } else {
                    m.end = parseFloat(rawV.toFixed(4));
                    m._lockDelta = m.end - (m.start ?? 0.0);
                }
            }
            syncRangeAndAudio();
        };

        root.querySelector('#wave-pitch-mode-btn')?.addEventListener('click', () => {
            m.pitchMode = !m.pitchMode;
            syncRangeAndAudio();
            ctx.reRenderModal?.();
        });

        root.querySelector('#wave-semi-mode-btn')?.addEventListener('click', () => {
            m.semiMode = !m.semiMode;
            if (m.semiMode) {
                const curCv = m.speedCv !== undefined ? m.speedCv : Math.log2(m.speed || 1.0);
                const snappedSemi = Math.max(-24, Math.min(24, Math.round(curCv * 12)));
                m.speedCv = snappedSemi / 12.0;
                m.speed = Math.pow(2.0, m.speedCv);
            }
            syncRangeAndAudio();
            ctx.reRenderModal?.();
        });

        if (!isStartPatched) {
            UIHelpers.bindSlider('wave-slider-start', v => {
                const b = WaveView.resolveEffectiveBounds(m, Math.max(0, Math.min(1, v)), m.end ?? 1.0);
                return WaveView.formatBoundDisp(m, b.rawStart, b.effStart, false);
            }, v => applyRangeCv('start', v), 1, 0.0, 1.0);
        }
        if (!isEndPatched) {
            UIHelpers.bindSlider('wave-slider-end', v => {
                const b = WaveView.resolveEffectiveBounds(m, m.start ?? 0.0, Math.max(0, Math.min(1, v)));
                return WaveView.formatBoundDisp(m, b.rawEnd, b.effEnd, false);
            }, v => applyRangeCv('end', v), 1, 0.0, 1.0);
        }
        if (!isSpeedPatched) {
            if (m.semiMode) {
                UIHelpers.bindSlider('wave-slider-speed', s => WaveView.formatSemi(s), s => {
                    const snapped = Math.max(-24, Math.min(24, Math.round(s)));
                    m.speedCv = snapped / 12.0;
                    m.speed = Math.pow(2.0, m.speedCv);
                    syncRangeAndAudio();
                }, 1, -24, 24);
            } else {
                UIHelpers.bindSlider('wave-slider-speed', v => m.pitchMode ? WaveView.formatPitch(v) : WaveView.formatSpeed(v), v => {
                    m.speedCv = v;
                    m.speed = Math.pow(2.0, v);
                    syncRangeAndAudio();
                }, 1, -2.0, 2.0);
            }
        }
    }
};

export default WaveModal;


