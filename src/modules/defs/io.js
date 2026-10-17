import { UIHelpers } from '../../ui/helpers.js';

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
        const cvs = cell.querySelector('.scope-canvas'); if (!cvs) return;
        const ctx2d = cvs.getContext('2d'), w = cvs.width, h = cvs.height;
        ctx2d.clearRect(0, 0, w, h);

        // Center grid
        ctx2d.strokeStyle = '#1e293b'; ctx2d.lineWidth = 0.8; ctx2d.beginPath();
        ctx2d.moveTo(0, h / 2); ctx2d.lineTo(w, h / 2);
        ctx2d.moveTo(w / 2, 0); ctx2d.lineTo(w / 2, h);
        ctx2d.stroke();

        const vR = m.vRange || 5.0;
        const b1 = data.buf1, b2 = data.buf2, trg = data.trigBuf;
        const len = b1.length;

        if (m.displayMode === 'xy') {
            // Lissajous XY Mode (X = in1, Y = in2)
            ctx2d.lineWidth = 1.4; ctx2d.strokeStyle = '#10b981'; ctx2d.beginPath();
            let lastX = w / 2, lastY = h / 2;
            for (let i = 0; i < len; i++) {
                const x = Math.max(1, Math.min(w - 1, (w / 2) + ((b1[i] / vR) * (w * 0.44))));
                const y = Math.max(1, Math.min(h - 1, (h / 2) - ((b2[i] / vR) * (h * 0.44))));
                if (i === 0) ctx2d.moveTo(x, y);
                else ctx2d.lineTo(x, y);
                if (i === len - 1) {
                    lastX = x;
                    lastY = y;
                }
            }
            ctx2d.stroke();

            // High-luminance, high-saturation phosphor beam spot
            ctx2d.save();
            ctx2d.shadowColor = '#00ffaa';
            ctx2d.shadowBlur = 6;
            ctx2d.fillStyle = '#ffffff';
            ctx2d.beginPath();
            ctx2d.arc(lastX, lastY, 1.4, 0, Math.PI * 2);
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

            // Upper terminal (in2 / b2) - shifts UP
            ctx2d.lineWidth = 1.2; ctx2d.strokeStyle = '#c084fc'; ctx2d.beginPath();
            for (let i = 0; i < drawPts; i++) {
                const idx = startIdx + i;
                const y = Math.max(1, Math.min(h - 1, (h / 2) - (((b2[idx] / vR) + sp) * (h * 0.44))));
                i === 0 ? ctx2d.moveTo(i * sW, y) : ctx2d.lineTo(i * sW, y);
            }
            ctx2d.stroke();

            // Lower terminal (in1 / b1) - shifts DOWN
            ctx2d.lineWidth = 1.4; ctx2d.strokeStyle = '#22d3ee'; ctx2d.beginPath();
            for (let i = 0; i < drawPts; i++) {
                const idx = startIdx + i;
                const y = Math.max(1, Math.min(h - 1, (h / 2) - (((b1[idx] / vR) - sp) * (h * 0.44))));
                i === 0 ? ctx2d.moveTo(i * sW, y) : ctx2d.lineTo(i * sW, y);
            }
            ctx2d.stroke();
        }
    },
    renderModal: (m) => {
        const T = SCOPE.T_STEPS;
        let tIdx = T.findIndex(t => Math.abs(t - (m.timeSpan || 0.05)) < 0.0005);
        if (tIdx === -1) tIdx = 4;
        const isLiss = m.displayMode === 'xy';
        const fmtT = SCOPE.formatTime;
        const curSpread = m.ySpread ?? 0.2;
        return `
            <div class="space-y-1.5 p-0.5">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <div class="flex items-center gap-1">
                        <button id="scope-mode-time" class="px-2 py-0.5 rounded text-[8px] font-bold border transition-colors ${!isLiss ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-slate-400 border-slate-700'}">DUAL</button>
                        <button id="scope-mode-liss" class="px-2 py-0.5 rounded text-[8px] font-bold border transition-colors ${isLiss ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}">LISS (XY)</button>
                    </div>
                    <button id="scope-trig-btn" class="px-2 py-0.5 rounded text-[8px] font-bold border transition-colors ${m.trigMode === 'free' ? 'bg-amber-600 text-white border-amber-500' : 'bg-cyan-600 text-white border-cyan-500'}">TRIG: ${(m.trigMode || 'auto').toUpperCase()}</button>
                </div>
                <div class="flex items-center justify-around py-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 gap-1">
                    ${UIHelpers.createVSliderHTML('scope-time-step', 'TIME', 0, T.length - 1, 1, tIdx, 'SPAN', 'cyan', false, fmtT(T[tIdx]))}
                    ${UIHelpers.createVSliderHTML('scope-volt', 'SCALE', 0.5, 10.0, 0.5, m.vRange || 5.0, 'v', 'cyan')}
                    ${UIHelpers.createVSliderHTML('scope-spread', 'Y SPREAD', 0.0, 1.0, 0.02, curSpread, 'sep', 'purple', isLiss, curSpread.toFixed(2))}
                </div>
            </div>`;
    },
    bindEvents: (m, ctx, cb) => {
        const T = SCOPE.T_STEPS;
        const fmtT = SCOPE.formatTime;
        document.getElementById('scope-mode-time')?.addEventListener('click', () => { m.displayMode = 'time'; ctx.reRenderModal(); cb(); });
        document.getElementById('scope-mode-liss')?.addEventListener('click', () => { m.displayMode = 'xy'; ctx.reRenderModal(); cb(); });
        document.getElementById('scope-trig-btn')?.addEventListener('click', () => { m.trigMode = m.trigMode === 'free' ? 'auto' : 'free'; ctx.reRenderModal(); cb(); });

        UIHelpers.bindSlider('scope-time-step', v => fmtT(T[Math.min(T.length - 1, Math.max(0, Math.round(v)))]), v => {
            m.timeSpan = T[Math.min(T.length - 1, Math.max(0, Math.round(v)))] || 0.05;
            cb();
        }, 1, 0, T.length - 1);
        UIHelpers.bindSlider('scope-volt', v => v.toFixed(1), v => { m.vRange = v; cb(); }, 1, 0.5, 10.0);
        UIHelpers.bindSlider('scope-spread', v => v.toFixed(2), v => { m.ySpread = v; cb(); }, 1, 0.0, 1.0);
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
    renderModal: () => `<div class="text-[9px] text-slate-400 p-2 text-center">4チャンネル CV/オーディオ信号リアルタイムモニター</div>`
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
    BLACK_KEYS: [{s:-2,l:0},{s:1,l:20},{s:3,l:30},{s:6,l:50},{s:8,l:60},{s:10,l:70},{s:13,l:90},{s:15,l:100}],
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
                <div class="relative h-28 bg-slate-950 rounded-lg border border-slate-800 flex select-none touch-none overflow-hidden" id="kb-box">
                    ${W.map(k => `<div class="flex-1 bg-slate-200 active:bg-cyan-300 border border-slate-400 rounded-b flex flex-col justify-end items-center pb-1 cursor-pointer" data-semi="${k.s}"><span class="text-[7.5px] font-bold text-slate-700 pointer-events-none">${k.n}</span></div>`).join('')}
                    <div class="absolute inset-0 pointer-events-none">${B.map(bk => `<div class="absolute h-16 bg-slate-900 border border-slate-700 rounded-b pointer-events-auto cursor-pointer active:bg-cyan-600 shadow-md" style="left:${bk.l}%;width:6.8%;transform:translateX(-50%);" data-semi="${bk.s}"></div>`).join('')}</div>
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
        if (kb) {
            let activeKey = null;
            kb.onpointerdown = (e) => {
                const k = e.target.closest('[data-semi]'); if (!k) return;
                activeKey = k; kb.setPointerCapture(e.pointerId); play(parseInt(k.dataset.semi), true);
            };
            const stop = (e) => {
                if (activeKey) { play(parseInt(activeKey.dataset.semi), false); activeKey = null; }
                try { kb.releasePointerCapture(e.pointerId); } catch(err){}
            };
            kb.onpointerup = stop; kb.onpointercancel = stop;
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
                        <span>OPEN SUBPATCH (PAGE ${curP})</span> →
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
                    <button id="sub-io-rename-btn" class="px-2 py-0.5 rounded text-[8.5px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/60 hover:bg-emerald-900 transition flex items-center gap-1">
                        <span class="font-mono font-bold">${pageName}</span>
                        <span class="text-[8px]">✏️</span>
                    </button>
                </div>
                <div class="text-center py-1">
                    <span class="text-[10px] font-bold text-emerald-300 uppercase">SUBPATCH I/O ROOT</span>
                    <p class="text-[8.5px] text-slate-400 mt-1">メイングリッドの SUB モジュールと12本の対称端子で通信します。</p>
                    <div class="mt-1.5 p-1 bg-slate-950/80 rounded border border-slate-800 text-[7.5px] text-left text-slate-300 space-y-0.5">
                        <div><span class="font-mono text-cyan-300 font-bold">PIN1〜6 [OUT]</span>: 親からの送り (CV / Gate / Clock)</div>
                        <div><span class="font-mono text-emerald-300 font-bold">PIN7〜12 [IN]</span>: 親への戻り (Audio L/R / Mod還元)</div>
                        <div class="text-[7px] text-slate-400 pt-0.5">左: PIN1〜3 (上➔下) / 下: PIN4〜9 (左➔右) / 右: PIN10〜12 (下➔上)</div>
                    </div>
                    <p class="text-[8px] text-amber-400/80 mt-1">※ このモジュールは削除できません（保護中）</p>
                </div>
                <div class="flex gap-1.5 pt-1">
                    <button id="sub-io-save-btn" class="flex-1 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded-lg border border-emerald-500/70 text-[10px] font-bold shadow-sm flex items-center justify-center gap-1 transition">
                        <span>💾 ライブラリに保存 (CUSTOM)</span>
                    </button>
                </div>
                <div class="pt-0.5">
                    <button id="sub-io-back-btn" class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg border border-emerald-400 text-xs font-bold shadow-md shadow-emerald-500/30 flex items-center justify-center gap-1.5 transition">
                        ← <span>RETURN TO MAIN (PAGE 0)</span>
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

const extractBands = (freqs, numBands, sampleRate = 48000, fMin = 40, fMax = 6400) => {
    const fftSize = freqs.length * 2;
    const bands = new Float32Array(numBands);
    let peakVal = 0, peakFreq = 0;

    for (let b = 0; b < numBands; b++) {
        const fStart = fMin * Math.pow(fMax / fMin, b / numBands);
        const fEnd = fMin * Math.pow(fMax / fMin, (b + 1) / numBands);
        const kStart = Math.max(0, Math.floor(fStart * fftSize / sampleRate));
        const kEnd = Math.min(freqs.length, Math.max(kStart + 1, Math.ceil(fEnd * fftSize / sampleRate)));

        let max = 0;
        let maxK = kStart;
        for (let k = kStart; k < kEnd; k++) {
            if (freqs[k] > max) {
                max = freqs[k];
                maxK = k;
            }
        }
        bands[b] = Math.max(0, Math.min(1, max / 255.0));

        if (max > peakVal) {
            peakVal = max;
            peakFreq = (maxK * sampleRate) / fftSize;
        }
    }

    return { bands, peakVal, peakFreq };
};

const findGlobalPeak = (freqs, sampleRate = 48000, fMin = 40, fMax = 6400) => {
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

    // Horizontal guidelines (-12dB, -24dB, -48dB)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.6;
    const gridY = [h * 0.25, h * 0.5, h * 0.75];
    gridY.forEach(y => {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    });

    const n = bands.length;
    if (mode === 'bar') {
        const gap = isModal ? 1.2 : 1.0;
        const barW = (w - gap * (n - 1)) / n;
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
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(x, y, barW, barH, [1, 1, 0, 0]);
            } else {
                ctx.rect(x, y, barW, barH);
            }
            ctx.fill();
        }
    } else {
        // Curve mode (折れ線・スペクトル曲線)
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
        <div class="absolute inset-0.5 bg-slate-950 rounded-sm border border-slate-800/90 overflow-hidden z-0 pointer-events-none flex flex-col justify-between p-1">
            <div class="flex items-center justify-between z-10 pointer-events-none">
                <span class="text-[7.5px] font-bold text-teal-400 font-mono">SPEC</span>
                <span class="spec-mode-badge text-[6.5px] font-mono font-bold text-teal-300/80 uppercase">${(m.mode || 'bar').toUpperCase()}</span>
            </div>
            <canvas class="spec-canvas w-full h-[74px] block rounded" width="120" height="74"></canvas>
            <div class="flex items-center justify-between text-[6.5px] font-mono text-slate-500 px-0.5 z-10">
                <span>40Hz</span>
                <span>500Hz</span>
                <span>6.4k</span>
            </div>
        </div>`,
    updateLive: (cell, data, isP, modal, m) => {
        if (!data?.freqs) return;
        const freqs = data.freqs;
        const sampleRate = data.sampleRate || 48000;
        const mode = m.mode || 'bar';

        // 1. Draw cell canvas (24 bands, 40Hz〜6.4kHz)
        const cvs = cell.querySelector('.spec-canvas');
        if (cvs) {
            const cellRes = extractBands(freqs, 24, sampleRate, 40, 6400);
            const ctx = cvs.getContext('2d');
            drawSpectrumCanvas(ctx, cvs.width, cvs.height, cellRes.bands, mode, false);
        }

        // 2. Draw modal canvas if modal is open (48 bands, 40Hz〜6.4kHz)
        const modalCvs = modal?.querySelector('#spec-modal-canvas');
        if (modalCvs) {
            const modalRes = extractBands(freqs, 48, sampleRate, 40, 6400);
            const mCtx = modalCvs.getContext('2d');
            drawSpectrumCanvas(mCtx, modalCvs.width, modalCvs.height, modalRes.bands, mode, true);

            const peakEl = modal?.querySelector('#spec-peak-disp');
            if (peakEl) {
                const peak = findGlobalPeak(freqs, sampleRate, 40, 6400);
                if (peak.peakVal > 25 && peak.peakFreq >= 35) {
                    const hz = peak.peakFreq;
                    const hzStr = hz >= 1000 ? `${(hz / 1000).toFixed(2)}kHz` : `${Math.round(hz)}Hz`;
                    peakEl.textContent = `PEAK: ${hzStr}`;
                } else {
                    peakEl.textContent = 'PEAK: ---';
                }
            }
        }
    },
    renderModal: (m) => {
        const curMode = m.mode || 'bar';
        const curSpeed = m.speed || 'med';
        return `
            <div class="space-y-2 p-0.5">
                <!-- 2-Row Controls: MODE & SPEED (はみだし防止) -->
                <div class="space-y-1.5 pb-1.5 border-b border-slate-800">
                    <div class="flex items-center justify-between">
                        <span class="text-[8px] text-slate-400 font-bold uppercase">MODE:</span>
                        <div class="flex items-center gap-1">
                            <button id="spec-mode-bar" class="px-2.5 py-0.5 rounded text-[8px] font-bold border transition-colors ${curMode === 'bar' ? 'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}">BAR (棒グラフ)</button>
                            <button id="spec-mode-curve" class="px-2.5 py-0.5 rounded text-[8px] font-bold border transition-colors ${curMode === 'curve' ? 'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}">CURVE (折れ線)</button>
                        </div>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-[8px] text-slate-400 font-bold uppercase">SPEED:</span>
                        <div class="flex items-center gap-1">
                            ${['fast', 'med', 'slow'].map(sp => `
                                <button class="spec-speed-btn px-2 py-0.5 rounded text-[7.5px] font-bold border transition-colors ${curSpeed === sp ? 'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}" data-speed="${sp}">${sp.toUpperCase()}</button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Expanded Modal Spectrum Display -->
                <div class="bg-slate-950/80 p-2 rounded-xl border border-slate-800 flex flex-col gap-1">
                    <div class="flex items-center justify-between px-1">
                        <span class="text-[7.5px] font-bold text-teal-400 uppercase tracking-wider">SPECTRUM (40Hz〜6.4kHz)</span>
                        <span id="spec-peak-disp" class="text-[7.5px] font-mono font-bold text-yellow-300">PEAK: ---</span>
                    </div>
                    <canvas id="spec-modal-canvas" class="w-full h-28 block rounded" width="220" height="110"></canvas>
                    <div class="flex items-center justify-between text-[7px] font-mono text-slate-500 px-1 border-t border-slate-800/80 pt-0.5">
                        <span>40Hz</span>
                        <span>150Hz</span>
                        <span>500Hz</span>
                        <span>1.8k</span>
                        <span>6.4kHz</span>
                    </div>
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

