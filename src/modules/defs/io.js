import { UIHelpers } from '../../ui/helpers.js';

const drawScopeCanvas = (ctx2d, w, h, data, m, isModal = false) => {
    ctx2d.clearRect(0, 0, w, h);

    // Graticule grid
    if (isModal) {
        ctx2d.strokeStyle = '#1e293b';
        ctx2d.lineWidth = 0.5;
        // 8 horizontal divisions
        for (let i = 1; i < 8; i++) {
            const y = (h / 8) * i;
            ctx2d.beginPath();
            ctx2d.moveTo(0, y);
            ctx2d.lineTo(w, y);
            ctx2d.stroke();
        }
        // 10 vertical divisions
        for (let i = 1; i < 10; i++) {
            const x = (w / 10) * i;
            ctx2d.beginPath();
            ctx2d.moveTo(x, 0);
            ctx2d.lineTo(x, h);
            ctx2d.stroke();
        }
    }

    // Center crosshair axes
    ctx2d.strokeStyle = isModal ? '#334155' : '#1e293b';
    ctx2d.lineWidth = isModal ? 1.0 : 0.8;
    ctx2d.beginPath();
    ctx2d.moveTo(0, h / 2); ctx2d.lineTo(w, h / 2);
    ctx2d.moveTo(w / 2, 0); ctx2d.lineTo(w / 2, h);
    ctx2d.stroke();

    const vR = m.vRange || 5.0;
    const b1 = data.buf1, b2 = data.buf2, trg = data.trigBuf;
    if (!b1) return;
    const len = b1.length;

    if (m.displayMode === 'xy') {
        // Lissajous XY Mode (X = in1, Y = in2)
        ctx2d.lineWidth = isModal ? 1.8 : 1.4;
        ctx2d.strokeStyle = '#10b981';
        ctx2d.beginPath();
        let lastX = w / 2, lastY = h / 2;
        for (let i = 0; i < len; i++) {
            const x = Math.max(1, Math.min(w - 1, (w / 2) + ((b1[i] / vR) * (w * 0.44))));
            const y = Math.max(1, Math.min(h - 1, (h / 2) - (((b2 ? b2[i] : 0) / vR) * (h * 0.44))));
            if (i === 0) ctx2d.moveTo(x, y);
            else ctx2d.lineTo(x, y);
            if (i === len - 1) {
                lastX = x;
                lastY = y;
            }
        }
        ctx2d.stroke();

        // High-luminance phosphor beam spot
        ctx2d.save();
        ctx2d.shadowColor = '#00ffaa';
        ctx2d.shadowBlur = isModal ? 8 : 6;
        ctx2d.fillStyle = '#ffffff';
        ctx2d.beginPath();
        ctx2d.arc(lastX, lastY, isModal ? 2.2 : 1.4, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.restore();
    } else {
        // Dual Trace Time Domain Mode
        let startIdx = 0;
        if ((m.trigMode || 'auto') === 'auto' && trg) {
            for (let i = 0; i < Math.min(trg.length - 2, 128); i++) {
                if (trg[i] < 0 && trg[i + 1] >= 0) { startIdx = i; break; }
            }
        }
        const drawPts = len - startIdx;
        const sW = w / Math.max(1, drawPts - 1);
        const sp = m.ySpread ?? 0.2;

        // Upper terminal (in2 / b2 - Purple) - shifts UP
        if (b2) {
            ctx2d.lineWidth = isModal ? 1.6 : 1.2;
            ctx2d.strokeStyle = '#c084fc';
            ctx2d.beginPath();
            for (let i = 0; i < drawPts; i++) {
                const idx = startIdx + i;
                const y = Math.max(1, Math.min(h - 1, (h / 2) - (((b2[idx] / vR) + sp) * (h * 0.44))));
                i === 0 ? ctx2d.moveTo(i * sW, y) : ctx2d.lineTo(i * sW, y);
            }
            ctx2d.stroke();
        }

        // Lower terminal (in1 / b1 - Cyan) - shifts DOWN
        ctx2d.lineWidth = isModal ? 1.8 : 1.4;
        ctx2d.strokeStyle = '#22d3ee';
        ctx2d.beginPath();
        for (let i = 0; i < drawPts; i++) {
            const idx = startIdx + i;
            const y = Math.max(1, Math.min(h - 1, (h / 2) - (((b1[idx] / vR) - sp) * (h * 0.44))));
            i === 0 ? ctx2d.moveTo(i * sW, y) : ctx2d.lineTo(i * sW, y);
        }
        ctx2d.stroke();
    }
};

export const SCOPE = {
    color: 'cyan',
    defaults: () => ({ type: 'SCOPE', timeSpan: 0.05, vRange: 5.0, trigMode: 'auto', displayMode: 'time', ySpread: 0.2 }),
    ports: () => ({
        in: [
            { port: 'wave_in1', pin: 4, color: 'bg-yellow-400' },
            { port: 'trig_in', pin: 5, color: 'bg-orange-500' },
            { port: 'wave_in2', pin: 3, color: 'bg-yellow-400' }
        ],
        out: []
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    T_STEPS: [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0],
    formatTime: (v) => v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(1)}s`,
    renderGrid: (m) => `
        <div class="absolute inset-0.5 bg-slate-950 rounded-sm border border-slate-800/90 overflow-hidden z-0 pointer-events-none">
            <canvas class="scope-canvas w-full h-full block" width="120" height="120"></canvas>
        </div>`,
    updateLive: (cell, data, isP, modal, m) => {
        if (!data?.buf1) return;
        // 1. Draw cell mini-canvas
        const cvs = cell.querySelector('.scope-canvas');
        if (cvs) {
            const ctx2d = cvs.getContext('2d');
            drawScopeCanvas(ctx2d, cvs.width, cvs.height, data, m, false);
        }
        // 2. Draw modal/dock expanded canvas if open
        const modalCvs = modal?.querySelector('#scope-modal-canvas');
        if (modalCvs) {
            const mCtx = modalCvs.getContext('2d');
            drawScopeCanvas(mCtx, modalCvs.width, modalCvs.height, data, m, true);
        }
    },
    renderModal: (m) => {
        const T = SCOPE.T_STEPS;
        let tIdx = T.findIndex(t => Math.abs(t - (m.timeSpan || 0.05)) < 0.0005);
        if (tIdx === -1) tIdx = 4;
        const isLiss = m.displayMode === 'xy';
        const fmtT = SCOPE.formatTime;
        const curSpread = m.ySpread ?? 0.2;
        const curV = m.vRange || 5.0;
        return `
            <div class="space-y-1.5">
                <!-- Top Menu Bar (荳頑ｮｵ 蜷・ｨｮ險ｭ螳壹Γ繝九Η繝ｼ) -->
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 gap-1 select-none">
                    <div class="flex items-center gap-1 shrink-0">
                        <button id="scope-mode-time" class="h-4 px-1.5 rounded text-[8px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${!isLiss ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm shadow-cyan-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}">DUAL</button>
                        <button id="scope-mode-liss" class="h-4 px-1.5 rounded text-[8px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${isLiss ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}">LISS</button>
                        <button id="scope-trig-btn" class="h-4 px-1.5 rounded text-[7.5px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${m.trigMode === 'free' ? 'bg-amber-600 text-white border-amber-500' : 'bg-cyan-600 text-white border-cyan-500'}">TRIG: ${(m.trigMode || 'auto').toUpperCase()}</button>
                    </div>

                    <!-- X-Axis Time Span Slider in Menu Bar (X霆ｸ縺ｮ譎る俣蟷・・繝｡繝九Η繝ｼ鬆伜沺縺ｫ繧ｹ繝ｩ繧､繝縺ｧ驟咲ｽｮ) -->
                    <div class="flex items-center gap-1 shrink-0">
                        <span class="text-[7.5px] font-mono text-cyan-300 font-bold uppercase tracking-tight">TIME:</span>
                        <input type="range" id="scope-time-slider" min="0" max="${T.length - 1}" step="1" value="${tIdx}" class="w-16 h-1 bg-slate-800 rounded accent-cyan-400 cursor-pointer" title="X霆ｸ譎る俣蟷・>
                        <span id="scope-time-val" class="text-[7.5px] font-mono text-cyan-300 font-bold min-w-[24px] text-right">${fmtT(T[tIdx])}</span>
                    </div>

                    <!-- Channel Indicators -->
                    <div class="flex items-center gap-1 text-[7px] font-mono text-slate-400 shrink-0">
                        <span class="flex items-center gap-0.5"><span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>CH1</span>
                        <span class="flex items-center gap-0.5"><span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>CH2</span>
                    </div>
                </div>

                <!-- Core Display Area flanked by Left and Right Sliders (Y霆ｸ蛟咲紫/2豕｢蠖｢蛻・屬縺ｯ陦ｨ遉ｺ蝓溘・蟾ｦ蜿ｳ縺ｫ繧ｹ繝ｩ繧､繝驟咲ｽｮ繝ｻ繧ｪ繧ｷ繝ｭ繧ｹ繧ｳ繝ｼ繝励→縺ｯ蛻・屬) -->
                <div class="flex items-center gap-1.5 h-[108px]">
                    <!-- Left: Y-Axis Scale / Magnification (Y霆ｸ蛟咲紫) -->
                    <div class="flex flex-col items-center justify-between shrink-0 w-8 h-[108px] bg-slate-950 py-1 px-0.5 rounded-lg border border-slate-800 select-none shadow-sm">
                        <span class="text-[6.5px] font-mono text-cyan-400 font-bold tracking-tight">SCALE</span>
                        <input type="range" id="scope-volt-slider" min="0.5" max="10.0" step="0.5" value="${curV}" class="scope-vslider accent-cyan-400 cursor-pointer" title="Y霆ｸ蛟咲紫 (V/Range)">
                        <span id="scope-volt-val" class="text-[7px] font-mono text-cyan-300 font-bold min-w-[22px] text-center">${curV.toFixed(1)}v</span>
                    </div>

                    <!-- Center: Oscilloscope Waveform Display -->
                    <div class="flex-1 min-w-0 h-[108px] bg-slate-950 p-1 rounded-lg border border-slate-800 flex flex-col justify-between overflow-hidden shadow-sm">
                        <div class="flex items-center justify-between px-1 shrink-0">
                            <span class="text-[7.5px] font-bold text-cyan-400 uppercase tracking-wider font-mono">${isLiss ? 'XY LISSAJOUS' : 'DUAL TRACE OSCILLOSCOPE'}</span>
                            <span class="text-[6.5px] font-mono text-slate-500">CH1:CYAN / CH2:PURPLE</span>
                        </div>
                        <canvas id="scope-modal-canvas" class="w-full flex-1 min-h-0 block rounded bg-slate-950" width="300" height="78"></canvas>
                    </div>

                    <!-- Right: 2-Waveform Separation (2豕｢蠖｢縺ｮ蛻・屬) -->
                    <div class="flex flex-col items-center justify-between shrink-0 w-8 h-[108px] bg-slate-950 py-1 px-0.5 rounded-lg border border-slate-800 select-none shadow-sm ${isLiss ? 'opacity-30 pointer-events-none' : ''}">
                        <span class="text-[6.5px] font-mono text-purple-400 font-bold tracking-tight">Y-SEP</span>
                        <input type="range" id="scope-spread-slider" min="0.0" max="0.8" step="0.02" value="${curSpread}" class="scope-vslider accent-purple-500 cursor-pointer" title="2豕｢蠖｢蛻・屬">
                        <span id="scope-spread-val" class="text-[7px] font-mono text-purple-300 font-bold min-w-[22px] text-center">${curSpread.toFixed(2)}</span>
                    </div>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const T = SCOPE.T_STEPS;
        const fmtT = SCOPE.formatTime;

        // Mode switch
        document.getElementById('scope-mode-time')?.addEventListener('click', () => { m.displayMode = 'time'; ctx.reRenderModal(); cb(); });
        document.getElementById('scope-mode-liss')?.addEventListener('click', () => { m.displayMode = 'xy'; ctx.reRenderModal(); cb(); });
        document.getElementById('scope-trig-btn')?.addEventListener('click', () => { m.trigMode = m.trigMode === 'free' ? 'auto' : 'free'; ctx.reRenderModal(); cb(); });

        // X-Axis Time Slider in Menu Bar
        const tSlider = document.getElementById('scope-time-slider');
        const tVal = document.getElementById('scope-time-val');
        tSlider?.addEventListener('input', (e) => {
            const idx = parseInt(e.target.value, 10);
            if (idx >= 0 && idx < T.length) {
                m.timeSpan = T[idx];
                if (tVal) tVal.textContent = fmtT(T[idx]);
                cb();
            }
        });

        // Left: Y-Axis Scale / Magnification vertical slider
        const vSlider = document.getElementById('scope-volt-slider');
        const vVal = document.getElementById('scope-volt-val');
        vSlider?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            m.vRange = val;
            if (vVal) vVal.textContent = `${val.toFixed(1)}v`;
            cb();
        });

        // Right: 2-Waveform Separation vertical slider
        const spSlider = document.getElementById('scope-spread-slider');
        const spVal = document.getElementById('scope-spread-val');
        spSlider?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            m.ySpread = val;
            if (spVal) spVal.textContent = val.toFixed(2);
            cb();
        });
    }
};

export const MON = {
    color: 'blue',
    defaults: () => ({ type: 'MON' }),
    ports: () => ({
        in: [
            { port: 'cv_in1', color: 'bg-yellow-400' },
            { port: 'cv_in2', color: 'bg-yellow-400' },
            { port: 'cv_in3', color: 'bg-yellow-400' },
            { port: 'cv_in4', color: 'bg-yellow-400' }
        ],
        out: []
    }),
    renderGrid: () => `<div class="flex flex-col justify-center gap-0.5 w-full h-full py-2.5 pl-3.5 pr-1 pointer-events-none select-none">${[4,3,2,1].map(i => `<div class="flex items-center justify-center h-2.5 bg-slate-950/50 rounded-sm border border-slate-800/70"><span class="mon-val-${i} text-[8px] font-mono text-cyan-300 font-bold leading-none">+0.00</span></div>`).join('')}</div>`,
    updateLive: (cell, data) => {
        if (!data?.values) return;
        for (let c = 1; c <= 4; c++) {
            const el = cell.querySelector(`.mon-val-${c}`);
            if (el) el.textContent = (data.values[c-1]>=0?'+':'') + Number(data.values[c-1]||0).toFixed(2);
        }
    },
    renderModal: () => `<div class="text-[9px] text-slate-400 p-2 text-center">4繝√Ε繝ｳ繝阪Ν CV/繧ｪ繝ｼ繝・ぅ繧ｪ菫｡蜿ｷ繝ｪ繧｢繝ｫ繧ｿ繧､繝繝｢繝九ち繝ｼ</div>`
};

export const SPK = {
    color: 'amber',
    defaults: () => ({ type: 'SPK', masterVol: 0.12 }),
    ports: () => ({
        in: [
            { port: 'wave_inL', pin: 4, color: 'bg-blue-500' },
            { port: 'wave_inR', pin: 5, color: 'bg-blue-500' }
        ],
        out: []
    }),
    schema: { color: 'amber', sliders: [{ key: 'masterVol', label: 'MASTER', min: 0, max: 0.5, step: 0.01, default: 0.12, unit: 'vol', format: v => Math.round(v * 100) + '%' }] },
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => `<div class="relative flex items-center justify-center w-full h-full pointer-events-none text-cyan-400">
        ${UIHelpers.renderPanelBars([
            {
                pct: 0,
                innerCls: 'spk-meter-l transition-all duration-75',
                width: 'w-2.5'
            },
            {
                pct: 0,
                innerCls: 'spk-meter-r transition-all duration-75',
                width: 'w-2.5'
            }
        ], { heightCls: 'h-7', gapCls: 'gap-1.5' })}
        <span class="spk-vol-val absolute bottom-[11px] left-1/2 -translate-x-1/2 text-[7.5px] font-mono font-bold text-cyan-300 bg-slate-950/85 px-1 py-[0.5px] rounded border border-slate-700/80 leading-none shadow-sm select-none">${Math.round((m.masterVol??0.12)*100)}%</span>
    </div>`,
    updateLive: (cell, data, isP, modal, m) => {
        const barL = cell.querySelector('.spk-meter-l');
        const barR = cell.querySelector('.spk-meter-r');
        if (barL && data?.peakL !== undefined) {
            barL.style.height = `${Math.max(0, Math.min(100, Math.round(data.peakL * 200)))}%`;
        }
        if (barR && data?.peakR !== undefined) {
            barR.style.height = `${Math.max(0, Math.min(100, Math.round(data.peakR * 200)))}%`;
        }
        const volTxt = cell.querySelector('.spk-vol-val');
        if (volTxt && m) {
            volTxt.textContent = `${Math.round((m.masterVol ?? 0.12) * 100)}%`;
        }
    }
};

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
                    <button id="key-oct-down" class="w-4 h-4 rounded bg-slate-800 text-[10px] font-bold">竏・/button>
                    <span id="key-oct-disp" class="w-5 text-center text-[10px] font-mono font-bold text-cyan-300">${m.octave||4}</span>
                    <button id="key-oct-up" class="w-4 h-4 rounded bg-slate-800 text-[10px] font-bold">・・/button></div>
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

export const SUB = {
    color: 'cyan',
    defaults: () => ({ type: 'SUB', targetPage: 1 }),
    ports: (m, ctx) => {
        const allPins = [
            { port: 'PIN1_in', slot: 1 }, { port: 'PIN2_in', slot: 2 }, { port: 'PIN3_in', slot: 3 },
            { port: 'PIN4_in', slot: 4 }, { port: 'PIN5_in', slot: 5 }, { port: 'PIN6_in', slot: 6 },
            { port: 'PIN7_out', slot: 7 }, { port: 'PIN8_out', slot: 8 }, { port: 'PIN9_out', slot: 9 },
            { port: 'PIN10_out', slot: 10 }, { port: 'PIN11_out', slot: 11 }, { port: 'PIN12_out', slot: 12 }
        ];
        const active = ctx?.subActivePorts;
        const visiblePins = active ? allPins.filter(p => active.has(p.port) || active.has(`PIN${p.slot}`) || active.has(`PIN${p.slot}_in`) || active.has(`PIN${p.slot}_out`)) : allPins;
        const inList = visiblePins.filter(p => p.slot <= 6).map(p => ({
            port: p.port,
            color: ctx?.getPortColor ? ctx.getPortColor(p.port) : 'bg-slate-500'
        }));
        const outList = visiblePins.filter(p => p.slot >= 7).map(p => ({
            port: p.port,
            color: ctx?.getPortColor ? ctx.getPortColor(p.port) : 'bg-slate-500'
        }));
        return { in: inList, out: outList };
    },
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: () => `
        <div class="flex flex-col items-center justify-center leading-none pointer-events-none">
            <svg class="w-5 h-5 text-cyan-400 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M11 9h4a2 2 0 0 0 2-2V3"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="M7 21v-4a2 2 0 0 1 2-2h4"/>
                <circle cx="15" cy="15" r="2"/>
            </svg>
        </div>`,
    renderModal: (m, ctx) => {
        const curP = m.targetPage ?? 1;
        const existingPages = ctx?.pagesData ? Object.keys(ctx.pagesData).map(Number).filter(n => n > 0 && !isNaN(n)) : [];
        const availablePages = Array.from(new Set([1, 2, 3, 4, curP, ...existingPages])).sort((a, b) => a - b);
        return `
            <div class="space-y-2 p-1">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] text-slate-400 font-semibold uppercase">TARGET SUBPAGE</span>
                    <span class="text-[9px] font-mono font-bold text-cyan-300">PAGE ${curP}${m.subType ? ` (${m.subType})` : ''}</span>
                </div>
                <div>
                    <label class="block text-[8px] text-slate-400 mb-1 uppercase tracking-wider font-semibold">Select Page Number</label>
                    <div class="grid grid-cols-4 gap-1">
                        ${availablePages.map(p => {
                             const pName = ctx?.pagesData ? ctx.pagesData[String(p)]?.name : null;
                            return `
                            <button class="sub-page-btn py-1 rounded text-[8.5px] font-bold border transition-colors flex flex-col items-center justify-center ${curP === p ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm shadow-cyan-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}" data-page="${p}">
                                <span>PAGE ${p}</span>
                                ${pName ? `<span class="text-[7px] opacity-80 truncate max-w-[40px]">${pName}</span>` : ''}
                            </button>`;
                        }).join('')}
                    </div>
                </div>
                <div class="pt-1">
                    <button id="sub-open-page-btn" class="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg border border-cyan-400 text-xs font-bold shadow-md shadow-cyan-500/30 flex items-center justify-center gap-1.5 transition">
                        <span>OPEN SUBPATCH (PAGE ${curP})</span> 竊・
                    </button>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        document.querySelectorAll('.sub-page-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.targetPage = parseInt(e.currentTarget.dataset.page) || 1;
                ctx.reRenderModal();
                cb();
            });
        });
        document.getElementById('sub-open-page-btn')?.addEventListener('click', () => {
            document.getElementById('shared-modal')?.classList.add('hidden');
            ctx.openSubpage?.(m.targetPage || 1);
        });
    },
    onDestroy: async (m, ctx) => {
        const target = m.targetPage ? String(m.targetPage) : null;
        if (!target || target === "0") return;
        const targetPageData = ctx.pagesData ? ctx.pagesData[target] : null;
        if (targetPageData?.modules) {
            const childIds = Object.keys(targetPageData.modules);
            for (const childId of childIds) {
                await ctx.destroyModule?.(target, childId);
            }
        }
        ctx.destroyPage?.(target);
    }
};

export const SUB_IO = {
    color: 'emerald',
    defaults: () => ({ type: 'SUB_IO' }),
    ports: (m, ctx) => {
        const allPins = [
            { port: 'PIN1_out', slot: 1 }, { port: 'PIN2_out', slot: 2 }, { port: 'PIN3_out', slot: 3 },
            { port: 'PIN4_out', slot: 4 }, { port: 'PIN5_out', slot: 5 }, { port: 'PIN6_out', slot: 6 },
            { port: 'PIN7_in', slot: 7 }, { port: 'PIN8_in', slot: 8 }, { port: 'PIN9_in', slot: 9 },
            { port: 'PIN10_in', slot: 10 }, { port: 'PIN11_in', slot: 11 }, { port: 'PIN12_in', slot: 12 }
        ];
        const outList = allPins.filter(p => p.slot <= 6).map(p => ({
            port: p.port,
            color: ctx?.getPortColor ? ctx.getPortColor(p.port) : 'bg-slate-500'
        }));
        const inList = allPins.filter(p => p.slot >= 7).map(p => ({
            port: p.port,
            color: ctx?.getPortColor ? ctx.getPortColor(p.port) : 'bg-slate-500'
        }));
        return { in: inList, out: outList };
    },
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: () => `
        <div class="flex flex-col items-center justify-center leading-none pointer-events-none">
            <svg class="w-5 h-5 text-cyan-400 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M11 9h4a2 2 0 0 0 2-2V3"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="M7 21v-4a2 2 0 0 1 2-2h4"/>
                <circle cx="15" cy="15" r="2"/>
            </svg>
        </div>`,
    renderModal: (m, ctx) => {
        const pageName = ctx?.getPageName ? ctx.getPageName() : (m.name || 'SUBPATCH');
        return `
            <div class="space-y-2 p-1">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] text-slate-400 font-semibold uppercase">SUBPATCH NAME</span>
                    <button id="sub-io-rename-btn" class="h-4 px-1.5 rounded text-[8px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/60 hover:bg-emerald-900 transition leading-none inline-flex items-center gap-1">
                        <span class="font-mono font-bold">${pageName}</span>
                        <span class="text-[8px]">笨擾ｸ・/span>
                    </button>
                </div>
                <div class="text-center py-1">
                    <span class="text-[10px] font-bold text-emerald-300 uppercase">SUBPATCH I/O ROOT</span>
                    <p class="text-[8.5px] text-slate-400 mt-1">繝｡繧､繝ｳ繧ｰ繝ｪ繝・ラ縺ｮ SUB 繝｢繧ｸ繝･繝ｼ繝ｫ縺ｨ12譛ｬ縺ｮ蟇ｾ遘ｰ遶ｯ蟄舌〒騾壻ｿ｡縺励∪縺吶・/p>
                    <div class="mt-1.5 p-1 bg-slate-950/80 rounded border border-slate-800 text-[7.5px] text-left text-slate-300 space-y-0.5">
                        <div><span class="font-mono text-cyan-300 font-bold">PIN1縲・ [OUT]</span>: 隕ｪ縺九ｉ縺ｮ騾√ｊ (CV / Gate / Clock)</div>
                        <div><span class="font-mono text-emerald-300 font-bold">PIN7縲・2 [IN]</span>: 隕ｪ縺ｸ縺ｮ謌ｻ繧・(Audio L/R / Mod驍・・)</div>
                        <div class="text-[7px] text-slate-400 pt-0.5">蟾ｦ: PIN1縲・ (荳岩梍荳・ / 荳・ PIN4縲・ (蟾ｦ筐泌承) / 蜿ｳ: PIN10縲・2 (荳銀梍荳・</div>
                    </div>
                    <p class="text-[8px] text-amber-400/80 mt-1">窶ｻ 縺薙・繝｢繧ｸ繝･繝ｼ繝ｫ縺ｯ蜑企勁縺ｧ縺阪∪縺帙ｓ・井ｿ晁ｭｷ荳ｭ・・/p>
                </div>
                <div class="flex gap-1.5 pt-1">
                    <button id="sub-io-save-btn" class="flex-1 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded-lg border border-emerald-500/70 text-[10px] font-bold shadow-sm flex items-center justify-center gap-1 transition">
                        <span>沈 繝ｩ繧､繝悶Λ繝ｪ縺ｫ菫晏ｭ・(CUSTOM)</span>
                    </button>
                </div>
                <div class="pt-0.5">
                    <button id="sub-io-back-btn" class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg border border-emerald-400 text-xs font-bold shadow-md shadow-emerald-500/30 flex items-center justify-center gap-1.5 transition">
                        竊・<span>RETURN TO MAIN (PAGE 0)</span>
                    </button>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        document.getElementById('sub-io-rename-btn')?.addEventListener('click', async () => {
            const curName = ctx.getPageName ? ctx.getPageName() : (m.name || 'SUBPATCH');
            const res = await ctx.prompt('SUBPATCH NAME', curName);
            if (res !== null && res.trim() !== '') {
                ctx.setPageName?.(res.trim());
                ctx.reRenderModal();
                cb?.();
            }
        });
        document.getElementById('sub-io-save-btn')?.addEventListener('click', async () => {
            const curName = ctx.getPageName ? ctx.getPageName() : (m.name || 'SUBPATCH');
            const res = await ctx.prompt('SAVE SUBPATCH AS', curName);
            if (res !== null && res.trim() !== '') {
                ctx.saveSubpatchToLibrary?.(res.trim());
            }
        });
        document.getElementById('sub-io-back-btn')?.addEventListener('click', () => {
            document.getElementById('shared-modal')?.classList.add('hidden');
            ctx.openSubpage?.(0);
        });
    }
};

const extractBands = (freqs, numBands = 96, sampleRate = 48000) => {
    const fftSize = freqs.length * 2;
    const bands = new Float32Array(numBands);
    let peakVal = 0, peakFreq = 0;

    // 1繧ｪ繧ｯ繧ｿ繝ｼ繝・2繧ｻ繝溘ヨ繝ｼ繝ｳ・亥濠髻ｳ蜊倅ｽ搾ｼ峨∝・96繝舌Φ繝会ｼ・繧ｪ繧ｯ繧ｿ繝ｼ繝・ 55Hz縲・4080Hz / 邏・4kHz・・
    // 55Hz (A1) 繧定ｵｷ轤ｹ(b=0)縺ｨ縺励∝推蜊企浹縺ｮ荳ｭ蠢・捉豕｢謨ｰ縺ｯ 55 * 2^(b / 12)
    const bandsPerOct = 12;
    const f0 = 55;

    for (let b = 0; b < numBands; b++) {
        const fCenter = f0 * Math.pow(2, b / bandsPerOct);

        // 蜷・濠髻ｳ縺ｮ荳ｭ蠢・捉豕｢謨ｰ縺ｮ繧ｹ繝壹け繝医Ν蛟､繧貞燕蠕後・繝薙Φ縺九ｉ邏皮ｲ九↓邱壼ｽ｢陬憺俣縺ｧ繧ｵ繝ｳ繝励Μ繝ｳ繧ｰ・亥玄髢杜ax謗｢邏｢縺ｮ驥崎､・ｒ螳悟・謗帝勁・・
        const kCenterFloat = fCenter * fftSize / sampleRate;
        const k0 = Math.max(0, Math.min(freqs.length - 1, Math.floor(kCenterFloat)));
        const k1 = Math.min(freqs.length - 1, k0 + 1);
        const t = kCenterFloat - k0;
        const val = (1 - t) * freqs[k0] + t * freqs[k1];

        // 閾ｪ辟ｶ縺ｪ豁｣隕丞喧・・.0縲・.0・峨→繧ｬ繝ｳ繝槭き繝ｼ繝厄ｼ亥床蠖｢蛹悶ｒ髦ｲ縺弱∵ｭ｣隕丞・蟶・き繝ｼ繝悶ｒ謠冗判・・
        const v = Math.max(0, Math.min(1.0, val / 255.0));
        bands[b] = Math.pow(v, 1.4);

        if (val > peakVal) {
            peakVal = val;
            peakFreq = (kCenterFloat * sampleRate) / fftSize;
        }
    }

    return { bands, peakVal, peakFreq };
};

const findGlobalPeak = (freqs, sampleRate = 48000, fMin = 40, fMax = 14000) => {
    const fftSize = freqs.length * 2;
    const kMin = Math.max(1, Math.floor(fMin * fftSize / sampleRate));
    const kMax = Math.min(freqs.length - 1, Math.ceil(fMax * fftSize / sampleRate));
    let max = 0, maxK = 0;
    for (let k = kMin; k <= kMax; k++) {
        if (freqs[k] > max) {
            max = freqs[k];
            maxK = k;
        }
    }
    return { peakVal: max, peakFreq: (maxK * sampleRate) / fftSize };
};

const drawSpectrumCanvas = (ctx, w, h, bands, mode, isModal) => {
    ctx.clearRect(0, 0, w, h);

    const n = bands.length;
    const bandsPerOct = 12;

    // 1. Horizontal guidelines (-12dB, -24dB, -48dB)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.6;
    const gridY = [h * 0.25, h * 0.5, h * 0.75];
    gridY.forEach(y => {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    });

    const gap = isModal ? 1.0 : 0.3;
    const barW = (w - gap * (n - 1)) / n;

    // 2. Vertical Octave Frequency Lines (55, 110, 220, 440, 880, 1.7k, 3.5k, 7k, 14k)
    const octFreqs = [
        { f: 55, l: '55' },
        { f: 110, l: '110' },
        { f: 220, l: '220' },
        { f: 440, l: '440', isA4: true },
        { f: 880, l: '880' },
        { f: 1760, l: '1.7k' },
        { f: 3520, l: '3.5k' },
        { f: 7040, l: '7k' },
        { f: 14080, l: '14k' }
    ];

    octFreqs.forEach(item => {
        const b = bandsPerOct * Math.log2(item.f / 55);
        if (b >= 0 && b <= n) {
            let x;
            if (mode === 'bar') {
                if (b < n) {
                    x = b * (barW + gap) + barW / 2;
                } else {
                    x = w - 1;
                }
            } else {
                x = (b / (n - 1)) * w;
            }

            ctx.save();
            if (item.isA4) {
                // 440Hz蝓ｺ貅悶Λ繧､繝ｳ (魄ｮ繧・°縺ｪ繝・ぅ繝ｼ繝ｫ邉ｻ繧｢繧ｯ繧ｻ繝ｳ繝育ｴ邱・
                ctx.strokeStyle = 'rgba(45, 212, 191, 0.85)';
                ctx.lineWidth = 1.2;
                ctx.setLineDash([3, 2]);
            } else {
                // 繧ｪ繧ｯ繧ｿ繝ｼ繝悶Λ繧､繝ｳ (譏弱ｋ縺剰ｦ冶ｪ肴ｧ縺ｮ鬮倥＞繧ｹ繝ｬ繝ｼ繝育ｳｻ遐ｴ邱・
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
                ctx.lineWidth = 0.8;
                ctx.setLineDash([2, 2]);
            }

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();

            // 繝｢繝ｼ繝繝ｫ諡｡螟ｧ譎・ 蜻ｨ豕｢謨ｰ繝ｩ繝吶Ν繧呈・繧九￥縺上▲縺阪ｊ陦ｨ遉ｺ
            if (isModal) {
                ctx.font = 'bold 8.5px ui-monospace, monospace';
                ctx.fillStyle = item.isA4 ? '#2dd4bf' : '#cbd5e1';
                ctx.textAlign = 'center';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 1;
                const clampedX = Math.max(10, Math.min(w - 10, x));
                ctx.fillText(item.l, clampedX, 10);
            }
            ctx.restore();
        }
    });

    if (mode === 'bar') {
        for (let i = 0; i < n; i++) {
            const v = Math.max(0, Math.min(1, bands[i]));
            const barH = Math.max(1, v * (h - 4));
            const x = i * (barW + gap);
            const y = h - barH;

            const grad = ctx.createLinearGradient(0, h, 0, 0);
            grad.addColorStop(0, '#0d9488');
            grad.addColorStop(0.65, '#2dd4bf');
            grad.addColorStop(1, '#facc15');

            ctx.fillStyle = grad;
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function' && barW >= 2) {
                ctx.roundRect(x, y, barW, barH, [1, 1, 0, 0]);
            } else {
                ctx.rect(x, y, barW, barH);
            }
            ctx.fill();
        }
    } else {
        // Curve mode (謚倥ｌ邱壹・繧ｹ繝壹け繝医Ν譖ｲ邱・
        const pts = [];
        for (let i = 0; i < n; i++) {
            const x = (i / (n - 1)) * w;
            const v = Math.max(0, Math.min(1, bands[i]));
            const y = h - (v * (h - 6)) - 2;
            pts.push({ x, y });
        }

        // Fill under curve
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(45, 212, 191, 0.45)');
        grad.addColorStop(0.7, 'rgba(13, 148, 136, 0.15)');
        grad.addColorStop(1, 'rgba(13, 148, 136, 0.0)');

        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            const midX = (pts[i - 1].x + pts[i].x) / 2;
            const midY = (pts[i - 1].y + pts[i].y) / 2;
            ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Stroke line
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            const midX = (pts[i - 1].x + pts[i].x) / 2;
            const midY = (pts[i - 1].y + pts[i].y) / 2;
            ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = isModal ? 2 : 1.5;
        ctx.stroke();
    }
};

export const SPEC = {
    color: 'teal',
    defaults: () => ({ type: 'SPEC', mode: 'bar', speed: 'med', smooth: 0.75 }),
    ports: () => ({
        in: [{ port: 'wave_in', pin: 4, color: 'bg-blue-500' }],
        out: []
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => `
        <div class="absolute inset-0.5 bg-slate-950 rounded-sm border border-slate-800/90 overflow-hidden z-0 pointer-events-none">
            <canvas class="spec-canvas w-full h-full block" width="120" height="120"></canvas>
        </div>`,
    updateLive: (cell, data, isP, modal, m) => {
        if (!data?.freqs) return;
        const freqs = data.freqs;
        const sampleRate = data.sampleRate || 48000;
        const mode = m.mode || 'bar';

        // 1. Draw cell canvas (96 bands, 1繧ｪ繧ｯ繧ｿ繝ｼ繝・2繧ｻ繝溘ヨ繝ｼ繝ｳ, 55Hz縲・4080Hz)
        const cvs = cell.querySelector('.spec-canvas');
        if (cvs) {
            const cellRes = extractBands(freqs, 96, sampleRate);
            const ctx = cvs.getContext('2d');
            drawSpectrumCanvas(ctx, cvs.width, cvs.height, cellRes.bands, mode, false);
        }

        // 2. Draw modal canvas if modal is open (96 bands, 1繧ｪ繧ｯ繧ｿ繝ｼ繝・2繧ｻ繝溘ヨ繝ｼ繝ｳ, 55Hz縲・4080Hz)
        const modalCvs = modal?.querySelector('#spec-modal-canvas');
        if (modalCvs) {
            const modalRes = extractBands(freqs, 96, sampleRate);
            const mCtx = modalCvs.getContext('2d');
            drawSpectrumCanvas(mCtx, modalCvs.width, modalCvs.height, modalRes.bands, mode, true);
        }
    },
    renderModal: (m) => {
        const curMode = m.mode || 'bar';
        const curSpeed = m.speed || 'med';
        return `
            <div class="space-y-1.5">
                <!-- Single-Row Top Menu Bar (1谿ｵ險ｭ螳壹Γ繝九Η繝ｼ) -->
                <div class="flex items-center justify-between pb-1 border-b border-slate-800 select-none">
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] text-slate-400 font-bold uppercase tracking-tight">MODE:</span>
                        <button id="spec-mode-bar" class="h-4 px-1.5 rounded text-[8px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${curMode === 'bar' ? 'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}">BAR</button>
                        <button id="spec-mode-curve" class="h-4 px-1.5 rounded text-[8px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${curMode === 'curve' ? 'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}">CURVE</button>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="text-[8px] text-slate-400 font-bold uppercase tracking-tight">SPEED:</span>
                        ${['fast', 'med', 'slow'].map(sp => `
                            <button class="spec-speed-btn h-4 px-1.5 rounded text-[7.5px] font-bold border leading-none inline-flex items-center justify-center transition-colors ${curSpeed === sp ? 'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}" data-speed="${sp}">${sp.toUpperCase()}</button>
                        `).join('')}
                    </div>
                </div>

                <!-- Expanded Modal Spectrum Display (繧ｪ繧ｷ繝ｭ繧ｹ繧ｳ繝ｼ繝怜酔讒倥∵枚蟄苓｡ｨ遉ｺ縺ｪ縺励・繝輔Ν繧ｭ繝｣繝ｳ繝舌せ) -->
                <div class="h-[108px] bg-slate-950 p-1 rounded-lg border border-slate-800 select-none shadow-sm overflow-hidden">
                    <canvas id="spec-modal-canvas" class="w-full h-full block rounded bg-slate-950" width="360" height="106"></canvas>
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        document.getElementById('spec-mode-bar')?.addEventListener('click', () => {
            m.mode = 'bar';
            ctx.reRenderModal();
            cb();
        });
        document.getElementById('spec-mode-curve')?.addEventListener('click', () => {
            m.mode = 'curve';
            ctx.reRenderModal();
            cb();
        });
        document.querySelectorAll('.spec-speed-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sp = e.currentTarget.dataset.speed;
                m.speed = sp;
                m.smooth = sp === 'fast' ? 0.4 : (sp === 'slow' ? 0.90 : 0.75);
                ctx.reRenderModal();
                cb();
            });
        });
    }
};

export const ioDefs = {
    SCOPE,
    MON,
    SPK,
    KEY,
    SUB,
    SUB_IO,
    SPEC
};

