// src/ui/wave-view.js
/**
 * WAVE Module Waveform Visualization & Modal DOM Synchronizer
 * Extracted from src/modules/defs/wave.js for modularity and zero-rebuild real-time updates.
 */

const SVG_W = 280;
const SVG_H = 92;
const MID_Y = SVG_H / 2;

export const WaveView = {
    SVG_W,
    SVG_H,

    formatMs(ms) {
        const sec = Math.max(0, ms) / 1000;
        return sec >= 10 ? `${sec.toFixed(1)}s` : `${sec.toFixed(2)}s`;
    },

    formatSpeed(v) {
        const val = Number(v || 0);
        return `${val >= 0 ? '+' : ''}${val.toFixed(2)}x`;
    },

    /**
     * Resolve effective playback start/end (0..1) and slice indices from raw CV values (0..1).
     */
    resolveEffectiveBounds(m, rawStartVal = null, rawEndVal = null) {
        const rawStart = Math.max(0, Math.min(1, Number(rawStartVal ?? m.start ?? 0.0)));
        const rawEnd = Math.max(0, Math.min(1, Number(rawEndVal ?? m.end ?? 1.0)));
        const chops = Array.isArray(m.chops) ? m.chops : [];
        const isSnap = Boolean(m.snapMode && chops.length > 0);

        if (!isSnap) {
            return {
                rawStart,
                rawEnd,
                effStart: rawStart,
                effEnd: rawEnd,
                startIdx: -1,
                endIdx: -1,
                sliceCount: 1,
                isSnap: false
            };
        }

        const bounds = [0.0];
        for (let i = 0; i < chops.length; i++) {
            const c = Number(chops[i]);
            if (c > 0.001 && c < 0.999) bounds.push(c);
        }
        bounds.push(1.0);
        bounds.sort((a, b) => a - b);

        const sliceCount = Math.max(1, bounds.length - 1);
        const startIdx = Math.min(sliceCount - 1, Math.max(0, Math.floor(rawStart * sliceCount)));
        const endIdx = Math.min(sliceCount - 1, Math.max(0, Math.floor(rawEnd * sliceCount)));

        let effStart = rawStart;
        let effEnd = rawEnd;
        if (startIdx === endIdx) {
            effStart = bounds[startIdx];
            effEnd = bounds[startIdx + 1];
        } else if (startIdx < endIdx) {
            effStart = bounds[startIdx];
            effEnd = bounds[endIdx + 1];
        } else {
            // Reverse playback across slices when Start > End
            effStart = bounds[startIdx + 1];
            effEnd = bounds[endIdx];
        }

        return {
            rawStart,
            rawEnd,
            effStart,
            effEnd,
            startIdx,
            endIdx,
            sliceCount,
            isSnap: true
        };
    },

    /**
     * Format the Start / End slider badge text showing CV value, slice index (in SNAP mode), and time in seconds.
     */
    formatBoundDisp(m, rawVal, effVal, isPatched = false) {
        const durSec = m.duration || 1.5;
        const chops = Array.isArray(m.chops) ? m.chops : [];
        const prefix = isPatched ? '[EXT] ' : '';
        if (m.snapMode && chops.length > 0) {
            const sliceCount = chops.length + 1;
            const idx = Math.min(sliceCount, Math.max(1, Math.floor(Math.max(0, Math.min(0.9999, rawVal)) * sliceCount) + 1));
            return `${prefix}CV ${Number(rawVal).toFixed(2)} -> #${idx} (${this.formatMs(effVal * durSec * 1000)})`;
        }
        return `${prefix}CV ${Number(rawVal).toFixed(2)} (${this.formatMs(effVal * durSec * 1000)})`;
    },

    /**
     * Render the full SVG waveform markup for the WAVE modal.
     */
    renderWaveformSVG(m, playhead = 0.0, isPlaying = false, effStartVal = null, effEndVal = null, rawStartVal = null, rawEndVal = null) {
        const peaks = m.peaks || m._peaks || [];
        const numBins = peaks.length || 64;
        const barW = SVG_W / numBins;

        const resolved = this.resolveEffectiveBounds(m, rawStartVal, rawEndVal);
        const startRatio = Math.max(0, Math.min(1, Number(effStartVal ?? resolved.effStart)));
        const endRatio = Math.max(0, Math.min(1, Number(effEndVal ?? resolved.effEnd)));
        const rawStartRatio = resolved.rawStart;
        const rawEndRatio = resolved.rawEnd;

        const minR = Math.min(startRatio, endRatio);
        const maxR = Math.max(startRatio, endRatio);
        const startX = (startRatio * SVG_W).toFixed(1);
        const endX = (endRatio * SVG_W).toFixed(1);
        const rawStartX = (rawStartRatio * SVG_W).toFixed(1);
        const rawEndX = (rawEndRatio * SVG_W).toFixed(1);
        const playX = (Math.max(0, Math.min(1, playhead)) * SVG_W).toFixed(1);

        const startLabelX = startRatio > 0.90 ? (Number(startX) - 13).toFixed(1) : (Number(startX) + 3).toFixed(1);
        const endLabelX = endRatio < 0.10 ? (Number(endX) + 3).toFixed(1) : (Number(endX) - 13).toFixed(1);

        let barsHtml = '';
        for (let i = 0; i < numBins; i++) {
            const ratio = i / numBins;
            const inRange = ratio >= minR - 0.005 && ratio <= maxR + 0.005;
            const amp = peaks[i] !== undefined ? peaks[i] : 0.05;
            const barH = Math.max(2, amp * (SVG_H - 14));
            const x = (i * barW + 0.6).toFixed(1);
            const y = (MID_Y - barH / 2).toFixed(1);
            const w = Math.max(1.2, barW - 1.2).toFixed(1);
            const color = inRange ? '#4ade80' : '#334155';
            const opacity = inRange ? '0.88' : '0.4';
            barsHtml += `<rect x="${x}" y="${y}" width="${w}" height="${barH.toFixed(1)}" rx="1" fill="${color}" opacity="${opacity}" />`;
        }

        const chops = Array.isArray(m.chops) ? m.chops : [];
        const sliceBounds = [0.0, ...chops.filter(c => c > 0.001 && c < 0.999), 1.0].sort((a, b) => a - b);

        let sliceOverlaysHtml = '';
        if (sliceBounds.length > 2) {
            for (let idx = 0; idx < sliceBounds.length - 1; idx++) {
                const s0 = sliceBounds[idx];
                const s1 = sliceBounds[idx + 1];
                const sx = (s0 * SVG_W).toFixed(1);
                const sw = Math.max(1, (s1 - s0) * SVG_W).toFixed(1);
                const midRatio = (s0 + s1) * 0.5;
                const isSelected = midRatio >= minR - 0.002 && midRatio <= maxR + 0.002;
                const fill = isSelected
                    ? (m.snapMode ? 'rgba(56,189,248,0.16)' : 'rgba(74,222,128,0.10)')
                    : 'rgba(15,23,42,0.35)';
                const labelColor = isSelected ? (m.snapMode ? '#38bdf8' : '#4ade80') : '#64748b';
                sliceOverlaysHtml += `
                    <rect data-slice-rect="${idx}" x="${sx}" y="0" width="${sw}" height="${SVG_H}" fill="${fill}" style="cursor:pointer;" />
                    <text data-slice-label="${idx}" x="${(Number(sx) + 3).toFixed(1)}" y="10" fill="${labelColor}" font-size="8" font-family="monospace" font-weight="bold" pointer-events="none">#${idx + 1}</text>
                `;
            }
        }

        let chopsHtml = '';
        for (let i = 0; i < chops.length; i++) {
            const cx = (Math.max(0, Math.min(1, chops[i])) * SVG_W).toFixed(1);
            chopsHtml += `<line x1="${cx}" y1="0" x2="${cx}" y2="${SVG_H}" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="2,2" opacity="0.85" pointer-events="none" />`;
        }

        const r = 3.5;
        const startNotchPts = `${(Number(rawStartX) - r).toFixed(1)},0 ${(Number(rawStartX) + r).toFixed(1)},0 ${rawStartX},${(r * 1.6).toFixed(1)}`;
        const endNotchPts = `${(Number(rawEndX) - r).toFixed(1)},${SVG_H} ${(Number(rawEndX) + r).toFixed(1)},${SVG_H} ${rawEndX},${(SVG_H - r * 1.6).toFixed(1)}`;

        return `
            <svg id="tape-waveform-svg" viewBox="0 0 ${SVG_W} ${SVG_H}" width="100%" height="100%" preserveAspectRatio="none" style="display:block; background:#090d14; border-radius:6px; border:1px solid #1e293b; overflow:hidden; user-select:none; touch-action:none;">
                <line x1="0" y1="${MID_Y}" x2="${SVG_W}" y2="${MID_Y}" stroke="#1e293b" stroke-width="1" pointer-events="none" />
                ${sliceOverlaysHtml}
                ${chopsHtml}
                <g pointer-events="none">${barsHtml}</g>
                <!-- Effective Start Marker (Green) -->
                <line id="tape-start-line" x1="${startX}" y1="0" x2="${startX}" y2="${SVG_H}" stroke="#4ade80" stroke-width="2" pointer-events="none" />
                <rect id="tape-start-badge" x="${startLabelX}" y="3" width="11" height="12" rx="2" fill="#064e3b" stroke="#4ade80" stroke-width="0.8" pointer-events="none" />
                <text id="tape-start-text" x="${(Number(startLabelX) + 5.5).toFixed(1)}" y="11.5" fill="#4ade80" font-size="8" font-family="monospace" font-weight="bold" text-anchor="middle" pointer-events="none">S</text>
                <!-- Effective End Marker (Green) -->
                <line id="tape-end-line" x1="${endX}" y1="0" x2="${endX}" y2="${SVG_H}" stroke="#4ade80" stroke-width="2" stroke-dasharray="4,2" pointer-events="none" />
                <rect id="tape-end-badge" x="${endLabelX}" y="${SVG_H - 15}" width="11" height="12" rx="2" fill="#064e3b" stroke="#4ade80" stroke-width="0.8" pointer-events="none" />
                <text id="tape-end-text" x="${(Number(endLabelX) + 5.5).toFixed(1)}" y="${SVG_H - 6.5}" fill="#4ade80" font-size="8" font-family="monospace" font-weight="bold" text-anchor="middle" pointer-events="none">E</text>
                <!-- Raw CV Start Marker (White) -->
                <line id="tape-cv-start-line" x1="${rawStartX}" y1="0" x2="${rawStartX}" y2="${SVG_H}" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="2,2" opacity="0.9" style="display:block;" pointer-events="none" />
                <polygon id="tape-cv-start-notch" points="${startNotchPts}" fill="#ffffff" style="display:block;" pointer-events="none" />
                <!-- Raw CV End Marker (White) -->
                <line id="tape-cv-end-line" x1="${rawEndX}" y1="0" x2="${rawEndX}" y2="${SVG_H}" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="2,2" opacity="0.9" style="display:block;" pointer-events="none" />
                <polygon id="tape-cv-end-notch" points="${endNotchPts}" fill="#ffffff" style="display:block;" pointer-events="none" />
                <!-- Playhead Line -->
                <line id="tape-playhead-line" x1="${playX}" y1="0" x2="${playX}" y2="${SVG_H}" stroke="#facc15" stroke-width="2" style="display:${isPlaying ? 'block' : 'none'};" pointer-events="none" />
            </svg>
        `;
    },

    /**
     * Unified real-time DOM updater for the WAVE modal.
     * Updates SVG lines/notches/slice overlays, progress bar, play button, and Start/End slider displays without rebuilding SVG innerHTML.
     */
    syncModalDOM(targetModal, m, state = {}) {
        if (!targetModal || !m) return;

        const rawStart = state.rawStart !== undefined ? state.rawStart : (m.start ?? 0.0);
        const rawEnd = state.rawEnd !== undefined ? state.rawEnd : (m.end ?? 1.0);
        const resolved = this.resolveEffectiveBounds(m, rawStart, rawEnd);

        const effS = Math.max(0, Math.min(1, Number(state.effStart !== undefined ? state.effStart : resolved.effStart)));
        const effE = Math.max(0, Math.min(1, Number(state.effEnd !== undefined ? state.effEnd : resolved.effEnd)));
        const rStart = resolved.rawStart;
        const rEnd = resolved.rawEnd;

        const startPatched = Boolean(state.startPatched);
        const endPatched = Boolean(state.endPatched);

        // 1. Update Effective Start/End Green Markers
        const sx = (effS * SVG_W).toFixed(1);
        const ex = (effE * SVG_W).toFixed(1);
        const sLabelX = effS > 0.90 ? (Number(sx) - 13).toFixed(1) : (Number(sx) + 3).toFixed(1);
        const eLabelX = effE < 0.10 ? (Number(ex) + 3).toFixed(1) : (Number(ex) - 13).toFixed(1);

        const startLine = targetModal.querySelector('#tape-start-line');
        const startBadge = targetModal.querySelector('#tape-start-badge');
        const startText = targetModal.querySelector('#tape-start-text');
        if (startLine) {
            startLine.setAttribute('x1', sx);
            startLine.setAttribute('x2', sx);
        }
        if (startBadge) startBadge.setAttribute('x', sLabelX);
        if (startText) startText.setAttribute('x', (Number(sLabelX) + 5.5).toFixed(1));

        const endLine = targetModal.querySelector('#tape-end-line');
        const endBadge = targetModal.querySelector('#tape-end-badge');
        const endText = targetModal.querySelector('#tape-end-text');
        if (endLine) {
            endLine.setAttribute('x1', ex);
            endLine.setAttribute('x2', ex);
        }
        if (endBadge) endBadge.setAttribute('x', eLabelX);
        if (endText) endText.setAttribute('x', (Number(eLabelX) + 5.5).toFixed(1));

        // 2. Update Raw CV White Lines & Notches
        const r = 3.5;
        const rsx = (rStart * SVG_W).toFixed(1);
        const rex = (rEnd * SVG_W).toFixed(1);

        const cvStartLine = targetModal.querySelector('#tape-cv-start-line');
        const cvStartNotch = targetModal.querySelector('#tape-cv-start-notch');
        if (cvStartLine) {
            cvStartLine.setAttribute('x1', rsx);
            cvStartLine.setAttribute('x2', rsx);
            cvStartLine.style.display = 'block';
        }
        if (cvStartNotch) {
            cvStartNotch.setAttribute('points', `${(Number(rsx) - r).toFixed(1)},0 ${(Number(rsx) + r).toFixed(1)},0 ${rsx},${(r * 1.6).toFixed(1)}`);
            cvStartNotch.style.display = 'block';
        }

        const cvEndLine = targetModal.querySelector('#tape-cv-end-line');
        const cvEndNotch = targetModal.querySelector('#tape-cv-end-notch');
        if (cvEndLine) {
            cvEndLine.setAttribute('x1', rex);
            cvEndLine.setAttribute('x2', rex);
            cvEndLine.style.display = 'block';
        }
        if (cvEndNotch) {
            cvEndNotch.setAttribute('points', `${(Number(rex) - r).toFixed(1)},${SVG_H} ${(Number(rex) + r).toFixed(1)},${SVG_H} ${rex},${(SVG_H - r * 1.6).toFixed(1)}`);
            cvEndNotch.style.display = 'block';
        }

        // 3. Update Slice Overlays
        const chops = Array.isArray(m.chops) ? m.chops : [];
        if (chops.length > 0) {
            const sliceBounds = [0.0, ...chops.filter(c => c > 0.001 && c < 0.999), 1.0].sort((a, b) => a - b);
            const minR = Math.min(effS, effE);
            const maxR = Math.max(effS, effE);
            for (let idx = 0; idx < sliceBounds.length - 1; idx++) {
                const midRatio = (sliceBounds[idx] + sliceBounds[idx + 1]) * 0.5;
                const isSel = midRatio >= minR - 0.002 && midRatio <= maxR + 0.002;
                const rectEl = targetModal.querySelector(`[data-slice-rect="${idx}"]`);
                const lblEl = targetModal.querySelector(`[data-slice-label="${idx}"]`);
                if (rectEl) {
                    rectEl.setAttribute('fill', isSel ? (m.snapMode ? 'rgba(56,189,248,0.16)' : 'rgba(74,222,128,0.10)') : 'rgba(15,23,42,0.35)');
                }
                if (lblEl) {
                    lblEl.setAttribute('fill', isSel ? (m.snapMode ? '#38bdf8' : '#4ade80') : '#64748b');
                }
            }
        }

        // 4. Update Playhead, Progress Bar & Play Button
        const minPct = Math.min(effS, effE) * 100;
        const maxPct = Math.max(effS, effE) * 100;
        const progRange = targetModal.querySelector('#tape-progress-range');
        if (progRange) {
            progRange.style.left = `${minPct.toFixed(1)}%`;
            progRange.style.width = `${Math.max(0.5, maxPct - minPct).toFixed(1)}%`;
        }

        if (state.playhead !== undefined || state.isPlaying !== undefined) {
            const playhead = Math.max(0, Math.min(1, Number(state.playhead ?? 0.0)));
            const isPlaying = Boolean(state.isPlaying);
            const playLine = targetModal.querySelector('#tape-playhead-line');
            if (playLine) {
                const px = (playhead * SVG_W).toFixed(1);
                playLine.setAttribute('x1', px);
                playLine.setAttribute('x2', px);
                playLine.style.display = isPlaying ? 'block' : 'none';
            }

            const progFill = targetModal.querySelector('#tape-progress-fill');
            const progDot = targetModal.querySelector('#tape-progress-dot');
            const pct = playhead * 100;
            if (progFill) {
                const fillLeft = Math.min(minPct, pct);
                const fillWidth = isPlaying ? Math.max(0, pct - minPct) : 0;
                progFill.style.left = `${fillLeft.toFixed(1)}%`;
                progFill.style.width = `${fillWidth.toFixed(1)}%`;
            }
            if (progDot) {
                progDot.style.left = `calc(${pct.toFixed(1)}% - 5px)`;
                progDot.style.display = isPlaying ? 'block' : 'none';
            }

            const playBtn = targetModal.querySelector('#tape-play-btn');
            if (playBtn && playBtn.dataset.playing !== (isPlaying ? '1' : '0')) {
                playBtn.dataset.playing = isPlaying ? '1' : '0';
                playBtn.innerHTML = isPlaying ? '&#9632;' : '&#9654;';
                playBtn.style.background = isPlaying ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.18)';
                playBtn.style.borderColor = isPlaying ? '#ef4444' : '#4ade80';
                playBtn.style.color = isPlaying ? '#ef4444' : '#4ade80';
            }
        }

        // 5. Update Start/End Sliders & Badges
        const sliderStart = targetModal.querySelector('#tape-slider-start');
        const sliderStartDisp = targetModal.querySelector('#tape-slider-start-disp');
        if (sliderStart) {
            sliderStart.disabled = startPatched;
            sliderStart.style.opacity = startPatched ? '0.45' : '1';
            if (startPatched || document.activeElement !== sliderStart) {
                sliderStart.value = rStart.toFixed(3);
            }
        }
        if (sliderStartDisp) {
            sliderStartDisp.textContent = this.formatBoundDisp(m, rStart, effS, startPatched);
        }

        const sliderEnd = targetModal.querySelector('#tape-slider-end');
        const sliderEndDisp = targetModal.querySelector('#tape-slider-end-disp');
        if (sliderEnd) {
            sliderEnd.disabled = endPatched;
            sliderEnd.style.opacity = endPatched ? '0.45' : '1';
            if (endPatched || document.activeElement !== sliderEnd) {
                sliderEnd.value = rEnd.toFixed(3);
            }
        }
        if (sliderEndDisp) {
            sliderEndDisp.textContent = this.formatBoundDisp(m, rEnd, effE, endPatched);
        }
    }
};

export default WaveView;
