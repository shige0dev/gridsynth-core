// src/modules/defs/tape.js
import { UIHelpers } from '../../ui/helpers.js?v=216';
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
     * Compute 64-bin peak array from Float32Array for lightweight SVG waveform drawing.
     */
    extractPeaks(buffer, numBins = 64) {
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
        const W = 280, H = 56;
        const padX = 4, padY = 4;
        const innerW = W - padX * 2, innerH = H - padY * 2;
        const midY = padY + innerH / 2;

        const startPct = Math.max(0, Math.min(1, m.start ?? 0.0));
        const endPct = Math.max(0, Math.min(1, m.end ?? 1.0));
        const isReverse = startPct > endPct;

        // Selection highlight box
        const x1 = padX + Math.min(startPct, endPct) * innerW;
        const x2 = padX + Math.max(startPct, endPct) * innerW;
        const boxW = Math.max(2, x2 - x1);

        const highlightColor = isReverse ? 'rgba(244, 63, 94, 0.25)' : 'rgba(56, 189, 248, 0.25)';
        const borderColor = isReverse ? '#f43f5e' : '#38bdf8';

        // Waveform bars
        const peaks = m._peaks || [];
        const numBars = peaks.length > 0 ? peaks.length : 48;
        const barW = innerW / numBars;

        let barsSvg = '';
        for (let i = 0; i < numBars; i++) {
            const bx = padX + i * barW;
            const val = peaks[i] !== undefined ? peaks[i] : (0.2 + 0.6 * Math.sin((i / numBars) * Math.PI));
            const barH = Math.max(2, val * (innerH / 2));
            barsSvg += `<line x1="${bx.toFixed(1)}" y1="${(midY - barH).toFixed(1)}" x2="${bx.toFixed(1)}" y2="${(midY + barH).toFixed(1)}" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/>`;
        }

        // Playhead position line
        const playX = padX + Math.max(0, Math.min(1, playhead)) * innerW;

        return `
            <svg id="tape-waveform-svg" viewBox="0 0 ${W} ${H}" class="w-full h-14 select-none bg-slate-950 rounded-lg border border-slate-800 shadow-inner overflow-hidden relative">
                <!-- Center zero line -->
                <line x1="${padX}" y1="${midY}" x2="${padX + innerW}" y2="${midY}" stroke="#1e293b" stroke-width="1"/>
                
                <!-- Waveform Peaks -->
                ${barsSvg}

                <!-- Active Window Highlight Region -->
                <rect x="${x1.toFixed(1)}" y="${padY}" width="${boxW.toFixed(1)}" height="${innerH}" fill="${highlightColor}" stroke="${borderColor}" stroke-width="1" stroke-dasharray="${isReverse ? '2,2' : 'none'}"/>

                <!-- Start marker line -->
                <line x1="${(padX + startPct * innerW).toFixed(1)}" y1="${padY}" x2="${(padX + startPct * innerW).toFixed(1)}" y2="${padY + innerH}" stroke="#38bdf8" stroke-width="2"/>
                <!-- End marker line -->
                <line x1="${(padX + endPct * innerW).toFixed(1)}" y1="${padY}" x2="${(padX + endPct * innerW).toFixed(1)}" y2="${padY + innerH}" stroke="#f43f5e" stroke-width="2"/>

                <!-- Dynamic Playhead Indicator -->
                <line id="tape-playhead-line" x1="${playX.toFixed(1)}" y1="${padY}" x2="${playX.toFixed(1)}" y2="${padY + innerH}" stroke="#fde047" stroke-width="2" class="drop-shadow-[0_0_6px_rgba(253,224,71,0.9)]"/>
            </svg>
        `;
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
        const speedDisp = isSpeedPatched ? 'EXT' : `${(m.speed ?? 1.0).toFixed(2)}x`;

        const isRev = (m.start ?? 0.0) > (m.end ?? 1.0);
        const durStr = `${(m.duration ?? 1.5).toFixed(2)}s`;

        return `
            <div class="space-y-2 p-1 text-slate-200">
                <!-- Header / File Loader -->
                <div class="flex items-center justify-between px-1">
                    <div class="flex items-center gap-1.5 overflow-hidden">
                        <i data-lucide="disc" class="w-3.5 h-3.5 text-cyan-400 shrink-0"></i>
                        <span class="text-[9px] font-bold text-cyan-300 truncate">${m.name || 'Tape 1'}</span>
                        <span class="text-[8px] font-mono text-slate-500">(${durStr})</span>
                    </div>
                    <label class="px-2 py-0.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 rounded text-[8px] font-bold cursor-pointer transition shadow-sm flex items-center gap-1">
                        <i data-lucide="upload" class="w-2.5 h-2.5"></i>
                        <span>LOAD AUDIO/MP4</span>
                        <input type="file" id="tape-file-input" accept="audio/*, video/mp4, video/*" class="hidden">
                    </label>
                </div>

                <!-- Waveform Canvas Container -->
                <div id="tape-waveform-wrap" class="w-full">
                    ${TAPE.renderWaveformSVG(m, 0.0)}
                </div>

                <!-- Playback Mode & Direction Status -->
                <div class="flex items-center justify-between px-1 py-0.5 bg-slate-950/60 rounded border border-slate-800 text-[8px]">
                    <div class="flex items-center gap-1.5">
                        <button id="tape-play-btn" class="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center gap-1">
                            <i data-lucide="play" class="w-2.5 h-2.5"></i>
                            <span id="tape-play-text">PLAY</span>
                        </button>
                        <button id="tape-loop-btn" class="px-2 py-0.5 rounded border ${m.loop ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-slate-900 text-slate-500 border-slate-800'} font-bold transition">
                            LOOP: ${m.loop ? 'ON' : 'OFF'}
                        </button>
                    </div>
                    <div class="flex items-center gap-1 font-mono font-bold">
                        <span class="text-slate-400">DIR:</span>
                        <span class="${isRev ? 'text-rose-400' : 'text-emerald-400'}">${isRev ? 'REVERSE ◀' : 'FORWARD ▶'}</span>
                    </div>
                </div>

                <!-- Vertical Sliders: START, END, SPEED (Standard GridSynth Rule) -->
                <div class="flex items-center justify-around py-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1">
                    ${UIHelpers.createVSliderHTML('tape-slider-start', 'START', 0.0, 1.0, 0.01, m.start ?? 0.0, 'start', 'cyan', isStartPatched, startDisp, 1)}
                    ${UIHelpers.createVSliderHTML('tape-slider-end', 'END', 0.0, 1.0, 0.01, m.end ?? 1.0, 'end', 'cyan', isEndPatched, endDisp, 1)}
                    ${UIHelpers.createVSliderHTML('tape-slider-speed', 'SPEED', 0.1, 4.0, 0.05, m.speed ?? 1.0, 'spd', 'cyan', isSpeedPatched, speedDisp, 2)}
                </div>

                <div class="text-[7.5px] text-slate-500 px-1 text-center italic">
                    * START &gt; END で自動逆再生 / SPEEDCVは-4V〜+4V (1V/oct)
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
                    const res = await TapeCodec.loadAudioFromFile(file, ctx.synth.ctx);

                    // Update module properties
                    m.name = file.name.replace(/\.[^/.]+$/, '').slice(0, 24);
                    m.duration = res.duration;
                    m.sampleRate = res.sampleRate;
                    m._peaks = TAPE.extractPeaks(res.buffer, 64);

                    // Transfer PCM to AudioWorklet immediately for zero-latency playing
                    inst?.setAudioBuffer?.(res.buffer, res.sampleRate);

                    redrawSvg();
                    ctx.reRenderModal?.();
                    cb();
                    ctx.showToast?.(`LOADED: ${res.duration.toFixed(1)}s (ENCODING OPUS...)`);

                    // Encode to Opus Base64 in background for patch JSON persistence
                    TapeCodec.encodeToOpusBase64(res.buffer, res.sampleRate, ctx.synth.ctx).then(b64 => {
                        m.data = b64;
                        cb();
                        ctx.showToast?.('TAPE SAVED TO PATCH');
                    }).catch(err => {
                        console.warn('[TAPE] Opus background encoding warning:', err);
                    });
                } catch (err) {
                    console.error('[TAPE] Load failed:', err);
                    ctx.showToast?.('LOAD FAILED');
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
            UIHelpers.bindSlider('tape-slider-speed', v => `${v.toFixed(2)}x`, v => { m.speed = v; onSliderChange(); }, 2, 0.1, 4.0);
            UIHelpers.bindScrubber('tape-slider-speed-disp', 'tape-slider-speed', v => `${v.toFixed(2)}x`, v => { m.speed = v; onSliderChange(); }, 2, 0.1, 4.0);
        }
    },
    updateLive: (cell, data, isPlaying, targetModal, m) => {
        const playhead = data?.playhead ?? 0.0;
        const isTapePlaying = Boolean(data?.isPlaying);

        // Update modal playhead line in real-time
        if (targetModal) {
            const playheadLine = targetModal.querySelector('#tape-playhead-line');
            if (playheadLine) {
                const W = 280, padX = 4, innerW = W - padX * 2;
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
