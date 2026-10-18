// src/modules/defs/wave.js
import { UIHelpers } from '../../ui/helpers.js?v=241';
import { WaveCodec } from '../../audio/wave-codec.js?v=241';
import { WaveView } from '../../ui/wave-view.js?v=241';
import { WaveModal } from '../../ui/wave-modal.js?v=241';

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
        rangeLock: false,
        data: '',
        peaks: null
    }),
    onNormalize: (m) => {
        if (m.peaks && Array.isArray(m.peaks)) m._peaks = m.peaks;
        if (m.chopMode === undefined) m.chopMode = 'off';
        if (!Array.isArray(m.chops)) m.chops = [];
        if (m.snapMode === undefined) m.snapMode = false;
        if (m.rangeLock === undefined) m.rangeLock = false;
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
    renderModal: (m, ctx) => WaveModal.renderModal(m, ctx),
    bindEvents: (m, ctx, onChange) => WaveModal.bindEvents(m, ctx, onChange),
    updateLive: (cell, data, isPlaying, targetModal, m) => WaveView.updateLive(cell, data, isPlaying, targetModal, m),

    // Delegated helpers for external compatibility
    extractPeaks: (buffer, numBins = 64) => WaveCodec.extractPeaks(buffer, numBins),
    formatMs: (ms) => WaveView.formatMs(ms),
    formatSpeed: (v) => WaveView.formatSpeed(v),
    resolveEffectiveBounds: (m, rawStartVal = null, rawEndVal = null) => WaveView.resolveEffectiveBounds(m, rawStartVal, rawEndVal),
    formatBoundDisp: (m, rawVal, effVal, isPatched = false) => WaveView.formatBoundDisp(m, rawVal, effVal, isPatched),
    renderWaveformSVG: (m, playhead = 0.0, isPlaying = false, effStartVal = null, effEndVal = null, rawStartVal = null, rawEndVal = null) =>
        WaveView.renderWaveformSVG(m, playhead, isPlaying, effStartVal, effEndVal, rawStartVal, rawEndVal),
    getActiveInst: (ctx, m) => WaveModal.getActiveInst(ctx, m)
};

export const TAPE = WAVE;
export const waveDefs = { WAVE, TAPE };
export const tapeDefs = waveDefs;
export default waveDefs;
