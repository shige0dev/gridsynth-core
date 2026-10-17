import { UIHelpers } from '../../ui/helpers.js';

export const SCALE_PRESETS = {
    'CHROMATIC': [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    'MAJOR':     [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
    'MINOR':     [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0],
    'PENT.MAJ':  [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
    'PENT.MIN':  [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0],
    'DORIAN':    [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0],
    'PHRYGIAN':  [1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0],
    'BLUES':     [1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0],
    'HARM.MIN':  [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1]
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const SCALE = {
    color: 'amber',
    defaults: () => ({
        type: 'SCALE',
        root: 0, // C
        scale: 'PENT.MIN',
        mask: [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0]
    }),
    ports: () => ({
        in: [
            { port: 'cv_in', color: 'bg-yellow-400' }
        ],
        out: [
            { port: 'cv_out', color: 'bg-yellow-400' }
        ]
    }),
    renderGrid: (m) => {
        const root = m.root ?? 0;
        const mask = m.mask || SCALE_PRESETS[m.scale] || SCALE_PRESETS['PENT.MIN'];
        const rootName = NOTE_NAMES[root] || 'C';
        return `
            <div class="flex flex-col items-center justify-center w-full h-full pointer-events-none leading-none gap-1">
                <div class="flex items-center justify-between w-[50px] px-0.5 pointer-events-none">
                    <span class="text-[7.5px] font-mono font-bold text-amber-400/90 truncate">${rootName}</span>
                    <span class="scale-note-disp text-[9px] font-mono font-bold text-white tracking-tight">—</span>
                </div>
                <div class="flex items-center justify-center w-full pointer-events-none">
                    ${UIHelpers.renderPanelBars(
                        Array.from({ length: 12 }, (_, i) => {
                            const isMasked = (mask[i] ?? 1) === 1;
                            const h = isMasked ? 85 : 4;
                            // 通過させる音は CVカラーの黄色（amber〜yellow）、通過させない音は消灯（暗いslate）
                            const barColor = isMasked
                                ? 'bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-300'
                                : 'bg-slate-800/40';
                            const borderCls = isMasked ? 'border-amber-500/60' : 'border-slate-800/60';
                            return {
                                pct: h,
                                color: barColor,
                                width: 'flex-1',
                                outerCls: borderCls,
                                attrs: `data-scale-bar="${i}"`
                            };
                        }),
                        {
                            gapCls: 'gap-px',
                            containerCls: 'w-[50px]',
                            theme: 'cv'
                        }
                    )}
                </div>
            </div>`;
    },
    updateLive: (cell, data, isP, modal, m) => {
        const semi = data?.activeSemi ?? -1;
        const cv = data?.cv ?? 0;

        // 盤面グリッドの12本バーのうち、現在鳴っている音を強烈に白〜ゴールド発光
        cell.querySelectorAll('[data-scale-bar]').forEach((b, i) => {
            const barSemi = parseInt(b.getAttribute('data-scale-bar') ?? i, 10);
            const isAct = (barSemi === semi);
            b.classList.toggle('scale-active', isAct);
        });

        // 盤面グリッドの現在音名表示
        const noteDisp = cell.querySelector('.scale-note-disp');
        if (noteDisp) {
            if (semi >= 0 && isFinite(cv)) {
                const oct = Math.floor(cv) + 1; // 1V/oct C1=0V -> 1V=C2
                noteDisp.textContent = `${NOTE_NAMES[semi]}${oct}`;
            } else {
                noteDisp.textContent = '—';
            }
        }

        // モーダルが開いていればモーダル内のバーと音名も更新
        if (modal) {
            modal.querySelectorAll('[data-modal-bar]').forEach((b, i) => {
                const barSemi = parseInt(b.getAttribute('data-modal-bar') ?? i, 10);
                const isAct = (barSemi === semi);
                b.classList.toggle('ring-2', isAct);
                b.classList.toggle('ring-white', isAct);
                b.classList.toggle('shadow-[0_0_12px_#ffffff]', isAct);
            });
            const liveNote = modal.querySelector('#scale-modal-live-note');
            if (liveNote) {
                if (semi >= 0 && isFinite(cv)) {
                    const oct = Math.floor(cv) + 1;
                    const sign = cv >= 0 ? '+' : '';
                    liveNote.textContent = `${NOTE_NAMES[semi]}${oct} (${sign}${cv.toFixed(2)}V)`;
                } else {
                    liveNote.textContent = '—';
                }
            }
        }
    },
    renderModal: (m, ctx) => {
        const root = m.root ?? 0;
        const scaleKey = m.scale || 'PENT.MIN';
        const mask = m.mask || SCALE_PRESETS[scaleKey] || SCALE_PRESETS['PENT.MIN'];
        const presetKeys = Object.keys(SCALE_PRESETS);

        return `
            <div class="flex flex-col gap-2 p-1 select-none">
                <!-- Top Row: Root & Scale Preset -->
                <div class="flex items-center justify-between gap-1.5 bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] font-bold text-slate-400 uppercase tracking-tight">ROOT:</span>
                        <select id="scale-root-sel" class="bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold text-[9.5px] rounded px-1.5 py-0.5 cursor-pointer outline-none hover:border-amber-500">
                            ${NOTE_NAMES.map((name, idx) => `
                                <option value="${idx}" ${idx === root ? 'selected' : ''}>${name}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="flex items-center gap-1 flex-1 justify-end min-w-0">
                        <span class="text-[8px] font-bold text-slate-400 uppercase tracking-tight">SCALE:</span>
                        <select id="scale-preset-sel" class="bg-slate-900 border border-slate-700 text-yellow-300 font-mono font-bold text-[9px] rounded px-1.5 py-0.5 cursor-pointer outline-none hover:border-yellow-500 truncate max-w-[130px]">
                            ${presetKeys.map(k => `
                                <option value="${k}" ${k === scaleKey ? 'selected' : ''}>${k}</option>
                            `).join('')}
                            <option value="CUSTOM" ${scaleKey === 'CUSTOM' ? 'selected' : ''}>*CUSTOM*</option>
                        </select>
                    </div>
                </div>

                <!-- 12-Bar Interactive Equal Probability Matrix -->
                <div class="flex flex-col gap-1 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                    <div class="flex items-center justify-between text-[7.5px] font-bold text-slate-400 tracking-wider">
                        <span>12-NOTE EQUAL PROBABILITY FILTER</span>
                        <span class="text-amber-400 font-mono">${mask.filter(x => x === 1).length} ACTIVE</span>
                    </div>

                    <!-- 12 Bars -->
                    <div class="flex items-end justify-between gap-1 h-16 pt-1 pb-0.5">
                        ${NOTE_NAMES.map((n, i) => {
                            const isOn = (mask[i] ?? 1) === 1;
                            const isBlack = n.includes('#');
                            const barBg = isOn
                                ? 'bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-300 border-amber-400/80'
                                : 'bg-slate-900 border-slate-800 text-slate-600';
                            const barHeight = isOn ? 'h-full' : 'h-3';
                            return `
                                <div class="flex-1 flex flex-col items-center justify-end h-full cursor-pointer group" data-note-toggle="${i}" title="${n} ON/OFF">
                                    <div data-modal-bar="${i}" class="w-full ${barHeight} rounded-t-sm border ${barBg} transition-all duration-75 flex items-center justify-center relative overflow-hidden">
                                        <div class="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                    </div>
                                    <span class="text-[8px] font-mono font-bold mt-1 ${isOn ? (isBlack ? 'text-amber-300' : 'text-yellow-200') : 'text-slate-600'}">${n}</span>
                                </div>`;
                        }).join('')}
                    </div>
                </div>

                <!-- Bottom Status Banner -->
                <div class="flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800/80 text-[8.5px] font-mono">
                    <div class="flex items-center gap-1 text-slate-400">
                        <span>OUT:</span>
                        <span id="scale-modal-live-note" class="text-yellow-300 font-bold tracking-wide">—</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="text-[7.5px] px-1.5 py-0.5 rounded font-bold bg-amber-950/80 text-amber-300 border border-amber-500/60">
                            0〜1V ➔ C1〜C2
                        </span>
                    </div>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        // Root Selector
        const rootSel = document.getElementById('scale-root-sel');
        if (rootSel) {
            rootSel.addEventListener('change', (e) => {
                m.root = parseInt(e.target.value, 10);
                cb();
            });
        }

        // Scale Preset Selector
        const presetSel = document.getElementById('scale-preset-sel');
        if (presetSel) {
            presetSel.addEventListener('change', (e) => {
                const k = e.target.value;
                m.scale = k;
                if (SCALE_PRESETS[k]) {
                    m.mask = [...SCALE_PRESETS[k]];
                }
                ctx.reRenderModal();
                cb();
            });
        }

        // Interactive Note Bar Toggles
        document.querySelectorAll('[data-note-toggle]').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.noteToggle, 10);
                if (!Array.isArray(m.mask)) {
                    m.mask = [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0];
                }
                m.mask[idx] = m.mask[idx] === 1 ? 0 : 1;

                // Match preset or mark custom
                let matchedKey = 'CUSTOM';
                for (const [k, p] of Object.entries(SCALE_PRESETS)) {
                    if (p.every((v, i) => v === m.mask[i])) {
                        matchedKey = k;
                        break;
                    }
                }
                m.scale = matchedKey;

                ctx.reRenderModal();
                cb();
            });
        });
    }
};

export const scaleDefs = { SCALE };
