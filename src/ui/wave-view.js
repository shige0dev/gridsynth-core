// src/ui/wave-view.js
/**
 * WAVE Module Waveform Visualization, Bound Resolution & Live DOM Synchronizer
 */

const W = 320;
const H = 100;
const PAD_X = 6;
const PAD_Y = 6;
const INNER_W = W - PAD_X * 2;
const INNER_H = H - PAD_Y * 2;

export const WaveView = {
    W,
    H,
    PAD_X,
    PAD_Y,
    INNER_W,
    INNER_H,

    formatMs(ms) {
        if (ms <= 0) return '0ms';
        if (ms < 1000) return `${Math.round(ms)}ms`;
        if (ms < 10000) {
            const s = ms / 1000;
            return Number.isInteger(s) ? `${s}s` : (ms % 100 === 0 ? `${s.toFixed(1)}s` : `${s.toFixed(2)}s`);
        }
        return `${(ms / 1000).toFixed(1)}s`;
    },

    formatSpeed(v) {
        if (Math.abs(v) < 0.02) return 'x1';
        if (Math.abs(v - (-2.0)) < 0.02) return '/4';
        if (Math.abs(v - (-1.0)) < 0.02) return '/2';
        if (Math.abs(v - 1.0) < 0.02) return 'x2';
        if (Math.abs(v - 2.0) < 0.02) return 'x4';
        const mult = Math.pow(2.0, v);
        if (v < 0) {
            const denom = Math.pow(2.0, -v);
            return `/${denom < 10 ? denom.toFixed(1) : denom.toFixed(0)}`;
        }
        return `x${mult.toFixed(1)}`;
    },

    /**
     * Convert raw Start/End CV values (0.0~1.0) into effective Start/End playback positions.
     */
    resolveEffectiveBounds(m, rawStartVal = null, rawEndVal = null) {
        const rawS = Math.max(0.0, Math.min(1.0, rawStartVal !== null ? rawStartVal : (m.start ?? 0.0)));
        const rawE = Math.max(0.0, Math.min(1.0, rawEndVal !== null ? rawEndVal : (m.end ?? 1.0)));

        let s = rawS;
        let e = rawE;

        if (m.snapMode && Array.isArray(m.chops) && m.chops.length > 0) {
            const pts = [0.0, ...m.chops, 1.0].sort((a, b) => a - b);
            const N = pts.length - 1;
            const getIndex = (val) => {
                const clamped = Math.max(0.0, Math.min(0.999999, val + 1e-7));
                return Math.min(N - 1, Math.max(0, Math.floor(clamped * N)));
            };

            const isDiff = Math.abs(rawS - rawE) > 0.001;
            if (!isDiff) {
                const idxS = getIndex(rawS);
                s = pts[idxS];
                e = pts[idxS + 1];
            } else if (rawS < rawE) {
                const idxS = getIndex(rawS);
                const idxE = getIndex(Math.max(rawS, rawE - 0.0001));
                s = pts[idxS];
                e = pts[idxE + 1];
            } else {
                const idxS = getIndex(Math.max(rawE, rawS - 0.0001));
                const idxE = getIndex(rawE);
                s = pts[idxS + 1];
                e = pts[idxE];
            }
        }

        return {
            start: Math.max(0.0, Math.min(1.0, s)),
            end: Math.max(0.0, Math.min(1.0, e)),
            rawStart: rawS,
            rawEnd: rawE
        };
    },

    formatBoundDisp(m, rawVal, effVal, isPatched = false) {
        const durMs = (m.duration ?? 1.5) * 1000;
        const cvPct = Math.round(Math.max(0, Math.min(1, rawVal)) * 100);
        const effMsStr = this.formatMs(Math.max(0, Math.min(1, effVal)) * durMs);
        return isPatched ? `EXT ${cvPct}% (${effMsStr})` : `${cvPct}% (${effMsStr})`;
    },

    renderWaveformSVG(m, playhead = 0.0, isPlaying = false, effStartVal = null, effEndVal = null, rawStartVal = null, rawEndVal = null) {
        const midY = PAD_Y + (INNER_H - 10) / 2;
        const durMs = (m.duration || 1.5) * 1000;

        const bounds = this.resolveEffectiveBounds(m, rawStartVal, rawEndVal);
        const startPct = Math.max(0, Math.min(1, effStartVal !== null ? effStartVal : bounds.start));
        const endPct = Math.max(0, Math.min(1, effEndVal !== null ? effEndVal : bounds.end));
        const cvStartX = PAD_X + bounds.rawStart * INNER_W;
        const cvEndX = PAD_X + bounds.rawEnd * INNER_W;

        let gridSvg = '';
        for (let gx = 1; gx <= 7; gx++) {
            const x = PAD_X + (INNER_W / 8) * gx;
            const strokeCol = gx === 4 ? '#334155' : (gx % 2 === 0 ? '#1e293b' : '#0f172a');
            gridSvg += `<line x1="${x.toFixed(1)}" y1="${PAD_Y}" x2="${x.toFixed(1)}" y2="${(PAD_Y + INNER_H - 10).toFixed(1)}" stroke="${strokeCol}" stroke-width="0.8" stroke-dasharray="2,2"/>`;
        }
        for (let gy = 1; gy <= 3; gy++) {
            const y = PAD_Y + ((INNER_H - 10) / 4) * gy;
            gridSvg += `<line x1="${PAD_X}" y1="${y.toFixed(1)}" x2="${PAD_X + INNER_W}" y2="${y.toFixed(1)}" stroke="#1e293b" stroke-width="0.8" stroke-dasharray="2,2"/>`;
        }

        const intervals = [0, 0.25, 0.5, 0.75, 1.0];
        let timeLabelsSvg = '';
        intervals.forEach((pct, idx) => {
            const x = PAD_X + pct * INNER_W;
            const label = this.formatMs(pct * durMs);
            const anchor = idx === 0 ? 'start' : (idx === intervals.length - 1 ? 'end' : 'middle');
            const drawX = idx === 0 ? PAD_X + 2 : (idx === intervals.length - 1 ? PAD_X + INNER_W - 2 : x);
            timeLabelsSvg += `<line x1="${x.toFixed(1)}" y1="${(PAD_Y + INNER_H - 9).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(PAD_Y + INNER_H - 6).toFixed(1)}" stroke="#475569" stroke-width="1"/>`;
            timeLabelsSvg += `<text x="${drawX.toFixed(1)}" y="${(PAD_Y + INNER_H - 1.5).toFixed(1)}" fill="${idx === 2 ? '#38bdf8' : '#94a3b8'}" font-size="7" font-family="monospace" font-weight="bold" text-anchor="${anchor}">${label}</text>`;
        });

        const peaks = m.peaks || m._peaks || [];
        const hasAudio = peaks.length > 0 && peaks.some(p => p > 0.005);
        let barsSvg = '';
        if (hasAudio) {
            const numBars = peaks.length;
            const barW = INNER_W / numBars;
            for (let i = 0; i < numBars; i++) {
                const bx = PAD_X + i * barW + barW * 0.5;
                const val = peaks[i] || 0.0;
                if (val > 0.005) {
                    const barH = Math.max(1.5, val * ((INNER_H - 10) * 0.46));
                    barsSvg += `<line x1="${bx.toFixed(1)}" y1="${(midY - barH).toFixed(1)}" x2="${bx.toFixed(1)}" y2="${(midY + barH).toFixed(1)}" stroke="#06b6d4" stroke-width="1.8" stroke-linecap="round" opacity="0.85"/>`;
                }
            }
        } else {
            barsSvg = `<text x="${(W / 2).toFixed(1)}" y="${(midY + 3.5).toFixed(1)}" fill="#334155" font-size="8.5" font-family="monospace" font-weight="bold" text-anchor="middle" letter-spacing="1">NO AUDIO LOADED</text>`;
        }

        let chopsSvg = '';
        if (Array.isArray(m.chops) && m.chops.length > 0) {
            const allPts = [0.0, ...m.chops, 1.0].sort((a, b) => a - b);
            const rMin = Math.min(startPct, endPct);
            const rMax = Math.max(startPct, endPct);
            for (let i = 0; i < allPts.length - 1; i++) {
                const s0 = allPts[i], s1 = allPts[i + 1];
                const x0 = PAD_X + s0 * INNER_W, x1 = PAD_X + s1 * INNER_W;
                const sliceW = x1 - x0;
                const isSelected = Boolean(m.snapMode) && (s0 >= rMin - 0.01) && (s1 <= rMax + 0.01) && (rMax - rMin > 0.005);
                chopsSvg += `<rect data-slice-rect="${i}" data-s0="${s0}" data-s1="${s1}" x="${x0.toFixed(1)}" y="${PAD_Y}" width="${sliceW.toFixed(1)}" height="${(INNER_H - 10).toFixed(1)}" fill="#f59e0b" fill-opacity="0.15" style="display: ${isSelected ? 'block' : 'none'};"/>`;
                chopsSvg += `<text data-slice-label="${i}" data-s0="${s0}" data-s1="${s1}" x="${(x0 + sliceW * 0.5).toFixed(1)}" y="${(PAD_Y + 8).toFixed(1)}" fill="${isSelected ? '#fbbf24' : '#64748b'}" font-size="6.5" font-family="monospace" font-weight="bold" text-anchor="middle" pointer-events="none">S${i + 1}</text>`;
            }
            m.chops.forEach((cp) => {
                const cx = PAD_X + cp * INNER_W;
                chopsSvg += `<line x1="${cx.toFixed(1)}" y1="${PAD_Y}" x2="${cx.toFixed(1)}" y2="${(PAD_Y + INNER_H - 10).toFixed(1)}" stroke="#64748b" stroke-width="0.9" opacity="0.85" pointer-events="none"/>`;
            });
        }

        const startX = PAD_X + startPct * INNER_W;
        const endX = PAD_X + endPct * INNER_W;
        const playX = PAD_X + Math.max(0, Math.min(1, playhead)) * INNER_W;

        const startNotchPts = `${cvStartX.toFixed(1)},${PAD_Y} ${cvStartX.toFixed(1)},${(PAD_Y + 6).toFixed(1)} ${(cvStartX + 5.5).toFixed(1)},${(PAD_Y + 3).toFixed(1)}`;
        const endNotchPts = `${cvEndX.toFixed(1)},${PAD_Y} ${cvEndX.toFixed(1)},${(PAD_Y + 6).toFixed(1)} ${(cvEndX - 5.5).toFixed(1)},${(PAD_Y + 3).toFixed(1)}`;

        return `
            <svg id="wave-waveform-svg" viewBox="0 0 ${W} ${H}" class="w-full h-28 select-none bg-slate-950 rounded-xl border border-slate-800 shadow-inner overflow-hidden relative cursor-pointer">
                <line x1="${PAD_X}" y1="${midY}" x2="${PAD_X + INNER_W}" y2="${midY}" stroke="#334155" stroke-width="1"/>
                ${gridSvg}
                ${timeLabelsSvg}
                ${barsSvg}
                ${chopsSvg}
                <line id="wave-end-line" x1="${endX.toFixed(1)}" y1="${PAD_Y}" x2="${endX.toFixed(1)}" y2="${PAD_Y + INNER_H}" stroke="#22c55e" stroke-width="2.0" class="drop-shadow-[0_0_4px_rgba(34,197,94,0.85)]"/>
                <line id="wave-start-line" x1="${startX.toFixed(1)}" y1="${PAD_Y}" x2="${startX.toFixed(1)}" y2="${PAD_Y + INNER_H}" stroke="#22c55e" stroke-width="2.0" class="drop-shadow-[0_0_4px_rgba(34,197,94,0.85)]"/>
                <rect id="wave-end-badge" x="${(endX - 5).toFixed(1)}" y="${PAD_Y + 7}" width="10" height="9" rx="1.5" fill="#14532d" stroke="#22c55e" stroke-width="1"/>
                <text id="wave-end-text" x="${endX.toFixed(1)}" y="${PAD_Y + 14}" fill="#4ade80" font-size="6.5" font-family="monospace" font-weight="bold" text-anchor="middle">E</text>
                <rect id="wave-start-badge" x="${(startX - 5).toFixed(1)}" y="${PAD_Y + 7}" width="10" height="9" rx="1.5" fill="#14532d" stroke="#22c55e" stroke-width="1"/>
                <text id="wave-start-text" x="${startX.toFixed(1)}" y="${PAD_Y + 14}" fill="#4ade80" font-size="6.5" font-family="monospace" font-weight="bold" text-anchor="middle">S</text>
                <line id="wave-cv-start-line" x1="${cvStartX.toFixed(1)}" y1="${PAD_Y}" x2="${cvStartX.toFixed(1)}" y2="${PAD_Y + INNER_H}" stroke="#ffffff" stroke-width="1.3" class="drop-shadow-[0_0_4px_rgba(255,255,255,0.9)]"/>
                <polygon id="wave-cv-start-notch" points="${startNotchPts}" fill="#ffffff"/>
                <line id="wave-cv-end-line" x1="${cvEndX.toFixed(1)}" y1="${PAD_Y}" x2="${cvEndX.toFixed(1)}" y2="${PAD_Y + INNER_H}" stroke="#ffffff" stroke-width="1.3" class="drop-shadow-[0_0_4px_rgba(255,255,255,0.9)]"/>
                <polygon id="wave-cv-end-notch" points="${endNotchPts}" fill="#ffffff"/>
                <line id="wave-playhead-line" x1="${playX.toFixed(1)}" y1="${PAD_Y}" x2="${playX.toFixed(1)}" y2="${PAD_Y + INNER_H}" stroke="#fde047" stroke-width="2.2" class="drop-shadow-[0_0_8px_rgba(253,224,71,1)]" style="display: ${isPlaying ? 'block' : 'none'};"/>
            </svg>
        `;
    },

    /**
     * Unified real-time DOM updater for SVG markers, play button, and Start/End badges.
     */
    syncModalDOM(targetModal, m, state = {}) {
        if (!targetModal || !m) return;

        const startPatched = Boolean(state.startPatched ?? m.startPatched);
        const endPatched = Boolean(state.endPatched ?? m.endPatched);
        const rawStart = state.rawStart ?? m.start ?? 0.0;
        const rawEnd = state.rawEnd ?? m.end ?? 1.0;
        const bounds = this.resolveEffectiveBounds(m, rawStart, rawEnd);
        const effStart = (startPatched || endPatched) && state.effStart !== undefined ? state.effStart : bounds.start;
        const effEnd = (startPatched || endPatched) && state.effEnd !== undefined ? state.effEnd : bounds.end;

        const startX = PAD_X + Math.max(0, Math.min(1, effStart)) * INNER_W;
        const endX = PAD_X + Math.max(0, Math.min(1, effEnd)) * INNER_W;

        const startLine = targetModal.querySelector('#wave-start-line');
        const startBadge = targetModal.querySelector('#wave-start-badge');
        const startText = targetModal.querySelector('#wave-start-text');
        if (startLine) { startLine.setAttribute('x1', startX.toFixed(1)); startLine.setAttribute('x2', startX.toFixed(1)); }
        if (startBadge) startBadge.setAttribute('x', (startX - 5).toFixed(1));
        if (startText) startText.setAttribute('x', startX.toFixed(1));

        const endLine = targetModal.querySelector('#wave-end-line');
        const endBadge = targetModal.querySelector('#wave-end-badge');
        const endText = targetModal.querySelector('#wave-end-text');
        if (endLine) { endLine.setAttribute('x1', endX.toFixed(1)); endLine.setAttribute('x2', endX.toFixed(1)); }
        if (endBadge) endBadge.setAttribute('x', (endX - 5).toFixed(1));
        if (endText) endText.setAttribute('x', endX.toFixed(1));

        const cvStartX = PAD_X + Math.max(0, Math.min(1, bounds.rawStart)) * INNER_W;
        const cvEndX = PAD_X + Math.max(0, Math.min(1, bounds.rawEnd)) * INNER_W;

        const cvStartLine = targetModal.querySelector('#wave-cv-start-line');
        const cvStartNotch = targetModal.querySelector('#wave-cv-start-notch');
        if (cvStartLine) { cvStartLine.style.display = 'block'; cvStartLine.setAttribute('x1', cvStartX.toFixed(1)); cvStartLine.setAttribute('x2', cvStartX.toFixed(1)); }
        if (cvStartNotch) { cvStartNotch.style.display = 'block'; cvStartNotch.setAttribute('points', `${cvStartX.toFixed(1)},${PAD_Y} ${cvStartX.toFixed(1)},${(PAD_Y + 6).toFixed(1)} ${(cvStartX + 5.5).toFixed(1)},${(PAD_Y + 3).toFixed(1)}`); }

        const cvEndLine = targetModal.querySelector('#wave-cv-end-line');
        const cvEndNotch = targetModal.querySelector('#wave-cv-end-notch');
        if (cvEndLine) { cvEndLine.style.display = 'block'; cvEndLine.setAttribute('x1', cvEndX.toFixed(1)); cvEndLine.setAttribute('x2', cvEndX.toFixed(1)); }
        if (cvEndNotch) { cvEndNotch.style.display = 'block'; cvEndNotch.setAttribute('points', `${cvEndX.toFixed(1)},${PAD_Y} ${cvEndX.toFixed(1)},${(PAD_Y + 6).toFixed(1)} ${(cvEndX - 5.5).toFixed(1)},${(PAD_Y + 3).toFixed(1)}`); }

        const rMin = Math.min(effStart, effEnd), rMax = Math.max(effStart, effEnd);
        const isSnap = Boolean(m.snapMode);
        targetModal.querySelectorAll('[data-slice-rect]').forEach(rectEl => {
            const s0 = parseFloat(rectEl.getAttribute('data-s0') || '0');
            const s1 = parseFloat(rectEl.getAttribute('data-s1') || '0');
            const sel = isSnap && (s0 >= rMin - 0.01) && (s1 <= rMax + 0.01) && (rMax - rMin > 0.005);
            rectEl.style.display = sel ? 'block' : 'none';
        });
        targetModal.querySelectorAll('[data-slice-label]').forEach(lblEl => {
            const s0 = parseFloat(lblEl.getAttribute('data-s0') || '0');
            const s1 = parseFloat(lblEl.getAttribute('data-s1') || '0');
            const sel = isSnap && (s0 >= rMin - 0.01) && (s1 <= rMax + 0.01) && (rMax - rMin > 0.005);
            lblEl.setAttribute('fill', sel ? '#fbbf24' : '#64748b');
        });

        const isWavePlaying = Boolean(state.isPlaying);
        const playhead = state.playhead ?? 0.0;
        const playheadLine = targetModal.querySelector('#wave-playhead-line');
        if (playheadLine) {
            if (isWavePlaying) {
                playheadLine.style.display = 'block';
                const px = PAD_X + Math.max(0, Math.min(1, playhead)) * INNER_W;
                playheadLine.setAttribute('x1', px.toFixed(1));
                playheadLine.setAttribute('x2', px.toFixed(1));
            } else {
                playheadLine.style.display = 'none';
            }
        }

        const playBtn = targetModal.querySelector('#wave-play-btn');
        if (playBtn && state.isPlaying !== undefined) {
            const cur = playBtn.querySelector('[data-lucide]')?.getAttribute('data-lucide');
            const target = isWavePlaying ? 'square' : 'play';
            if (cur !== target) {
                playBtn.innerHTML = `<i data-lucide="${target}" class="w-3 h-3"></i>`;
                if (window.lucide) window.lucide.createIcons({ root: playBtn });
            }
        }

        const startDisp = targetModal.querySelector('#wave-slider-start-disp');
        const endDisp = targetModal.querySelector('#wave-slider-end-disp');
        const inStart = targetModal.querySelector('#wave-slider-start');
        const inEnd = targetModal.querySelector('#wave-slider-end');
        if (startDisp) startDisp.textContent = this.formatBoundDisp(m, bounds.rawStart, effStart, startPatched);
        if (endDisp) endDisp.textContent = this.formatBoundDisp(m, bounds.rawEnd, effEnd, endPatched);
        if (inStart && !startPatched) inStart.value = bounds.rawStart;
        if (inEnd && !endPatched) inEnd.value = bounds.rawEnd;
    },

    updateLive(cell, data, isPlaying, targetModal, m) {
        if (targetModal) {
            this.syncModalDOM(targetModal, m, {
                playhead: data?.playhead ?? 0.0,
                isPlaying: Boolean(data?.isPlaying),
                startPatched: Boolean(data?.startPatched ?? m.startPatched),
                endPatched: Boolean(data?.endPatched ?? m.endPatched),
                rawStart: data?.rawStart,
                rawEnd: data?.rawEnd,
                effStart: data?.effStart,
                effEnd: data?.effEnd
            });
        }
        cell?.querySelectorAll('[data-wave-bar]').forEach(bar => {
            bar.classList.toggle('bar-active-audio', Boolean(data?.isPlaying));
        });
    }
};

export default WaveView;

