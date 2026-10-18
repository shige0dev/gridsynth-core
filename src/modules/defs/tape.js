// src/modules/defs/tape.js
import { UIHelpers } from '../../ui/helpers.js?v=218';
import { TapeCodec } from '../../audio/tape-codec.js';

export const TAPE = {
    color: 'cyan',
    defaults: () => ({
        type: 'TAPE',
        name: 'Tape 1',
        codec: 'opus',
        sampleRate: 48000,
        maxDuration: 16.0,
        duration: 1.5,
        start: 0.0,
        end: 1.0,
        speed: 1.0,
        loop: false,
        retrigger: true,
        data: '',
        peaks: null
    }),
    onNormalize: (m) => {
        if (m.peaks && Array.isArray(m.peaks)) {
            m._peaks = m.peaks;
        }
    },
    ports: () => ({
        in: [
            { port: 'gate_in', color: 'bg-orange-500' },
            { port: 'start_cv', color: 'bg-yellow-400' },
            { port: 'end_cv', color: 'bg-yellow-400' },
            { port: 'speed_cv', color: 'bg-yellow-400' }
        ],
        out: [
            { port: 'wave_out', color: 'bg-blue-500' }
        ]
    }),
    /**
     * Compute 96-bin peak array from Float32Array for high-res oscilloscope-like waveform.
     */
    extractPeaks(buffer, numBins = 96) {
        if (!buffer || buffer.length === 0) return null;
        const peaks = new Float32Array(numBins);
        const step = Math.floor(buffer.length / numBins);
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
    formatMs: (ms) => {
        if (ms <= 0) return '0ms';
        if (ms < 1000) return `${Math.round(ms)}ms`;
        if (ms < 10000) {
            const s = ms / 1000;
            return Number.isInteger(s) ? `${s}s` : (ms % 100 === 0 ? `${s.toFixed(1)}s` : `${s.toFixed(2)}s`);
        }
        return `${(ms / 1000).toFixed(1)}s`;
    },
    renderWaveformSVG: (m, playhead = 0.0, isPlaying = false, effStartVal = null, effEndVal = null) => {
        const W = 320, H = 100;
        const padX = 6, padY = 6;
        const innerW = W - padX * 2;
        const innerH = H - padY * 2;
        const midY = padY + (innerH - 10) / 2;

        const durSec = m.duration || 1.5;
        const durMs = durSec * 1000;

        const startPct = Math.max(0, Math.min(1, effStartVal !== null ? effStartVal : (m.start ?? 0.0)));
        const endPct = Math.max(0, Math.min(1, effEndVal !== null ? effEndVal : (m.end ?? 1.0)));

        // Oscilloscope reticle background grid
        let gridSvg = '';
        for (let gx = 1; gx <= 7; gx++) {
            const x = padX + (innerW / 8) * gx;
            const isCenter = (gx === 4);
            const isQuarter = (gx % 2 === 0);
            const strokeCol = isCenter ? '#334155' : (isQuarter ? '#1e293b' : '#0f172a');
            gridSvg += `<line x1="${x.toFixed(1)}" y1="${padY}" x2="${(padY + innerH - 10).toFixed(1)}" stroke="${strokeCol}" stroke-width="0.8" stroke-dasharray="2,2"/>`;
        }
        for (let gy = 1; gy <= 3; gy++) {
            const y = padY + ((innerH - 10) / 4) * gy;
            gridSvg += `<line x1="${padX}" y1="${y.toFixed(1)}" x2="${padX + innerW}" y2="${y.toFixed(1)}" stroke="#1e293b" stroke-width="0.8" stroke-dasharray="2,2"/>`;
        }

        // Representative Millisecond Time Labels & tick marks (0ms, 25%, 50%, 75%, 100%)
        const intervals = [0, 0.25, 0.5, 0.75, 1.0];
        let timeLabelsSvg = '';
        intervals.forEach((pct, idx) => {
            const x = padX + pct * innerW;
            const ms = pct * durMs;
            const label = TAPE.formatMs(ms);
            let anchor = 'middle';
            let drawX = x;
            if (idx === 0) {
                anchor = 'start';
                drawX = padX + 2;
            } else if (idx === intervals.length - 1) {
                anchor = 'end';
                drawX = padX + innerW - 2;
            }
            // Vertical tick mark at bottom axis
            timeLabelsSvg += `<line x1="${x.toFixed(1)}" y1="${(padY + innerH - 9).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(padY + innerH - 6).toFixed(1)}" stroke="#475569" stroke-width="1"/>`;
            // Representative time text (bright readable slate monospace)
            timeLabelsSvg += `<text x="${drawX.toFixed(1)}" y="${(padY + innerH - 1.5).toFixed(1)}" fill="${idx === 2 ? '#38bdf8' : '#94a3b8'}" font-size="7" font-family="monospace" font-weight="bold" text-anchor="${anchor}">${label}</text>`;
        });

        // Waveform peaks (sharp cyan oscilloscope trace)
        const peaks = m.peaks || m._peaks || [];
        const hasAudio = peaks.length > 0 && peaks.some(p => p > 0.005);
        let barsSvg = '';
        if (hasAudio) {
            const numBars = peaks.length;
            const barW = innerW / numBars;
            for (let i = 0; i < numBars; i++) {
                const bx = padX + i * barW + barW * 0.5;
                const val = peaks[i] || 0.0;
                if (val > 0.005) {
                    const barH = Math.max(1.5, val * ((innerH - 10) * 0.46));
                    barsSvg += `<line x1="${bx.toFixed(1)}" y1="${(midY - barH).toFixed(1)}" x2="${bx.toFixed(1)}" y2="${(midY + barH).toFixed(1)}" stroke="#06b6d4" stroke-width="1.8" stroke-linecap="round" opacity="0.85"/>`;
                }
            }
        } else {
            barsSvg = `<text x="${(W / 2).toFixed(1)}" y="${(midY + 3.5).toFixed(1)}" fill="#334155" font-size="8.5" font-family="monospace" font-weight="bold" text-anchor="middle" letter-spacing="1">NO AUDIO LOADED</text>`;
        }

        // Neon Green (#22c55e) markers for Start & End
        const startX = padX + startPct * innerW;
        const endX = padX + endPct * innerW;

        // Dynamic playhead position line
        const playX = padX + Math.max(0, Math.min(1, playhead)) * innerW;

        return `
            <svg id="tape-waveform-svg" viewBox="0 0 ${W} ${H}" class="w-full h-28 select-none bg-slate-950 rounded-xl border border-slate-800 shadow-inner overflow-hidden relative">
                <!-- Center zero axis -->
                <line x1="${padX}" y1="${midY}" x2="${padX + innerW}" y2="${midY}" stroke="#334155" stroke-width="1"/>
                
                <!-- Oscilloscope Reticle Grid -->
                ${gridSvg}

                <!-- Representative Time Axis & Millisecond Labels -->
                ${timeLabelsSvg}

                <!-- Audio Waveform (Empty if silent) -->
                ${barsSvg}

                <!-- End Line: Neon Green (same color), stroke (1.6px) -->
                <line id="tape-end-line" x1="${endX.toFixed(1)}" y1="${padY}" x2="${endX.toFixed(1)}" y2="${padY + innerH}" stroke="#22c55e" stroke-width="1.6" class="drop-shadow-[0_0_4px_rgba(34,197,94,0.85)]"/>
                <rect id="tape-end-badge" x="${(endX - 5).toFixed(1)}" y="${padY}" width="10" height="9" rx="1.5" fill="#14532d" stroke="#22c55e" stroke-width="1"/>
                <text id="tape-end-text" x="${endX.toFixed(1)}" y="${padY + 7}" fill="#4ade80" font-size="6.5" font-family="monospace" font-weight="bold" text-anchor="middle">E</text>

                <!-- Start Line: Neon Green (same color), stroke (1.6px, same thickness as End) -->
                <line id="tape-start-line" x1="${startX.toFixed(1)}" y1="${padY}" x2="${startX.toFixed(1)}" y2="${padY + innerH}" stroke="#22c55e" stroke-width="1.6" class="drop-shadow-[0_0_4px_rgba(34,197,94,0.85)]"/>
                <rect id="tape-start-badge" x="${(startX - 5).toFixed(1)}" y="${padY}" width="10" height="9" rx="1.5" fill="#14532d" stroke="#22c55e" stroke-width="1"/>
                <text id="tape-start-text" x="${startX.toFixed(1)}" y="${padY + 7}" fill="#4ade80" font-size="6.5" font-family="monospace" font-weight="bold" text-anchor="middle">S</text>

                <!-- Dynamic Playhead Indicator Line (Shown ONLY while playing) -->
                <line id="tape-playhead-line" x1="${playX.toFixed(1)}" y1="${padY}" x2="${playX.toFixed(1)}" y2="${padY + innerH}" stroke="#fde047" stroke-width="2.2" class="drop-shadow-[0_0_8px_rgba(253,224,71,1)]" style="display: ${isPlaying ? 'block' : 'none'};"/>
            </svg>
        `;
    },
    formatSpeed: (v) => {
        if (Math.abs(v) < 0.02) return 'x1';
        if (Math.abs(v - (-2.0)) < 0.02) return '/4';
        if (Math.abs(v - (-1.0)) < 0.02) return '/2';
        if (Math.abs(v - 1.0) < 0.02) return 'x2';
        if (Math.abs(v - 2.0) < 0.02) return 'x4';
        const mult = Math.pow(2.0, v);
        if (v < 0) {
            const denom = Math.pow(2.0, -v);
            return `/${denom < 10 ? denom.toFixed(1) : denom.toFixed(0)}`;
        } else {
            return `x${mult.toFixed(1)}`;
        }
    },
    renderGrid: (m) => {
        const startPct = Math.max(5, Math.min(100, Math.round((m.start ?? 0) * 100)));
        const endPct = Math.max(5, Math.min(100, Math.round((m.end ?? 1) * 100)));
        const spdPct = Math.max(5, Math.min(100, Math.round(((m.speed ?? 1.0) / 4.0) * 100)));
        return `<div class="flex items-center justify-center w-full h-full pointer-events-none">${UIHelpers.renderPanelBars([
            { pct: startPct, innerCls: 'tape-bar-start', attrs: 'data-tape-bar="start"', width: 'w-2' },
            { pct: endPct, innerCls: 'tape-bar-end', attrs: 'data-tape-bar="end"', width: 'w-2' },
            { pct: spdPct, innerCls: 'tape-bar-spd', attrs: 'data-tape-bar="spd"', width: 'w-2' }
        ], { gapCls: 'gap-1.5', theme: 'audio' })}</div>`;
    },
    renderModal: (m, ctx) => {
        const isStartPatched = ctx?.patched?.has('start_cv') || ctx?.patched?.has('cv_start');
        const isEndPatched = ctx?.patched?.has('end_cv') || ctx?.patched?.has('cv_end');
        const isSpeedPatched = ctx?.patched?.has('speed_cv') || ctx?.patched?.has('cv_speed');

        const durMs = (m.duration ?? 1.5) * 1000;
        const startDisp = isStartPatched ? 'EXT' : `${Math.round((m.start ?? 0) * 100)}% (${TAPE.formatMs((m.start ?? 0) * durMs)})`;
        const endDisp = isEndPatched ? 'EXT' : `${Math.round((m.end ?? 1) * 100)}% (${TAPE.formatMs((m.end ?? 1) * durMs)})`;
        const speedCvVal = m.speedCv !== undefined ? m.speedCv : Math.log2(m.speed || 1.0);
        const speedDisp = isSpeedPatched ? 'EXT' : TAPE.formatSpeed(speedCvVal);
        const durStr = `${(m.duration ?? 1.5).toFixed(2)}s`;
        const loopActive = Boolean(m.loop);
        const retriggerActive = m.retrigger !== false;

        const rangeLeft = (Math.min(m.start ?? 0, m.end ?? 1) * 100).toFixed(1);
        const rangeWidth = (Math.abs((m.end ?? 1) - (m.start ?? 0)) * 100).toFixed(1);
        const startPct = Math.max(0, Math.min(1, m.start ?? 0.0));

        return `
            <div class="space-y-2 p-1 text-slate-200 w-full">
                <!-- Header / File Loader -->
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 gap-1 select-none">
                    <div class="flex items-center gap-1.5 overflow-hidden">
                        <span class="text-[9.5px] font-bold text-cyan-300 truncate max-w-[140px]">${m.name || 'Tape 1'}</span>
                        <span class="text-[8px] font-mono text-slate-400 font-bold">(${durStr})</span>
                    </div>
                    <label class="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/70 text-cyan-200 rounded text-[8px] font-bold cursor-pointer transition shadow-sm flex items-center gap-1 shrink-0">
                        <i data-lucide="download" class="w-2.5 h-2.5"></i>
                        <span>LOAD</span>
                        <input type="file" id="tape-file-input" accept="audio/*, video/mp4, video/*" class="hidden">
                    </label>
                </div>

                <!-- Oscilloscope-sized Waveform Display (Large format) -->
                <div id="tape-waveform-wrap" class="w-full">
                    ${TAPE.renderWaveformSVG(m, 0.0, false)}
                </div>

                <!-- Dynamic Progress Bar (Monochrome Gray) -->
                <div class="w-full py-1">
                    <div class="w-full h-2.5 bg-slate-900 rounded-full border border-slate-700 relative shadow-inner overflow-visible">
                        <!-- Start - End Range Band (Neutral gray band) -->
                        <div id="tape-progress-range" class="absolute top-0 bottom-0 bg-slate-600/40 border-l border-r border-slate-400/80 rounded-sm" style="left: ${rangeLeft}%; width: ${rangeWidth}%;"></div>
                        <!-- Live Playback Fill (Neutral monochrome fill) -->
                        <div id="tape-progress-fill" class="absolute top-0 bottom-0 left-0 bg-zinc-300 rounded-full transition-none opacity-0" style="width: 0%;"></div>
                        <!-- Playhead Pin / Dot (Neutral silver dot) -->
                        <div id="tape-progress-dot" class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-zinc-200 border-2 border-slate-950 shadow-[0_0_6px_rgba(255,255,255,0.7)] transition-none z-10" style="left: ${(startPct * 100).toFixed(1)}%; display: block;"></div>
                    </div>
                </div>

                <!-- Row 1: PLAY Button, LOOP Button, RETRIG Button, and SPEED Slider -->
                <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-950/70 rounded-xl border border-slate-800 text-[8.5px]">
                    <!-- Control Buttons -->
                    <div class="flex items-center gap-1.5 shrink-0">
                        <button id="tape-play-btn" class="h-6 px-2.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition flex items-center gap-1 shadow-sm text-[8px] active:scale-95 cursor-pointer shrink-0">
                            <i data-lucide="play" class="w-2.5 h-2.5"></i>
                            <span id="tape-play-text">PLAY</span>
                        </button>
                        <button id="tape-loop-btn" class="h-6 px-2 rounded border ${loopActive ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-slate-900 text-slate-500 border-slate-800'} font-bold transition text-[8px] cursor-pointer shrink-0" title="ループ再生の有効/無効">
                            LOOP: <span id="tape-loop-text">${loopActive ? 'ON' : 'OFF'}</span>
                        </button>
                        <button id="tape-retrigger-btn" class="h-6 px-2 rounded border ${retriggerActive ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-slate-900 text-slate-500 border-slate-800'} font-bold transition text-[8px] cursor-pointer shrink-0" title="トリガー動作 (RETRIG: ON=毎回到頭再生 / OFF=完走までトリガー無視)">
                            RETRIG: <span id="tape-retrigger-text">${retriggerActive ? 'ON' : 'OFF'}</span>
                        </button>
                    </div>

                    <div class="w-[1px] h-6 bg-slate-800 shrink-0"></div>

                    <!-- SPEED Horizontal Slider (Exponential: /4, /2, x1, x2, x4) -->
                    <div class="flex-1 min-w-[110px] flex flex-col justify-center gap-0.5 ${isSpeedPatched ? 'opacity-30 pointer-events-none' : ''}">
                        <div class="flex items-center justify-between text-[8px] font-mono font-bold leading-tight">
                            <span class="text-cyan-400">SPEED</span>
                            <span id="tape-slider-speed-disp" class="text-cyan-300 font-mono text-[8.5px] cursor-ns-resize hover:bg-slate-800/80 px-1 rounded leading-none">${speedDisp}</span>
                        </div>
                        <input type="range" id="tape-slider-speed" min="-2.0" max="2.0" step="0.05" value="${speedCvVal}" class="w-full h-1.5 bg-slate-800 rounded-lg accent-cyan-400 cursor-pointer" ${isSpeedPatched ? 'disabled' : ''} title="再生速度 (指数: /4, /2, x1, x2, x4)">
                        <div class="flex justify-between px-0.5 text-[6.5px] font-mono text-slate-500 font-bold select-none pointer-events-none -mt-0.5">
                            <span>/4</span>
                            <span>/2</span>
                            <span class="text-cyan-400">x1</span>
                            <span>x2</span>
                            <span>x4</span>
                        </div>
                    </div>
                </div>

                <!-- Row 2: Enlarge START & END Sliders (Spacious & High Precision) -->
                <div class="flex items-center justify-between gap-3 px-3 py-2 bg-slate-950/70 rounded-xl border border-slate-800 shadow-sm">
                    <!-- START (Large Horizontal Slider) -->
                    <div class="flex-1 min-w-0 flex flex-col gap-1 ${isStartPatched ? 'opacity-30 pointer-events-none' : ''}">
                        <div class="flex items-center justify-between text-[8.5px] font-mono font-bold leading-tight">
                            <div class="flex items-center gap-1 text-emerald-400">
                                <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]"></span>
                                <span class="text-[9px]">START</span>
                            </div>
                            <span id="tape-slider-start-disp" class="text-emerald-300 font-mono text-[9px] font-bold cursor-ns-resize hover:bg-slate-800/80 px-1.5 py-0.5 rounded leading-none">${startDisp}</span>
                        </div>
                        <input type="range" id="tape-slider-start" min="0.0" max="1.0" step="0.005" value="${m.start ?? 0.0}" class="w-full h-2.5 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer" ${isStartPatched ? 'disabled' : ''} title="開始位置 (0%〜100%)">
                    </div>

                    <div class="w-[1px] h-8 bg-slate-800/90 shrink-0"></div>

                    <!-- END (Large Horizontal Slider) -->
                    <div class="flex-1 min-w-0 flex flex-col gap-1 ${isEndPatched ? 'opacity-30 pointer-events-none' : ''}">
                        <div class="flex items-center justify-between text-[8.5px] font-mono font-bold leading-tight">
                            <div class="flex items-center gap-1 text-emerald-400">
                                <span class="inline-block w-2.5 h-2.5 rounded-full border border-emerald-500 bg-emerald-950 shadow-[0_0_4px_rgba(34,197,94,0.5)]"></span>
                                <span class="text-[9px]">END</span>
                            </div>
                            <span id="tape-slider-end-disp" class="text-emerald-300 font-mono text-[9px] font-bold cursor-ns-resize hover:bg-slate-800/80 px-1.5 py-0.5 rounded leading-none">${endDisp}</span>
                        </div>
                        <input type="range" id="tape-slider-end" min="0.0" max="1.0" step="0.005" value="${m.end ?? 1.0}" class="w-full h-2.5 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer" ${isEndPatched ? 'disabled' : ''} title="終了位置 (0%〜100%)">
                    </div>
                </div>

                <div class="text-[7.5px] text-slate-500 px-1 text-center italic">
                    * PLAY: 単体試聴（スピーカー未接続でも内部再生） | RETRIG: OFF時は完走までトリガー無視
                </div>
            </div>
        `;
    },
    getActiveInst: (ctx, m) => {
        const s = ctx?.synth || window.__GS_SYNTH__;
        if (!s || !s.modules) return null;
        const pId = ctx?.currentPageId ?? '0';
        const keys = [`${pId}/${m.id}`, m.id, `0/${m.id}`];
        for (const k of keys) {
            if (s.modules[k]) return s.modules[k];
        }
        for (const k in s.modules) {
            const inst = s.modules[k];
            if (inst && typeof inst.setAudioBuffer === 'function') {
                return inst;
            }
        }
        return null;
    },
    bindEvents: (m, ctx, cb) => {
        const dialogEl = document.getElementById(`dock-dialog-${m.id}`);
        const root = dialogEl || document;
        const svgWrap = root.querySelector('#tape-waveform-wrap');

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            try { window.lucide.createIcons({ root }); } catch (_) {}
        }

        // Restore PCM buffer to AudioWorklet if already in memory, or decode from base64 if needed
        const initialInst = TAPE.getActiveInst(ctx, m);
        if (m._buffer && initialInst?.setAudioBuffer) {
            initialInst.setAudioBuffer(m._buffer, m.sampleRate || 48000);
        } else if (m.data && (!m.peaks || m.peaks.length === 0 || !m._buffer)) {
            const synth = ctx?.synth || window.__GS_SYNTH__;
            TapeCodec.decodeFromBase64(m.data, synth?.ctx).then(res => {
                if (res?.buffer) {
                    m._buffer = res.buffer;
                    m.duration = res.duration;
                    m.sampleRate = res.sampleRate;
                    if (!m.peaks || m.peaks.length === 0) {
                        m.peaks = TAPE.extractPeaks(res.buffer, 64);
                    }
                    m._peaks = m.peaks;
                    const inst = TAPE.getActiveInst(ctx, m);
                    if (inst?.setAudioBuffer) {
                        inst.setAudioBuffer(res.buffer, res.sampleRate);
                    }
                    redrawSvg();
                    cb();
                }
            }).catch(err => {
                console.warn('[TAPE] Decode data on bindEvents warning:', err);
            });
        }

        const redrawSvg = () => {
            const activeInst = TAPE.getActiveInst(ctx, m);
            const st = activeInst?.read?.();
            if (svgWrap) svgWrap.innerHTML = TAPE.renderWaveformSVG(m, st?.playhead ?? 0.0, Boolean(st?.isPlaying));
        };

        const onSliderChange = () => {
            redrawSvg();
            const startP = Math.max(0, Math.min(1, m.start ?? 0.0));
            const endP = Math.max(0, Math.min(1, m.end ?? 1.0));
            const durMs = (m.duration ?? 1.5) * 1000;
            const startDispEl = root.querySelector('#tape-slider-start-disp');
            const endDispEl = root.querySelector('#tape-slider-end-disp');
            if (startDispEl && !isStartPatched) {
                startDispEl.textContent = `${Math.round(startP * 100)}% (${TAPE.formatMs(startP * durMs)})`;
            }
            if (endDispEl && !isEndPatched) {
                endDispEl.textContent = `${Math.round(endP * 100)}% (${TAPE.formatMs(endP * durMs)})`;
            }
            // Update progress bar range bounds
            const rangeEl = root.querySelector('#tape-progress-range');
            if (rangeEl) {
                rangeEl.style.left = `${(Math.min(startP, endP) * 100).toFixed(1)}%`;
                rangeEl.style.width = `${(Math.abs(endP - startP) * 100).toFixed(1)}%`;
            }
            // Update playhead pin to current start if stopped
            const dotEl = root.querySelector('#tape-progress-dot');
            const activeInst = TAPE.getActiveInst(ctx, m);
            const st = activeInst?.read?.();
            if (dotEl && !st?.isPlaying) {
                dotEl.style.left = `${(startP * 100).toFixed(1)}%`;
            }
            const synth = ctx?.synth || window.__GS_SYNTH__;
            activeInst?.update?.(synth?.ctx, activeInst, m);
            cb();
        };

        // File Input Handler
        const fileInput = root.querySelector('#tape-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                try {
                    ctx.showToast?.('DECODING AUDIO / MP4...');

                    const synth = ctx?.synth || window.__GS_SYNTH__;
                    if (synth && !synth.ctx) {
                        await synth.init();
                    }
                    if (synth?.ctx && synth.ctx.state === 'suspended') {
                        try {
                            await synth.ctx.resume();
                        } catch (resErr) {
                            console.warn('[TAPE] Synth context resume failed:', resErr);
                        }
                    }
                    if (synth && !synth.hasModules()) {
                        synth.rebuildAll(ctx.pagesData, (pId, id) => ctx.getPatchState(id, pId));
                    }

                    // Turn audio power button indicator active if currently idle
                    const pwrBtn = document.getElementById('audio-power-btn');
                    if (pwrBtn && !pwrBtn.classList.contains('border-red-500')) {
                        pwrBtn.className = "h-7 w-7 bg-red-950 text-red-400 rounded-lg border border-red-500 shadow-md shadow-red-500/40 flex items-center justify-center shrink-0";
                    }

                    // 2. Decode Audio / MP4
                    const audioCtx = synth?.ctx || null;
                    const res = await TapeCodec.loadAudioFromFile(file, audioCtx);

                    // Update module properties
                    m.name = file.name.replace(/\.[^/.]+$/, '').slice(0, 24);
                    m.duration = res.duration;
                    m.sampleRate = res.sampleRate;
                    const peaks = TAPE.extractPeaks(res.buffer, 64);
                    m.peaks = peaks;
                    m._peaks = peaks;
                    m._buffer = res.buffer; // Persist PCM in memory!

                    // Re-acquire active module instance and transfer PCM immediately
                    const activeInst = TAPE.getActiveInst(ctx, m);
                    if (activeInst && activeInst.setAudioBuffer) {
                        activeInst.setAudioBuffer(res.buffer, res.sampleRate);
                    }

                    redrawSvg();
                    ctx.reRenderModal?.();
                    cb();
                    ctx.showToast?.(`LOADED: ${res.duration.toFixed(1)}s`);

                    // Encode to Opus Base64 in background for patch JSON persistence
                    TapeCodec.encodeToOpusBase64(res.buffer, res.sampleRate, synth?.ctx).then(b64 => {
                        m.data = b64;
                        cb();
                    }).catch(err => {
                        console.warn('[TAPE] Opus background encoding warning:', err);
                    });
                } catch (err) {
                    console.error('[TAPE] Load failed:', err);
                    const errMsg = err?.message || err?.name || String(err);
                    ctx.showToast?.(`LOAD FAILED: ${errMsg.slice(0, 32)}`);
                } finally {
                    fileInput.value = ''; // Reset so the user can re-select the same file
                }
            });
        }

        // Trigger / Test Play button
        const playBtn = root.querySelector('#tape-play-btn');
        const playText = root.querySelector('#tape-play-text');
        if (playBtn) {
            playBtn.addEventListener('click', async () => {
                const synth = ctx?.synth || window.__GS_SYNTH__;
                if (synth && !synth.ctx) {
                    await synth.init();
                }
                if (synth?.ctx && synth.ctx.state === 'suspended') {
                    try {
                        await synth.ctx.resume();
                    } catch (resErr) {
                        console.warn('[TAPE] Synth context resume failed:', resErr);
                    }
                }
                if (synth && !synth.hasModules()) {
                    synth.rebuildAll(ctx.pagesData, (pId, id) => ctx.getPatchState(id, pId));
                }

                const pwrBtn = document.getElementById('audio-power-btn');
                if (pwrBtn && !pwrBtn.classList.contains('border-red-500')) {
                    pwrBtn.className = "h-7 w-7 bg-red-950 text-red-400 rounded-lg border border-red-500 shadow-md shadow-red-500/40 flex items-center justify-center shrink-0";
                }

                const activeInst = TAPE.getActiveInst(ctx, m);
                if (!activeInst) {
                    console.error('[TAPE] No active synth instance found for', m.id);
                    ctx.showToast?.('ENGINE NOT READY');
                    return;
                }

                // Ensure PCM buffer is in worklet
                if (m._buffer && activeInst.setAudioBuffer) {
                    activeInst.setAudioBuffer(m._buffer, m.sampleRate || 48000);
                }

                const peaks = m._peaks || [];
                const hasAudio = (peaks.length > 0 && peaks.some(p => p > 0.005)) || (m._buffer && m._buffer.length > 0);
                if (!hasAudio) {
                    ctx.showToast?.('NO AUDIO LOADED (PLEASE LOAD FILE)');
                    return;
                }

                const st = activeInst.read?.();
                const playheadLine = root.querySelector('#tape-playhead-line');
                const progressFill = root.querySelector('#tape-progress-fill');
                const progressDot = root.querySelector('#tape-progress-dot');
                const startP = Math.max(0, Math.min(1, m.start ?? 0.0));

                if (st?.isPlaying) {
                    activeInst.stop?.();
                    if (playText) playText.textContent = 'PLAY';
                    if (playheadLine) playheadLine.style.display = 'none';
                    if (progressFill) progressFill.style.opacity = '0';
                    if (progressDot) progressDot.style.left = `${(startP * 100).toFixed(1)}%`;
                } else {
                    activeInst.testPlay?.();
                    if (playText) playText.textContent = 'STOP';
                    if (playheadLine) playheadLine.style.display = 'block';
                }
            });
        }

        // Loop Toggle
        const loopBtn = root.querySelector('#tape-loop-btn');
        const loopText = root.querySelector('#tape-loop-text');
        if (loopBtn) {
            loopBtn.addEventListener('click', () => {
                m.loop = !m.loop;
                const activeInst = TAPE.getActiveInst(ctx, m);
                const synth = ctx?.synth || window.__GS_SYNTH__;
                activeInst?.update?.(synth?.ctx, activeInst, m);
                if (loopText) loopText.textContent = m.loop ? 'ON' : 'OFF';
                loopBtn.className = `h-6 px-2 rounded border ${m.loop ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-slate-900 text-slate-500 border-slate-800'} font-bold transition text-[8px] cursor-pointer shrink-0`;
                cb();
            });
        }

        // Retrigger Mode Toggle (RETRIG: ON = always restart / OFF = finish playback before retriggering)
        const retriggerBtn = root.querySelector('#tape-retrigger-btn');
        const retriggerText = root.querySelector('#tape-retrigger-text');
        if (retriggerBtn) {
            retriggerBtn.addEventListener('click', () => {
                m.retrigger = !(m.retrigger !== false);
                const activeInst = TAPE.getActiveInst(ctx, m);
                const synth = ctx?.synth || window.__GS_SYNTH__;
                activeInst?.update?.(synth?.ctx, activeInst, m);
                const on = m.retrigger !== false;
                if (retriggerText) retriggerText.textContent = on ? 'ON' : 'OFF';
                retriggerBtn.className = `h-6 px-2 rounded border ${on ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-slate-900 text-slate-500 border-slate-800'} font-bold transition text-[8px] cursor-pointer shrink-0`;
                cb();
            });
        }

        // Sliders
        const isStartPatched = ctx?.patched?.has('start_cv') || ctx?.patched?.has('cv_start');
        const isEndPatched = ctx?.patched?.has('end_cv') || ctx?.patched?.has('cv_end');
        const isSpeedPatched = ctx?.patched?.has('speed_cv') || ctx?.patched?.has('cv_speed');

        if (!isStartPatched) {
            const formatStart = v => `${Math.round(v * 100)}% (${TAPE.formatMs(v * ((m.duration ?? 1.5) * 1000))})`;
            UIHelpers.bindSlider('tape-slider-start', formatStart, v => { m.start = v; onSliderChange(); }, 1, 0.0, 1.0);
            UIHelpers.bindScrubber('tape-slider-start-disp', 'tape-slider-start', formatStart, v => { m.start = v; onSliderChange(); }, 1, 0.0, 1.0);
        }

        if (!isEndPatched) {
            const formatEnd = v => `${Math.round(v * 100)}% (${TAPE.formatMs(v * ((m.duration ?? 1.5) * 1000))})`;
            UIHelpers.bindSlider('tape-slider-end', formatEnd, v => { m.end = v; onSliderChange(); }, 1, 0.0, 1.0);
            UIHelpers.bindScrubber('tape-slider-end-disp', 'tape-slider-end', formatEnd, v => { m.end = v; onSliderChange(); }, 1, 0.0, 1.0);
        }

        if (!isSpeedPatched) {
            UIHelpers.bindSlider('tape-slider-speed', TAPE.formatSpeed, v => {
                m.speedCv = v;
                m.speed = Math.pow(2.0, v);
                const activeInst = TAPE.getActiveInst(ctx, m);
                const synth = ctx?.synth || window.__GS_SYNTH__;
                activeInst?.update?.(synth?.ctx, activeInst, m);
                onSliderChange();
            }, 1, -2.0, 2.0);
            UIHelpers.bindScrubber('tape-slider-speed-disp', 'tape-slider-speed', TAPE.formatSpeed, v => {
                m.speedCv = v;
                m.speed = Math.pow(2.0, v);
                const activeInst = TAPE.getActiveInst(ctx, m);
                const synth = ctx?.synth || window.__GS_SYNTH__;
                activeInst?.update?.(synth?.ctx, activeInst, m);
                onSliderChange();
            }, 1, -2.0, 2.0);
        }
    },
    updateLive: (cell, data, isPlaying, targetModal, m) => {
        const playhead = data?.playhead ?? 0.0;
        const isTapePlaying = Boolean(data?.isPlaying);
        const effStart = data?.effStart !== undefined ? data.effStart : (m.start ?? 0.0);
        const effEnd = data?.effEnd !== undefined ? data.effEnd : (m.end ?? 1.0);

        // Update modal playhead line, Start/End CV markers, and progress bar in real-time
        if (targetModal) {
            const W = 320, padX = 6, innerW = W - padX * 2;

            // 1. Dynamic Start/End lines and badges according to external CV
            const startX = padX + Math.max(0, Math.min(1, effStart)) * innerW;
            const endX = padX + Math.max(0, Math.min(1, effEnd)) * innerW;

            const startLine = targetModal.querySelector('#tape-start-line');
            const startBadge = targetModal.querySelector('#tape-start-badge');
            const startText = targetModal.querySelector('#tape-start-text');
            if (startLine) {
                startLine.setAttribute('x1', startX.toFixed(1));
                startLine.setAttribute('x2', startX.toFixed(1));
            }
            if (startBadge) startBadge.setAttribute('x', (startX - 5).toFixed(1));
            if (startText) startText.setAttribute('x', startX.toFixed(1));

            const endLine = targetModal.querySelector('#tape-end-line');
            const endBadge = targetModal.querySelector('#tape-end-badge');
            const endText = targetModal.querySelector('#tape-end-text');
            if (endLine) {
                endLine.setAttribute('x1', endX.toFixed(1));
                endLine.setAttribute('x2', endX.toFixed(1));
            }
            if (endBadge) endBadge.setAttribute('x', (endX - 5).toFixed(1));
            if (endText) endText.setAttribute('x', endX.toFixed(1));

            // 2. Playhead vertical line inside SVG
            const playheadLine = targetModal.querySelector('#tape-playhead-line');
            if (playheadLine) {
                if (isTapePlaying) {
                    playheadLine.style.display = 'block';
                    const px = padX + Math.max(0, Math.min(1, playhead)) * innerW;
                    playheadLine.setAttribute('x1', px.toFixed(1));
                    playheadLine.setAttribute('x2', px.toFixed(1));
                } else {
                    playheadLine.style.display = 'none';
                }
            }

            // 3. Horizontal Progress Bar (Fill, Range, & Playhead Dot - ALWAYS VISIBLE!)
            const progressRange = targetModal.querySelector('#tape-progress-range');
            if (progressRange) {
                const rLeft = Math.min(effStart, effEnd) * 100;
                const rWidth = Math.abs(effEnd - effStart) * 100;
                progressRange.style.left = `${rLeft.toFixed(1)}%`;
                progressRange.style.width = `${rWidth.toFixed(1)}%`;
            }

            const progressFill = targetModal.querySelector('#tape-progress-fill');
            const progressDot = targetModal.querySelector('#tape-progress-dot');
            if (progressDot) {
                progressDot.style.display = 'block';
                if (isTapePlaying) {
                    const pct = (Math.max(0, Math.min(1, playhead)) * 100).toFixed(1);
                    progressDot.style.left = `${pct}%`;
                    if (progressFill) {
                        progressFill.style.opacity = '1';
                        const fillLeft = Math.min(effStart, playhead) * 100;
                        const fillW = Math.abs(playhead - effStart) * 100;
                        progressFill.style.left = `${fillLeft.toFixed(1)}%`;
                        progressFill.style.width = `${fillW.toFixed(1)}%`;
                    }
                } else {
                    // Position at effective start when silent or stopped
                    progressDot.style.left = `${(effStart * 100).toFixed(1)}%`;
                    if (progressFill) {
                        progressFill.style.opacity = '0';
                    }
                }
            }

            // 4. Trigger / Play Button Label
            const playText = targetModal.querySelector('#tape-play-text');
            if (playText) {
                playText.textContent = isTapePlaying ? 'STOP' : 'PLAY';
            }

            // 5. Update CV-patched start/end display badges
            const durMs = (m.duration ?? 1.5) * 1000;
            const sliderStart = targetModal.querySelector('#tape-slider-start');
            if (sliderStart && sliderStart.disabled) {
                const disp = targetModal.querySelector('#tape-slider-start-disp');
                if (disp) disp.textContent = `EXT (${Math.round(effStart * 100)}% / ${TAPE.formatMs(effStart * durMs)})`;
            }
            const sliderEnd = targetModal.querySelector('#tape-slider-end');
            if (sliderEnd && sliderEnd.disabled) {
                const disp = targetModal.querySelector('#tape-slider-end-disp');
                if (disp) disp.textContent = `EXT (${Math.round(effEnd * 100)}% / ${TAPE.formatMs(effEnd * durMs)})`;
            }
        }

        // Grid Cell active glow
        cell.querySelectorAll('[data-tape-bar]').forEach(bar => {
            bar.classList.toggle('bar-active-audio', isTapePlaying);
        });
    }
};

export const tapeDefs = { TAPE };

