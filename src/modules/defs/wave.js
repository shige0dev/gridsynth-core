// src/modules/defs/wave.js
import { UIHelpers } from '../../ui/helpers.js?v=289';
import { WaveCodec } from '../../audio/wave-codec.js?v=289';
import { WaveView } from '../../ui/wave-view.js?v=289';
import { WaveModal } from '../../ui/wave-modal.js?v=289';

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
        pitchMode: false,
        semiMode: false,
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
        if (m.pitchMode === undefined) m.pitchMode = false;
        if (m.semiMode === undefined) m.semiMode = false;
    },
    onExport: (cloned, m) => {
        if (m?._isLinked) {
            cloned.data = '';
            cloned.peaks = null;
        }
    },
    ports: () => ({
        in: [
            { port: 'gate_in', color: 'bg-orange-500', pin: 4 },
            { port: 'start_cv', color: 'bg-yellow-400', pin: 5 },
            { port: 'end_cv', color: 'bg-yellow-400', pin: 6 },
            { port: 'speed_cv', color: 'bg-yellow-400', pin: 7 },
            { port: 'link_in', color: 'bg-slate-300', pin: 0 }
        ],
        out: [
            { port: 'wave_out', color: 'bg-blue-500', pin: 9 },
            { port: 'link_out', color: 'bg-slate-300', pin: 13 }
        ]
    }),
    renderGrid: (m, ctx) => {
        const bounds = WaveView.resolveEffectiveBounds(m);
        const rMin = Math.min(bounds.effStart, bounds.effEnd) * 100;
        const rWidth = Math.abs(bounds.effEnd - bounds.effStart) * 100;
        const isLinked = Boolean(ctx?.patched?.has('link_in') || m._isLinked);
        return `<div class="flex items-center justify-center w-full h-full pointer-events-none">
            <div class="w-14 h-7 rounded border border-slate-600 bg-slate-950 p-[1px] relative flex items-center justify-center shadow-inner panel-bar-slot">
                ${isLinked ? '<div class="absolute -top-2.5 inset-x-0 flex items-center justify-center pointer-events-none"><span class="text-[6px] font-mono font-bold tracking-wider text-slate-300 leading-none">LINKED</span></div>' : ''}
                <div class="absolute inset-0 overflow-hidden rounded-[3px]">
                    <div class="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 border-t border-slate-800/80"></div>
                    <div data-wave-panel-range class="absolute top-0 bottom-0 bg-slate-300/20" style="left: ${rMin.toFixed(1)}%; width: ${rWidth.toFixed(1)}%;"></div>
                    <div data-wave-panel-playhead class="absolute top-0 bottom-0 w-[1.5px] bg-yellow-400 drop-shadow-[0_0_3px_rgba(250,204,21,1)] z-10" style="left: 0%; display: none;"></div>
                </div>
            </div>
        </div>`;
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

export const waveDefs = { WAVE };
export default waveDefs;

