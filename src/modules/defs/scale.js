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
        const relMask = Array.isArray(m.mask) ? m.mask : (SCALE_PRESETS[m.scale] || SCALE_PRESETS['PENT.MIN'] || [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0]);
        const rootName = NOTE_NAMES[root] || 'C';
        const scaleName = m.scale || 'PENT.MIN';

        return `
            <div class="flex flex-col items-center justify-center w-full h-full pointer-events-none leading-none gap-1">
                <!-- ルート音 ＋ スケール名 -->
                <div class="flex items-center justify-center w-[50px] px-0.5 pointer-events-none text-center">
                    <span class="text-[8px] font-mono font-bold text-amber-400 truncate tracking-tight">${rootName} ${scaleName}</span>
                </div>
                <!-- 12本バー：C〜B固定。ルート音変更で通過音の黄色位置がシフト -->
                <div class="flex items-center justify-between w-[50px] h-6 gap-[1.5px] p-0 pointer-events-none">
                    ${Array.from({ length: 12 }, (_, semi) => {
                        const rel = (semi - root + 12) % 12;
                        const isMasked = (relMask[rel] ?? 1) === 1;
                        const barBg = isMasked
                            ? 'bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-300 shadow-[0_0_3px_rgba(251,191,36,0.6)]'
                            : 'bg-slate-900/90 border border-slate-800/60';
                        return `<div data-scale-bar="${semi}" class="scale-bar-item flex-1 h-full rounded-[1px] relative ${barBg}"></div>`;
                    }).join('')}
                </div>
            </div>`;
    },
    updateLive: (cell, data, isP, modal) => {
        const semi = data?.activeSemi ?? -1;

        // 該当出力のバーだけ枠が光る（0〜11の絶対半音 C〜B）
        cell.querySelectorAll('[data-scale-bar]').forEach((b) => {
            const barSemi = parseInt(b.getAttribute('data-scale-bar'), 10);
            b.classList.toggle('scale-active', barSemi === semi);
        });

        // モーダルが開いていればモーダル内のバー枠もハイライト
        if (modal) {
            modal.querySelectorAll('[data-modal-bar]').forEach((b) => {
                const barSemi = parseInt(b.getAttribute('data-modal-bar'), 10);
                const isAct = (barSemi === semi);
                b.classList.toggle('ring-2', isAct);
                b.classList.toggle('ring-yellow-300', isAct);
                b.classList.toggle('shadow-[0_0_8px_#fde047]', isAct);
            });
        }
    },
    renderModal: (m) => {
        const root = m.root ?? 0;
        const scaleKey = m.scale || 'PENT.MIN';
        const relMask = m.mask || SCALE_PRESETS[scaleKey] || SCALE_PRESETS['PENT.MIN'];
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
                        <span class="text-amber-400 font-mono">${relMask.filter(x => x === 1).length} ACTIVE</span>
                    </div>

                    <!-- 12 Bars: C〜B 完全固定。ルート変更で黄色バーと光る位置がシフト -->
                    <div class="flex items-end justify-between gap-1 h-16 pt-1 pb-0.5">
                        ${NOTE_NAMES.map((n, semi) => {
                            const rel = (semi - root + 12) % 12;
                            const isOn = (relMask[rel] ?? 1) === 1;
                            const isRoot = (semi === root);
                            const isBlack = n.includes('#');
                            const barBg = isOn
                                ? (isRoot
                                    ? 'bg-gradient-to-t from-amber-600 via-amber-400 to-yellow-200 border-yellow-300 shadow-[0_0_6px_rgba(253,224,71,0.5)]'
                                    : 'bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-300 border-amber-400/80')
                                : 'bg-slate-900 border-slate-800 text-slate-600';
                            const barHeight = isOn ? 'h-full' : 'h-3';
                            const textCls = isOn
                                ? (isRoot ? 'text-amber-300 font-black underline' : (isBlack ? 'text-amber-300/90' : 'text-yellow-200'))
                                : 'text-slate-600';
                            return `
                                <div class="flex-1 flex flex-col items-center justify-end h-full cursor-pointer group" data-note-toggle="${semi}" title="${n}">
                                    <div data-modal-bar="${semi}" class="w-full ${barHeight} rounded-t-sm border ${barBg} transition-all duration-75 flex items-center justify-center relative overflow-hidden">
                                        <div class="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                    </div>
                                    <span class="text-[8px] font-mono font-bold mt-1 ${textCls}">${n}</span>
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

        // Interactive Note Bar Toggles (C〜Bの各バーをタップ)
        document.querySelectorAll('[data-note-toggle]').forEach(el => {
            el.addEventListener('click', () => {
                const semi = parseInt(el.dataset.noteToggle, 10);
                const root = m.root ?? 0;
                const rel = (semi - root + 12) % 12;

                if (!Array.isArray(m.mask)) {
                    m.mask = [1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0];
                }
                m.mask[rel] = m.mask[rel] === 1 ? 0 : 1;

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
