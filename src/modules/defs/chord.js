import { UIHelpers } from '../../ui/helpers.js';
import { CHORD_SPECS, CHORD_KEYS, NOTES } from '../../core/musical.js';

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
            // Split: upper half red, lower half yellow
            bars += `
                <div class="flex-1 h-full flex flex-col rounded-[1px] overflow-hidden bg-slate-900 border border-slate-800/60 shrink-0">
                    <div class="h-1/2 w-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.7)]"></div>
                    <div class="h-1/2 w-full bg-yellow-400 shadow-[0_0_4px_rgba(250,204,21,0.7)]"></div>
                </div>`;
        } else if (hasBase) {
            // Base layer only: solid yellow
            bars += `
                <div class="flex-1 h-full rounded-[1px] overflow-hidden bg-yellow-400 shadow-[0_0_4px_rgba(250,204,21,0.7)] border border-yellow-300/40 shrink-0"></div>`;
        } else if (hasOver) {
            // Over layer only: solid red
            bars += `
                <div class="flex-1 h-full rounded-[1px] overflow-hidden bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.7)] border border-red-400/40 shrink-0"></div>`;
        } else {
            // Off: dark
            bars += `
                <div class="flex-1 h-full rounded-[1px] bg-slate-800/35 border border-slate-800/30 opacity-40 shrink-0"></div>`;
        }
    }
    return bars;
};

const renderChordModalBarsHTML = (chordKey) => {
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

    return NOTES.map((n, semi) => {
        const hasBase = baseSlots.has(semi);
        const hasOver = overSlots.has(semi);
        const isOn = hasBase || hasOver;
        const isBlack = n.includes('#');

        let barContent = '';
        const barHeight = isOn ? 'h-full' : 'h-3';
        const textCls = isOn
            ? (semi === 0 ? 'text-amber-300 font-black underline' : (isBlack ? 'text-amber-300/90' : 'text-yellow-200'))
            : 'text-slate-600';

        if (hasBase && hasOver) {
            barContent = `
                <div class="w-full h-full flex flex-col rounded-t-sm overflow-hidden border border-amber-300/80">
                    <div class="h-1/2 w-full bg-gradient-to-t from-red-600 via-red-500 to-rose-400 shadow-[0_0_6px_rgba(239,68,68,0.5)]"></div>
                    <div class="h-1/2 w-full bg-gradient-to-t from-amber-600 via-amber-400 to-yellow-200 shadow-[0_0_6px_rgba(253,224,71,0.5)]"></div>
                </div>`;
        } else if (hasBase) {
            barContent = `
                <div class="w-full h-full rounded-t-sm border border-yellow-300 bg-gradient-to-t from-amber-600 via-amber-400 to-yellow-200 shadow-[0_0_6px_rgba(253,224,71,0.5)]"></div>`;
        } else if (hasOver) {
            barContent = `
                <div class="w-full h-full rounded-t-sm border border-red-400 bg-gradient-to-t from-red-600 via-red-500 to-rose-400 shadow-[0_0_6px_rgba(239,68,68,0.5)]"></div>`;
        } else {
            barContent = `
                <div class="w-full h-full rounded-t-sm border border-slate-800 bg-slate-900"></div>`;
        }

        return `
            <div class="flex-1 flex flex-col items-center justify-end h-full">
                <div class="w-full ${barHeight} flex items-center justify-center relative transition-all duration-75">
                    ${barContent}
                </div>
                <span class="text-[8px] font-mono font-bold mt-1 ${textCls}">${n}</span>
            </div>`;
    }).join('');
};

export const CHORD = {
    color: 'purple',
    CHORD_SPECS,
    defaults: () => ({ type: 'CHORD', chord: 'min', rootMidi: 48 }),
    ports: () => ({
        in: [
            { port: 'cv_in', pin: 5, label: 'IN', signal: 'cv', color: 'bg-yellow-400' }
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
            <div class="flex flex-col items-center justify-center w-full h-full pointer-events-none leading-none gap-1">
                <div class="flex items-center justify-center w-[50px] px-0.5 pointer-events-none text-center">
                    <span class="text-[8px] font-mono font-bold text-amber-400 truncate tracking-tight">${info.label}</span>
                </div>
                <div class="flex items-center justify-between w-[50px] h-6 gap-[1.5px] p-0 pointer-events-none">
                    ${slotsHTML}
                </div>
            </div>`;
    },
    renderModal: (m, ctx) => {
        const curChord = m.chord || 'min';
        const curInfo = CHORD_SPECS[curChord] || CHORD_SPECS['min'];
        const isRootPatched = ctx.patched?.has('cv_in');
        const curRoot = m.rootMidi ?? 48;
        const rootName = UIHelpers.cvToNoteName((curRoot - 24) / 12.0);

        return `
            <div class="flex flex-col gap-2 p-1 select-none">
                <!-- Top Row: Root & Chord Selector (SCALEと同一デザイン) -->
                <div class="flex items-center justify-between gap-1.5 bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] font-bold text-slate-400 uppercase tracking-tight">ROOT:</span>
                        <span class="text-[9.5px] font-mono font-bold text-amber-300 px-1 py-0.5">${isRootPatched ? 'EXT (CV IN)' : rootName}</span>
                    </div>

                    <div class="flex items-center gap-1 flex-1 justify-end min-w-0">
                        <span class="text-[8px] font-bold text-slate-400 uppercase tracking-tight">CHORD:</span>
                        <select id="chord-preset-sel" class="bg-slate-900 border border-slate-700 text-yellow-300 font-mono font-bold text-[9px] rounded px-1.5 py-0.5 cursor-pointer outline-none hover:border-yellow-500 truncate max-w-[130px]">
                            ${CHORD_KEYS.map(k => `
                                <option value="${k}" ${k === curChord ? 'selected' : ''}>${CHORD_SPECS[k].label}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <!-- 12-Bar Chord Intervals Display (SCALEと同一デザイン) -->
                <div class="flex flex-col gap-1 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                    <div class="flex items-center justify-between text-[7.5px] font-bold text-slate-400 tracking-wider">
                        <span>12-SEMITONE CHORD INTERVALS</span>
                        <span class="text-amber-400 font-mono">${curInfo.intervals.length} VOICES</span>
                    </div>

                    <div class="flex items-end justify-between gap-1 h-16 pt-1 pb-0.5">
                        ${renderChordModalBarsHTML(curChord)}
                    </div>
                </div>

                <!-- Unpatched Root Note Slider -->
                ${!isRootPatched ? `
                <div class="flex items-center justify-around py-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1">
                    ${UIHelpers.createVSliderHTML('chord-root-slider', 'ROOT NOTE', 24, 72, 1, curRoot, 'note', 'purple', false, rootName)}
                </div>` : ''}
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const chordSel = document.getElementById('chord-preset-sel');
        if (chordSel) {
            chordSel.addEventListener('change', (e) => {
                m.chord = e.target.value;
                ctx.reRenderModal?.();
                ctx.reRenderCell?.();
                cb();
            });
        }
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
