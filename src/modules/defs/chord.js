import { UIHelpers } from '../../ui/helpers.js';
import { CHORD_SPECS, CHORD_KEYS } from '../../core/musical.js';

const renderChordSlotsHTML = (chordKey) => {
    const info = CHORD_SPECS[chordKey] || CHORD_SPECS['min'];
    const intervals = info.intervals || [0, 3, 7, 12];
    const baseSlots = new Set();
    const overSlots = new Set();

    intervals.forEach(semi => {
        const slot = ((semi % 12) + 12) % 12;
        if (semi < 12) {
            baseSlots.add(slot);
        } else {
            overSlots.add(slot);
        }
    });

    let bars = '';
    for (let s = 0; s < 12; s++) {
        const hasBase = baseSlots.has(s);
        const hasOver = overSlots.has(s);

        if (hasBase && hasOver) {
            // Split: upper half amber, lower half cyan
            bars += `
                <div class="flex-1 h-full flex flex-col rounded-[1px] overflow-hidden bg-slate-900 border border-slate-800/60 shrink-0">
                    <div class="h-1/2 w-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.7)]"></div>
                    <div class="h-1/2 w-full bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.7)]"></div>
                </div>`;
        } else if (hasBase) {
            // Base layer only: solid cyan
            bars += `
                <div class="flex-1 h-full rounded-[1px] overflow-hidden bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.7)] border border-cyan-300/40 shrink-0"></div>`;
        } else if (hasOver) {
            // Over layer only: solid amber
            bars += `
                <div class="flex-1 h-full rounded-[1px] overflow-hidden bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.7)] border border-amber-300/40 shrink-0"></div>`;
        } else {
            // Off: dark
            bars += `
                <div class="flex-1 h-full rounded-[1px] bg-slate-800/35 border border-slate-800/30 opacity-40 shrink-0"></div>`;
        }
    }
    return bars;
};

export const CHORD = {
    color: 'purple',
    CHORD_SPECS,
    defaults: () => ({ type: 'CHORD', chord: 'min', rootMidi: 48 }),
    ports: () => ({
        in: [
            { port: 'cv_in', pin: 4, label: 'IN', signal: 'cv', color: 'bg-yellow-400' }
        ],
        out: [
            { port: 'cv_out1', pin: 10, label: 'V1', signal: 'cv', color: 'bg-yellow-400' },
            { port: 'cv_out2', pin: 11, label: 'V2', signal: 'cv', color: 'bg-yellow-400' },
            { port: 'cv_out3', pin: 12, label: 'V3', signal: 'cv', color: 'bg-yellow-400' },
            { port: 'cv_out4', pin: 13, label: 'V4', signal: 'cv', color: 'bg-yellow-400' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const chordKey = m.chord || 'min';
        const info = CHORD_SPECS[chordKey] || CHORD_SPECS['min'];
        const slotsHTML = renderChordSlotsHTML(chordKey);
        return `
            <div class="flex flex-col items-center justify-between w-full h-full py-1.5 px-2 select-none pointer-events-none text-purple-300 leading-none">
                <div class="flex flex-col items-center gap-0.5 w-full">
                    <span class="text-[7.5px] font-bold uppercase tracking-wider text-slate-400">CHORD</span>
                    <span class="text-[10px] font-mono font-bold text-cyan-300 truncate max-w-full text-center">${info.label}</span>
                </div>
                <div class="w-full flex items-center justify-center px-0.5">
                    <div class="w-full h-7 flex items-center gap-[1.5px] p-0.5 bg-slate-950/80 rounded border border-slate-800/90 shadow-inner">
                        ${slotsHTML}
                    </div>
                </div>
                <div class="flex items-center justify-center gap-2 text-[7px] font-mono text-slate-500">
                    <span class="flex items-center gap-0.5"><span class="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span>0-11</span>
                    <span class="flex items-center gap-0.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>+12</span>
                </div>
            </div>`;
    },
    renderModal: (m, ctx) => {
        const curChord = m.chord || 'min';
        const isRootPatched = ctx.patched?.has('cv_in');
        const curRoot = m.rootMidi ?? 48;
        const rootName = UIHelpers.cvToNoteName((curRoot - 24) / 12.0);

        return `
            <div class="space-y-2 select-none">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] text-slate-400 font-semibold uppercase">ROOT NOTE (1V/OCT BASE)</span>
                    <span class="text-[9px] font-mono font-bold text-yellow-300">${isRootPatched ? 'EXT CV (PATCHED)' : rootName}</span>
                </div>
                <div class="flex items-center justify-around py-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1 ${isRootPatched ? 'opacity-30 pointer-events-none' : ''}">
                    ${UIHelpers.createVSliderHTML('chord-root-slider', 'ROOT', 24, 72, 1, curRoot, 'note', 'purple', isRootPatched, rootName)}
                </div>
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label class="block text-[8px] text-slate-400 uppercase tracking-wider font-semibold">CHORD SELECT (16 TYPES)</label>
                        <span class="text-[8px] font-mono text-cyan-300 font-bold">${(CHORD_SPECS[curChord] || CHORD_SPECS['min']).label}</span>
                    </div>
                    <div class="grid grid-cols-4 gap-1">
                        ${CHORD_KEYS.map(key => {
                            const c = CHORD_SPECS[key];
                            const isSel = curChord === key;
                            return `
                                <button class="chord-type-btn py-1.5 px-1 rounded flex flex-col items-center justify-center border transition-all ${isSel ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="${key}">
                                    <span class="text-[8.5px] font-bold pointer-events-none">${c.label}</span>
                                    <span class="text-[6.5px] font-mono ${isSel ? 'text-purple-200' : 'text-slate-500'} pointer-events-none">[${c.intervals.join(',')}]</span>
                                </button>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        UIHelpers.bindButtonGroup('.chord-type-btn', 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50', 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800', val => {
            m.chord = val;
            ctx.reRenderModal?.();
            ctx.reRenderCell?.();
            cb();
        });
        if (!ctx.patched?.has('cv_in')) {
            UIHelpers.bindSlider('chord-root-slider', v => UIHelpers.cvToNoteName((Math.round(v) - 24) / 12.0), v => {
                m.rootMidi = Math.round(v);
                cb();
            }, 1, 24, 72);
        }
    }
};

export const chordDefs = {
    CHORD
};
