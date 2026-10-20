import { UIHelpers } from '../../ui/helpers.js?v=293';

export const KEY = {
    color: 'sky',
    defaults: () => ({ type: 'KEY', octave: 4, lastNote: 'C4', currentMidi: 60 }),
    ports: () => ({
        in: [],
        out: [
            { port: 'cv_out', color: 'bg-yellow-400' },
            { port: 'gate_out', color: 'bg-orange-500' }
        ]
    }),
    WHITE_KEYS: [{n:'B',s:-1},{n:'C',s:0},{n:'D',s:2},{n:'E',s:4},{n:'F',s:5},{n:'G',s:7},{n:'A',s:9},{n:'B',s:11},{n:'C',s:12},{n:'D',s:14}],
    BLACK_KEYS: [
        { s: -2, l: -1.667 },
        { s: 1, l: 15.833 },
        { s: 3, l: 27.5 },
        { s: 6, l: 45.0 },
        { s: 8, l: 56.667 },
        { s: 10, l: 68.333 },
        { s: 13, l: 85.833 },
        { s: 15, l: 97.5 }
    ],
    renderGrid: (m) => `<div class="flex flex-col items-center justify-center leading-tight gap-0.5 pointer-events-none text-cyan-400"><span class="text-[9px] font-bold text-sky-300">KEYBOARD</span><span class="text-[14px] font-mono font-bold text-white">${m.lastNote||'C4'}</span></div>`,
    renderModal: (m) => {
        const W = KEY.WHITE_KEYS, B = KEY.BLACK_KEYS;
        return `
            <div class="space-y-2">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <div class="flex items-center gap-1.5"><span class="text-[8px] text-slate-400 uppercase font-semibold">OCTAVE</span>
                    <button id="key-oct-down" class="w-4 h-4 rounded bg-slate-800 text-[10px] font-bold">−</button>
                    <span id="key-oct-disp" class="w-5 text-center text-[10px] font-mono font-bold text-cyan-300">${m.octave||4}</span>
                    <button id="key-oct-up" class="w-4 h-4 rounded bg-slate-800 text-[10px] font-bold">＋</button></div>
                    <span class="text-[9px] font-mono font-bold text-sky-300" id="key-active-note">${m.lastNote||'C4'}</span>
                </div>
                <div class="relative h-28 bg-slate-950 border-2 border-slate-400 flex select-none touch-none overflow-hidden" id="kb-box">
                    ${W.map(k => `<div class="key-white flex-1 bg-slate-950 border-r-2 border-slate-400 last:border-r-0 flex flex-col justify-end items-center pb-1 cursor-pointer select-none transition-colors" data-semi="${k.s}"><span class="text-[7.5px] font-bold text-slate-400 pointer-events-none">${k.n}</span></div>`).join('')}
                    <div class="absolute inset-0 pointer-events-none">
                        <!-- Accidentals aligned to user centers (1.5, 3.5, 6.5, 8.5, 10.5 * 5.833% + 10%) with uniform 2px border and sharp corners -->
                        ${B.map(bk => `<div class="key-black absolute h-16 bg-slate-950 border-2 border-slate-400 border-t-0 pointer-events-auto cursor-pointer select-none transition-colors" style="left:${bk.l}%;width:5.833%;" data-semi="${bk.s}"></div>`).join('')}
                    </div>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const octD = document.getElementById('key-oct-disp'), nD = document.getElementById('key-active-note');
        document.getElementById('key-oct-down')?.addEventListener('click', () => { if ((m.octave||4) > 1) { m.octave--; if (octD) octD.textContent = m.octave; cb(); } });
        document.getElementById('key-oct-up')?.addEventListener('click', () => { if ((m.octave||4) < 7) { m.octave++; if (octD) octD.textContent = m.octave; cb(); } });
        const play = (s, isDown) => {
            const midi = ((m.octave||4) + 1) * 12 + s;
            const name = `${UIHelpers.NOTES[((s%12)+12)%12]}${Math.floor(midi/12)-1}`;
            m.lastNote = name; if (nD && isDown) nD.textContent = name;
            ctx.sendKeyNote?.(midi, isDown); if (isDown) cb();
        };
        const kb = document.getElementById('kb-box');
        const setKeyHighlight = (semi, isPressed) => {
            if (semi === null || semi === undefined || isNaN(semi) || !kb) return;
            const elements = kb.querySelectorAll(`[data-semi="${semi}"]`);
            elements.forEach(el => {
                el.classList.toggle('!bg-cyan-400', isPressed);
                el.classList.toggle('!text-black', isPressed);
            });
        };
        if (kb) {
            let activeSemi = null;
            let activePointerId = null;

            const getSemiFromPoint = (x, y) => {
                const el = document.elementFromPoint(x, y);
                const k = (el && kb.contains(el)) ? el.closest('[data-semi]') : null;
                return (k && k.dataset.semi !== undefined) ? parseInt(k.dataset.semi, 10) : null;
            };

            kb.onpointerdown = (e) => {
                const semi = getSemiFromPoint(e.clientX, e.clientY);
                if (semi === null || isNaN(semi)) return;
                if (activeSemi !== null) {
                    setKeyHighlight(activeSemi, false);
                    play(activeSemi, false);
                }
                activePointerId = e.pointerId;
                activeSemi = semi;
                try { kb.setPointerCapture(e.pointerId); } catch(err){}
                setKeyHighlight(semi, true);
                play(semi, true);
            };

            kb.onpointermove = (e) => {
                if (activePointerId === null || e.pointerId !== activePointerId) return;
                const semi = getSemiFromPoint(e.clientX, e.clientY);
                if (semi !== activeSemi) {
                    if (activeSemi !== null) {
                        setKeyHighlight(activeSemi, false);
                        play(activeSemi, false);
                    }
                    if (semi !== null && !isNaN(semi)) {
                        setKeyHighlight(semi, true);
                        play(semi, true);
                    }
                    activeSemi = semi;
                }
            };

            const stop = (e) => {
                if (activePointerId !== null && e && e.pointerId !== activePointerId) return;
                if (activeSemi !== null) {
                    setKeyHighlight(activeSemi, false);
                    play(activeSemi, false);
                    activeSemi = null;
                }
                activePointerId = null;
                try {
                    if (e && kb.hasPointerCapture?.(e.pointerId)) {
                        kb.releasePointerCapture(e.pointerId);
                    }
                } catch(err){}
            };

            kb.onpointerup = stop;
            kb.onpointercancel = stop;
        }
    }
};

export const controllerDefs = {
    KEY
};
