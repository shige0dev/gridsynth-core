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
        const mask = Array.isArray(m.mask) ? m.mask : (SCALE_PRESETS[m.scale] || SCALE_PRESETS['PENT.MIN'] || [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0]);
        const rootName = NOTE_NAMES[root] || 'C';
        const scaleName = m.scale || 'PENT.MIN';

        return `
            <div class="flex flex-col items-center justify-center w-full h-full pointer-events-none leading-none gap-1">
                <!-- ルート音 ＋ スケール名 -->
                <div class="flex items-center justify-center w-[50px] px-0.5 pointer-events-none text-center">
                    <span class="text-[8px] font-mono font-bold text-amber-400 truncate tracking-tight">${rootName} ${scaleName}</span>
                </div>
                <!-- 12本バー：通過音は100%黄色塗りつぶし・細くても潰れないソリッドバー構造 -->
                <div class="flex items-center justify-between w-[50px] h-6 gap-[1.5px] p-0 pointer-events-none">
                    ${Array.from({ length: 12 }, (_, i) => {
                        const isMasked = (mask[i] ?? 1) === 1;
                        const barBg = isMasked
                            ? 'bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-300 shadow-[0_0_3px_rgba(251,191,36,0.6)]'
                            : 'bg-slate-900/90 border border-slate-800/60';
                        return `<div data-scale-bar="${i}" class="scale-bar-item flex-1 h-full rounded-[1px] relative ${barBg}"></div>`;
                    }).join('')}
                </div>
            </div>`;
    },
    updateLive: (cell, data, isP, modal) => {
        const relSemi = (data?.activeRelSemi !== undefined && data.activeRelSemi >= 0)
            ? data.activeRelSemi
            : (data?.activeSemi ?? -1);

        // 該当出力のバーだけ枠が光る（0〜11のスケール内相対位置）
        cell.querySelectorAll('[data-scale-bar]').forEach((b, i) => {
            const barIdx = parseInt(b.getAttribute('data-scale-bar') ?? i, 10);
            const isAct = (barIdx === relSemi);
            b.classList.toggle('scale-active', isAct);
        });

        // モーダルが開いていればモーダル内のバー枠もハイライト
        if (modal) {
            modal.querySelectorAll('[data-modal-bar]').forEach((b, i) => {
                const barIdx = parseInt(b.getAttribute('data-modal-bar') ?? i, 10);
                const isAct = (barIdx === relSemi);
                b.classList.toggle('ring-2', isAct);
                b.classList.toggle('ring-yellow-300', isAct);
                b.classList.toggle('shadow-[0_0_8px_#fde047]', isAct);
            });
        }
    },
    renderModal: (m) => {
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

                    <!-- 12 Bars: ルート音を左端（0番目）として音名を表示 -->
                    <div class="flex items-end justify-between gap-1 h-16 pt-1 pb-0.5">
                        ${Array.from({ length: 12 }, (_, i) => {
                            const noteIdx = (root + i) % 12;
                            const n = NOTE_NAMES[noteIdx] || 'C';
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
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        // Root Selector
        const rootSel = document.getElementById('scale-root-sel');
        if (rootSel) {
            rootSel.addEventListener('change', (e) => {
                m.root = parseInt(e.target.value, 10);
                ctx.reRenderModal();
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
