// src/ui/wave-modal.js
import { UIHelpers } from './helpers.js?v=242';
import { WaveCodec } from '../audio/wave-codec.js?v=242';
import { WaveView } from './wave-view.js?v=242';

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
        if (synth && !synth.ctx) await synth.init();
        if (synth?.ctx && synth.ctx.state === 'suspended') {
            try { await synth.ctx.resume(); } catch (_) {}
        }
        if (synth && !synth.hasModules()) {
            synth.rebuildAll(ctx.pagesData, (pId, id) => ctx.getPatchState(id, pId));
        }
        const pwrBtn = document.getElementById('audio-power-btn');
        if (pwrBtn && !pwrBtn.classList.contains('border-red-500')) {
            pwrBtn.className = "h-7 w-7 bg-red-950 text-red-400 rounded-lg border border-red-500 shadow-md shadow-red-500/40 flex items-center justify-center shrink-0";
        }
        return this.getActiveInst(ctx, m);
    },

    renderModal(m, ctx) {
        const isStartPatched = ctx?.patched?.has('start_cv') || ctx?.patched?.has('cv_start');
        const isEndPatched = ctx?.patched?.has('end_cv') || ctx?.patched?.has('cv_end');
        const isSpeedPatched = ctx?.patched?.has('speed_cv') || ctx?.patched?.has('cv_speed');
        const isAnyRangePatched = Boolean(isStartPatched || isEndPatched);
        const lockActive = Boolean(m.rangeLock) && !isAnyRangePatched;

        const bounds = WaveView.resolveEffectiveBounds(m);
        const startDisp = WaveView.formatBoundDisp(m, bounds.rawStart, bounds.start, isStartPatched);
        const endDisp = WaveView.formatBoundDisp(m, bounds.rawEnd, bounds.end, isEndPatched);
        const speedCvVal = m.speedCv !== undefined ? m.speedCv : Math.log2(m.speed || 1.0);
        const speedDisp = isSpeedPatched ? 'EXT' : WaveView.formatSpeed(speedCvVal);
        const durStr = `${(m.duration ?? 1.5).toFixed(2)}s`;
        const loopActive = Boolean(m.loop);
        const retriggerActive = m.retrigger !== false;

        const chopBtnCls = (mode) =>
            `px-1.5 py-0.5 rounded border ${(m.chopMode ?? 'off') === mode ? 'bg-amber-950 text-amber-300 border-amber-500 font-bold shadow-sm shadow-amber-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'} transition cursor-pointer`;

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

                <!-- Oscilloscope-sized Waveform Display -->
                <div id="tape-waveform-wrap" class="w-full">
                    ${WaveView.renderWaveformSVG(m, 0.0, false)}
                </div>

                <!-- CHOP and SNAP Controls -->
                <div class="flex items-center justify-between gap-1 px-2 py-1 bg-slate-950/70 rounded-xl border border-slate-800 text-[8px] select-none">
                    <div class="flex items-center gap-1.5">
                        <span class="text-amber-400 font-bold text-[7.5px] font-mono">CHOP:</span>
                        <div class="flex items-center gap-1">
                            <button id="tape-chop-off" class="${chopBtnCls('off')}">OFF</button>
                            <button id="tape-chop-4" class="${chopBtnCls('4')}">4</button>
                            <button id="tape-chop-8" class="${chopBtnCls('8')}">8</button>
                            <button id="tape-chop-16" class="${chopBtnCls('16')}">16</button>
                        </div>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="text-slate-400 font-bold text-[7.5px] font-mono">SNAP:</span>
                        <button id="tape-snap-btn" class="px-2 py-0.5 rounded border ${m.snapMode ? 'bg-emerald-950 text-emerald-300 border-emerald-500 font-bold shadow-sm shadow-emerald-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'} transition cursor-pointer font-bold">
                            ${m.snapMode ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>

                <!-- Row 1: PLAY, LOOP, RETRIG & SPEED Slider -->
                <div class="flex items-center justify-between gap-2 px-2 py-1.5 bg-slate-950/70 rounded-xl border border-slate-800 text-[8.5px]">
                    <div class="flex items-center gap-1 shrink-0">
                        <button id="tape-play-btn" class="h-6 w-7 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition flex items-center justify-center shadow-sm active:scale-95 cursor-pointer shrink-0" title="PLAY / STOP">
                            <i id="tape-play-icon" data-lucide="play" class="w-3 h-3"></i>
                        </button>
                        <button id="tape-loop-btn" class="h-6 w-7 rounded border ${loopActive ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'} font-bold transition flex items-center justify-center cursor-pointer shrink-0" title="LOOP (ループ再生 ON/OFF)">
                            <i data-lucide="repeat" class="w-3 h-3"></i>
                        </button>
                        <button id="tape-retrigger-btn" class="h-6 w-7 rounded border ${retriggerActive ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'} font-bold transition flex items-center justify-center cursor-pointer shrink-0" title="RETRIGGER (ON: 毎回先頭から再生 / OFF: 完走するまでトリガー無視)">
                            <i data-lucide="rotate-ccw" class="w-3 h-3"></i>
                        </button>
                    </div>
                    <div class="w-[1px] h-6 bg-slate-800 shrink-0"></div>
                    <div class="flex-1 min-w-[120px] flex flex-col justify-center gap-0.5 ${isSpeedPatched ? 'opacity-30 pointer-events-none' : ''}">
                        <div class="flex items-center justify-between text-[8px] font-mono font-bold leading-tight">
                            <span class="text-cyan-400">SPEED</span>
                            <span id="tape-slider-speed-disp" class="text-cyan-300 font-mono text-[8.5px] cursor-ns-resize hover:bg-slate-800/80 px-1 rounded leading-none">${speedDisp}</span>
                        </div>
                        <input type="range" id="tape-slider-speed" min="-2.0" max="2.0" step="0.05" value="${speedCvVal}" class="w-full h-1.5 bg-slate-800 rounded-lg accent-cyan-400 cursor-pointer" ${isSpeedPatched ? 'disabled' : ''} title="再生速度 (/4, /2, x1, x2, x4)">
                        <div class="flex justify-between px-0.5 text-[6.5px] font-mono text-slate-500 font-bold select-none pointer-events-none -mt-0.5">
                            <span>/4</span><span>/2</span><span class="text-cyan-400">x1</span><span>x2</span><span>x4</span>
                        </div>
                    </div>
                </div>

                <!-- Row 2: START, Center TIME LOCK, & END Sliders -->
                <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-950/70 rounded-xl border border-slate-800 shadow-sm">
                    <div class="flex-1 min-w-0 flex flex-col gap-0.5 ${isStartPatched ? 'opacity-30 pointer-events-none' : ''}">
                        <div class="flex items-center justify-between gap-1 text-[8px] font-mono font-bold leading-tight whitespace-nowrap overflow-hidden">
                            <span class="text-[8.5px] text-emerald-400 shrink-0">START</span>
                            <span id="tape-slider-start-disp" class="text-emerald-300 font-mono text-[8px] font-bold cursor-ns-resize hover:bg-slate-800/80 px-1 py-0.5 rounded leading-none truncate">${startDisp}</span>
                        </div>
                        <input type="range" id="tape-slider-start" min="0.0" max="1.0" step="0.005" value="${m.start ?? 0.0}" class="w-full h-2.5 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer" ${isStartPatched ? 'disabled' : ''} title="開始CV位置 (0%〜100%)">
                    </div>

                    <button id="tape-range-lock-btn" class="h-6 w-6 rounded-lg border ${lockActive ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'} transition flex items-center justify-center shrink-0 ${isAnyRangePatched ? 'opacity-30 pointer-events-none cursor-not-allowed' : 'cursor-pointer active:scale-95'}" ${isAnyRangePatched ? 'disabled' : ''} title="TIME LOCK (START/END CV差分ロック)">
                        <i data-lucide="${lockActive ? 'lock' : 'unlock'}" class="w-3 h-3 pointer-events-none"></i>
                    </button>

                    <div class="flex-1 min-w-0 flex flex-col gap-0.5 ${isEndPatched ? 'opacity-30 pointer-events-none' : ''}">
                        <div class="flex items-center justify-between gap-1 text-[8px] font-mono font-bold leading-tight whitespace-nowrap overflow-hidden">
                            <span class="text-[8.5px] text-emerald-400 shrink-0">END</span>
                            <span id="tape-slider-end-disp" class="text-emerald-300 font-mono text-[8px] font-bold cursor-ns-resize hover:bg-slate-800/80 px-1 py-0.5 rounded leading-none truncate">${endDisp}</span>
                        </div>
                        <input type="range" id="tape-slider-end" min="0.0" max="1.0" step="0.005" value="${m.end ?? 1.0}" class="w-full h-2.5 bg-slate-800 rounded-lg accent-emerald-400 cursor-pointer" ${isEndPatched ? 'disabled' : ''} title="終了CV位置 (0%〜100%)">
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents(m, ctx, onChange) {
        const root = ctx.getDialogElement?.() || document;
        const cb = typeof onChange === 'function' ? onChange : () => {};
        const svgWrap = root.querySelector('#tape-waveform-wrap');

        const isStartPatched = Boolean(ctx?.patched?.has('start_cv') || ctx?.patched?.has('cv_start'));
        const isEndPatched = Boolean(ctx?.patched?.has('end_cv') || ctx?.patched?.has('cv_end'));
        const isSpeedPatched = Boolean(ctx?.patched?.has('speed_cv') || ctx?.patched?.has('cv_speed'));
        const isAnyRangePatched = isStartPatched || isEndPatched;

        if (m._lockDelta === undefined) m._lockDelta = (m.end ?? 1.0) - (m.start ?? 0.0);
        if (window.lucide?.createIcons) { try { window.lucide.createIcons({ root }); } catch (_) {} }

        const redrawSvg = () => {
            const st = this.getActiveInst(ctx, m)?.read?.();
            const rawS = isStartPatched ? (st?.rawStart ?? m.start ?? 0.0) : (m.start ?? 0.0);
            const rawE = isEndPatched ? (st?.rawEnd ?? m.end ?? 1.0) : (m.end ?? 1.0);
            const bounds = WaveView.resolveEffectiveBounds(m, rawS, rawE);
            if (svgWrap) {
                svgWrap.innerHTML = WaveView.renderWaveformSVG(m, st?.playhead ?? 0.0, Boolean(st?.isPlaying), bounds.start, bounds.end, bounds.rawStart, bounds.rawEnd);
            }
        };

        // Ensure PCM buffer is loaded into AudioWorklet
        const initialInst = this.getActiveInst(ctx, m);
        if (m._buffer && initialInst?.setAudioBuffer) {
            initialInst.setAudioBuffer(m._buffer, m.sampleRate || 48000);
        } else if (m.data && (!m.peaks?.length || !m._buffer)) {
            const synth = ctx?.synth || window.__GS_SYNTH__;
            WaveCodec.decodeFromBase64(m.data, synth?.ctx).then(res => {
                if (res?.buffer) {
                    m._buffer = res.buffer;
                    m.duration = res.duration;
                    m.sampleRate = res.sampleRate;
                    if (!m.peaks?.length) m.peaks = WaveCodec.extractPeaks(res.buffer, 64);
                    m._peaks = m.peaks;
                    this.getActiveInst(ctx, m)?.setAudioBuffer?.(res.buffer, res.sampleRate);
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

        // File Input
        const fileInput = root.querySelector('#tape-file-input');
        fileInput?.addEventListener('change', async (e) => {
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
                m.peaks = WaveCodec.extractPeaks(res.buffer, 64);
                m._peaks = m.peaks;
                m._buffer = res.buffer;
                (activeInst || this.getActiveInst(ctx, m))?.setAudioBuffer?.(res.buffer, res.sampleRate);

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

        // Play / Stop
        const playBtn = root.querySelector('#tape-play-btn');
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
        root.querySelector('#tape-loop-btn')?.addEventListener('click', (e) => {
            m.loop = !m.loop;
            e.currentTarget.className = toggleBtnCls(m.loop);
            syncRangeAndAudio();
        });
        root.querySelector('#tape-retrigger-btn')?.addEventListener('click', (e) => {
            m.retrigger = !(m.retrigger !== false);
            e.currentTarget.className = toggleBtnCls(m.retrigger !== false);
            syncRangeAndAudio();
        });

        // CHOP & SNAP
        const setChop = (mode) => {
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
            ctx.reRenderModal?.();
        };
        ['off', '4', '8', '16'].forEach(mode => {
            root.querySelector(`#tape-chop-${mode}`)?.addEventListener('click', () => setChop(mode));
        });
        root.querySelector('#tape-snap-btn')?.addEventListener('click', () => {
            m.snapMode = !m.snapMode;
            syncRangeAndAudio();
            ctx.reRenderModal?.();
        });

        // SVG Click to select slice or move locked CV window
        svgWrap?.addEventListener('click', (e) => {
            if (isAnyRangePatched) return;
            const svgEl = svgWrap.querySelector('#tape-waveform-svg');
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
        const lockBtn = root.querySelector('#tape-range-lock-btn');
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

        if (!isStartPatched) {
            UIHelpers.bindSlider('tape-slider-start', v => {
                const b = WaveView.resolveEffectiveBounds(m, Math.max(0, Math.min(1, v)), m.end ?? 1.0);
                return WaveView.formatBoundDisp(m, b.rawStart, b.start, false);
            }, v => applyRangeCv('start', v), 1, 0.0, 1.0);
        }
        if (!isEndPatched) {
            UIHelpers.bindSlider('tape-slider-end', v => {
                const b = WaveView.resolveEffectiveBounds(m, m.start ?? 0.0, Math.max(0, Math.min(1, v)));
                return WaveView.formatBoundDisp(m, b.rawEnd, b.end, false);
            }, v => applyRangeCv('end', v), 1, 0.0, 1.0);
        }
        if (!isSpeedPatched) {
            UIHelpers.bindSlider('tape-slider-speed', v => WaveView.formatSpeed(v), v => {
                m.speedCv = v;
                m.speed = Math.pow(2.0, v);
                syncRangeAndAudio();
            }, 1, -2.0, 2.0);
        }
    }
};

export default WaveModal;

