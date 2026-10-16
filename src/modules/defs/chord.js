import { UIHelpers } from '../../ui/helpers.js';
import { CHORD_TYPES, CHORD_VOICINGS, CHORD_ORDER, VOICING_LABELS, VOICING_ORDER } from '../../core/musical.js';

export const CHORD = {
    color: 'purple',
    CHORD_TYPES,
    VOICINGS: CHORD_VOICINGS,
    defaults: () => ({ type: 'CHORD', chord: 'min', rootMidi: 48, voicing: 'close' }),
    ports: () => ({
        in: [
            { port: 'cv_in', color: 'bg-yellow-400' },
            { port: 'type_cv', color: 'bg-yellow-400' },
            { port: 'voice_cv', color: 'bg-yellow-400' }
        ],
        out: [
            { port: 'cv_out1', color: 'bg-yellow-400' },
            { port: 'cv_out2', color: 'bg-yellow-400' },
            { port: 'cv_out3', color: 'bg-yellow-400' },
            { port: 'cv_out4', color: 'bg-yellow-400' }
        ]
    }),
    renderGrid: (m, ctx) => {
        const chordKey = m.chord || 'min';
        const info = CHORD_TYPES[chordKey] || CHORD_TYPES['min'];
        const voiceKey = m.voicing || 'close';
        const voiceInfo = VOICING_LABELS[voiceKey] || VOICING_LABELS['close'];
        const isPatched = ctx?.patched?.has('cv_in');
        const rootName = isPatched ? 'EXT' : UIHelpers.cvToNoteName(((m.rootMidi ?? 48) - 24) / 12.0);
        return `
            <div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-purple-300">
                <span class="text-[7.5px] font-bold uppercase tracking-wider text-slate-400">CHORD CV</span>
                <span class="text-[12px] font-mono font-bold text-cyan-300 chord-live-name">${rootName} ${info.label}</span>
                <div class="flex items-center gap-1 text-[7px] font-mono text-purple-400">
                    <span class="chord-live-bin font-bold text-yellow-300/90">${info.binary}</span>
                    <span class="text-slate-500">•</span>
                    <span class="chord-live-voice">${voiceInfo.label}</span>
                </div>
            </div>`;
    },
    renderModal: (m, ctx) => {
        const chords = CHORD_ORDER.map(val => ({ val, ...CHORD_TYPES[val] }));
        const voicings = VOICING_ORDER.map(val => ({ val, ...VOICING_LABELS[val] }));
        const isRootPatched = ctx.patched?.has('cv_in');
        const isTypePatched = ctx.patched?.has('type_cv');
        const isVoicePatched = ctx.patched?.has('voice_cv');
        const curRoot = m.rootMidi ?? 48;
        const rootName = UIHelpers.cvToNoteName((curRoot - 24) / 12.0);

        const curChord = m.chord || 'min';
        const curVoice = m.voicing || 'close';

        return `
            <div class="space-y-1.5">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] text-slate-400 font-semibold uppercase">ROOT NOTE (1V/OCT)</span>
                    <span class="text-[9px] font-mono font-bold text-yellow-300">${isRootPatched ? 'EXT CV (PATCHED)' : rootName}</span>
                </div>
                <div class="flex items-center justify-around py-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1 ${isRootPatched ? 'opacity-30 pointer-events-none' : ''}">
                    ${UIHelpers.createVSliderHTML('chord-root-slider', 'ROOT', 24, 72, 1, curRoot, 'note', 'purple', isRootPatched, rootName)}
                </div>
                <div>
                    <div class="flex items-center justify-between mb-0.5">
                        <label class="block text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Chord Type (0-7V)</label>
                        <span class="text-[8px] font-mono ${isTypePatched ? 'text-yellow-300 font-bold' : 'text-slate-500'}">${isTypePatched ? 'EXT CV (PATCHED)' : '3-BIT BINARY'}</span>
                    </div>
                    <div class="grid grid-cols-4 gap-1">
                        ${chords.map(c => {
                            const isSel = curChord === c.val;
                            return `
                                <button class="chord-type-btn py-1 px-1 rounded flex flex-col items-center justify-center border transition-all ${isSel ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="${c.val}">
                                    <span class="text-[7px] font-mono ${isSel ? 'text-purple-200' : 'text-slate-500'} pointer-events-none">${c.binary}</span>
                                    <span class="text-[8.5px] font-bold pointer-events-none">${c.label}</span>
                                </button>`;
                        }).join('')}
                    </div>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-0.5">
                        <label class="block text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Voicing (0-3V)</label>
                        <span class="text-[8px] font-mono ${isVoicePatched ? 'text-yellow-300 font-bold' : 'text-slate-500'}">${isVoicePatched ? 'EXT CV (PATCHED)' : '2-BIT BINARY'}</span>
                    </div>
                    <div class="grid grid-cols-4 gap-1">
                        ${voicings.map(v => {
                            const isSel = curVoice === v.val;
                            return `
                                <button class="chord-voice-btn py-1 px-1 rounded flex flex-col items-center justify-center border transition-all ${isSel ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="${v.val}">
                                    <span class="text-[7px] font-mono ${isSel ? 'text-purple-200' : 'text-slate-500'} pointer-events-none">${v.binary}</span>
                                    <span class="text-[8px] font-bold pointer-events-none">${v.label}</span>
                                </button>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        UIHelpers.bindButtonGroup('.chord-type-btn', 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50', 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800', val => {
            m.chord = val;
            ctx.reRenderModal();
            cb();
        });
        UIHelpers.bindButtonGroup('.chord-voice-btn', 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50', 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800', val => {
            m.voicing = val;
            ctx.reRenderModal();
            cb();
        });
        if (!ctx.patched?.has('cv_in')) {
            UIHelpers.bindSlider('chord-root-slider', v => UIHelpers.cvToNoteName((Math.round(v) - 24) / 12.0), v => {
                m.rootMidi = Math.round(v);
                cb();
            }, 1, 24, 72);
        }
    },
    updateLive: (cell, data, isPlaying, modalEl, m) => {
        if (!data) return;
        const cIdx = data.activeChordIdx ?? (m.chord ? CHORD_ORDER.indexOf(m.chord) : 0);
        const vIdx = data.activeVoiceIdx ?? (m.voicing ? VOICING_ORDER.indexOf(m.voicing) : 0);
        const cKey = CHORD_ORDER[cIdx] || 'min';
        const vKey = VOICING_ORDER[vIdx] || 'close';
        const cInfo = CHORD_TYPES[cKey];
        const vInfo = VOICING_LABELS[vKey];

        const nameEl = cell?.querySelector('.chord-live-name');
        const binEl = cell?.querySelector('.chord-live-bin');
        const voiceEl = cell?.querySelector('.chord-live-voice');
        if (nameEl && cInfo) {
            const isRootP = cell?.querySelector('.cable-jack[data-port="cv_in"]')?.classList.contains('connected');
            const rootName = isRootP ? 'EXT' : UIHelpers.cvToNoteName(((m.rootMidi ?? 48) - 24) / 12.0);
            nameEl.textContent = `${rootName} ${cInfo.label}`;
        }
        if (binEl && cInfo) binEl.textContent = cInfo.binary;
        if (voiceEl && vInfo) voiceEl.textContent = vInfo.label;

        if (modalEl) {
            modalEl.querySelectorAll('.chord-type-btn').forEach(btn => {
                const isCur = btn.dataset.val === cKey;
                btn.classList.toggle('ring-1', isCur);
                btn.classList.toggle('ring-yellow-400', isCur);
            });
            modalEl.querySelectorAll('.chord-voice-btn').forEach(btn => {
                const isCur = btn.dataset.val === vKey;
                btn.classList.toggle('ring-1', isCur);
                btn.classList.toggle('ring-yellow-400', isCur);
            });
        }
    }
};

export const chordDefs = {
    CHORD
};
