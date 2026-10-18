// src/modules/defs/wave.js
import { WaveCodec, TapeCodec } from '../../audio/wave-codec.js?v=238';
import { WaveView } from '../../ui/wave-view.js?v=238';

export const WAVE = {
    title: 'WAVE',
    cat: 'gen',
    color: 'c-tape',
    out: ['wave_out'],
    in: ['gate_in', 'start_cv', 'end_cv', 'speed_cv'],

    init: (m) => ({
        ...m,
        name: m.name || 'WAVE',
        start: m.start ?? 0.0,
        end: m.end ?? 1.0,
        speed: m.speed ?? 1.0,
        loop: m.loop ?? false,
        retrigger: m.retrigger ?? true,
        snapMode: m.snapMode ?? false,
        rangeLock: m.rangeLock ?? false,
        chops: Array.isArray(m.chops) ? m.chops : [],
        duration: m.duration || 1.5,
        sampleRate: m.sampleRate || 48000,
        data: m.data || '',
        peaks: m.peaks || Array.from({ length: 64 }, (_, i) => Math.exp(-(i / 64) * 3) * 0.7)
    }),

    formatMs: (ms) => WaveView.formatMs(ms),
    formatSpeed: (v) => WaveView.formatSpeed(v),
    resolveEffectiveBounds: (m, rawStartVal = null, rawEndVal = null) =>
        WaveView.resolveEffectiveBounds(m, rawStartVal, rawEndVal),
    formatBoundDisp: (m, rawVal, effVal, isPatched = false) =>
        WaveView.formatBoundDisp(m, rawVal, effVal, isPatched),
    renderWaveformSVG: (m, playhead = 0.0, isPlaying = false, effStartVal = null, effEndVal = null, rawStartVal = null, rawEndVal = null) =>
        WaveView.renderWaveformSVG(m, playhead, isPlaying, effStartVal, effEndVal, rawStartVal, rawEndVal),
    extractPeaks: (buffer, numBins = 64) => WaveCodec.extractPeaks(buffer, numBins),

    renderGrid: (m) => {
        const peaks = m.peaks || m._peaks || [];
        const step = Math.max(1, Math.floor((peaks.length || 64) / 16));
        let bars = '';
        for (let i = 0; i < 16; i++) {
            const amp = peaks[i * step] ?? 0.2;
            const h = Math.max(15, Math.round(amp * 90));
            bars += `<span class="tape-grid-bar" style="width:2px; height:${h}%; background:#4ade80; border-radius:1px; opacity:0.75; transition:opacity 0.1s;"></span>`;
        }
        return `
            <span class="mod-label" style="top:2px; font-size:7px; color:#86efac;">${m.name || 'WAVE'}</span>
            <div style="display:flex; align-items:center; justify-content:center; gap:1px; width:82%; height:20px; margin-top:8px;">
                ${bars}
            </div>
        `;
    },

    renderModal: (m) => {
        const durSec = m.duration || 1.5;
        const resolved = WaveView.resolveEffectiveBounds(m);
        const effS = resolved.effStart;
        const effE = resolved.effEnd;
        const minPct = Math.min(effS, effE) * 100;
        const maxPct = Math.max(effS, effE) * 100;

        const chopsCount = Array.isArray(m.chops) ? m.chops.length : 0;
        const activeChopBtn = chopsCount === 3 ? 4 : chopsCount === 7 ? 8 : chopsCount === 15 ? 16 : 0;
        const isLocked = Boolean(m.rangeLock);

        const chopBtnStyle = (active) =>
            `flex:1; height:24px; background:${active ? 'rgba(56,189,248,0.2)' : '#1e293b'}; border:1px solid ${active ? '#38bdf8' : '#334155'}; border-radius:4px; color:${active ? '#38bdf8' : '#64748b'}; font-size:9px; font-weight:bold; cursor:pointer;`;

        return `
            <div style="display:flex; flex-direction:column; gap:8px; width:280px;">
                <!-- Row 1: Name & File Load -->
                <div style="display:flex; align-items:center; gap:6px;">
                    <input id="tape-name-input" type="text" maxlength="10" value="${m.name || 'WAVE'}"
                        style="width:82px; padding:4px 6px; background:#0f172a; border:1px solid #334155; border-radius:4px; color:#f8fafc; font-family:monospace; font-size:11px; font-weight:bold;" />
                    <button id="tape-load-btn" type="button"
                        style="flex:1; padding:5px 8px; background:rgba(56,189,248,0.14); border:1px solid #38bdf8; border-radius:4px; color:#38bdf8; font-size:10px; font-weight:bold; cursor:pointer;">
                        LOAD AUDIO / MP4
                    </button>
                    <input id="tape-file-input" type="file" accept="audio/*,video/mp4,video/quicktime,.wav,.mp3,.ogg,.m4a,.mp4,.webm" style="display:none;" />
                </div>
                <div id="tape-status-text" style="font-size:9px; color:#94a3b8; font-family:monospace; text-align:right; margin-top:-4px;">
                    ${m.data ? `Ready (${WaveView.formatMs(durSec * 1000)})` : 'Default synth sample (1.50s)'}
                </div>

                <!-- Row 2: Waveform SVG -->
                <div id="tape-waveform-svg-wrap" style="width:280px; height:92px; position:relative;">
                    ${WaveView.renderWaveformSVG(m, 0.0, false)}
                </div>

                <!-- Row 3: Transport & Loop / Retrig -->
                <div style="display:flex; align-items:center; gap:6px;">
                    <button id="tape-play-btn" type="button" data-playing="0"
                        style="width:30px; height:26px; background:rgba(74,222,128,0.18); border:1px solid #4ade80; border-radius:4px; color:#4ade80; font-size:11px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                        &#9654;
                    </button>
                    <button id="tape-reset-btn" type="button" title="Reset Playhead"
                        style="width:26px; height:26px; background:#1e293b; border:1px solid #334155; border-radius:4px; color:#cbd5e1; font-size:11px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                        &#8634;
                    </button>
                    <div id="tape-progress-track" style="flex:1; height:8px; background:#090d14; border:1px solid #1e293b; border-radius:4px; position:relative; overflow:visible;">
                        <div id="tape-progress-range" style="position:absolute; top:0; bottom:0; left:${minPct.toFixed(1)}%; width:${Math.max(0.5, maxPct - minPct).toFixed(1)}%; background:rgba(74,222,128,0.18); border-radius:3px;"></div>
                        <div id="tape-progress-fill" style="position:absolute; top:0; bottom:0; left:${minPct.toFixed(1)}%; width:0%; background:#4ade80; border-radius:3px;"></div>
                        <div id="tape-progress-dot" style="display:none; position:absolute; top:-2px; width:10px; height:10px; border-radius:50%; background:#facc15; box-shadow:0 0 6px #facc15; pointer-events:none;"></div>
                    </div>
                    <button id="tape-loop-btn" type="button"
                        style="padding:4px 7px; height:26px; background:${m.loop ? 'rgba(74,222,128,0.18)' : '#1e293b'}; border:1px solid ${m.loop ? '#4ade80' : '#334155'}; border-radius:4px; color:${m.loop ? '#4ade80' : '#64748b'}; font-size:9px; font-weight:bold; cursor:pointer;">
                        LOOP
                    </button>
                    <button id="tape-retrig-btn" type="button"
                        style="padding:4px 7px; height:26px; background:${m.retrigger ? 'rgba(56,189,248,0.18)' : '#1e293b'}; border:1px solid ${m.retrigger ? '#38bdf8' : '#334155'}; border-radius:4px; color:${m.retrigger ? '#38bdf8' : '#64748b'}; font-size:9px; font-weight:bold; cursor:pointer;">
                        RETRIG
                    </button>
                </div>

                <!-- Row 4: CHOP & SNAP Controls -->
                <div style="display:flex; align-items:center; gap:4px;">
                    <span style="font-size:9px; color:#94a3b8; font-weight:bold; margin-right:2px;">CHOP</span>
                    <button id="tape-chop-off-btn" type="button" style="${chopBtnStyle(activeChopBtn === 0)}">OFF</button>
                    <button id="tape-chop-4-btn" type="button" style="${chopBtnStyle(activeChopBtn === 4)}">4</button>
                    <button id="tape-chop-8-btn" type="button" style="${chopBtnStyle(activeChopBtn === 8)}">8</button>
                    <button id="tape-chop-16-btn" type="button" style="${chopBtnStyle(activeChopBtn === 16)}">16</button>
                    <button id="tape-snap-btn" type="button"
                        style="padding:0 8px; height:24px; background:${m.snapMode ? 'rgba(56,189,248,0.22)' : '#1e293b'}; border:1px solid ${m.snapMode ? '#38bdf8' : '#334155'}; border-radius:4px; color:${m.snapMode ? '#38bdf8' : '#64748b'}; font-size:9px; font-weight:bold; cursor:pointer;">
                        SNAP
                    </button>
                </div>

                <!-- Row 5: CV Sliders (START / LOCK / END / SPEED) -->
                <div style="display:flex; flex-direction:column; gap:6px; background:#0b111e; border:1px solid #1e293b; border-radius:6px; padding:8px;">
                    <!-- START CV -->
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <div style="display:flex; justify-content:space-between; font-size:9px; font-family:monospace;">
                            <span style="color:#cbd5e1; font-weight:bold;">START CV</span>
                            <span id="tape-slider-start-disp" style="color:#4ade80;">${WaveView.formatBoundDisp(m, m.start ?? 0.0, effS, false)}</span>
                        </div>
                        <input id="tape-slider-start" type="range" min="0" max="1" step="0.001" value="${(m.start ?? 0.0).toFixed(3)}" style="width:100%; accent-color:#4ade80; margin:0;" />
                    </div>

                    <!-- Center Time-Lock Button -->
                    <div style="display:flex; align-items:center; justify-content:center; gap:6px; margin:1px 0;">
                        <div style="flex:1; height:1px; background:#1e293b;"></div>
                        <button id="tape-range-lock-btn" type="button"
                            style="padding:2px 10px; height:20px; border-radius:10px; font-size:9px; font-family:monospace; font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:4px; background:${isLocked ? 'rgba(250,204,21,0.18)' : '#1e293b'}; border:1px solid ${isLocked ? '#facc15' : '#334155'}; color:${isLocked ? '#facc15' : '#94a3b8'};">
                            <span>${isLocked ? '&#128274;' : '&#128275;'}</span>
                            <span>${isLocked ? 'LOCKED ΔT' : 'LOCK ΔT'}</span>
                        </button>
                        <div style="flex:1; height:1px; background:#1e293b;"></div>
                    </div>

                    <!-- END CV -->
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <div style="display:flex; justify-content:space-between; font-size:9px; font-family:monospace;">
                            <span style="color:#cbd5e1; font-weight:bold;">END CV</span>
                            <span id="tape-slider-end-disp" style="color:#4ade80;">${WaveView.formatBoundDisp(m, m.end ?? 1.0, effE, false)}</span>
                        </div>
                        <input id="tape-slider-end" type="range" min="0" max="1" step="0.001" value="${(m.end ?? 1.0).toFixed(3)}" style="width:100%; accent-color:#4ade80; margin:0;" />
                    </div>

                    <!-- SPEED -->
                    <div style="display:flex; flex-direction:column; gap:2px; margin-top:2px;">
                        <div style="display:flex; justify-content:space-between; font-size:9px; font-family:monospace;">
                            <span style="color:#cbd5e1; font-weight:bold;">SPEED</span>
                            <span id="tape-slider-speed-disp" style="color:#38bdf8;">${WaveView.formatSpeed(m.speed ?? 1.0)}</span>
                        </div>
                        <input id="tape-slider-speed" type="range" min="-2" max="2" step="0.01" value="${(m.speed ?? 1.0).toFixed(2)}" style="width:100%; accent-color:#38bdf8; margin:0;" />
                        <div style="display:flex; justify-content:space-between; font-size:8px; color:#64748b; font-family:monospace; padding:0 2px;">
                            <span>-2x</span><span>-1x</span><span>0</span><span>+1x</span><span>+2x</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    bindModal: (modal, m, ctx) => {
        const getInst = () => ctx?.synth?.nodes?.get?.(m.id);

        const ensureSynthReady = async () => {
            const synth = ctx?.synth;
            if (!synth) return null;
            if (!synth.ctx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                synth.ctx = new AC();
            }
            if (synth.ctx.state === 'suspended') {
                try { await synth.ctx.resume(); } catch (_) {}
            }
            if (!synth.nodes?.has(m.id) && typeof synth.rebuild === 'function') {
                await synth.rebuild();
            }
            return synth.nodes?.get?.(m.id) || null;
        };

        const getPatchState = () => {
            const p = window.__GS_APP__?.getPatchState ? window.__GS_APP__.getPatchState(m.id) : null;
            const inst = getInst();
            const readState = inst?.read ? inst.read() : null;
            const startPatched = Boolean(p?.has?.('start_cv') || p?.has?.('cv_start') || readState?.startPatched);
            const endPatched = Boolean(p?.has?.('end_cv') || p?.has?.('cv_end') || readState?.endPatched);
            return { startPatched, endPatched, readState };
        };

        const syncAudio = () => {
            const inst = getInst();
            if (inst?.nodes?.w) {
                const { startPatched, endPatched } = getPatchState();
                inst.nodes.w.port.postMessage({
                    type: 'SET_PARAMS',
                    start: m.start ?? 0.0,
                    end: m.end ?? 1.0,
                    speed: m.speed ?? 1.0,
                    loop: Boolean(m.loop),
                    retrigger: Boolean(m.retrigger),
                    startPatched,
                    endPatched,
                    snapMode: Boolean(m.snapMode),
                    chops: Array.isArray(m.chops) ? m.chops : []
                });
            }
            ctx?.sync?.();
        };

        const lockBtn = modal.querySelector('#tape-range-lock-btn');
        const updateLockBtnUI = () => {
            if (!lockBtn) return;
            const { startPatched, endPatched } = getPatchState();
            const extDisabled = startPatched || endPatched;
            if (extDisabled && m.rangeLock) {
                m.rangeLock = false;
            }
            const active = Boolean(m.rangeLock) && !extDisabled;
            lockBtn.disabled = extDisabled;
            lockBtn.style.opacity = extDisabled ? '0.4' : '1';
            lockBtn.style.cursor = extDisabled ? 'not-allowed' : 'pointer';
            lockBtn.style.background = active ? 'rgba(250,204,21,0.18)' : '#1e293b';
            lockBtn.style.borderColor = active ? '#facc15' : '#334155';
            lockBtn.style.color = active ? '#facc15' : '#94a3b8';
            lockBtn.innerHTML = `<span>${active ? '&#128274;' : '&#128275;'}</span><span>${active ? 'LOCKED ΔT' : 'LOCK ΔT'}</span>`;
        };

        const svgWrap = modal.querySelector('#tape-waveform-svg-wrap');
        const bindSliceClicks = () => {
            if (!svgWrap) return;
            svgWrap.querySelectorAll('[data-slice-rect]').forEach(rect => {
                rect.addEventListener('click', () => {
                    const { startPatched, endPatched } = getPatchState();
                    if (startPatched && endPatched) return;
                    const idx = Number(rect.getAttribute('data-slice-rect'));
                    const chops = Array.isArray(m.chops) ? m.chops : [];
                    const bounds = [0.0, ...chops.filter(c => c > 0.001 && c < 0.999), 1.0].sort((a, b) => a - b);
                    if (idx < 0 || idx >= bounds.length - 1) return;

                    if (m.snapMode) {
                        const midCv = (idx + 0.5) / (bounds.length - 1);
                        if (!startPatched) m.start = midCv;
                        if (!endPatched) m.end = midCv;
                    } else {
                        if (!startPatched) m.start = bounds[idx];
                        if (!endPatched) m.end = bounds[idx + 1];
                    }
                    m._lockedDiff = (m.end ?? 1.0) - (m.start ?? 0.0);
                    WaveView.syncModalDOM(modal, m, { startPatched, endPatched });
                    syncAudio();
                });
            });
        };

        const redrawSvg = () => {
            if (!svgWrap) return;
            const { startPatched, endPatched, readState } = getPatchState();
            svgWrap.innerHTML = WaveView.renderWaveformSVG(
                m,
                readState?.playhead ?? 0.0,
                Boolean(readState?.isPlaying),
                readState?.effStart,
                readState?.effEnd,
                readState?.rawStart ?? m.start,
                readState?.rawEnd ?? m.end
            );
            bindSliceClicks();
            WaveView.syncModalDOM(modal, m, {
                ...(readState || {}),
                startPatched,
                endPatched
            });
        };

        bindSliceClicks();
        updateLockBtnUI();

        // Time-Lock toggle button
        if (lockBtn) {
            lockBtn.addEventListener('click', () => {
                const { startPatched, endPatched } = getPatchState();
                if (startPatched || endPatched) return;
                m.rangeLock = !m.rangeLock;
                if (m.rangeLock) {
                    m._lockedDiff = (m.end ?? 1.0) - (m.start ?? 0.0);
                }
                updateLockBtnUI();
            });
        }

        // Unified START / END CV Slider Handler
        const applyRangeCv = (side, rawVal) => {
            const { startPatched, endPatched } = getPatchState();
            const val = Math.max(0, Math.min(1, Number(rawVal)));
            if (m.rangeLock && !startPatched && !endPatched) {
                const diff = m._lockedDiff !== undefined ? m._lockedDiff : ((m.end ?? 1.0) - (m.start ?? 0.0));
                if (side === 'start') {
                    const minS = Math.max(0, -diff);
                    const maxS = Math.min(1, 1 - diff);
                    m.start = Math.max(minS, Math.min(maxS, val));
                    m.end = Math.max(0, Math.min(1, m.start + diff));
                } else {
                    const minE = Math.max(0, diff);
                    const maxE = Math.min(1, 1 + diff);
                    m.end = Math.max(minE, Math.min(maxE, val));
                    m.start = Math.max(0, Math.min(1, m.end - diff));
                }
            } else if (side === 'start' && !startPatched) {
                m.start = val;
                m._lockedDiff = (m.end ?? 1.0) - m.start;
            } else if (side === 'end' && !endPatched) {
                m.end = val;
                m._lockedDiff = m.end - (m.start ?? 0.0);
            }
            WaveView.syncModalDOM(modal, m, { startPatched, endPatched });
            syncAudio();
        };

        const sliderStart = modal.querySelector('#tape-slider-start');
        const sliderEnd = modal.querySelector('#tape-slider-end');
        const sliderSpeed = modal.querySelector('#tape-slider-speed');
        const sliderSpeedDisp = modal.querySelector('#tape-slider-speed-disp');

        if (sliderStart) {
            sliderStart.addEventListener('input', (e) => applyRangeCv('start', e.target.value));
        }
        if (sliderEnd) {
            sliderEnd.addEventListener('input', (e) => applyRangeCv('end', e.target.value));
        }
        if (sliderSpeed) {
            sliderSpeed.addEventListener('input', (e) => {
                m.speed = Math.max(-2, Math.min(2, Number(e.target.value)));
                if (sliderSpeedDisp) sliderSpeedDisp.textContent = WaveView.formatSpeed(m.speed);
                syncAudio();
            });
            sliderSpeed.addEventListener('dblclick', () => {
                m.speed = 1.0;
                sliderSpeed.value = '1.00';
                if (sliderSpeedDisp) sliderSpeedDisp.textContent = WaveView.formatSpeed(1.0);
                syncAudio();
            });
        }

        // Transport Buttons
        const playBtn = modal.querySelector('#tape-play-btn');
        const resetBtn = modal.querySelector('#tape-reset-btn');
        const loopBtn = modal.querySelector('#tape-loop-btn');
        const retrigBtn = modal.querySelector('#tape-retrig-btn');

        if (playBtn) {
            playBtn.addEventListener('click', async () => {
                const inst = (await ensureSynthReady()) || getInst();
                if (!inst) return;
                const state = inst.read ? inst.read() : null;
                if (state?.isPlaying) {
                    inst.stop?.();
                } else {
                    syncAudio();
                    if (typeof inst.testPlay === 'function') inst.testPlay();
                    else inst.play?.();
                }
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                const inst = getInst();
                inst?.reset?.();
            });
        }

        const styleToggleBtn = (btn, active, activeColor, activeRgba) => {
            if (!btn) return;
            btn.style.background = active ? activeRgba : '#1e293b';
            btn.style.borderColor = active ? activeColor : '#334155';
            btn.style.color = active ? activeColor : '#64748b';
        };

        if (loopBtn) {
            loopBtn.addEventListener('click', () => {
                m.loop = !m.loop;
                styleToggleBtn(loopBtn, m.loop, '#4ade80', 'rgba(74,222,128,0.18)');
                syncAudio();
            });
        }

        if (retrigBtn) {
            retrigBtn.addEventListener('click', () => {
                m.retrigger = !m.retrigger;
                styleToggleBtn(retrigBtn, m.retrigger, '#38bdf8', 'rgba(56,189,248,0.18)');
                syncAudio();
            });
        }

        // CHOP & SNAP Buttons
        const chopBtns = {
            0: modal.querySelector('#tape-chop-off-btn'),
            4: modal.querySelector('#tape-chop-4-btn'),
            8: modal.querySelector('#tape-chop-8-btn'),
            16: modal.querySelector('#tape-chop-16-btn')
        };
        const snapBtn = modal.querySelector('#tape-snap-btn');

        const setChop = (count) => {
            if (!count || count <= 1) {
                m.chops = [];
                m.snapMode = false;
            } else {
                const arr = [];
                for (let i = 1; i < count; i++) arr.push(Number((i / count).toFixed(4)));
                m.chops = arr;
                m.snapMode = true;
            }
            Object.entries(chopBtns).forEach(([k, btn]) => {
                styleToggleBtn(btn, Number(k) === count, '#38bdf8', 'rgba(56,189,248,0.2)');
            });
            styleToggleBtn(snapBtn, Boolean(m.snapMode), '#38bdf8', 'rgba(56,189,248,0.22)');
            redrawSvg();
            syncAudio();
        };

        Object.entries(chopBtns).forEach(([k, btn]) => {
            if (btn) btn.addEventListener('click', () => setChop(Number(k)));
        });

        if (snapBtn) {
            snapBtn.addEventListener('click', () => {
                m.snapMode = !m.snapMode;
                if (m.snapMode && (!Array.isArray(m.chops) || m.chops.length === 0)) {
                    setChop(4);
                    return;
                }
                styleToggleBtn(snapBtn, Boolean(m.snapMode), '#38bdf8', 'rgba(56,189,248,0.22)');
                redrawSvg();
                syncAudio();
            });
        }

        // Name & File Load
        const nameInput = modal.querySelector('#tape-name-input');
        const loadBtn = modal.querySelector('#tape-load-btn');
        const fileInput = modal.querySelector('#tape-file-input');
        const statusText = modal.querySelector('#tape-status-text');

        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                m.name = (e.target.value || 'WAVE').toUpperCase();
                ctx?.renderGrid?.();
            });
        }

        if (loadBtn && fileInput) {
            loadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (statusText) statusText.textContent = `Loading ${file.name}...`;
                try {
                    await ensureSynthReady();
                    const audioCtx = ctx?.synth?.ctx;
                    const decoded = await TapeCodec.loadAudioFromFile(file, audioCtx);
                    m._buffer = decoded.buffer;
                    m.duration = decoded.duration;
                    m.sampleRate = decoded.sampleRate;
                    m.peaks = WaveCodec.extractPeaks(decoded.buffer, 64);
                    m._peaks = m.peaks;

                    const inst = getInst();
                    inst?.setAudioBuffer?.(decoded.buffer, decoded.sampleRate);

                    if (statusText) statusText.textContent = `Encoding (${WaveView.formatMs(decoded.duration * 1000)})...`;
                    m.data = await TapeCodec.encodeToOpusBase64(decoded.buffer, decoded.sampleRate, audioCtx);
                    if (statusText) statusText.textContent = `Ready (${WaveView.formatMs(decoded.duration * 1000)})`;

                    redrawSvg();
                    syncAudio();
                    ctx?.renderGrid?.();
                } catch (err) {
                    console.error('[WAVE] File load failed:', err);
                    if (statusText) statusText.textContent = `Error: ${err.message || 'Load failed'}`;
                }
            });
        }
    },

    updateLive: (el, m, vals, targetModal) => {
        if (el) {
            const bars = el.querySelectorAll('.tape-grid-bar');
            const isPlaying = Boolean(vals?.isPlaying);
            const playhead = vals?.playhead ?? 0;
            const activeBin = Math.floor(playhead * bars.length);
            bars.forEach((b, idx) => {
                if (isPlaying && idx === activeBin) {
                    b.style.background = '#facc15';
                    b.style.opacity = '1';
                } else {
                    b.style.background = '#4ade80';
                    b.style.opacity = '0.75';
                }
            });
        }

        if (!targetModal) return;

        if ((vals?.startPatched || vals?.endPatched) && m.rangeLock) {
            m.rangeLock = false;
            const lockBtn = targetModal.querySelector('#tape-range-lock-btn');
            if (lockBtn) {
                lockBtn.disabled = true;
                lockBtn.style.opacity = '0.4';
                lockBtn.style.cursor = 'not-allowed';
                lockBtn.style.background = '#1e293b';
                lockBtn.style.borderColor = '#334155';
                lockBtn.style.color = '#94a3b8';
                lockBtn.innerHTML = '<span>&#128275;</span><span>LOCK ΔT</span>';
            }
        }

        WaveView.syncModalDOM(targetModal, m, vals || {});
    }
};

export const TAPE = WAVE;
export const waveDefs = { WAVE, TAPE };
export const tapeDefs = waveDefs;
export default waveDefs;
