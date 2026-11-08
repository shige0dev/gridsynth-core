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
            // Split: left half yellow, right half red
            bars += `
                <div class="w-[4px] h-full flex flex-row rounded-[0.5px] overflow-hidden shrink-0">
                    <div class="w-1/2 h-full bg-yellow-400 shadow-[0_0_3px_rgba(250,204,21,0.6)]"></div>
                    <div class="w-1/2 h-full bg-red-500 shadow-[0_0_3px_rgba(239,68,68,0.6)]"></div>
                </div>`;
        } else if (hasBase) {
            // Base layer only: solid yellow
            bars += `
                <div class="w-[4px] h-full rounded-[0.5px] bg-yellow-400 shadow-[0_0_3px_rgba(250,204,21,0.6)] shrink-0"></div>`;
        } else if (hasOver) {
            // Over layer only: solid red
            bars += `
                <div class="w-[4px] h-full rounded-[0.5px] bg-red-500 shadow-[0_0_3px_rgba(239,68,68,0.6)] shrink-0"></div>`;
        } else {
            // Off: dark
            bars += `
                <div class="w-[4px] h-full rounded-[0.5px] bg-slate-800/40 shrink-0"></div>`;
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
            // Split: left half yellow, right half red
            barContent = `
                <div class="w-full h-full flex flex-row rounded-t-sm overflow-hidden border border-amber-300/80">
                    <div class="w-1/2 h-full bg-gradient-to-t from-amber-600 via-amber-400 to-yellow-200 shadow-[0_0_6px_rgba(253,224,71,0.5)]"></div>
                    <div class="w-1/2 h-full bg-gradient-to-t from-red-600 via-red-500 to-rose-400 shadow-[0_0_6px_rgba(239,68,68,0.5)]"></div>
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
                <div class="flex items-center justify-center w-[59px] px-0.5 pointer-events-none text-center">
                    <span class="text-[8px] font-mono font-bold text-amber-400 truncate tracking-tight">${info.label}</span>
                </div>
                <!-- 12本バー：すべて同一幅(4px)・同一間隔(1px) -->
                <div class="flex items-center justify-center h-6 gap-[1px] p-0 pointer-events-none">
                    ${slotsHTML}
                </div>
            </div>`;
    },
    renderModal: (m, ctx) => {
        const curChord = m.chord || 'min';
        const curInfo = CHORD_SPECS[curChord] || CHORD_SPECS['min'];
        const isRootPatched = ctx.patched?.has('cv_in');
        const rootSemi = ((m.rootMidi ?? 48) - 48 + 120) % 12;

        return `
            <div class="flex flex-col gap-2 p-1 select-none">
                <!-- Top Row: Root & Chord Selector (SCALEと同一表示) -->
                <div class="flex items-center justify-between gap-1.5 bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] font-bold text-slate-400 uppercase tracking-tight">ROOT:</span>
                        ${isRootPatched ? `
                            <span class="text-[9.5px] font-mono font-bold text-amber-300 px-1 py-0.5">EXT (CV)</span>
                        ` : `
                            <select id="chord-root-sel" class="bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold text-[9.5px] rounded px-1.5 py-0.5 cursor-pointer outline-none hover:border-amber-500">
                                ${NOTES.map((name, idx) => `
                                    <option value="${idx}" ${idx === rootSemi ? 'selected' : ''}>${name}</option>
                                `).join('')}
                            </select>
                        `}
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

                <!-- 12-Bar Chord Intervals Display (SCALEと同一表示) -->
                <div class="flex flex-col gap-1 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                    <div class="flex items-center justify-between text-[7.5px] font-bold text-slate-400 tracking-wider">
                        <span>12-SEMITONE CHORD INTERVALS</span>
                        <span class="text-amber-400 font-mono">${curInfo.intervals.length} VOICES</span>
                    </div>

                    <div class="flex items-end justify-between gap-1 h-16 pt-1 pb-0.5">
                        ${renderChordModalBarsHTML(curChord)}
                    </div>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        // Root Selector
        const rootSel = document.getElementById('chord-root-sel');
        if (rootSel) {
            rootSel.addEventListener('change', (e) => {
                const rootSemi = parseInt(e.target.value, 10);
                m.rootMidi = 48 + rootSemi;
                ctx.reRenderModal?.();
                ctx.reRenderCell?.();
                cb();
            });
        }

        // Chord Preset Selector
        const chordSel = document.getElementById('chord-preset-sel');
        if (chordSel) {
            chordSel.addEventListener('change', (e) => {
                m.chord = e.target.value;
                ctx.reRenderModal?.();
                ctx.reRenderCell?.();
                cb();
            });
        }
    }
};

export const chordDefs = {
    CHORD
};
