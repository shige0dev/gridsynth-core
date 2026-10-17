import { UIHelpers } from '../../ui/helpers.js';

export const ADSR_CURVES = {
    exp: { label: '⟍ EXP', attackCurve: 0.0, decayCurve: -0.75, releaseCurve: -0.75 },
    lin: { label: '＼ LIN', attackCurve: 0.0, decayCurve: 0.0, releaseCurve: 0.0 },
    log: { label: '⟋ LOG', attackCurve: 0.0, decayCurve: 0.75, releaseCurve: 0.75 }
};

export const ADSR = {
    color: 'blue',
    defaults: () => ({
        type: 'ADSR',
        attack: 0.02,
        decay: 0.2,
        sustain: 0.6,
        release: 0.4,
        aCurve: 'lin',
        dCurve: 'lin',
        rCurve: 'lin',
        attackCurve: 0.0,
        decayCurve: 0.0,
        releaseCurve: 0.0
    }),
    onNormalize: (m) => {
        const curveVal = (c) => c === 'log' ? 0.75 : (c === 'exp' ? -0.75 : 0.0);
        if (!m.aCurve) {
            if (m.attackCurve !== undefined) m.aCurve = m.attackCurve > 0.15 ? 'log' : (m.attackCurve < -0.15 ? 'exp' : 'lin');
            else m.aCurve = m.curve || 'lin';
        }
        if (!m.dCurve) {
            if (m.decayCurve !== undefined) m.dCurve = m.decayCurve > 0.15 ? 'log' : (m.decayCurve < -0.15 ? 'exp' : 'lin');
            else m.dCurve = m.curve || 'lin';
        }
        if (!m.rCurve) {
            if (m.releaseCurve !== undefined) m.rCurve = m.releaseCurve > 0.15 ? 'log' : (m.releaseCurve < -0.15 ? 'exp' : 'lin');
            else m.rCurve = m.curve || 'lin';
        }
        m.attackCurve = curveVal(m.aCurve);
        m.decayCurve = curveVal(m.dCurve);
        m.releaseCurve = curveVal(m.rCurve);
    },
    ports: () => ({
        in: [{ port: 'gate_in', color: 'bg-orange-500' }],
        out: [{ port: 'cv_out', color: 'bg-yellow-400' }]
    }),
    MAX_STAGES: [2, 3, 1, 5],
    renderSvgCurve: (m) => {
        const padX = 6, padY = 4, W = 160 - padX * 2, H = 40 - padY * 2;
        const yTop = padY, yBot = padY + H;
        const ampH = H;
        const sus = Math.max(0, Math.min(1, m.sustain ?? 0.6));
        const ySus = yBot - sus * ampH;

        const viewTime = Math.max(0.02, m._viewTime ?? 1.0);
        const pxPerSec = W / viewTime;

        const att = Math.max(0.0001, m.attack ?? 0.02);
        const dec = Math.max(0.0001, m.decay ?? 0.2);
        const rel = Math.max(0.0001, m.release ?? 0.4);

        const wA = att * pxPerSec;
        const wD = dec * pxPerSec;
        const holdTime = Math.min(0.4, Math.max(0.02, viewTime * 0.15));
        const wS = holdTime * pxPerSec;
        const wR = rel * pxPerSec;

        const curvePreset = ADSR_CURVES[m.curve || 'lin'] || ADSR_CURVES.lin;
        const attCurve = m.attackCurve ?? curvePreset.attackCurve;
        const decCurve = m.decayCurve ?? curvePreset.decayCurve;
        const relCurve = m.releaseCurve ?? curvePreset.releaseCurve;

        const curveShape = (t, c) => {
            if (Math.abs(c) < 0.02) return t;
            const k = c * 4.0;
            return Math.expm1(k * t) / Math.expm1(k);
        };

        const maxX = padX + W;
        const rawPts = [];
        const N = 16;

        // Attack (0 -> 1)
        const xA0 = padX;
        rawPts.push([xA0, yBot]);
        if (wA < 1.5) {
            rawPts.push([xA0 + wA, yTop]);
        } else {
            for (let k = 1; k <= N; k++) {
                const t = k / N;
                const v = curveShape(t, -attCurve);
                rawPts.push([xA0 + t * wA, yBot - v * ampH]);
            }
        }

        // Decay (1 -> sustain)
        const xD0 = padX + wA;
        if (wD < 1.5) {
            rawPts.push([xD0 + wD, ySus]);
        } else {
            for (let k = 1; k <= N; k++) {
                const t = k / N;
                const v = 1.0 - curveShape(t, decCurve);
                rawPts.push([xD0 + t * wD, ySus + v * (yTop - ySus)]);
            }
        }

        // Sustain
        const xS0 = padX + wA + wD;
        const xS1 = xS0 + wS;
        rawPts.push([xS1, ySus]);

        // Release (sustain -> 0)
        const xR0 = xS1;
        if (wR < 1.5) {
            rawPts.push([xR0 + wR, yBot]);
        } else {
            for (let k = 1; k <= N; k++) {
                const t = k / N;
                const v = 1.0 - curveShape(t, relCurve);
                rawPts.push([xR0 + t * wR, yBot - sus * ampH * v]);
            }
        }

        // Clip points to maxX
        const pts = [];
        for (let i = 0; i < rawPts.length; i++) {
            const p = rawPts[i];
            if (p[0] <= maxX) {
                pts.push(p);
            } else {
                const prev = rawPts[i - 1] || [padX, yBot];
                const frac = (maxX - prev[0]) / Math.max(0.001, (p[0] - prev[0]));
                const interpY = prev[1] + (p[1] - prev[1]) * Math.max(0, Math.min(1, frac));
                pts.push([maxX, interpY]);
                break;
            }
        }

        const lastP = pts[pts.length - 1];
        if (lastP[0] < maxX) {
            pts.push([maxX, yBot]);
        }

        const pathD = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
        const fillD = `${pathD} L ${maxX.toFixed(1)} ${yBot.toFixed(1)} L ${padX.toFixed(1)} ${yBot.toFixed(1)} Z`;

        let timeTicks = '';
        for (let div = 1; div < 4; div++) {
            const tickX = padX + (W * div) / 4;
            timeTicks += `<line x1="${tickX.toFixed(1)}" y1="${yTop}" x2="${tickX.toFixed(1)}" y2="${yBot}" stroke="#1e293b" stroke-width="0.5" stroke-dasharray="1,3"/>`;
        }

        const sepA = (wA >= 3 && (padX + wA) < maxX) ? `<line x1="${(padX + wA).toFixed(1)}" y1="${yTop}" x2="${(padX + wA).toFixed(1)}" y2="${yBot}" stroke="#334155" stroke-width="0.75" stroke-dasharray="2,2"/>` : '';
        const sepD = (wD >= 3 && (padX + wA + wD) < maxX) ? `<line x1="${(padX + wA + wD).toFixed(1)}" y1="${yTop}" x2="${(padX + wA + wD).toFixed(1)}" y2="${yBot}" stroke="#334155" stroke-width="0.75" stroke-dasharray="2,2"/>` : '';
        const sepS = ((padX + wA + wD + wS) < maxX) ? `<line x1="${(padX + wA + wD + wS).toFixed(1)}" y1="${yTop}" x2="${(padX + wA + wD + wS).toFixed(1)}" y2="${yBot}" stroke="#334155" stroke-width="0.75" stroke-dasharray="2,2"/>` : '';

        const dotA = (padX + wA) <= maxX ? `<circle cx="${(padX + wA).toFixed(1)}" cy="${yTop}" r="2" fill="#38bdf8" />` : '';
        const dotD = (padX + wA + wD) <= maxX ? `<circle cx="${(padX + wA + wD).toFixed(1)}" cy="${ySus.toFixed(1)}" r="1.5" fill="#0284c7" />` : '';
        const dotS = (padX + wA + wD + wS) <= maxX ? `<circle cx="${(padX + wA + wD + wS).toFixed(1)}" cy="${ySus.toFixed(1)}" r="1.5" fill="#0284c7" />` : '';
        const dotR = (padX + wA + wD + wS + wR) <= maxX ? `<circle cx="${(padX + wA + wD + wS + wR).toFixed(1)}" cy="${yBot}" r="1.5" fill="#0284c7" />` : '';

        return `
            <svg viewBox="0 0 160 40" class="w-full h-10 select-none">
                <defs>
                    <linearGradient id="adsr-curve-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.4"/>
                        <stop offset="100%" stop-color="#0284c7" stop-opacity="0.05"/>
                    </linearGradient>
                </defs>
                <line x1="${padX}" y1="${yBot}" x2="${maxX}" y2="${yBot}" stroke="#334155" stroke-width="1"/>
                <line x1="${padX}" y1="${ySus.toFixed(1)}" x2="${maxX}" y2="${ySus.toFixed(1)}" stroke="#475569" stroke-width="0.75" stroke-dasharray="2,2"/>
                ${timeTicks}
                ${sepA}
                ${sepD}
                ${sepS}
                <path d="${fillD}" fill="url(#adsr-curve-grad)" />
                <path d="${pathD}" fill="none" stroke="#38bdf8" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
                ${dotA}
                ${dotD}
                ${dotS}
                ${dotR}
            </svg>
        `;
    },
    renderModal: (m, ctx) => {
        ADSR.onNormalize?.(m);
        const vTime = m._viewTime ?? 1.0;
        const sliderVal = Math.pow(Math.max(0, Math.min(1, (vTime - 0.02) / 9.98)), 1 / 2.5);

        const aCurve = m.aCurve || 'lin';
        const dCurve = m.dCurve || 'lin';
        const rCurve = m.rCurve || 'lin';

        const renderCurveCol = (stageKey, curVal, label) => {
            const options = ['log', 'lin', 'exp'];
            return `
                <div class="flex flex-col bg-slate-950/70 p-1 rounded-lg border border-slate-800">
                    <span class="text-[7.5px] font-bold text-center text-cyan-300 pb-0.5 border-b border-slate-800/80">${label}</span>
                    <div class="flex flex-col gap-0.5 mt-0.5">
                        ${options.map(opt => {
                            const isSel = curVal === opt;
                            return `
                                <button class="adsr-curve-stage-btn py-1 px-0.5 rounded text-[7.5px] font-bold border transition-colors ${isSel ? 'bg-blue-600 text-white border-blue-400 shadow-sm shadow-blue-500/40' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-stage="${stageKey}" data-val="${opt}">
                                    ${opt.toUpperCase()}
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        };

        return `
            <div id="adsr-curve-container" class="mb-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 flex flex-col gap-1">
                <div id="adsr-svg-wrap" class="w-full flex items-center justify-center">
                    ${ADSR.renderSvgCurve(m)}
                </div>
                <div class="flex items-center gap-1 px-1 pt-0.5 border-t border-slate-800/80">
                    <span class="text-[7.5px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap">VIEW TIME</span>
                    <input type="range" id="adsr-view-time-slider" min="0" max="1" step="0.005" value="${sliderVal.toFixed(3)}" class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400">
                    <span id="adsr-view-time-disp" class="text-[8px] font-mono text-cyan-300 font-bold min-w-[32px] text-right">${UIHelpers.formatTime(vTime)}</span>
                </div>
            </div>

            <!-- CURVE: A用 D用 R用 横並び (上から LOG, LIN, EXP) -->
            <div class="my-1">
                <label class="block text-[8px] text-slate-400 mb-0.5 uppercase tracking-wider font-semibold">CURVE</label>
                <div class="grid grid-cols-3 gap-1">
                    ${renderCurveCol('a', aCurve, 'A')}
                    ${renderCurveCol('d', dCurve, 'D')}
                    ${renderCurveCol('r', rCurve, 'R')}
                </div>
            </div>

            <!-- Sliders A, D, S, R (Vertical) -->
            <div class="flex items-center justify-around py-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1 mt-1">
                ${UIHelpers.createVSliderHTML('adsr-slider-attack', 'A', 0.0005, 2.0, 0.001, m.attack ?? 0.02, 'time', 'blue', false, UIHelpers.formatTime(m.attack ?? 0.02), 2.5)}
                ${UIHelpers.createVSliderHTML('adsr-slider-decay', 'D', 0.005, 3.0, 0.005, m.decay ?? 0.2, 'time', 'blue', false, UIHelpers.formatTime(m.decay ?? 0.2), 2.5)}
                ${UIHelpers.createVSliderHTML('adsr-slider-sustain', 'S', 0.0, 1.0, 0.01, m.sustain ?? 0.6, 'lvl', 'blue', false, (m.sustain ?? 0.6).toFixed(2), 1)}
                ${UIHelpers.createVSliderHTML('adsr-slider-release', 'R', 0.005, 5.0, 0.005, m.release ?? 0.4, 'time', 'blue', false, UIHelpers.formatTime(m.release ?? 0.4), 2.5)}
            </div>
        `;
    },
    bindEvents: (m, ctx, cb) => {
        const timeSlider = document.getElementById('adsr-view-time-slider');
        const timeDisp = document.getElementById('adsr-view-time-disp');
        const svgWrap = document.getElementById('adsr-svg-wrap');
        if (timeSlider) {
            timeSlider.addEventListener('input', (e) => {
                const raw = parseFloat(e.target.value);
                m._viewTime = 0.02 + 9.98 * Math.pow(Math.max(0, Math.min(1, raw)), 2.5);
                if (timeDisp) timeDisp.textContent = UIHelpers.formatTime(m._viewTime);
                if (svgWrap) svgWrap.innerHTML = ADSR.renderSvgCurve(m);
            });
        }

        document.querySelectorAll('.adsr-curve-stage-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stage = e.currentTarget.dataset.stage;
                const val = e.currentTarget.dataset.val;
                if (stage === 'a') m.aCurve = val;
                else if (stage === 'd') m.dCurve = val;
                else if (stage === 'r') m.rCurve = val;
                ADSR.onNormalize(m);
                if (svgWrap) svgWrap.innerHTML = ADSR.renderSvgCurve(m);
                cb();
                ctx.reRenderModal();
            });
        });

        const onSliderChange = () => {
            if (svgWrap) svgWrap.innerHTML = ADSR.renderSvgCurve(m);
            cb();
        };

        UIHelpers.bindSlider('adsr-slider-attack', UIHelpers.formatTime, v => { m.attack = v; onSliderChange(); }, 2.5, 0.0005, 2.0);
        UIHelpers.bindSlider('adsr-slider-decay', UIHelpers.formatTime, v => { m.decay = v; onSliderChange(); }, 2.5, 0.005, 3.0);
        UIHelpers.bindSlider('adsr-slider-sustain', v => v.toFixed(2), v => { m.sustain = v; onSliderChange(); }, 1, 0.0, 1.0);
        UIHelpers.bindSlider('adsr-slider-release', UIHelpers.formatTime, v => { m.release = v; onSliderChange(); }, 2.5, 0.005, 5.0);
    },
    renderGrid: (m) => `<div class="flex items-center justify-center w-full h-full pointer-events-none">${UIHelpers.renderPanelBars(
        [m.attack ?? 0.02, m.decay ?? 0.2, m.sustain ?? 0.6, m.release ?? 0.4].map((v, i) => ({
            pct: Math.max(5, Math.min(100, Math.round((v / (ADSR.MAX_STAGES[i] ?? 1)) * 100))),
            innerCls: `adsr-bar-${i}`,
            attrs: `data-adsr-bar="${i}"`,
            width: 'w-2'
        })),
        { gapCls: 'gap-1.5', theme: 'cv' }
    )}</div>`,
    updateLive: (cell, data) => {
        const stage = data?.stage ?? -1;
        const now = performance.now();
        if (!cell._adsrState) cell._adsrState = { lastStage: -1, attFlashUntil: 0, susFlashUntil: 0 };

        // Guarantee Attack lights up on note onset even if attack time is 0s
        if (data?.attackTriggered || (stage === 0 && cell._adsrState.lastStage !== 0)) {
            cell._adsrState.attFlashUntil = now + 60;
        }

        // Guarantee Sustain lights up when release begins
        if (stage === 3 && cell._adsrState.lastStage !== 3) {
            cell._adsrState.susFlashUntil = now + 60;
        }
        cell._adsrState.lastStage = stage;

        const isAttActive = (stage === 0) || (now < cell._adsrState.attFlashUntil);
        const isSusActive = (stage === 2) || (now < cell._adsrState.susFlashUntil);

        cell.querySelectorAll('[data-adsr-bar]').forEach((bar, i) => {
            let isAct = (i === stage);
            if (i === 0) isAct = isAttActive;
            else if (i === 2) isAct = isSusActive;
            bar.classList.toggle('bar-active', isAct);
        });
    }
};

export const adsrDefs = { ADSR };
