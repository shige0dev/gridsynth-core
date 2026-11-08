import { UIHelpers } from '../../ui/helpers.js?v=354';
import { NOTES, SCALE_PRESETS, SCALE_KEYS, snapToScale, parseKeyNoteToCv } from '../../core/musical.js?v=367';
export { parseKeyNoteToCv };

export const KEY = {
    color: 'sky',
    defaults: () => ({
        type: 'KEY',
        octave: 3,
        root: 0,
        scale: 'CHROMATIC',
        mask: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        lastNote: '', // 入力するまでは表示なし
        currentMidi: null,
        cv: 2.0
    }),
    onNormalize: (m) => {
        if (m.octave === undefined) m.octave = 3;
        if (m.root === undefined) m.root = 0;
        if (m.scale === undefined) m.scale = 'CHROMATIC';
        if (!Array.isArray(m.mask) || m.mask.length !== 12) {
            m.mask = SCALE_PRESETS[m.scale] || [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
        }
    },
    ports: () => ({
        in: [
            { port: 'cv_in', pin: 5, label: 'IN', signal: 'cv', color: 'bg-yellow-400' }
        ],
        out: [
            { port: 'gate_out', pin: 10, label: 'G', signal: 'gate', color: 'bg-orange-500' },
            { port: 'cv_out', pin: 11, label: 'CV', signal: 'cv', color: 'bg-yellow-400' }
        ]
    }),
    renderGrid: (m) => {
        const root = m.root ?? 0;
        const rootName = NOTES[root] || 'C';
        const scaleName = m.scale || 'CHROMATIC';
        const mask = Array.isArray(m.mask) ? m.mask : (SCALE_PRESETS[scaleName] || SCALE_PRESETS['CHROMATIC']);
        const curNote = m.lastNote || '';

        return `
            <div class="flex flex-col items-center justify-center w-full h-full pointer-events-none leading-none gap-1">
                <!-- スケール表示 ＆ ノート名（入力するまでは非表示） -->
                <div class="flex items-center justify-between w-[59px] px-0.5 pointer-events-none text-center">
                    <span class="text-[7.5px] font-mono font-bold text-amber-400 truncate tracking-tight">${rootName} ${scaleName}</span>
                    <span class="text-[7.5px] font-mono font-bold text-cyan-300 ml-1 key-live-cell-note">${curNote}</span>
                </div>
                <!-- 12本 VOLCAスタイル タッチバー（C〜B固定） -->
                <div class="flex items-center justify-center h-6 gap-[1px] p-0 pointer-events-none">
                    ${NOTES.map((n, semi) => {
                        const rel = (semi - root + 12) % 12;
                        const isMasked = (mask[rel] ?? 1) === 1;
                        const isBlack = n.includes('#');

                        // 色相は同一の黄色(Hue 48deg)。黒鍵は色相を変えず彩度のみ少し落とす (96% -> 60%)
                        let barBg = '';
                        if (isMasked) {
                            barBg = isBlack
                                ? 'bg-[hsl(48,60%,50%)] shadow-[0_0_3px_rgba(200,175,50,0.5)]'
                                : 'bg-yellow-400 shadow-[0_0_3px_rgba(250,204,21,0.6)]';
                        } else {
                            barBg = isBlack
                                ? 'bg-slate-900/90 border border-slate-800/80'
                                : 'bg-slate-700/50';
                        }
                        return `<div data-key-bar="${semi}" class="w-[4px] h-full rounded-[0.5px] relative shrink-0 ${barBg}"></div>`;
                    }).join('')}
                </div>
            </div>`;
    },
    updateLive: (cell, data, isP, modal) => {
        const semi = data?.activeSemi ?? -1;
        const isAct = semi >= 0;

        // パネル上のバーのハイライト（未入力時は消灯）
        cell.querySelectorAll('[data-key-bar]').forEach(b => {
            const barSemi = parseInt(b.getAttribute('data-key-bar'), 10);
            b.classList.toggle('key-active-bar', isAct && barSemi === semi);
        });

        // パネル上のノート名表示
        const cellNoteEl = cell.querySelector('.key-live-cell-note');
        if (cellNoteEl) {
            if (isAct && data?.cv !== undefined) {
                cellNoteEl.textContent = UIHelpers.cvToNoteName(data.cv);
            }
        }

        if (modal) {
            modal.querySelectorAll('[data-modal-key-bar]').forEach(b => {
                const barSemi = parseInt(b.getAttribute('data-modal-key-bar'), 10);
                const isThisAct = isAct && (barSemi === semi);
                b.classList.toggle('ring-2', isThisAct);
                b.classList.toggle('ring-cyan-300', isThisAct);
                b.classList.toggle('shadow-[0_0_8px_#67e8f9]', isThisAct);
            });
            const noteDisp = modal.querySelector('#key-active-note');
            if (noteDisp) {
                if (isAct && data?.cv !== undefined) {
                    noteDisp.textContent = UIHelpers.cvToNoteName(data.cv);
                } else if (!isAct && !noteDisp.textContent) {
                    noteDisp.textContent = '--';
                }
            }
        }
    },
    renderModal: (m) => {
        const curOct = m.octave ?? 3;
        const curRoot = m.root ?? 0;
        const scaleKey = m.scale || 'CHROMATIC';
        const mask = Array.isArray(m.mask) ? m.mask : (SCALE_PRESETS[scaleKey] || SCALE_PRESETS['CHROMATIC']);
        const curNote = m.lastNote || '--';

        return `
            <div class="space-y-2 flex flex-col items-center select-none w-full p-1">
                <!-- Top Row: Octave, Root, Scale -->
                <div class="w-[331px] flex items-center justify-between gap-1 bg-slate-950/70 p-1.5 rounded-lg border border-slate-800 shrink-0">
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] text-slate-400 uppercase font-semibold">OCT:</span>
                        <button id="key-oct-down" class="w-4 h-4 rounded bg-slate-800 text-[10px] font-bold active:bg-slate-700">−</button>
                        <span id="key-oct-disp" class="w-4 text-center text-[10px] font-mono font-bold text-cyan-300">${curOct}</span>
                        <button id="key-oct-up" class="w-4 h-4 rounded bg-slate-800 text-[10px] font-bold active:bg-slate-700">＋</button>
                    </div>

                    <div class="flex items-center gap-1">
                        <span class="text-[8px] font-bold text-slate-400 uppercase tracking-tight">ROOT:</span>
                        <select id="key-root-sel" class="bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold text-[9px] rounded px-1 py-0.5 cursor-pointer outline-none hover:border-amber-500">
                            ${NOTES.map((name, idx) => `
                                <option value="${idx}" ${idx === curRoot ? 'selected' : ''}>${name}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="flex items-center gap-1 flex-1 justify-end min-w-0">
                        <span class="text-[8px] font-bold text-slate-400 uppercase tracking-tight">SCALE:</span>
                        <select id="key-scale-sel" class="bg-slate-900 border border-slate-700 text-yellow-300 font-mono font-bold text-[9px] rounded px-1.5 py-0.5 cursor-pointer outline-none hover:border-yellow-500 truncate max-w-[110px]">
                            ${SCALE_KEYS.map(k => `
                                <option value="${k}" ${k === scaleKey ? 'selected' : ''}>${k}</option>
                            `).join('')}
                        </select>
                    </div>

                    <span class="text-[9.5px] font-mono font-bold text-cyan-300 min-w-[28px] text-right" id="key-active-note">${curNote}</span>
                </div>

                <!-- VOLCAスタイル 12本 フラット・タッチバー -->
                <div class="w-[331px] h-28 bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex justify-between gap-1 select-none touch-none shrink-0" id="volca-key-box">
                    ${NOTES.map((n, semi) => {
                        const rel = (semi - curRoot + 12) % 12;
                        const isMasked = (mask[rel] ?? 1) === 1;
                        const isBlack = n.includes('#');

                        // 色相は同一の黄色(Hue 48deg)。黒鍵は色相を変えず彩度のみ少し落とす
                        let barBg = '';
                        let textCls = '';
                        if (isMasked) {
                            barBg = isBlack
                                ? 'bg-gradient-to-t from-[hsl(48,50%,40%)] via-[hsl(48,60%,50%)] to-[hsl(48,55%,68%)] border border-[hsl(48,55%,55%)] shadow-[0_0_6px_rgba(200,175,50,0.35)]'
                                : 'bg-gradient-to-t from-yellow-500 via-yellow-400 to-amber-200 border border-yellow-300 shadow-[0_0_6px_rgba(253,224,71,0.4)]';
                            textCls = 'text-yellow-950 font-black';
                        } else {
                            barBg = isBlack
                                ? 'bg-slate-900/95 border border-slate-800'
                                : 'bg-slate-800/80 border border-slate-700/60';
                            textCls = 'text-slate-500 font-bold';
                        }

                        return `
                            <div class="volca-key-item flex-1 h-full rounded-md flex flex-col justify-end items-center pb-1.5 cursor-pointer select-none transition-all duration-75 relative overflow-hidden ${barBg}" data-key-semi="${semi}" data-modal-key-bar="${semi}" title="${n}">
                                <div class="absolute inset-0 bg-white opacity-0 active:opacity-20 pointer-events-none"></div>
                                <span class="text-[8.5px] font-mono pointer-events-none ${textCls}">${n}</span>
                            </div>`;
                    }).join('')}
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const rootEl = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;
        const octD = rootEl.querySelector('#key-oct-disp');
        const nD = rootEl.querySelector('#key-active-note');

        // Octave Up / Down
        rootEl.querySelector('#key-oct-down')?.addEventListener('click', () => {
            if ((m.octave ?? 3) > 1) {
                m.octave = (m.octave ?? 3) - 1;
                if (octD) octD.textContent = m.octave;
                ctx.reRenderModal?.();
                ctx.reRenderCell?.();
                cb();
            }
        });
        rootEl.querySelector('#key-oct-up')?.addEventListener('click', () => {
            if ((m.octave ?? 3) < 6) {
                m.octave = (m.octave ?? 3) + 1;
                if (octD) octD.textContent = m.octave;
                ctx.reRenderModal?.();
                ctx.reRenderCell?.();
                cb();
            }
        });

        // Root Selector
        rootEl.querySelector('#key-root-sel')?.addEventListener('change', (e) => {
            m.root = parseInt(e.target.value, 10);
            ctx.reRenderModal?.();
            ctx.reRenderCell?.();
            cb();
        });

        // Scale Selector
        rootEl.querySelector('#key-scale-sel')?.addEventListener('change', (e) => {
            const k = e.target.value;
            m.scale = k;
            if (SCALE_PRESETS[k]) {
                m.mask = [...SCALE_PRESETS[k]];
            }
            ctx.reRenderModal?.();
            ctx.reRenderCell?.();
            cb();
        });

        // Touch & Slide Interaction on VOLCA Ribbon Bar
        const box = rootEl.querySelector('#volca-key-box');
        if (!box) return;

        const playSemi = (rawSemi, isDown) => {
            const oct = m.octave ?? 3;
            const mask = m.mask || SCALE_PRESETS[m.scale] || SCALE_PRESETS['CHROMATIC'];
            const snappedSemi = snapToScale(rawSemi, m.root ?? 0, mask);
            const midi = (oct + 1) * 12 + snappedSemi;
            const name = `${NOTES[snappedSemi]}${oct}`;

            if (isDown) {
                m.lastNote = name;
                m.currentMidi = midi;
                m.cv = (midi - 24) / 12.0;
                if (nD) nD.textContent = name;
            }
            ctx.sendKeyNote?.(midi, isDown);
            if (isDown) cb();
        };

        const setHighlight = (semi, isPressed) => {
            if (semi === null || semi === undefined || isNaN(semi)) return;
            const el = box.querySelector(`[data-key-semi="${semi}"]`);
            if (el) {
                el.classList.toggle('!bg-cyan-400', isPressed);
                el.classList.toggle('!text-black', isPressed);
                el.classList.toggle('shadow-[0_0_12px_#22d3ee]', isPressed);
            }
        };

        let activeSemi = null;
        let activePointerId = null;

        const getSemiFromPoint = (x, y) => {
            const el = document.elementFromPoint(x, y);
            const k = (el && box.contains(el)) ? el.closest('[data-key-semi]') : null;
            return (k && k.dataset.keySemi !== undefined) ? parseInt(k.dataset.keySemi, 10) : null;
        };

        box.onpointerdown = (e) => {
            const semi = getSemiFromPoint(e.clientX, e.clientY);
            if (semi === null || isNaN(semi)) return;
            if (activeSemi !== null) {
                setHighlight(activeSemi, false);
                playSemi(activeSemi, false);
            }
            activePointerId = e.pointerId;
            activeSemi = semi;
            try { box.setPointerCapture(e.pointerId); } catch(err){}
            setHighlight(semi, true);
            playSemi(semi, true);
        };

        box.onpointermove = (e) => {
            if (activePointerId === null || e.pointerId !== activePointerId) return;
            const semi = getSemiFromPoint(e.clientX, e.clientY);
            if (semi !== activeSemi) {
                if (activeSemi !== null) {
                    setHighlight(activeSemi, false);
                    playSemi(activeSemi, false);
                }
                if (semi !== null && !isNaN(semi)) {
                    setHighlight(semi, true);
                    playSemi(semi, true);
                }
                activeSemi = semi;
            }
        };

        const stop = (e) => {
            if (activePointerId !== null && e && e.pointerId !== activePointerId) return;
            if (activeSemi !== null) {
                setHighlight(activeSemi, false);
                playSemi(activeSemi, false);
                activeSemi = null;
            }
            activePointerId = null;
            try {
                if (e && box.hasPointerCapture?.(e.pointerId)) {
                    box.releasePointerCapture(e.pointerId);
                }
            } catch(err){}
        };

        box.onpointerup = stop;
        box.onpointercancel = stop;
    }
};

export const controllerDefs = {
    KEY
};
