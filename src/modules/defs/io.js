import { UIHelpers } from '../../ui/helpers.js?v=297';

let spkRecState = {
    isRecording: false,
    startTime: 0,
    maxDuration: 16.0,
    timerId: null,
    recorder: null,
    audioChunks: [],
    lastBlob: null,
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
            spkRecState.isRecording = false;
            clearInterval(spkRecState.timerId);
            spkRecState.timerId = null;

            const ext = actualType.includes('mp4') ? 'mp4' : 'webm';
            const d = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
            spkRecState.lastFileName = `REC_${dateStr}_24k.${ext}`;

            // 自動保存（スマホのDownloadフォルダ直下に格納）
            downloadRecording(blob, spkRecState.lastFileName);

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
        }, 200);

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
        const remainInt = Math.ceil(Math.max(0, 16.0 - elapsed));
        const hasRec = Boolean(spkRecState.lastBlob);

        return `
        <div class="space-y-2 p-1 select-none">
            <!-- 1. Top Minimal REC Bar (Header-level) -->
            <div class="flex items-center gap-2.5 bg-slate-950/80 px-2 py-1.5 rounded-xl border border-slate-800/90">
                <button id="spk-rec-btn" class="h-6 px-3 rounded-lg font-mono font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${isRec ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-500/40'}">
                    <span class="w-1.5 h-1.5 rounded-full ${isRec ? 'bg-white' : 'bg-red-500'}"></span>
                    <span id="spk-rec-btn-lbl">${isRec ? remainInt : 'REC'}</span>
                </button>
                <span id="spk-rec-status-txt" class="text-[9px] font-mono ${isRec ? 'text-red-400 font-bold animate-pulse' : 'text-slate-500'}">
                    ${isRec ? 'RECORDING...' : (hasRec ? 'SAVED (24k)' : '16s / 24k')}
                </span>
            </div>

            <!-- 2. Master Volume Slider from Schema -->
            ${UIHelpers.renderSchemaModal(m, ctx, SPK.schema)}
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        // 1. Bind Master Volume Slider
        UIHelpers.bindSchemaEvents(m, ctx, SPK.schema, onChange);

        // 2. Bind Recorder Controls
        const updateUI = () => {
            const isRec = spkRecState.isRecording;
            const elapsed = isRec ? (Date.now() - spkRecState.startTime) / 1000 : 0;
            const remainInt = Math.ceil(Math.max(0, 16.0 - elapsed));
            const hasRec = Boolean(spkRecState.lastBlob);

            const btn = document.getElementById('spk-rec-btn');
            const lbl = document.getElementById('spk-rec-btn-lbl');
            if (btn && lbl) {
                lbl.textContent = isRec ? remainInt : 'REC';
                btn.className = `h-6 px-3 rounded-lg font-mono font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${isRec ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-red-400 border border-red-500/40'}`;
            }

            const statusTxt = document.getElementById('spk-rec-status-txt');
            if (statusTxt) {
                statusTxt.textContent = isRec ? 'RECORDING...' : (hasRec ? 'SAVED (24k)' : '16s / 24k');
                statusTxt.className = `text-[9px] font-mono ${isRec ? 'text-red-400 font-bold animate-pulse' : 'text-slate-500'}`;
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
