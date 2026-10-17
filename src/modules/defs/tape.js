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
        loop: true,
        data: ''
    }),
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
    renderWaveformSVG: (m, playhead = 0.0) => {
        const W = 320, H = 100;
        const padX = 6, padY = 6;
        const innerW = W - padX * 2;
        const innerH = H - padY * 2;
        const midY = padY + innerH / 2;

        const startPct = Math.max(0, Math.min(1, m.start ?? 0.0));
        const endPct = Math.max(0, Math.min(1, m.end ?? 1.0));

        // Oscilloscope reticle background grid
        let gridSvg = '';
        for (let gx = 1; gx <= 7; gx++) {
            const x = padX + (innerW / 8) * gx;
            gridSvg += `<line x1="${x.toFixed(1)}" y1="${padY}" x2="${x.toFixed(1)}" y2="${padY + innerH}" stroke="#1e293b" stroke-width="0.8" stroke-dasharray="2,2"/>`;
        }
        for (let gy = 1; gy <= 3; gy++) {
            const y = padY + (innerH / 4) * gy;
            gridSvg += `<line x1="${padX}" y1="${y.toFixed(1)}" x2="${padX + innerW}" y2="${y.toFixed(1)}" stroke="#1e293b" stroke-width="0.8" stroke-dasharray="2,2"/>`;
        }

        // Waveform peaks (sharp cyan oscilloscope trace)
        const peaks = m._peaks || [];
        const numBars = peaks.length > 0 ? peaks.length : 64;
        const barW = innerW / numBars;

        let barsSvg = '';
        for (let i = 0; i < numBars; i++) {
            const bx = padX + i * barW + barW * 0.5;
            const val = peaks[i] !== undefined ? peaks[i] : (0.2 + 0.6 * Math.sin((i / numBars) * Math.PI));
            const barH = Math.max(1.5, val * (innerH * 0.46));
            barsSvg += `<line x1="${bx.toFixed(1)}" y1="${(midY - barH).toFixed(1)}" x2="${bx.toFixed(1)}" y2="${(midY + barH).toFixed(1)}" stroke="#06b6d4" stroke-width="1.8" stroke-linecap="round" opacity="0.85"/>`;
        }

        // Neon Green (#22c55e) markers for Start & End
        // Start is slightly thicker (stroke-width: 3.0) than End (stroke-width: 1.6)
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

                <!-- Audio Waveform -->
                ${barsSvg}

                <!-- End Line: Neon Green (same color), normal stroke (1.6px) -->
                <line x1="${endX.toFixed(1)}" y1="${padY}" x2="${endX.toFixed(1)}" y2="${padY + innerH}" stroke="#22c55e" stroke-width="1.6" class="drop-shadow-[0_0_4px_rgba(34,197,94,0.85)]"/>
                <rect x="${(endX - 5).toFixed(1)}" y="${padY}" width="10" height="9" rx="1.5" fill="#14532d" stroke="#22c55e" stroke-width="1"/>
                <text x="${endX.toFixed(1)}" y="${padY + 7}" fill="#4ade80" font-size="6.5" font-family="monospace" font-weight="bold" text-anchor="middle">E</text>

                <!-- Start Line: Neon Green (same color), THICKER (3.0px) -->
                <line x1="${startX.toFixed(1)}" y1="${padY}" x2="${startX.toFixed(1)}" y2="${padY + innerH}" stroke="#22c55e" stroke-width="3.0" class="drop-shadow-[0_0_6px_rgba(34,197,94,0.95)]"/>
                <rect x="${(startX - 6).toFixed(1)}" y="${padY}" width="12" height="9" rx="1.5" fill="#14532d" stroke="#22c55e" stroke-width="1.2"/>
                <text x="${startX.toFixed(1)}" y="${padY + 7}" fill="#4ade80" font-size="6.5" font-family="monospace" font-weight="bold" text-anchor="middle">S</text>

                <!-- Dynamic Playhead Indicator Line -->
                <line id="tape-playhead-line" x1="${playX.toFixed(1)}" y1="${padY}" x2="${playX.toFixed(1)}" y2="${padY + innerH}" stroke="#fde047" stroke-width="2.2" class="drop-shadow-[0_0_8px_rgba(253,224,71,1)]"/>
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

        const startDisp = isStartPatched ? 'EXT' : `${Math.round((m.start ?? 0) * 100)}%`;
        const endDisp = isEndPatched ? 'EXT' : `${Math.round((m.end ?? 1) * 100)}%`;
        const speedCvVal = m.speedCv !== undefined ? m.speedCv : Math.log2(m.speed || 1.0);
        const speedDisp = isSpeedPatched ? 'EXT' : TAPE.formatSpeed(speedCvVal);

        const isRev = (m.start ?? 0.0) > (m.end ?? 1.0);
        const durStr = `${(m.duration ?? 1.5).toFixed(2)}s`;

        return `
            <div class="space-y-2 p-1.5 text-slate-200 w-[310px] sm:w-[330px]">
                <!-- Header / File Loader -->
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 gap-1 select-none">
                    <div class="flex items-center gap-1.5 overflow-hidden">
                        <i data-lucide="disc" class="w-3.5 h-3.5 text-cyan-400 shrink-0"></i>
                        <span class="text-[9.5px] font-bold text-cyan-300 truncate max-w-[120px]">${m.name || 'Tape 1'}</span>
                        <span class="text-[8px] font-mono text-slate-400 font-bold">(${durStr})</span>
                    </div>
                    <label class="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/70 text-cyan-200 rounded text-[8px] font-bold cursor-pointer transition shadow-sm flex items-center gap-1">
                        <i data-lucide="upload" class="w-2.5 h-2.5"></i>
                        <span>LOAD AUDIO/MP4</span>
                        <input type="file" id="tape-file-input" accept="audio/*, video/mp4, video/*" class="hidden">
                    </label>
                </div>

                <!-- Oscilloscope-sized Waveform Display (Large format) -->
                <div id="tape-waveform-wrap" class="w-full">
                    ${TAPE.renderWaveformSVG(m, 0.0)}
                </div>

                <!-- Playback Mode & Direction Status -->
                <div class="flex items-center justify-between px-2 py-1 bg-slate-950/70 rounded-lg border border-slate-800 text-[8.5px]">
                    <div class="flex items-center gap-2">
                        <button id="tape-play-btn" class="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center gap-1 shadow-sm">
                            <i data-lucide="play" class="w-3 h-3"></i>
                            <span id="tape-play-text">PLAY</span>
                        </button>
                        <button id="tape-loop-btn" class="px-2 py-1 rounded border ${m.loop ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-slate-900 text-slate-500 border-slate-800'} font-bold transition">
                            LOOP: ${m.loop ? 'ON' : 'OFF'}
                        </button>
                    </div>
                    <div class="flex items-center gap-1.5 font-mono font-bold text-[9px]">
                        <span class="text-slate-400">DIR:</span>
                        <span id="tape-dir-disp" class="${isRev ? 'text-rose-400' : 'text-emerald-400'}">${isRev ? 'REVERSE ◀' : 'FORWARD ▶'}</span>
                    </div>
                </div>

                <!-- Time-axis Horizontal Sliders: START, END, SPEED in 1 Single Row -->
                <div class="flex items-center justify-between gap-2 px-2 py-1.5 bg-slate-950/70 rounded-xl border border-slate-800 shadow-sm">
                    <!-- START (Horizontal Slider) -->
                    <div class="flex-1 min-w-0 flex flex-col gap-0.5 ${isStartPatched ? 'opacity-30 pointer-events-none' : ''}">
                        <div class="flex items-center justify-between text-[8px] font-mono font-bold leading-tight">
                            <span class="text-emerald-400">START</span>
                            <span id="tape-slider-start-disp" class="text-emerald-300 font-mono text-[8.5px] cursor-ns-resize hover:bg-slate-800/80 px-1 py-0.5 rounded leading-none">${startDisp}</span>
                        </div>
                        <input type="range" id="tape-slider-start" min="0.0" max="1.0" step="0.01" value="${m.start ?? 0.0}" class="w-full h-1.5 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer" ${isStartPatched ? 'disabled' : ''} title="開始位置 (時間軸)">
                    </div>

                    <div class="w-[1px] h-6 bg-slate-800/90 shrink-0"></div>

                    <!-- END (Horizontal Slider) -->
                    <div class="flex-1 min-w-0 flex flex-col gap-0.5 ${isEndPatched ? 'opacity-30 pointer-events-none' : ''}">
                        <div class="flex items-center justify-between text-[8px] font-mono font-bold leading-tight">
                            <span class="text-emerald-400">END</span>
                            <span id="tape-slider-end-disp" class="text-emerald-300 font-mono text-[8.5px] cursor-ns-resize hover:bg-slate-800/80 px-1 py-0.5 rounded leading-none">${endDisp}</span>
                        </div>
                        <input type="range" id="tape-slider-end" min="0.0" max="1.0" step="0.01" value="${m.end ?? 1.0}" class="w-full h-1.5 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer" ${isEndPatched ? 'disabled' : ''} title="終了位置 (時間軸)">
                    </div>

                    <div class="w-[1px] h-6 bg-slate-800/90 shrink-0"></div>

                    <!-- SPEED (Horizontal Exponential Slider: /4, /2, x1, x2, x4) -->
                    <div class="flex-1 min-w-0 flex flex-col gap-0.5 ${isSpeedPatched ? 'opacity-30 pointer-events-none' : ''}">
                        <div class="flex items-center justify-between text-[8px] font-mono font-bold leading-tight">
                            <span class="text-cyan-400">SPEED</span>
                            <span id="tape-slider-speed-disp" class="text-cyan-300 font-mono text-[8.5px] cursor-ns-resize hover:bg-slate-800/80 px-1 py-0.5 rounded leading-none">${speedDisp}</span>
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

                <div class="text-[7.5px] text-slate-500 px-1 text-center italic">
                    * SPEED: 指数移動 (/4, /2, x1, x2, x4) | ループ: ゲート持続でリピート / 1周目ワンショット保証
                </div>
            </div>
        `;
    },
    bindEvents: (m, ctx, cb) => {
        const fullId = `${ctx.currentPageId || '0'}/${m.id}`;
        const inst = ctx.synth?.modules?.[fullId] || ctx.synth?.modules?.[m.id];
        const svgWrap = document.getElementById('tape-waveform-wrap');

        const redrawSvg = () => {
            if (svgWrap) svgWrap.innerHTML = TAPE.renderWaveformSVG(m, inst?.read?.()?.playhead ?? 0.0);
        };

        const onSliderChange = () => {
            redrawSvg();
            const dirEl = document.getElementById('tape-dir-disp');
            if (dirEl) {
                const isRev = (m.start ?? 0.0) > (m.end ?? 1.0);
                dirEl.className = isRev ? 'text-rose-400' : 'text-emerald-400';
                dirEl.textContent = isRev ? 'REVERSE ◀' : 'FORWARD ▶';
            }
            cb();
        };

        // File Input Handler
        const fileInput = document.getElementById('tape-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                try {
                    ctx.showToast?.('DECODING AUDIO / MP4...');

                    // 1. Ensure synth audio engine is initialized and running
                    if (ctx.synth && !ctx.synth.ctx) {
                        await ctx.synth.init();
                    }
                    if (ctx.synth?.ctx && ctx.synth.ctx.state === 'suspended') {
                        try {
                            await ctx.synth.ctx.resume();
                        } catch (resErr) {
                            console.warn('[TAPE] Synth context resume failed:', resErr);
                        }
                    }
                    if (ctx.synth && !ctx.synth.hasModules()) {
                        ctx.synth.rebuildAll(ctx.pagesData, (pId, id) => ctx.getPatchState(id, pId));
                    }

                    // Turn audio power button indicator active if currently idle
                    const pwrBtn = document.getElementById('audio-power-btn');
                    if (pwrBtn && !pwrBtn.classList.contains('border-red-500')) {
                        pwrBtn.className = "h-7 w-7 bg-red-950 text-red-400 rounded-lg border border-red-500 shadow-md shadow-red-500/40 flex items-center justify-center shrink-0";
                    }

                    // 2. Decode Audio / MP4
                    const audioCtx = ctx.synth?.ctx || null;
                    const res = await TapeCodec.loadAudioFromFile(file, audioCtx);

                    // Update module properties
                    m.name = file.name.replace(/\.[^/.]+$/, '').slice(0, 24);
                    m.duration = res.duration;
                    m.sampleRate = res.sampleRate;
                    m._peaks = TAPE.extractPeaks(res.buffer, 64);

                    // Re-acquire active module instance
                    const activeInst = ctx.synth?.modules?.[fullId] || ctx.synth?.modules?.[m.id] || inst;

                    // Transfer PCM to AudioWorklet immediately for zero-latency playing
                    activeInst?.setAudioBuffer?.(res.buffer, res.sampleRate);

                    redrawSvg();
                    ctx.reRenderModal?.();
                    cb();
                    ctx.showToast?.(`LOADED: ${res.duration.toFixed(1)}s`);

                    // Encode to Opus Base64 in background for patch JSON persistence
                    TapeCodec.encodeToOpusBase64(res.buffer, res.sampleRate, ctx.synth?.ctx).then(b64 => {
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

        // Play / Stop preview button
        const playBtn = document.getElementById('tape-play-btn');
        const playText = document.getElementById('tape-play-text');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                const st = inst?.read?.();
                if (st?.isPlaying) {
                    inst?.stop?.();
                    if (playText) playText.textContent = 'PLAY';
                } else {
                    inst?.play?.();
                    if (playText) playText.textContent = 'STOP';
                }
            });
        }

        // Loop Toggle
        const loopBtn = document.getElementById('tape-loop-btn');
        if (loopBtn) {
            loopBtn.addEventListener('click', () => {
                m.loop = !m.loop;
                inst?.update?.(ctx.synth.ctx, inst, m);
                ctx.reRenderModal?.();
                cb();
            });
        }

        // Sliders
        const isStartPatched = ctx?.patched?.has('start_cv') || ctx?.patched?.has('cv_start');
        const isEndPatched = ctx?.patched?.has('end_cv') || ctx?.patched?.has('cv_end');
        const isSpeedPatched = ctx?.patched?.has('speed_cv') || ctx?.patched?.has('cv_speed');

        if (!isStartPatched) {
            UIHelpers.bindSlider('tape-slider-start', v => `${Math.round(v * 100)}%`, v => { m.start = v; onSliderChange(); }, 1, 0.0, 1.0);
            UIHelpers.bindScrubber('tape-slider-start-disp', 'tape-slider-start', v => `${Math.round(v * 100)}%`, v => { m.start = v; onSliderChange(); }, 1, 0.0, 1.0);
        }

        if (!isEndPatched) {
            UIHelpers.bindSlider('tape-slider-end', v => `${Math.round(v * 100)}%`, v => { m.end = v; onSliderChange(); }, 1, 0.0, 1.0);
            UIHelpers.bindScrubber('tape-slider-end-disp', 'tape-slider-end', v => `${Math.round(v * 100)}%`, v => { m.end = v; onSliderChange(); }, 1, 0.0, 1.0);
        }

        if (!isSpeedPatched) {
            UIHelpers.bindSlider('tape-slider-speed', TAPE.formatSpeed, v => {
                m.speedCv = v;
                m.speed = Math.pow(2.0, v);
                inst?.update?.(ctx.synth.ctx, inst, m);
                onSliderChange();
            }, 1, -2.0, 2.0);
            UIHelpers.bindScrubber('tape-slider-speed-disp', 'tape-slider-speed', TAPE.formatSpeed, v => {
                m.speedCv = v;
                m.speed = Math.pow(2.0, v);
                inst?.update?.(ctx.synth.ctx, inst, m);
                onSliderChange();
            }, 1, -2.0, 2.0);
        }
    },
    updateLive: (cell, data, isPlaying, targetModal, m) => {
        const playhead = data?.playhead ?? 0.0;
        const isTapePlaying = Boolean(data?.isPlaying);

        // Update modal playhead line in real-time
        if (targetModal) {
            const playheadLine = targetModal.querySelector('#tape-playhead-line');
            if (playheadLine) {
                const W = 320, padX = 6, innerW = W - padX * 2;
                const px = padX + Math.max(0, Math.min(1, playhead)) * innerW;
                playheadLine.setAttribute('x1', px.toFixed(1));
                playheadLine.setAttribute('x2', px.toFixed(1));
            }
            const playText = targetModal.querySelector('#tape-play-text');
            if (playText) {
                playText.textContent = isTapePlaying ? 'STOP' : 'PLAY';
            }
        }

        // Grid Cell active glow
        cell.querySelectorAll('[data-tape-bar]').forEach(bar => {
            bar.classList.toggle('bar-active-audio', isTapePlaying);
        });
    }
};

export const tapeDefs = { TAPE };

