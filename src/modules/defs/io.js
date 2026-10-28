import { UIHelpers } from '../../ui/helpers.js?v=297';

let spkRecState = {
    isRecording: false,
    startTime: 0,
    maxDuration: 16.0,
    timerId: null,
    recorder: null,
    audioChunks: [],
    lastBlob: null,
    lastUrl: null,
    lastBase64: null,
    previewAudio: null,
    lastFileName: null
};

function downloadRecording(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 1000);
}

function startSpkRecording(m, ui, updateUI) {
    if (spkRecState.isRecording) return;
    const synth = ui?.synth || window.__GS_SYNTH__;
    if (!synth || !synth.ctx) {
        ui?.showToast('オーディオが起動していません');
        return;
    }
    const fullId = synth.modules[m.id] ? m.id : `0/${m.id}`;
    const inst = synth.modules[fullId] || synth.modules[m.id];
    const stream = inst?.getMediaStream?.();
    if (!stream) {
        ui?.showToast('録音ストリームを取得できません');
        return;
    }

    let mimeType = 'audio/webm;codecs=opus';
    if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
                       (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
        }
    } else {
        mimeType = '';
    }

    try {
        const options = { audioBitsPerSecond: 24000 };
        if (mimeType) options.mimeType = mimeType;
        const recorder = new MediaRecorder(stream, options);
        spkRecState.recorder = recorder;
        spkRecState.audioChunks = [];
        spkRecState.isRecording = true;
        spkRecState.startTime = Date.now();

        recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                spkRecState.audioChunks.push(e.data);
            }
        };

        recorder.onstop = () => {
            const actualType = recorder.mimeType || mimeType || 'audio/webm';
            const blob = new Blob(spkRecState.audioChunks, { type: actualType });
            spkRecState.lastBlob = blob;
            if (spkRecState.lastUrl) URL.revokeObjectURL(spkRecState.lastUrl);
            spkRecState.lastUrl = URL.createObjectURL(blob);
            spkRecState.isRecording = false;
            clearInterval(spkRecState.timerId);
            spkRecState.timerId = null;

            const ext = actualType.includes('mp4') ? 'mp4' : 'webm';
            const d = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
            spkRecState.lastFileName = `GridSynth_REC_${dateStr}_24k.${ext}`;

            // 自動保存（スマホのDownloadフォルダ直下に格納）
            downloadRecording(blob, spkRecState.lastFileName);

            // Base64 生成
            const reader = new FileReader();
            reader.onloadend = () => {
                spkRecState.lastBase64 = reader.result;
            };
            reader.readAsDataURL(blob);

            const sizeKb = Math.round(blob.size / 1024);
            ui?.showToast(`REC保存完了 (${sizeKb}KB / Opus 24k)`);
            updateUI();
        };

        recorder.start(100);

        spkRecState.timerId = setInterval(() => {
            const elapsed = (Date.now() - spkRecState.startTime) / 1000;
            if (elapsed >= spkRecState.maxDuration) {
                stopSpkRecording();
            } else {
                updateUI();
            }
        }, 100);

        updateUI();
    } catch (err) {
        console.error('REC error:', err);
        ui?.showToast('録音開始エラー: ' + err.message);
        spkRecState.isRecording = false;
    }
}

function stopSpkRecording() {
    if (!spkRecState.isRecording || !spkRecState.recorder) return;
    if (spkRecState.recorder.state !== 'inactive') {
        spkRecState.recorder.stop();
    }
    clearInterval(spkRecState.timerId);
    spkRecState.timerId = null;
    spkRecState.isRecording = false;
}

function copyBase64(ui) {
    if (!spkRecState.lastBase64) {
        ui?.showToast('録音データがありません');
        return;
    }
    if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(spkRecState.lastBase64).then(() => {
            ui?.showToast('Base64をコピーしました（AI貼付用）');
        }).catch(() => fallbackCopy(ui));
    } else {
        fallbackCopy(ui);
    }
}

function fallbackCopy(ui) {
    const ta = document.createElement('textarea');
    ta.value = spkRecState.lastBase64;
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        ui?.showToast('Base64をコピーしました（AI貼付用）');
    } catch (_) {
        ui?.showToast('コピーできませんでした');
    }
    document.body.removeChild(ta);
}

function togglePreviewPlay(btn) {
    if (!spkRecState.lastUrl) return;
    if (spkRecState.previewAudio && !spkRecState.previewAudio.paused) {
        spkRecState.previewAudio.pause();
        spkRecState.previewAudio.currentTime = 0;
        if (btn) btn.innerHTML = '▶ PLAY';
    } else {
        if (!spkRecState.previewAudio) {
            spkRecState.previewAudio = new Audio();
            spkRecState.previewAudio.onended = () => {
                if (btn) btn.innerHTML = '▶ PLAY';
            };
        }
        spkRecState.previewAudio.src = spkRecState.lastUrl;
        spkRecState.previewAudio.play().catch(() => {});
        if (btn) btn.innerHTML = '⏹ STOP';
    }
}

export const SPK = {
    color: 'amber',
    defaults: () => ({ type: 'SPK', masterVol: 0.12 }),
    ports: () => ({
        in: [
            { port: 'wave_in_l', pin: 5, color: 'bg-blue-500' },
            { port: 'wave_in_r', pin: 6, color: 'bg-blue-500' }
        ],
        out: []
    }),
    schema: { color: 'amber', sliders: [{ key: 'masterVol', label: 'MASTER', min: 0, max: 0.5, step: 0.01, default: 0.12, unit: 'vol', format: v => Math.round(v * 100) + '%' }] },
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => `<div class="relative flex items-center justify-center w-full h-full pointer-events-none text-cyan-400">
        ${UIHelpers.renderPanelBars([
            {
                pct: 0,
                innerCls: 'spk-meter-l transition-all duration-75',
                width: 'w-2.5'
            },
            {
                pct: 0,
                innerCls: 'spk-meter-r transition-all duration-75',
                width: 'w-2.5'
            }
        ], { heightCls: 'h-7', gapCls: 'gap-1.5' })}
        <span class="spk-vol-val absolute bottom-[11px] left-1/2 -translate-x-1/2 text-[7.5px] font-mono font-bold text-cyan-300 bg-slate-950/85 px-1 py-[0.5px] rounded border border-slate-700/80 leading-none shadow-sm select-none">${Math.round((m.masterVol??0.12)*100)}%</span>
    </div>`,
    renderModal: (m, ctx) => {
        const isRec = spkRecState.isRecording;
        const elapsed = isRec ? (Date.now() - spkRecState.startTime) / 1000 : 0;
        const remain = Math.max(0, 16.0 - elapsed).toFixed(1);
        const pct = isRec ? Math.min(100, (elapsed / 16.0) * 100).toFixed(1) : (spkRecState.lastBlob ? 100 : 0);
        const hasRec = Boolean(spkRecState.lastBlob);
        const sizeKb = hasRec ? Math.round(spkRecState.lastBlob.size / 1024) : 0;

        return `
        <div class="space-y-3 p-1">
            <!-- 1. Master Volume Slider from Schema -->
            ${UIHelpers.renderSchemaModal(m, ctx, SPK.schema)}

            <!-- 2. AI Feedback Opus Recorder Section -->
            <div class="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/90 space-y-2 select-none">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800/80">
                    <span class="text-[9px] font-bold text-amber-400 font-mono tracking-wider flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full ${isRec ? 'bg-red-500 animate-ping' : 'bg-red-500/70'}"></span>
                        AI RECORDER (Opus 24k / 16s)
                    </span>
                    <span id="spk-rec-timer-txt" class="text-[10px] font-mono font-bold ${isRec ? 'text-red-400 font-extrabold animate-pulse' : 'text-slate-400'}">
                        ${isRec ? `${remain}s` : (hasRec ? `DONE (${sizeKb}KB)` : '16.0s')}
                    </span>
                </div>

                <!-- Progress Bar -->
                <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div id="spk-rec-bar" class="h-full bg-red-500 transition-all duration-100" style="width: ${pct}%;"></div>
                </div>

                <!-- Start / Stop Button -->
                <button id="spk-rec-btn" class="w-full py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${isRec ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-500/40'}">
                    <span class="w-2 h-2 rounded-full bg-red-500"></span>
                    <span>${isRec ? `STOP REC (${remain}s)` : '● START REC (16s)'}</span>
                </button>

                <!-- Action Toolbar after Recording -->
                <div id="spk-rec-actions-box" class="${hasRec ? 'flex' : 'hidden'} items-center gap-1.5 pt-1 border-t border-slate-800/60">
                    <button id="spk-rec-play-btn" class="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[9px] font-bold flex items-center justify-center gap-1 border border-slate-700 cursor-pointer">
                        ▶ PLAY
                    </button>
                    <button id="spk-rec-dl-btn" class="flex-1 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-300 rounded text-[9px] font-bold flex items-center justify-center gap-1 border border-amber-500/50 cursor-pointer" title="スマホのDownloadフォルダに再保存">
                        💾 SAVE
                    </button>
                    <button id="spk-rec-copy-btn" class="flex-1 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 rounded text-[9px] font-bold flex items-center justify-center gap-1 border border-cyan-500/50 cursor-pointer" title="AIチャット貼付用のBase64文字列をコピー">
                        📋 BASE64
                    </button>
                </div>
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        // 1. Bind Master Volume Slider
        UIHelpers.bindSchemaEvents(m, ctx, SPK.schema, onChange);

        // 2. Bind Recorder Controls
        const updateUI = () => {
            const isRec = spkRecState.isRecording;
            const elapsed = isRec ? (Date.now() - spkRecState.startTime) / 1000 : 0;
            const remain = Math.max(0, 16.0 - elapsed).toFixed(1);
            const pct = isRec ? Math.min(100, (elapsed / 16.0) * 100).toFixed(1) : (spkRecState.lastBlob ? 100 : 0);
            const hasRec = Boolean(spkRecState.lastBlob);
            const sizeKb = hasRec ? Math.round(spkRecState.lastBlob.size / 1024) : 0;

            const timerTxt = document.getElementById('spk-rec-timer-txt');
            if (timerTxt) {
                timerTxt.textContent = isRec ? `${remain}s` : (hasRec ? `DONE (${sizeKb}KB)` : '16.0s');
                timerTxt.className = `text-[10px] font-mono font-bold ${isRec ? 'text-red-400 font-extrabold animate-pulse' : 'text-slate-400'}`;
            }

            const bar = document.getElementById('spk-rec-bar');
            if (bar) bar.style.width = `${pct}%`;

            const btn = document.getElementById('spk-rec-btn');
            if (btn) {
                btn.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-500"></span><span>${isRec ? `STOP REC (${remain}s)` : '● START REC (16s)'}</span>`;
                btn.className = `w-full py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${isRec ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-500/40'}`;
            }

            const actBox = document.getElementById('spk-rec-actions-box');
            if (actBox) {
                actBox.className = `${hasRec ? 'flex' : 'hidden'} items-center gap-1.5 pt-1 border-t border-slate-800/60`;
            }
        };

        const recBtn = document.getElementById('spk-rec-btn');
        if (recBtn) {
            recBtn.onclick = () => {
                if (spkRecState.isRecording) {
                    stopSpkRecording();
                } else {
                    const ui = window.__GS_APP__;
                    startSpkRecording(m, ui, updateUI);
                }
            };
        }

        const dlBtn = document.getElementById('spk-rec-dl-btn');
        if (dlBtn) {
            dlBtn.onclick = () => {
                if (spkRecState.lastBlob && spkRecState.lastFileName) {
                    downloadRecording(spkRecState.lastBlob, spkRecState.lastFileName);
                }
            };
        }

        const copyBtn = document.getElementById('spk-rec-copy-btn');
        if (copyBtn) {
            copyBtn.onclick = () => {
                const ui = window.__GS_APP__;
                copyBase64(ui);
            };
        }

        const playBtn = document.getElementById('spk-rec-play-btn');
        if (playBtn) {
            playBtn.onclick = () => {
                togglePreviewPlay(playBtn);
            };
        }
    },
    updateLive: (cell, data, isP, modal, m) => {
        const barL = cell.querySelector('.spk-meter-l');
        const barR = cell.querySelector('.spk-meter-r');
        if (barL && data?.peakL !== undefined) {
            barL.style.height = `${Math.max(0, Math.min(100, Math.round(data.peakL * 200)))}%`;
        }
        if (barR && data?.peakR !== undefined) {
            barR.style.height = `${Math.max(0, Math.min(100, Math.round(data.peakR * 200)))}%`;
        }
        const volTxt = cell.querySelector('.spk-vol-val');
        if (volTxt && m) {
            volTxt.textContent = `${Math.round((m.masterVol ?? 0.12) * 100)}%`;
        }
    }
};

export const ioDefs = {
    SPK
};
