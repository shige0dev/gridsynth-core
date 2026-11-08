import { UIHelpers } from '../../ui/helpers.js?v=354';
import { NOTES, SCALE_PRESETS, SCALE_KEYS, snapToScale, parseKeyNoteToCv } from '../../core/musical.js?v=367';
export { parseKeyNoteToCv };

// 16 Keys: 前2セミトーン (A#, B) + 12半音 (C〜B) + 後2セミトーン (C, C#) = -2 .. 13
export const KEYS_16 = Array.from({ length: 16 }, (_, i) => {
    const s = i - 2; // -2 .. 13
    const absSemi = ((s % 12) + 12) % 12;
    const name = NOTES[absSemi];
    const isBlack = name.includes('#');
    return { s, absSemi, name, isBlack };
});

const renderQuantizeMapHTML = (root, mask) => {
    return NOTES.map((nIn, i) => {
        const snapSemi = snapToScale(i, root, mask);
        const snapName = NOTES[snapSemi];
        const isScaleNote = (i === snapSemi);
        const isBlack = nIn.includes('#');

        // スナップ先が変わる場所に細い線（区分線）を配置
        const nextSemi = (i + 1) % 12;
        const nextSnap = snapToScale(nextSemi, root, mask);
        const isBoundary = (snapSemi !== nextSnap);
        const borderR = isBoundary ? 'border-r-2 border-amber-400/90' : 'border-r border-slate-800/50';

        let bgCls = '';
        if (isScaleNote) {
            bgCls = isBlack
                ? 'bg-[hsl(48,65%,20%)] text-yellow-300'
                : 'bg-[hsl(48,80%,26%)] text-yellow-200 font-bold';
        } else {
            bgCls = 'bg-slate-950/80 text-slate-400';
        }

        return `
            <div class="flex-1 h-full flex flex-col items-center justify-between py-1 select-none relative transition-colors ${borderR} ${bgCls}" data-quant-semi="${i}" title="${nIn} &rarr; ${snapName}">
                <!-- 入力半音名 -->
                <span class="text-[7px] font-mono leading-none ${isBlack ? 'text-slate-500' : 'text-slate-400'}">${nIn}</span>
                <!-- クオンタイズスナップ先 -->
                <span class="text-[8px] font-mono font-bold leading-none ${isScaleNote ? 'text-amber-300' : 'text-amber-400/70'}">${snapName}</span>
            </div>`;
    }).join('');
};

export const KEY = {
    color: 'sky',
    KEYS_16,
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

        // 標準 renderPanelBars (h-7, 28px) ルールに完全準拠
        const barItems = KEYS_16.map(k => {
            const rel = ((k.absSemi - root) % 12 + 12) % 12;
            const isMasked = (mask[rel] ?? 1) === 1;

            let color = '';
            if (isMasked) {
                // 色相・彩度は同一(Hue 48deg, Sat 90%+)。黒鍵は明度を上げて淡く表現
                color = k.isBlack ? 'bg-[hsl(48,90%,72%)]' : 'bg-yellow-400';
            } else {
                color = 'bg-transparent';
            }

            return {
                pct: isMasked ? 100 : 0,
                color,
                width: 'w-[2.5px]',
                innerCls: isMasked ? (k.isBlack ? 'shadow-[0_0_2px_rgba(254,240,138,0.5)]' : 'shadow-[0_0_2px_rgba(250,204,21,0.6)]') : '',
                outerCls: isMasked ? '' : (k.isBlack ? 'opacity-30' : 'opacity-40'),
                attrs: `data-key-bar="${k.s}"`
            };
        });

        const barsHTML = UIHelpers.renderPanelBars(barItems, {
            heightCls: 'h-7',
            gapCls: 'gap-px',
            containerCls: 'w-[58px]',
            theme: 'cv'
        });

        return `
            <div class="relative flex items-center justify-center w-full h-full pointer-events-none select-none">
                <!-- 上部: スケール名（バーのすぐ上） -->
                <span class="absolute top-[8px] left-1/2 -translate-x-1/2 text-[7.5px] font-mono font-bold text-amber-400 truncate tracking-tight text-center max-w-[64px] leading-none">${rootName} ${scaleName}</span>
                <!-- 中央: 標準 renderPanelBars (h-7 / 28px) -->
                ${barsHTML}
                <!-- 下部: 現在音（バーのすぐ下、SPK等と同一の配置ルール） -->
                <span class="key-live-cell-note absolute bottom-[10px] left-1/2 -translate-x-1/2 text-[7.5px] font-mono font-bold text-cyan-300 leading-none" data-manual-note="${curNote}">${curNote || ''}</span>
            </div>`;
    },
    updateLive: (cell, data, isP, modal) => {
        if (!data) return;
        const inSemi = data.inputSemi ?? -1;
        const isPatched = Boolean(data.isPatched);

        // 1. Grid cell note display (バーの下の現在音)
        const cellNoteEl = cell?.querySelector('.key-live-cell-note');
        if (cellNoteEl) {
            if (isPatched && inSemi >= 0 && data.cv !== undefined) {
                cellNoteEl.textContent = UIHelpers.cvToNoteName(data.cv);
            } else if (!isPatched) {
                cellNoteEl.textContent = cellNoteEl.dataset.manualNote || '';
            }
        }

        if (!modal) return;

        // 2. Modal header quantize map highlight (外部CV入力時)
        modal.querySelectorAll('[data-quant-semi]').forEach(el => {
            const semi = parseInt(el.getAttribute('data-quant-semi'), 10);
            const isMatch = (isPatched && inSemi >= 0 && semi === inSemi);
            el.classList.toggle('!bg-cyan-500/40', isMatch);
            el.classList.toggle('!text-cyan-200', isMatch);
            el.classList.toggle('ring-1', isMatch);
            el.classList.toggle('ring-cyan-300', isMatch);
        });

        const noteDisp = modal.querySelector('#key-active-note');
        if (noteDisp) {
            if (isPatched && inSemi >= 0 && data.cv !== undefined) {
                noteDisp.textContent = UIHelpers.cvToNoteName(data.cv);
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

                <!-- クオンタイズマッピングルーラー（細い線でクオンタイズ吸着範囲を区分） -->
                <div class="w-[331px] bg-slate-950/90 p-1.5 rounded-lg border border-slate-800 flex flex-col gap-1 shrink-0">
                    <div class="flex items-center justify-between text-[7px] font-bold text-slate-400 tracking-wider">
                        <span>CV IN &rarr; QUANTIZE MAP</span>
                        <span class="text-amber-400 font-mono text-[7px]">${NOTES[curRoot]} ${scaleKey}</span>
                    </div>
                    <div class="flex items-center w-full h-7 bg-slate-900/90 rounded border border-slate-700/60 overflow-hidden" id="key-quant-strip">
                        ${renderQuantizeMapHTML(curRoot, mask)}
                    </div>
                </div>

                <!-- VOLCAスタイル 16本 角のあるスクエアバー (-2 .. 13) -->
                <div class="w-[331px] h-28 bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex justify-between gap-[2px] select-none touch-none shrink-0" id="volca-key-box">
                    ${KEYS_16.map(k => {
                        const rel = ((k.absSemi - curRoot) % 12 + 12) % 12;
                        const isMasked = (mask[rel] ?? 1) === 1;

                        // 色相・彩度は同一(Hue 48deg, Sat 90%+)。黒鍵は彩度を落とすのでなく明度を上げて淡く表現
                        let barBg = '';
                        let textCls = '';
                        if (isMasked) {
                            barBg = k.isBlack
                                ? 'bg-gradient-to-t from-[hsl(48,85%,62%)] via-[hsl(48,90%,74%)] to-[hsl(48,95%,86%)] border border-[hsl(48,85%,78%)] shadow-[0_0_6px_rgba(254,240,138,0.4)]'
                                : 'bg-gradient-to-t from-yellow-500 via-yellow-400 to-amber-200 border border-yellow-300 shadow-[0_0_6px_rgba(253,224,71,0.4)]';
                            textCls = k.isBlack ? 'text-[hsl(48,60%,25%)] font-bold' : 'text-yellow-950 font-black';
                        } else {
                            barBg = k.isBlack
                                ? 'bg-slate-900/70 border border-slate-800/60'
                                : 'bg-slate-800/80 border border-slate-700/60';
                            textCls = 'text-slate-500 font-bold';
                        }

                        return `
                            <div class="volca-key-item flex-1 h-full rounded-none flex flex-col justify-end items-center pb-1.5 cursor-pointer select-none transition-all duration-75 relative overflow-hidden ${barBg}" data-key-semi="${k.s}" title="${k.name}">
                                <div class="absolute inset-0 bg-white opacity-0 active:opacity-25 pointer-events-none"></div>
                                <span class="text-[7.5px] font-mono pointer-events-none ${textCls}">${k.name}</span>
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

        // Touch & Slide Interaction on VOLCA 16 Ribbon Bar
        const box = rootEl.querySelector('#volca-key-box');
        if (!box) return;

        const playSemi = (rawSemi, isDown) => {
            const oct = m.octave ?? 3;
            const mask = m.mask || SCALE_PRESETS[m.scale] || SCALE_PRESETS['CHROMATIC'];
            const absSemi = ((rawSemi % 12) + 12) % 12;
            const snappedAbsSemi = snapToScale(absSemi, m.root ?? 0, mask);
            
            // Nearest snapped offset
            let diff = snappedAbsSemi - absSemi;
            if (diff > 6) diff -= 12;
            if (diff < -6) diff += 12;
            const snappedSemi = rawSemi + diff;

            const midi = (oct + 1) * 12 + snappedSemi;
            const octDisplay = Math.floor(midi / 12) - 1;
            const name = `${NOTES[snappedAbsSemi]}${octDisplay}`;

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
