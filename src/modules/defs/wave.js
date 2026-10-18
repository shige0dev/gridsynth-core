// src/modules/defs/wave.js
import { UIHelpers } from '../../ui/helpers.js?v=218';
import { WaveCodec, TapeCodec } from '../../audio/wave-codec.js';

export const WAVE = {
    color: 'cyan',
    defaults: () => ({
        type: 'WAVE',
        name: 'Wave 1',
        codec: 'opus',
        sampleRate: 48000,
        maxDuration: 16.0,
        duration: 1.5,
        start: 0.0,
        end: 1.0,
        speed: 1.0,
        loop: false,
        retrigger: true,
        chopMode: 'off',
        chops: [],
        snapMode: false,
        data: '',
        peaks: null
    }),
    onNormalize: (m) => {
        if (m.peaks && Array.isArray(m.peaks)) {
            m._peaks = m.peaks;
        }
        if (m.chopMode === undefined) m.chopMode = 'off';
        if (!Array.isArray(m.chops)) m.chops = [];
        if (m.snapMode === undefined) m.snapMode = false;
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
    renderWaveformSVG: (m, playhead = 0.0, isPlaying = false, effStartVal = null, effEndVal = null, rawStartVal = null, rawEndVal = null, isStartPatched = false, isEndPatched = false) => {
        const W = 320, H = 100;
        const padX = 6, padY = 6;
        const innerW = W - padX * 2;
        const innerH = H - padY * 2;
        const midY = padY + (innerH - 10) / 2;

        const durSec = m.duration || 1.5;
        const durMs = durSec * 1000;

        const startPct = Math.max(0, Math.min(1, effStartVal !== null ? effStartVal : (m.start ?? 0.0)));
        const endPct = Math.max(0, Math.min(1, effEndVal !== null ? effEndVal : (m.end ?? 1.0)));
        const rawStartPct = Math.max(0, Math.min(1, rawStartVal !== null ? rawStartVal : startPct));
        const rawEndPct = Math.max(0, Math.min(1, rawEndVal !== null ? rawEndVal : endPct));

        const hasChops = Array.isArray(m.chops) && m.chops.length > 0;
        const isSlice = Boolean(m.snapMode) && hasChops;
        const showCvStart = isSlice && (isStartPatched || Math.abs(rawStartPct - startPct) > 0.005);
        const showCvEnd = isSlice && (isEndPatched || Math.abs(rawEndPct - endPct) > 0.005);

        const cvStartX = padX + rawStartPct * innerW;
        const cvEndX = padX + rawEndPct * innerW;

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
            const label = WAVE.formatMs(ms);
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

        // Chop guide lines, slice backgrounds, and labels
        let chopsSvg = '';
        if (m.chops && Array.isArray(m.chops) && m.chops.length > 0) {
            const allPts = [0.0, ...m.chops, 1.0].sort((a, b) => a - b);
            const numSlices = allPts.length - 1;

            for (let i = 0; i < numSlices; i++) {
                const s0 = allPts[i];
                const s1 = allPts[i + 1];
                const x0 = padX + s0 * innerW;
                const x1 = padX + s1 * innerW;
                const sliceW = x1 - x0;
                const isSelected = Math.abs(startPct - s0) < 0.015 && Math.abs(endPct - s1) < 0.015;
                if (isSelected) {
                    chopsSvg += `<rect x="${x0.toFixed(1)}" y="${padY}" width="${sliceW.toFixed(1)}" height="${(innerH - 10).toFixed(1)}" fill="#f59e0b" fill-opacity="0.15"/>`;
                }
                const midX = x0 + sliceW * 0.5;
                chopsSvg += `<text x="${midX.toFixed(1)}" y="${(padY + 8).toFixed(1)}" fill="${isSelected ? '#fbbf24' : '#64748b'}" font-size="6.5" font-family="monospace" font-weight="bold" text-anchor="middle" pointer-events="none">S${i + 1}</text>`;
            }

            m.chops.forEach((cp) => {
                const cx = padX + cp * innerW;
                chopsSvg += `<line x1="${cx.toFixed(1)}" y1="${padY}" x2="${cx.toFixed(1)}" y2="${(padY + innerH - 10).toFixed(1)}" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="3,2" opacity="0.85" pointer-events="none"/>`;
            });
        }

        // Raw CV Lines (White with subtle glow and triangle notches)
        const cvStartLineSvg = `<line id="tape-cv-start-line" x1="${cvStartX.toFixed(1)}" y1="${padY}" x2="${cvStartX.toFixed(1)}" y2="${padY + innerH}" stroke="#ffffff" stroke-width="1.4" class="drop-shadow-[0_0_4px_rgba(255,255,255,0.9)]" style="display: ${showCvStart ? 'block' : 'none'};"/>
        <polygon id="tape-cv-start-notch" points="${(cvStartX - 3).toFixed(1)},${padY} ${(cvStartX + 3).toFixed(1)},${padY} ${cvStartX.toFixed(1)},${(padY + 4).toFixed(1)}" fill="#ffffff" style="display: ${showCvStart ? 'block' : 'none'};"/>`;

        const cvEndLineSvg = `<line id="tape-cv-end-line" x1="${cvEndX.toFixed(1)}" y1="${padY}" x2="${cvEndX.toFixed(1)}" y2="${padY + innerH}" stroke="#ffffff" stroke-width="1.4" stroke-dasharray="3,2" class="drop-shadow-[0_0_4px_rgba(255,255,255,0.9)]" style="display: ${showCvEnd ? 'block' : 'none'};"/>
        <polygon id="tape-cv-end-notch" points="${(cvEndX - 3).toFixed(1)},${(padY + innerH).toFixed(1)} ${(cvEndX + 3).toFixed(1)},${(padY + innerH).toFixed(1)} ${cvEndX.toFixed(1)},${(padY + innerH - 4).toFixed(1)}" fill="#ffffff" style="display: ${showCvEnd ? 'block' : 'none'};"/>`;

        // Neon Green (#22c55e) markers for Start & End
        const startX = padX + startPct * innerW;
        const endX = padX + endPct * innerW;

        // Dynamic playhead position line
        const playX = padX + Math.max(0, Math.min(1, playhead)) * innerW;

        return `
            <svg id="tape-waveform-svg" viewBox="0 0 ${W} ${H}" class="w-full h-28 select-none bg-slate-950 rounded-xl border border-slate-800 shadow-inner overflow-hidden relative cursor-pointer">
                <!-- Center zero axis -->
                <line x1="${padX}" y1="${midY}" x2="${padX + innerW}" y2="${midY}" stroke="#334155" stroke-width="1"/>
                
                <!-- Oscilloscope Reticle Grid -->
                ${gridSvg}

                <!-- Representative Time Axis & Millisecond Labels -->
                ${timeLabelsSvg}

                <!-- Audio Waveform (Empty if silent) -->
                ${barsSvg}

                <!-- Chop Slices Guide & Highlights -->
                ${chopsSvg}

                <!-- Raw CV Lines (White) -->
                ${cvStartLineSvg}
                ${cvEndLineSvg}

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
        const startDisp = isStartPatched ? 'EXT' : `${Math.round((m.start ?? 0) * 100)}% (${WAVE.formatMs((m.start ?? 0) * durMs)})`;
        const endDisp = isEndPatched ? 'EXT' : `${Math.round((m.end ?? 1) * 100)}% (${WAVE.formatMs((m.end ?? 1) * durMs)})`;
        const speedCvVal = m.speedCv !== undefined ? m.speedCv : Math.log2(m.speed || 1.0);
        const speedDisp = isSpeedPatched ? 'EXT' : WAVE.formatSpeed(speedCvVal);
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
                        <span class="text-[9.5px] font-bold text-cyan-300 truncate max-w-[140px]">${m.name || 'Wave 1'}</span>
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
                    ${WAVE.renderWaveformSVG(m, 0.0, false)}
                </div>

                <!-- Dynamic Progress Bar (Monochrome Gray) -->
                <div class="w-full py-0.5">
                    <div class="w-full h-2 bg-slate-900 rounded-full border border-slate-700 relative shadow-inner overflow-visible">
                        <!-- Start - End Range Band (Neutral gray band) -->
                        <div id="tape-progress-range" class="absolute top-0 bottom-0 bg-slate-600/40 border-l border-r border-slate-400/80 rounded-sm" style="left: ${rangeLeft}%; width: ${rangeWidth}%;"></div>
                        <!-- Live Playback Fill (Neutral monochrome fill) -->
                        <div id="tape-progress-fill" class="absolute top-0 bottom-0 left-0 bg-zinc-300 rounded-full transition-none opacity-0" style="width: 0%;"></div>
                        <!-- Playhead Pin / Dot (Neutral silver dot) -->
                        <div id="tape-progress-dot" class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-zinc-200 border-2 border-slate-950 shadow-[0_0_6px_rgba(255,255,255,0.7)] transition-none z-10" style="left: ${(startPct * 100).toFixed(1)}%; display: block;"></div>
                    </div>
                </div>

                <!-- CHOP and SNAP Controls -->
                <div class="flex items-center justify-between gap-1 px-2 py-1 bg-slate-950/70 rounded-xl border border-slate-800 text-[8px] select-none">
                    <div class="flex items-center gap-1.5">
                        <span class="text-amber-400 font-bold text-[7.5px] font-mono">CHOP:</span>
                        <div class="flex items-center gap-1">
                            <button id="tape-chop-off" class="px-1.5 py-0.5 rounded border ${(m.chopMode ?? 'off') === 'off' ? 'bg-amber-950 text-amber-300 border-amber-500 font-bold shadow-sm shadow-amber-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'} transition cursor-pointer">OFF</button>
                            <button id="tape-chop-4" class="px-1.5 py-0.5 rounded border ${m.chopMode === '4' ? 'bg-amber-950 text-amber-300 border-amber-500 font-bold shadow-sm shadow-amber-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'} transition cursor-pointer">4</button>
                            <button id="tape-chop-8" class="px-1.5 py-0.5 rounded border ${m.chopMode === '8' ? 'bg-amber-950 text-amber-300 border-amber-500 font-bold shadow-sm shadow-amber-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'} transition cursor-pointer">8</button>
                            <button id="tape-chop-16" class="px-1.5 py-0.5 rounded border ${m.chopMode === '16' ? 'bg-amber-950 text-amber-300 border-amber-500 font-bold shadow-sm shadow-amber-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'} transition cursor-pointer">16</button>
                        </div>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="text-slate-400 font-bold text-[7.5px] font-mono">SNAP:</span>
                        <button id="tape-snap-btn" class="px-2 py-0.5 rounded border ${m.snapMode ? 'bg-emerald-950 text-emerald-300 border-emerald-500 font-bold shadow-sm shadow-emerald-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'} transition cursor-pointer font-bold">
                            ${m.snapMode ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>

                <!-- Row 1: PLAY Button, LOOP Button, RETRIG Button, and SPEED Slider -->
                <div class="flex items-center justify-between gap-2 px-2 py-1.5 bg-slate-950/70 rounded-xl border border-slate-800 text-[8.5px]">
                    <!-- Control Buttons (Icon Only for maximum space) -->
                    <div class="flex items-center gap-1 shrink-0">
                        <button id="tape-play-btn" class="h-6 w-7 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition flex items-center justify-center shadow-sm active:scale-95 cursor-pointer shrink-0" title="PLAY / STOP">
                            <i id="tape-play-icon" data-lucide="play" class="w-3 h-3"></i>
                        </button>
                        <button id="tape-loop-btn" class="h-6 w-7 rounded border ${loopActive ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'} font-bold transition flex items-center justify-center cursor-pointer shrink-0" title="LOOP (繝ｫ繝ｼ繝怜・逕・ON/OFF)">
                            <i data-lucide="repeat" class="w-3 h-3"></i>
                        </button>
                        <button id="tape-retrigger-btn" class="h-6 w-7 rounded border ${retriggerActive ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'} font-bold transition flex items-center justify-center cursor-pointer shrink-0" title="RETRIGGER (ON: 豈主屓蛻ｰ鬆ｭ蜀咲函 / OFF: 螳瑚ｵｰ縺ｾ縺ｧ繝医Μ繧ｬ繝ｼ辟｡隕・">
                            <i data-lucide="rotate-ccw" class="w-3 h-3"></i>
                        </button>
                    </div>

                    <div class="w-[1px] h-6 bg-slate-800 shrink-0"></div>

                    <!-- SPEED Horizontal Slider (Exponential: /4, /2, x1, x2, x4) -->
                    <div class="flex-1 min-w-[120px] flex flex-col justify-center gap-0.5 ${isSpeedPatched ? 'opacity-30 pointer-events-none' : ''}">
                        <div class="flex items-center justify-between text-[8px] font-mono font-bold leading-tight">
                            <span class="text-cyan-400">SPEED</span>
                            <span id="tape-slider-speed-disp" class="text-cyan-300 font-mono text-[8.5px] cursor-ns-resize hover:bg-slate-800/80 px-1 rounded leading-none">${speedDisp}</span>
                        </div>
                        <input type="range" id="tape-slider-speed" min="-2.0" max="2.0" step="0.05" value="${speedCvVal}" class="w-full h-1.5 bg-slate-800 rounded-lg accent-cyan-400 cursor-pointer" ${isSpeedPatched ? 'disabled' : ''} title="蜀咲函騾溷ｺｦ (謖・焚: /4, /2, x1, x2, x4)">
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
                <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-950/70 rounded-xl border border-slate-800 shadow-sm">
                    <!-- START (Large Horizontal Slider) -->
                    <div class="flex-1 min-w-0 flex flex-col gap-0.5 ${isStartPatched ? 'opacity-30 pointer-events-none' : ''}">
                        <div class="flex items-center justify-between gap-1 text-[8px] font-mono font-bold leading-tight whitespace-nowrap overflow-hidden">
                            <span class="text-[8.5px] text-emerald-400 shrink-0">START</span>
                            <span id="tape-slider-start-disp" class="text-emerald-300 font-mono text-[8px] font-bold cursor-ns-resize hover:bg-slate-800/80 px-1 py-0.5 rounded leading-none truncate">${startDisp}</span>
                        </div>
                        <input type="range" id="tape-slider-start" min="0.0" max="1.0" step="0.005" value="${m.start ?? 0.0}" class="w-full h-2.5 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer" ${isStartPatched ? 'disabled' : ''} title="髢句ｧ倶ｽ咲ｽｮ (0%縲・00%)">
                    </div>

                    <div class="w-[1px] h-7 bg-slate-800/90 shrink-0"></div>

                    <!-- END (Large Horizontal Slider) -->
                    <div class="flex-1 min-w-0 flex flex-col gap-0.5 ${isEndPatched ? 'opacity-30 pointer-events-none' : ''}">
                        <div class="flex items-center justify-between gap-1 text-[8px] font-mono font-bold leading-tight whitespace-nowrap overflow-hidden">
                            <span class="text-[8.5px] text-emerald-400 shrink-0">END</span>
                            <span id="tape-slider-end-disp" class="text-emerald-300 font-mono text-[8px] font-bold cursor-ns-resize hover:bg-slate-800/80 px-1 py-0.5 rounded leading-none truncate">${endDisp}</span>
                        </div>
                        <input type="range" id="tape-slider-end" min="0.0" max="1.0" step="0.005" value="${m.end ?? 1.0}" class="w-full h-2.5 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer" ${isEndPatched ? 'disabled' : ''} title="邨ゆｺ・ｽ咲ｽｮ (0%縲・00%)">
                    </div>
                </div>

                <div class="text-[7.5px] text-slate-500 px-1 text-center italic">
                    * PLAY: 蜊倅ｽ楢ｩｦ閨ｴ | LOOP: 繝ｫ繝ｼ繝怜・譖ｿ | RETRIG: ON=鬆ｭ蜃ｺ縺怜・髢・/ OFF=螳瑚ｵｰ縺ｾ縺ｧ繝医Μ繧ｬ繝ｼ辟｡隕・                </div>
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
        const initialInst = WAVE.getActiveInst(ctx, m);
        if (m._buffer && initialInst?.setAudioBuffer) {
            initialInst.setAudioBuffer(m._buffer, m.sampleRate || 48000);
        } else if (m.data && (!m.peaks || m.peaks.length === 0 || !m._buffer)) {
            const synth = ctx?.synth || window.__GS_SYNTH__;
            WaveCodec.decodeFromBase64(m.data, synth?.ctx).then(res => {
                if (res?.buffer) {
                    m._buffer = res.buffer;
                    m.duration = res.duration;
                    m.sampleRate = res.sampleRate;
                    if (!m.peaks || m.peaks.length === 0) {
                        m.peaks = WAVE.extractPeaks(res.buffer, 64);
                    }
                    m._peaks = m.peaks;
                    const inst = WAVE.getActiveInst(ctx, m);
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
            const activeInst = WAVE.getActiveInst(ctx, m);
            const st = activeInst?.read?.();
            if (svgWrap) {
                svgWrap.innerHTML = WAVE.renderWaveformSVG(
                    m,
                    st?.playhead ?? 0.0,
                    Boolean(st?.isPlaying),
                    st?.effStart ?? null,
                    st?.effEnd ?? null,
                    st?.rawStart ?? null,
                    st?.rawEnd ?? null,
                    Boolean(st?.startPatched ?? isStartPatched),
                    Boolean(st?.endPatched ?? isEndPatched)
                );
            }
        };

        const onSliderChange = () => {
            redrawSvg();
            const startP = Math.max(0, Math.min(1, m.start ?? 0.0));
            const endP = Math.max(0, Math.min(1, m.end ?? 1.0));
            const durMs = (m.duration ?? 1.5) * 1000;
            const startDispEl = root.querySelector('#tape-slider-start-disp');
            const endDispEl = root.querySelector('#tape-slider-end-disp');
            if (startDispEl && !isStartPatched) {
                let sliceBadge = '';
                if (m.chops && m.chops.length > 0) {
                    const allPts = [0.0, ...m.chops, 1.0].sort((a, b) => a - b);
                    for (let i = 0; i < allPts.length - 1; i++) {
                        if (Math.abs(startP - allPts[i]) < 0.015) {
                            sliceBadge = `S${i + 1}: `;
                            break;
                        }
                    }
                }
                startDispEl.textContent = `${sliceBadge}${Math.round(startP * 100)}% (${WAVE.formatMs(startP * durMs)})`;
            }
            if (endDispEl && !isEndPatched) {
                endDispEl.textContent = `${Math.round(endP * 100)}% (${WAVE.formatMs(endP * durMs)})`;
            }
            const inStart = root.querySelector('#tape-slider-start');
            const inEnd = root.querySelector('#tape-slider-end');
            if (inStart && Math.abs(parseFloat(inStart.value) - startP) > 0.002) inStart.value = startP;
            if (inEnd && Math.abs(parseFloat(inEnd.value) - endP) > 0.002) inEnd.value = endP;

            // Update progress bar range bounds
            const rangeEl = root.querySelector('#tape-progress-range');
            if (rangeEl) {
                rangeEl.style.left = `${(Math.min(startP, endP) * 100).toFixed(1)}%`;
                rangeEl.style.width = `${(Math.abs(endP - startP) * 100).toFixed(1)}%`;
            }
            // Update playhead pin to current start if stopped
            const dotEl = root.querySelector('#tape-progress-dot');
            const activeInst = WAVE.getActiveInst(ctx, m);
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
                    const res = await WaveCodec.loadAudioFromFile(file, audioCtx);

                    // Update module properties
                    m.name = file.name.replace(/\.[^/.]+$/, '').slice(0, 24);
                    m.duration = res.duration;
                    m.sampleRate = res.sampleRate;
                    const peaks = WAVE.extractPeaks(res.buffer, 64);
                    m.peaks = peaks;
                    m._peaks = peaks;
                    m._buffer = res.buffer; // Persist PCM in memory!

                    // Re-acquire active module instance and transfer PCM immediately
                    const activeInst = WAVE.getActiveInst(ctx, m);
                    if (activeInst && activeInst.setAudioBuffer) {
                        activeInst.setAudioBuffer(res.buffer, res.sampleRate);
                    }

                    redrawSvg();
                    ctx.reRenderModal?.();
                    cb();
                    ctx.showToast?.(`LOADED: ${res.duration.toFixed(1)}s`);

                    // Encode to Opus Base64 in background for patch JSON persistence
                    WaveCodec.encodeToOpusBase64(res.buffer, res.sampleRate, synth?.ctx).then(b64 => {
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

                const activeInst = WAVE.getActiveInst(ctx, m);
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
                    playBtn.innerHTML = `<i data-lucide="play" class="w-3 h-3"></i>`;
                    if (window.lucide) window.lucide.createIcons({ root: playBtn });
                    if (playheadLine) playheadLine.style.display = 'none';
                    if (progressFill) progressFill.style.opacity = '0';
                    if (progressDot) progressDot.style.left = `${(startP * 100).toFixed(1)}%`;
                } else {
                    activeInst.testPlay?.();
                    playBtn.innerHTML = `<i data-lucide="square" class="w-3 h-3"></i>`;
                    if (window.lucide) window.lucide.createIcons({ root: playBtn });
                    if (playheadLine) playheadLine.style.display = 'block';
                }
            });
        }

        // Loop Toggle (Icon Only)
        const loopBtn = root.querySelector('#tape-loop-btn');
        if (loopBtn) {
            loopBtn.addEventListener('click', () => {
                m.loop = !m.loop;
                const activeInst = WAVE.getActiveInst(ctx, m);
                const synth = ctx?.synth || window.__GS_SYNTH__;
                activeInst?.update?.(synth?.ctx, activeInst, m);
                loopBtn.className = `h-6 w-7 rounded border ${m.loop ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'} font-bold transition flex items-center justify-center cursor-pointer shrink-0`;
                cb();
            });
        }

        // Retrigger Mode Toggle (Icon Only: ON = restart / OFF = finish playback before retriggering)
        const retriggerBtn = root.querySelector('#tape-retrigger-btn');
        if (retriggerBtn) {
            retriggerBtn.addEventListener('click', () => {
                m.retrigger = !(m.retrigger !== false);
                const activeInst = WAVE.getActiveInst(ctx, m);
                const synth = ctx?.synth || window.__GS_SYNTH__;
                activeInst?.update?.(synth?.ctx, activeInst, m);
                const on = m.retrigger !== false;
                retriggerBtn.className = `h-6 w-7 rounded border ${on ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'} font-bold transition flex items-center justify-center cursor-pointer shrink-0`;
                cb();
            });
        }

        // Chop Buttons
        const setChop = (mode) => {
            m.chopMode = mode;
            if (mode === '4') {
                m.chops = [0.25, 0.5, 0.75];
                m.snapMode = true;
                m.start = 0.0;
                m.end = 0.25;
            } else if (mode === '8') {
                m.chops = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
                m.snapMode = true;
                m.start = 0.0;
                m.end = 0.125;
            } else if (mode === '16') {
                const arr = [];
                for (let i = 1; i < 16; i++) arr.push(parseFloat((i / 16.0).toFixed(4)));
                m.chops = arr;
                m.snapMode = true;
                m.start = 0.0;
                m.end = 0.0625;
            } else {
                m.chopMode = 'off';
                m.chops = [];
                m.snapMode = false;
                m.start = 0.0;
                m.end = 1.0;
            }
            const activeInst = WAVE.getActiveInst(ctx, m);
            const synth = ctx?.synth || window.__GS_SYNTH__;
            activeInst?.update?.(synth?.ctx, activeInst, m);
            ctx.reRenderModal?.();
            cb();
        };

        root.querySelector('#tape-chop-off')?.addEventListener('click', () => setChop('off'));
        root.querySelector('#tape-chop-4')?.addEventListener('click', () => setChop('4'));
        root.querySelector('#tape-chop-8')?.addEventListener('click', () => setChop('8'));
        root.querySelector('#tape-chop-16')?.addEventListener('click', () => setChop('16'));

        // SNAP Toggle Button
        root.querySelector('#tape-snap-btn')?.addEventListener('click', () => {
            m.snapMode = !m.snapMode;
            const activeInst = WAVE.getActiveInst(ctx, m);
            const synth = ctx?.synth || window.__GS_SYNTH__;
            activeInst?.update?.(synth?.ctx, activeInst, m);
            ctx.reRenderModal?.();
            cb();
        });

        // Waveform SVG click to select slice
        const svgEl = root.querySelector('#tape-waveform-svg');
        if (svgEl) {
            svgEl.addEventListener('click', (e) => {
                if (e.target.closest('#tape-start-badge') || e.target.closest('#tape-end-badge')) return;
                if (!m.chops || m.chops.length === 0) return;
                const rect = svgEl.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const svgW = 320, padX = 6, innerW = svgW - padX * 2;
                const normX = (clickX / rect.width) * svgW;
                const pct = Math.max(0.0, Math.min(1.0, (normX - padX) / innerW));

                const allPts = [0.0, ...m.chops, 1.0].sort((a, b) => a - b);
                let foundIdx = 0;
                for (let i = 0; i < allPts.length - 1; i++) {
                    if (pct >= allPts[i] && (i === allPts.length - 2 || pct < allPts[i + 1])) {
                        foundIdx = i;
                        break;
                    }
                }
                m.start = allPts[foundIdx];
                m.end = allPts[foundIdx + 1];
                onSliderChange();
            });
        }

        // Sliders
        const isStartPatched = ctx?.patched?.has('start_cv') || ctx?.patched?.has('cv_start');
        const isEndPatched = ctx?.patched?.has('end_cv') || ctx?.patched?.has('cv_end');
        const isSpeedPatched = ctx?.patched?.has('speed_cv') || ctx?.patched?.has('cv_speed');

        if (!isStartPatched) {
            const getStartVal = v => {
                if (m.snapMode && m.chops && m.chops.length > 0) {
                    const allPts = [0.0, ...m.chops, 1.0].sort((a, b) => a - b);
                    let closest = allPts[0];
                    let minDiff = 999;
                    for (const pt of allPts.slice(0, -1)) {
                        const diff = Math.abs(pt - v);
                        if (diff < minDiff) { minDiff = diff; closest = pt; }
                    }
                    return closest;
                }
                return v;
            };
            const formatStart = v => {
                const durMs = (m.duration ?? 1.5) * 1000;
                let sliceBadge = '';
                if (m.chops && m.chops.length > 0) {
                    const allPts = [0.0, ...m.chops, 1.0].sort((a, b) => a - b);
                    for (let i = 0; i < allPts.length - 1; i++) {
                        if (Math.abs(v - allPts[i]) < 0.015) {
                            sliceBadge = `S${i + 1}: `;
                            break;
                        }
                    }
                }
                return `${sliceBadge}${Math.round(v * 100)}% (${WAVE.formatMs(v * durMs)})`;
            };
            const applyStart = v => {
                const snapped = getStartVal(v);
                m.start = snapped;
                if (m.snapMode && m.chops && m.chops.length > 0 && !isEndPatched) {
                    const allPts = [0.0, ...m.chops, 1.0].sort((a, b) => a - b);
                    const idx = allPts.findIndex(p => Math.abs(p - snapped) < 0.01);
                    if (idx >= 0 && idx + 1 < allPts.length) {
                        m.end = allPts[idx + 1];
                    }
                }
                onSliderChange();
            };
            UIHelpers.bindSlider('tape-slider-start', formatStart, applyStart, 1, 0.0, 1.0);
            UIHelpers.bindScrubber('tape-slider-start-disp', 'tape-slider-start', formatStart, applyStart, 1, 0.0, 1.0);
        }

        if (!isEndPatched) {
            const getEndVal = v => {
                if (m.snapMode && m.chops && m.chops.length > 0) {
                    const allPts = [0.0, ...m.chops, 1.0].sort((a, b) => a - b);
                    let closest = allPts[allPts.length - 1];
                    let minDiff = 999;
                    for (const pt of allPts.slice(1)) {
                        const diff = Math.abs(pt - v);
                        if (diff < minDiff) { minDiff = diff; closest = pt; }
                    }
                    return closest;
                }
                return v;
            };
            const formatEnd = v => `${Math.round(v * 100)}% (${WAVE.formatMs(v * ((m.duration ?? 1.5) * 1000))})`;
            const applyEnd = v => {
                m.end = getEndVal(v);
                onSliderChange();
            };
            UIHelpers.bindSlider('tape-slider-end', formatEnd, applyEnd, 1, 0.0, 1.0);
            UIHelpers.bindScrubber('tape-slider-end-disp', 'tape-slider-end', formatEnd, applyEnd, 1, 0.0, 1.0);
        }

        if (!isSpeedPatched) {
            UIHelpers.bindSlider('tape-slider-speed', WAVE.formatSpeed, v => {
                m.speedCv = v;
                m.speed = Math.pow(2.0, v);
                const activeInst = WAVE.getActiveInst(ctx, m);
                const synth = ctx?.synth || window.__GS_SYNTH__;
                activeInst?.update?.(synth?.ctx, activeInst, m);
                onSliderChange();
            }, 1, -2.0, 2.0);
            UIHelpers.bindScrubber('tape-slider-speed-disp', 'tape-slider-speed', WAVE.formatSpeed, v => {
                m.speedCv = v;
                m.speed = Math.pow(2.0, v);
                const activeInst = WAVE.getActiveInst(ctx, m);
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
        const rawStart = data?.rawStart !== undefined ? data.rawStart : effStart;
        const rawEnd = data?.rawEnd !== undefined ? data.rawEnd : effEnd;
        const startPatched = Boolean(data?.startPatched ?? m.startPatched);
        const endPatched = Boolean(data?.endPatched ?? m.endPatched);
        const snapMode = Boolean(data?.snapMode ?? m.snapMode);

        // Update modal playhead line, Start/End CV markers, and progress bar in real-time
        if (targetModal) {
            const W = 320, H = 100, padX = 6, padY = 6;
            const innerW = W - padX * 2;
            const innerH = H - padY * 2;

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

            // 2. Dynamic Raw CV Markers (White lines & triangle notches)
            const hasChops = Array.isArray(m.chops) && m.chops.length > 0;
            const isSlice = snapMode && hasChops;
            const showCvStart = isSlice && (startPatched || Math.abs(rawStart - effStart) > 0.005);
            const showCvEnd = isSlice && (endPatched || Math.abs(rawEnd - effEnd) > 0.005);

            const cvStartX = padX + Math.max(0, Math.min(1, rawStart)) * innerW;
            const cvEndX = padX + Math.max(0, Math.min(1, rawEnd)) * innerW;

            const cvStartLine = targetModal.querySelector('#tape-cv-start-line');
            const cvStartNotch = targetModal.querySelector('#tape-cv-start-notch');
            if (cvStartLine) {
                cvStartLine.style.display = showCvStart ? 'block' : 'none';
                if (showCvStart) {
                    cvStartLine.setAttribute('x1', cvStartX.toFixed(1));
                    cvStartLine.setAttribute('x2', cvStartX.toFixed(1));
                }
            }
            if (cvStartNotch) {
                cvStartNotch.style.display = showCvStart ? 'block' : 'none';
                if (showCvStart) {
                    cvStartNotch.setAttribute('points', `${(cvStartX - 3).toFixed(1)},${padY} ${(cvStartX + 3).toFixed(1)},${padY} ${cvStartX.toFixed(1)},${(padY + 4).toFixed(1)}`);
                }
            }

            const cvEndLine = targetModal.querySelector('#tape-cv-end-line');
            const cvEndNotch = targetModal.querySelector('#tape-cv-end-notch');
            if (cvEndLine) {
                cvEndLine.style.display = showCvEnd ? 'block' : 'none';
                if (showCvEnd) {
                    cvEndLine.setAttribute('x1', cvEndX.toFixed(1));
                    cvEndLine.setAttribute('x2', cvEndX.toFixed(1));
                }
            }
            if (cvEndNotch) {
                cvEndNotch.style.display = showCvEnd ? 'block' : 'none';
                if (showCvEnd) {
                    cvEndNotch.setAttribute('points', `${(cvEndX - 3).toFixed(1)},${(padY + innerH).toFixed(1)} ${(cvEndX + 3).toFixed(1)},${(padY + innerH).toFixed(1)} ${cvEndX.toFixed(1)},${(padY + innerH - 4).toFixed(1)}`);
                }
            }

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

            // 4. Trigger / Play Button Icon
            const playBtn = targetModal.querySelector('#tape-play-btn');
            if (playBtn) {
                const icon = playBtn.querySelector('[data-lucide]');
                const cur = icon?.getAttribute('data-lucide');
                const target = isTapePlaying ? 'square' : 'play';
                if (cur !== target) {
                    playBtn.innerHTML = `<i data-lucide="${target}" class="w-3 h-3"></i>`;
                    if (window.lucide) window.lucide.createIcons({ root: playBtn });
                }
            }

            // 5. Update CV-patched start/end display badges
            const durMs = (m.duration ?? 1.5) * 1000;
            const sliderStart = targetModal.querySelector('#tape-slider-start');
            if (sliderStart && sliderStart.disabled) {
                const disp = targetModal.querySelector('#tape-slider-start-disp');
                if (disp) disp.textContent = `EXT (${Math.round(effStart * 100)}% / ${WAVE.formatMs(effStart * durMs)})`;
            }
            const sliderEnd = targetModal.querySelector('#tape-slider-end');
            if (sliderEnd && sliderEnd.disabled) {
                const disp = targetModal.querySelector('#tape-slider-end-disp');
                if (disp) disp.textContent = `EXT (${Math.round(effEnd * 100)}% / ${WAVE.formatMs(effEnd * durMs)})`;
            }
        }

        // Grid Cell active glow
        cell.querySelectorAll('[data-tape-bar]').forEach(bar => {
            bar.classList.toggle('bar-active-audio', isTapePlaying);
        });
    }
};

export const WAVE = TAPE;
export const waveDefs = { WAVE, TAPE };
export const tapeDefs = waveDefs;
export default waveDefs;

