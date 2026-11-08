import { UIHelpers } from '../../ui/helpers.js?v=354';
import { NOTES, SCALE_PRESETS, SCALE_KEYS, snapToScale, parseKeyNoteToCv, getScaleNotesInOctave } from '../../core/musical.js?v=367';
export { parseKeyNoteToCv };

// 16 Keys: 前2セミトーン (A#, B) + 12半音 (C〜B) + 後2セミトーン (C, C#) = -2 .. 13
export const KEYS_16 = Array.from({ length: 16 }, (_, i) => {
    const s = i - 2; // -2 .. 13
    const absSemi = ((s % 12) + 12) % 12;
    const name = NOTES[absSemi];
    const isBlack = name.includes('#');
    return { s, absSemi, name, isBlack };
});

const renderQuantizeMapHTML = (root, octave, mask) => {
    const scaleNotes = getScaleNotesInOctave(root, mask);
    const N = scaleNotes.length;
    if (N === 0) return '';

    // ルーラー表示範囲: 下の16鍵盤(-2 .. +13半音)に対応する -2/12V 〜 +14/12V (全16/12V幅)
    const vMin = -2.0 / 12.0;
    const vMax = 14.0 / 12.0;
    const totalV = vMax - vMin; // 16 / 12

    const oct = octave ?? 3;
    const vBase = oct - 1.0; // OCT 1 -> 0V, OCT 2 -> 1V, OCT 3 -> 2V...

    // 各スライスは幅 1/N V。オクターブ外も全く同じピッチ幅 1/N V で分割線を延長描画
    const kMin = Math.floor(vMin * N);
    const kMax = Math.ceil(vMax * N) - 1;

    const slices = [];
    for (let k = kMin; k <= kMax; k++) {
        const v1 = Math.max(vMin, k / N);
        const v2 = Math.min(vMax, (k + 1) / N);
        if (v2 <= v1) continue;

        const widthPct = ((v2 - v1) / totalV) * 100;

        const scaleIdx = ((k % N) + N) % N;
        const semi = scaleNotes[scaleIdx];
        const absSemi = ((semi % 12) + 12) % 12;

        // 境界線判定:
        // k = -1 の右端は v = 0.0 (Cの左側) -> 太い琥珀色ラインを強く表示
        // k = N - 1 の右端は v = 1.0 (オクターブ上Cの左側) -> 太い琥珀色ラインを強く表示
        // その他のスライス境界は細い区切り線
        let borderR = '';
        if (k === -1 || k === N - 1) {
            borderR = 'border-r-2 border-zinc-400 shadow-[0_0_4px_rgba(255,255,255,0.3)] z-10';
        } else if (k !== kMax) {
            borderR = 'border-r border-zinc-800/80';
        }

        const noteOct = Math.floor(vBase + (k / N)) + 1;
        const noteName = `${NOTES[absSemi]}${noteOct}`;

        slices.push(
            `<div class="h-full relative ${borderR} bg-zinc-900/80 shrink-0" style="width: ${widthPct}%;" data-quant-slice="${k}" title="${noteName}"></div>`
        );
    }

    return slices.join('');
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

        // 枠・修飾・隙間のない16分割キー配列を単一の標準バー枠(w-[50px] h-7)内に収容
        // 16キー × 3px = 48px + 左右ボーダー1px×2 = 外寸ちょうど 50px (全キー完全均等3px)
        const keysHTML = KEYS_16.map(k => {
            const rel = ((k.absSemi - root) % 12 + 12) % 12;
            const isMasked = (mask[rel] ?? 1) === 1;

            let bg = '';
            if (isMasked) {
                // 無彩色（グレー／ダークグレーのグラデーション）
                bg = k.isBlack ? 'bg-gradient-to-t from-zinc-700 to-zinc-600' : 'bg-gradient-to-t from-zinc-500 to-zinc-400';
            } else {
                bg = 'bg-transparent';
            }

            return `<div class="w-[3px] h-full ${bg} transition-colors shrink-0" data-key-bar="${k.s}"></div>`;
        }).join('');

        return `
            <div class="relative flex items-center justify-center w-full h-full pointer-events-none select-none">
                <!-- 単一の標準スロット枠(w-[50px] h-7) -->
                <div class="relative w-[50px] h-7 flex items-center justify-center">
                    <!-- 上部: スケール名（バー上端から直近2px） -->
                    <span class="absolute bottom-full mb-[2px] left-1/2 -translate-x-1/2 text-[7.5px] font-mono font-bold text-amber-400 truncate tracking-tight text-center max-w-[64px] leading-none pointer-events-none select-none">${rootName} ${scaleName}</span>
                    <!-- 隙間なし16キー矩形 (各3px完全均等、枠内のみオーバーフロー非表示) -->
                    <div class="w-full h-full rounded-sm p-0 flex flex-row border border-zinc-600 bg-zinc-950/50 panel-bar-slot overflow-hidden">
                        ${keysHTML}
                    </div>
                    <!-- 下部: 現在音（バー下端から直近2px、音名文字は白） -->
                    <span class="key-live-cell-note absolute top-full mt-[2px] left-1/2 -translate-x-1/2 text-[7.5px] font-mono font-bold text-white truncate tracking-tight text-center max-w-[64px] leading-none pointer-events-none select-none" data-manual-note="${curNote}">${curNote || ''}</span>
                </div>
            </div>`;
    },
    updateLive: (cell, data, isP, modal, m) => {
        if (!data) return;
        const isPatched = Boolean(data.isPatched);

        // 1. Grid cell note display (バーの下の現在音)
        const cellNoteEl = cell?.querySelector('.key-live-cell-note');
        if (cellNoteEl) {
            if (isPatched && data.cv !== undefined) {
                cellNoteEl.textContent = UIHelpers.cvToNoteName(data.cv);
            } else if (!isPatched) {
                cellNoteEl.textContent = cellNoteEl.dataset.manualNote || '';
            }
        }

        if (!modal) return;

        // 2. モーダル内音名表示（数値は即時更新）
        const noteDisp = modal.querySelector('#key-active-note');
        if (noteDisp) {
            if (isPatched && data.cv !== undefined) {
                noteDisp.textContent = UIHelpers.cvToNoteName(data.cv);
            }
        }

        const inCv = data.inCv;

        // 3. CV IN オクターブ自動ジャンプ (同一オクターブなら維持、異なるオクターブは150msデバウンスで追従)
        if (isPatched && inCv !== null && inCv !== undefined) {
            const inOct = Math.max(1, Math.min(6, Math.floor(inCv) + 1));
            if (inOct !== (m?.octave ?? 3)) {
                const now = performance.now();
                if (!m._lastOctJump || (now - m._lastOctJump >= 150)) {
                    m.octave = inOct;
                    m._lastOctJump = now;

                    const octD = modal.querySelector('#key-oct-disp');
                    if (octD) octD.textContent = m.octave;

                    const titleEl = modal.querySelector('#key-quant-title');
                    if (titleEl) {
                        const curRoot = m.root ?? 0;
                        const scaleKey = m.scale || 'CHROMATIC';
                        titleEl.textContent = `${NOTES[curRoot]}${m.octave} ${scaleKey}`;
                    }
                }
            }
        }

        // 4. Modal header quantize map highlight (DOM換算方式: 選択オクターブ範囲内でのみ均等割スライスを点灯)
        const curOct = m?.octave ?? 3;
        const vBase = curOct - 1.0;

        const mask = m?.mask || (m?.scale ? SCALE_PRESETS[m.scale] : null) || SCALE_PRESETS['CHROMATIC'];
        const scaleNotes = getScaleNotesInOctave(m?.root ?? 0, mask);
        const N = scaleNotes.length;

        const inRange = (isPatched && N > 0 && inCv !== null && inCv !== undefined && inCv >= vBase - (2.0 / 12.0) && inCv < vBase + (14.0 / 12.0));
        const activeSlice = inRange ? Math.floor((inCv - vBase) * N) : null;

        modal.querySelectorAll('[data-quant-slice]').forEach(el => {
            const idx = parseInt(el.getAttribute('data-quant-slice'), 10);
            const isMatch = (activeSlice !== null && idx === activeSlice);
            el.classList.toggle('!bg-cyan-400', isMatch);
            el.classList.toggle('shadow-[0_0_8px_rgba(34,211,238,0.8)]', isMatch);
            el.classList.toggle('ring-1', isMatch);
            el.classList.toggle('ring-cyan-200', isMatch);
        });

        // 5. 入力CV実際値のホワイトニードル（実測値インジケーター）
        const needleEl = modal.querySelector('#key-quant-needle');
        if (needleEl) {
            if (isPatched && inCv !== null && inCv !== undefined && inCv >= vBase - (2.0 / 12.0) && inCv <= vBase + (14.0 / 12.0)) {
                const vRel = inCv - vBase;
                const pct = ((12 * vRel + 2) / 16) * 100;
                needleEl.style.left = `${pct}%`;
                needleEl.style.opacity = '1';
            } else {
                needleEl.style.opacity = '0';
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
                <div class="w-[332px] flex items-center justify-between gap-1 bg-zinc-950/80 p-1.5 rounded-lg border border-zinc-800 shrink-0">
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] text-zinc-400 uppercase font-semibold">OCT:</span>
                        <button id="key-oct-down" class="w-4 h-4 rounded bg-zinc-800 text-zinc-200 text-[10px] font-bold active:bg-zinc-700">－</button>
                        <span id="key-oct-disp" class="w-4 text-center text-[10px] font-mono font-bold text-white">${curOct}</span>
                        <button id="key-oct-up" class="w-4 h-4 rounded bg-zinc-800 text-zinc-200 text-[10px] font-bold active:bg-zinc-700">＋</button>
                    </div>

                    <div class="flex items-center gap-1">
                        <span class="text-[8px] font-bold text-zinc-400 uppercase tracking-tight">ROOT:</span>
                        <select id="key-root-sel" class="bg-zinc-900 border border-zinc-700 text-zinc-200 font-mono font-bold text-[9px] rounded px-1 py-0.5 cursor-pointer outline-none hover:border-zinc-500">
                            ${NOTES.map((name, idx) => `
                                <option value="${idx}" ${idx === curRoot ? 'selected' : ''}>${name}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="flex items-center gap-1 flex-1 justify-end min-w-0">
                        <span class="text-[8px] font-bold text-zinc-400 uppercase tracking-tight">SCALE:</span>
                        <select id="key-scale-sel" class="bg-zinc-900 border border-zinc-700 text-zinc-200 font-mono font-bold text-[9px] rounded px-1.5 py-0.5 cursor-pointer outline-none hover:border-zinc-500 truncate max-w-[110px]">
                            ${SCALE_KEYS.map(k => `
                                <option value="${k}" ${k === scaleKey ? 'selected' : ''}>${k}</option>
                            `).join('')}
                        </select>
                    </div>

                    <span class="text-[9.5px] font-mono font-bold text-white min-w-[28px] text-right" id="key-active-note">${curNote}</span>
                </div>

                <!-- クオンタイズマッピングルーラー（細い線でクオンタイズ吸着範囲を区分） -->
                <div class="w-[332px] bg-zinc-950/90 p-1.5 rounded-lg border border-zinc-800 flex flex-col gap-1 shrink-0">
                    <div class="flex items-center justify-between text-[7px] font-bold text-zinc-400 tracking-wider">
                        <span>CV IN &rarr; QUANTIZE MAP</span>
                        <span class="text-zinc-300 font-mono text-[7px]" id="key-quant-title">${NOTES[curRoot]}${curOct} ${scaleKey}</span>
                    </div>
                    <div class="relative flex items-center w-full h-[10px] bg-zinc-900/90 rounded-[1px] border border-zinc-700/60 overflow-hidden" id="key-quant-strip">
                        ${renderQuantizeMapHTML(curRoot, curOct, mask)}
                        <!-- 入力CV実際値を示すホワイトライン（ニードル） -->
                        <div id="key-quant-needle" class="absolute top-0 bottom-0 w-[1.5px] bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] z-20 pointer-events-none opacity-0 -translate-x-1/2"></div>
                    </div>
                </div>

                <!-- VOLCAスタイル 16本 角のあるスクエアバー (-2 .. 13) -->
                <!-- 各キーw-[18px]×16本 = 288px + gap-[2px]×15 = 30px -> 内寸ちょうど318px (全キー・全間隔完全均等) -->
                <div class="w-[332px] h-28 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 flex flex-row gap-[2px] select-none touch-none shrink-0" id="volca-key-box">
                    ${KEYS_16.map(k => {
                        const rel = ((k.absSemi - curRoot) % 12 + 12) % 12;
                        const isMasked = (mask[rel] ?? 1) === 1;

                        // 無彩色グレーとダークグレーのグラデーション表現。音名文字は白
                        let barBg = '';
                        let textCls = '';
                        if (isMasked) {
                            barBg = k.isBlack
                                ? 'bg-gradient-to-t from-zinc-800 via-zinc-700 to-zinc-600 border border-zinc-600/80 shadow-[0_0_4px_rgba(82,82,91,0.25)]'
                                : 'bg-gradient-to-t from-zinc-600 via-zinc-500 to-zinc-400 border border-zinc-400/80 shadow-[0_0_4px_rgba(161,161,170,0.25)]';
                            textCls = 'text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]';
                        } else {
                            barBg = k.isBlack
                                ? 'bg-zinc-950/90 border border-zinc-900/80'
                                : 'bg-zinc-900/90 border border-zinc-800/80';
                            textCls = 'text-zinc-600 font-medium';
                        }

                        return `
                            <div class="volca-key-item w-[18px] shrink-0 h-full rounded-none flex flex-col justify-end items-center pb-1.5 cursor-pointer select-none transition-all duration-75 relative overflow-hidden ${barBg}" data-key-semi="${k.s}" title="${k.name}">
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
