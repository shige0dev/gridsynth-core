import { UIHelpers } from '../../ui/helpers.js';

export const FMx3 = {
    color: 'cyan',
    ALGORITHMS: [
        { id: 1, label: '1: 3➔2➔1', name: 'CASCADE', desc: 'Op3 ➔ Op2 ➔ Op1 ➔ OUT (直列FM/金属音/複雑倍音)' },
        { id: 2, label: '2: (3+2)➔1', name: 'DUAL MOD', desc: '(Op3 + Op2) ➔ Op1 ➔ OUT (並列変調/王道パーカッション)' },
        { id: 3, label: '3: 3+(2➔1)', name: 'FM+LAYER', desc: 'Op3 + (Op2 ➔ Op1) ➔ OUT (FM＋ノイズ/スネア/アタック直足し)' }
    ],
    defaults: () => ({
        type: 'FMx3',
        algorithm: 1,
        rootMidi: 48,
        op1: { ratio: 1.0, level: 0.85, attack: 0.005, decay: 0.4, sustain: 0.0, release: 0.1, aCurve: 'exp', dCurve: 'exp', rCurve: 'exp' },
        op2: { ratio: 2.0, level: 1.5, attack: 0.005, decay: 0.15, sustain: 0.0, release: 0.05, aCurve: 'exp', dCurve: 'exp', rCurve: 'exp' },
        op3: { ratio: 3.5, level: 1.8, feedback: 0.0, wave: 'sine', attack: 0.005, decay: 0.05, sustain: 0.0, release: 0.02, aCurve: 'exp', dCurve: 'exp', rCurve: 'exp' }
    }),
    onNormalize: (m) => {
        const curveVal = (c) => c === 'log' ? 0.75 : (c === 'exp' ? -0.75 : 0.0);
        const normOp = (op, def) => {
            if (!op) op = { ...def };
            if (op.ratio === undefined) op.ratio = def.ratio;
            if (op.level === undefined) op.level = def.level;
            if (op.attack === undefined) op.attack = def.attack;
            if (op.decay === undefined) op.decay = def.decay;
            if (op.sustain === undefined) op.sustain = def.sustain;
            if (op.release === undefined) op.release = def.release;
            if (!op.aCurve) op.aCurve = op.curve || 'exp';
            if (!op.dCurve) op.dCurve = op.curve || 'exp';
            if (!op.rCurve) op.rCurve = op.curve || 'exp';
            op.attackCurve = curveVal(op.aCurve);
            op.decayCurve = curveVal(op.dCurve);
            op.releaseCurve = curveVal(op.rCurve);
            return op;
        };
        m.op1 = normOp(m.op1, { ratio: 1.0, level: 0.85, attack: 0.005, decay: 0.4, sustain: 0.0, release: 0.1, aCurve: 'exp', dCurve: 'exp', rCurve: 'exp' });
        m.op2 = normOp(m.op2, { ratio: 2.0, level: 1.5, attack: 0.005, decay: 0.15, sustain: 0.0, release: 0.05, aCurve: 'exp', dCurve: 'exp', rCurve: 'exp' });
        m.op3 = normOp(m.op3, { ratio: 3.5, level: 1.8, feedback: 0.0, wave: 'sine', attack: 0.005, decay: 0.05, sustain: 0.0, release: 0.02, aCurve: 'exp', dCurve: 'exp', rCurve: 'exp' });
        if (m.algorithm === undefined) m.algorithm = 1;
        else m.algorithm = Math.max(1, Math.min(3, Math.round(m.algorithm)));
        if (m.rootMidi === undefined) m.rootMidi = 48;
    },
    ports: () => ({
        in: [
            { port: 'gate_in', color: 'bg-orange-500' },
            { port: 'pitch_in', color: 'bg-yellow-400' }
        ],
        out: [
            { port: 'wave_out', color: 'bg-blue-500' }
        ]
    }),
    renderGrid: (m, ctx) => {
        const op1 = m.op1 || { ratio: 1.0 };
        const op2 = m.op2 || { ratio: 2.0 };
        const op3 = m.op3 || { ratio: 3.5, wave: 'sine' };
        const isNz = op3.wave === 'noise';
        const alg = m.algorithm || 1;
        const rootM = m.rootMidi || 48;
        const noteStr = UIHelpers.midiToNoteName(rootM);
        const isPitchPatched = ctx?.patched?.has('pitch_in') || ctx?.patched?.has('cv_in');

        return `
            <div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-cyan-300">
                <div class="flex items-center gap-1">
                    <span class="text-[7.5px] font-bold uppercase tracking-wider text-slate-400">FM x3</span>
                    <span class="px-1 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40 text-[7px] font-mono font-bold text-cyan-300">A${alg}</span>
                </div>
                <span class="text-[12px] font-mono font-bold text-white tracking-tight">${isPitchPatched ? 'EXT CV' : noteStr}</span>
                <div class="flex items-center gap-0.5 text-[7px] font-mono text-cyan-400/90">
                    <span>${Number(op1.ratio).toFixed(1)}</span>
                    <span class="text-slate-600">:</span>
                    <span>${Number(op2.ratio).toFixed(1)}</span>
                    <span class="text-slate-600">:</span>
                    <span class="${isNz ? 'text-amber-400 font-bold' : ''}">${isNz ? 'NZ' : Number(op3.ratio).toFixed(1)}</span>
                </div>
            </div>`;
    },
    renderModal: (m, ctx) => {
        FMx3.onNormalize?.(m);
        const curAlg = m.algorithm || 1;
        const algs = FMx3.ALGORITHMS;
        const curAlgInfo = algs.find(a => a.id === curAlg) || algs[0];

        const isNz = m.op3.wave === 'noise';
        const isPitchPatched = ctx?.patched?.has('pitch_in') || ctx?.patched?.has('cv_in');
        const rootM = m.rootMidi || 48;
        const rootName = UIHelpers.midiToNoteName(rootM);

        const renderMiniVSlider = (id, label, min, max, step, val, accentColor, formattedDisp, power = 1) => {
            let sMin = min, sMax = max, sStep = step, sVal = val;
            if (power && power !== 1) {
                sMin = 0; sMax = 1; sStep = 0.001;
                const norm = Math.max(0, Math.min(1, (val - min) / (max - min)));
                sVal = Math.pow(norm, 1 / power);
            }
            return `
                <div class="flex flex-col items-center justify-between h-full min-w-[17px] flex-1">
                    <span class="text-[6.5px] font-bold text-slate-400 uppercase tracking-tight leading-none">${label}</span>
                    <span id="${id}-disp" class="text-[7.5px] font-mono font-bold text-${accentColor}-300 cursor-ns-resize touch-none select-none hover:bg-slate-800/80 px-0.5 rounded leading-none py-0.5" title="上下ドラッグで微調整">${formattedDisp}</span>
                    <div class="flex items-center justify-center my-0.5">
                        <input type="range" id="${id}" min="${sMin}" max="${sMax}" step="${sStep}" value="${sVal}" class="native-vslider-sm accent-${accentColor}-400">
                    </div>
                </div>
            `;
        };

        const renderMiniPlaceholder = (label = 'FB') => `
            <div class="flex flex-col items-center justify-between h-full min-w-[17px] flex-1 opacity-20 pointer-events-none">
                <span class="text-[6.5px] font-bold text-slate-600 uppercase tracking-tight leading-none">${label}</span>
                <span class="text-[7.5px] font-mono text-slate-600 leading-none py-0.5">—</span>
                <div class="w-[14px] h-[48px] flex items-center justify-center my-0.5">
                    <div class="w-[1px] h-full bg-slate-800/60"></div>
                </div>
            </div>
        `;

        const renderCurveBlock = (opNum, opData, accentColor) => {
            const stages = [
                { key: 'a', label: 'A', cur: opData.aCurve || 'exp' },
                { key: 'd', label: 'D', cur: opData.dCurve || 'exp' },
                { key: 'r', label: 'R', cur: opData.rCurve || 'exp' }
            ];
            const opts = ['log', 'lin', 'exp'];

            return `
                <div class="flex flex-col justify-between h-full pl-1 border-l border-slate-800/80 shrink-0">
                    <span class="text-[6px] font-bold text-slate-400 uppercase tracking-tight text-center leading-none">CURVE</span>
                    <div class="flex items-center gap-1">
                        ${stages.map(st => `
                            <div class="flex flex-col items-center gap-0.5">
                                <span class="text-[6px] font-bold text-${accentColor}-300 leading-none">${st.label}</span>
                                <div class="flex flex-col gap-0.5">
                                    ${opts.map(opt => {
                                        const isSel = st.cur === opt;
                                        return `
                                            <button class="fm-curve-btn w-[21px] h-[13px] rounded text-[6px] font-bold border transition-colors leading-none flex items-center justify-center ${isSel ? `bg-${accentColor}-600 text-white border-${accentColor}-400 shadow-sm shadow-${accentColor}-500/40` : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-op="${opNum}" data-stage="${st.key}" data-val="${opt}">
                                                ${opt.toUpperCase()}
                                            </button>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        };

        return `
            <div class="space-y-1.5 select-none">
                <!-- Top: Algorithm Selector -->
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[8px] text-slate-400 uppercase font-bold tracking-wider">ALGORITHM</span>
                        <span class="text-[7.5px] font-mono text-cyan-300 font-bold truncate max-w-[200px]" id="fm-alg-desc">${curAlgInfo.desc}</span>
                    </div>
                    <div class="grid grid-cols-3 gap-1">
                        ${algs.map(a => {
                            const isSel = curAlg === a.id;
                            return `
                                <button class="fm-alg-btn py-1 px-0.5 rounded text-[7.5px] font-bold border transition-all ${isSel ? 'bg-cyan-600 text-white border-cyan-400 shadow-sm shadow-cyan-500/50' : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'}" data-val="${a.id}">
                                    ${a.label}
                                </button>`;
                        }).join('')}
                    </div>
                </div>

                <!-- Operator Console with Vertical Root Note on Right -->
                <div class="flex gap-1.5 items-stretch">
                    <!-- Operators (Top-to-Bottom: OP3, OP2, OP1) -->
                    <div class="flex flex-col gap-1.5 flex-1 min-w-0">
                        <!-- OP 3 Row (Modulator 2) -->
                        <div class="flex items-center gap-1 p-1 rounded-lg bg-slate-950/70 border border-slate-800/80 h-[74px]">
                            <div class="flex flex-col items-center justify-between h-full w-[38px] shrink-0 pr-1 border-r border-slate-800/80">
                                <div class="flex flex-col items-center">
                                    <span class="text-[8px] font-bold text-amber-300 uppercase tracking-tight leading-none">OP 3</span>
                                    <span class="text-[6.5px] font-mono text-slate-400 leading-tight">MOD 2</span>
                                </div>
                                <button id="fm-op3-wave-btn" class="w-full py-0.5 rounded text-[6.5px] font-bold border transition-colors ${isNz ? 'bg-amber-500 text-slate-950 border-amber-300 font-extrabold shadow-sm' : 'bg-slate-900 text-slate-300 border-slate-700'}" title="波形切替 (Sine / White Noise)">
                                    ${isNz ? 'NOISE' : 'SINE'}
                                </button>
                            </div>

                            <div class="flex items-center justify-around flex-1 h-full gap-0.5">
                                ${renderMiniVSlider('fm-op3-level', 'LEVEL', 0.0, 5.0, 0.05, m.op3.level, 'amber', Number(m.op3.level).toFixed(2))}
                                ${renderMiniVSlider('fm-op3-ratio', 'RATIO', 0.25, 16.0, 0.25, m.op3.ratio, 'amber', Number(m.op3.ratio).toFixed(2))}
                                ${renderMiniVSlider('fm-op3-fb', 'FB', 0.0, 1.0, 0.02, m.op3.feedback || 0, 'amber', Math.round((m.op3.feedback || 0) * 100) + '%')}
                                <div class="w-[1px] h-[52px] bg-slate-800/60 mx-0.5 shrink-0"></div>
                                ${renderMiniVSlider('fm-op3-a', 'A', 0.0005, 2.0, 0.001, m.op3.attack, 'amber', UIHelpers.formatTime(m.op3.attack), 2.5)}
                                ${renderMiniVSlider('fm-op3-d', 'D', 0.005, 3.0, 0.005, m.op3.decay, 'amber', UIHelpers.formatTime(m.op3.decay), 2.5)}
                                ${renderMiniVSlider('fm-op3-s', 'S', 0.0, 1.0, 0.01, m.op3.sustain, 'amber', Number(m.op3.sustain).toFixed(2))}
                                ${renderMiniVSlider('fm-op3-r', 'R', 0.005, 5.0, 0.005, m.op3.release, 'amber', UIHelpers.formatTime(m.op3.release), 2.5)}
                            </div>

                            ${renderCurveBlock(3, m.op3, 'amber')}
                        </div>

                        <!-- OP 2 Row (Modulator 1) -->
                        <div class="flex items-center gap-1 p-1 rounded-lg bg-slate-950/70 border border-slate-800/80 h-[74px]">
                            <div class="flex flex-col items-center justify-center h-full w-[38px] shrink-0 pr-1 border-r border-slate-800/80">
                                <span class="text-[8px] font-bold text-purple-300 uppercase tracking-tight leading-none">OP 2</span>
                                <span class="text-[6.5px] font-mono text-slate-400 leading-tight">MOD 1</span>
                            </div>

                            <div class="flex items-center justify-around flex-1 h-full gap-0.5">
                                ${renderMiniVSlider('fm-op2-level', 'LEVEL', 0.0, 5.0, 0.05, m.op2.level, 'purple', Number(m.op2.level).toFixed(2))}
                                ${renderMiniVSlider('fm-op2-ratio', 'RATIO', 0.25, 16.0, 0.25, m.op2.ratio, 'purple', Number(m.op2.ratio).toFixed(2))}
                                ${renderMiniPlaceholder('FB')}
                                <div class="w-[1px] h-[52px] bg-slate-800/60 mx-0.5 shrink-0"></div>
                                ${renderMiniVSlider('fm-op2-a', 'A', 0.0005, 2.0, 0.001, m.op2.attack, 'purple', UIHelpers.formatTime(m.op2.attack), 2.5)}
                                ${renderMiniVSlider('fm-op2-d', 'D', 0.005, 3.0, 0.005, m.op2.decay, 'purple', UIHelpers.formatTime(m.op2.decay), 2.5)}
                                ${renderMiniVSlider('fm-op2-s', 'S', 0.0, 1.0, 0.01, m.op2.sustain, 'purple', Number(m.op2.sustain).toFixed(2))}
                                ${renderMiniVSlider('fm-op2-r', 'R', 0.005, 5.0, 0.005, m.op2.release, 'purple', UIHelpers.formatTime(m.op2.release), 2.5)}
                            </div>

                            ${renderCurveBlock(2, m.op2, 'purple')}
                        </div>

                        <!-- OP 1 Row (Carrier) -->
                        <div class="flex items-center gap-1 p-1 rounded-lg bg-slate-950/70 border border-slate-800/80 h-[74px]">
                            <div class="flex flex-col items-center justify-center h-full w-[38px] shrink-0 pr-1 border-r border-slate-800/80">
                                <span class="text-[8px] font-bold text-cyan-300 uppercase tracking-tight leading-none">OP 1</span>
                                <span class="text-[6.5px] font-mono text-slate-400 leading-tight">CARRIER</span>
                            </div>

                            <div class="flex items-center justify-around flex-1 h-full gap-0.5">
                                ${renderMiniVSlider('fm-op1-level', 'LEVEL', 0.0, 1.0, 0.01, m.op1.level, 'cyan', Number(m.op1.level).toFixed(2))}
                                ${renderMiniVSlider('fm-op1-ratio', 'RATIO', 0.25, 16.0, 0.25, m.op1.ratio, 'cyan', Number(m.op1.ratio).toFixed(2))}
                                ${renderMiniPlaceholder('FB')}
                                <div class="w-[1px] h-[52px] bg-slate-800/60 mx-0.5 shrink-0"></div>
                                ${renderMiniVSlider('fm-op1-a', 'A', 0.0005, 2.0, 0.001, m.op1.attack, 'cyan', UIHelpers.formatTime(m.op1.attack), 2.5)}
                                ${renderMiniVSlider('fm-op1-d', 'D', 0.005, 3.0, 0.005, m.op1.decay, 'cyan', UIHelpers.formatTime(m.op1.decay), 2.5)}
                                ${renderMiniVSlider('fm-op1-s', 'S', 0.0, 1.0, 0.01, m.op1.sustain, 'cyan', Number(m.op1.sustain).toFixed(2))}
                                ${renderMiniVSlider('fm-op1-r', 'R', 0.005, 5.0, 0.005, m.op1.release, 'cyan', UIHelpers.formatTime(m.op1.release), 2.5)}
                            </div>

                            ${renderCurveBlock(1, m.op1, 'cyan')}
                        </div>
                    </div>

                    <!-- Right Column: Vertical ROOT NOTE Slider (Disabled when pitch_in is patched) -->
                    <div class="flex flex-col items-center justify-between p-1 bg-slate-950/70 border border-slate-800/80 rounded-lg w-[38px] shrink-0 ${isPitchPatched ? 'opacity-30 pointer-events-none' : ''}">
                        <div class="flex flex-col items-center">
                            <span class="text-[7px] font-bold text-yellow-400 uppercase tracking-tight text-center leading-tight">ROOT</span>
                            <span class="text-[6px] font-mono text-slate-400 leading-tight">NOTE</span>
                        </div>
                        <span id="fm-root-slider-disp" class="text-[8.5px] font-mono font-bold text-yellow-300 cursor-ns-resize touch-none select-none hover:bg-slate-800/80 px-0.5 rounded leading-none py-0.5" title="上下ドラッグで微調整">${isPitchPatched ? 'EXT' : rootName}</span>
                        <div class="flex items-center justify-center flex-1 my-1">
                            <input type="range" id="fm-root-slider" min="24" max="72" step="1" value="${rootM}" class="native-vslider accent-yellow-400" ${isPitchPatched ? 'disabled' : ''} style="height: 140px;">
                        </div>
                        <span class="text-[6.5px] font-mono text-slate-500 uppercase text-center leading-tight">${isPitchPatched ? 'EXT CV' : '1V/OCT'}</span>
                    </div>
                </div>
            </div>
        `;
    },
    bindEvents: (m, ctx, cb) => {
        // Algorithm buttons
        document.querySelectorAll('.fm-alg-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.algorithm = parseInt(e.currentTarget.dataset.val, 10) || 1;
                cb();
                ctx.reRenderModal();
            });
        });

        // Op3 Noise toggle
        document.getElementById('fm-op3-wave-btn')?.addEventListener('click', () => {
            if (!m.op3) m.op3 = {};
            m.op3.wave = (m.op3.wave === 'noise') ? 'sine' : 'noise';
            cb();
            ctx.reRenderModal();
        });

        // Curve buttons
        document.querySelectorAll('.fm-curve-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const opNum = e.currentTarget.dataset.op;
                const stage = e.currentTarget.dataset.stage;
                const val = e.currentTarget.dataset.val;
                const opKey = `op${opNum}`;
                if (!m[opKey]) m[opKey] = {};
                m[opKey][`${stage}Curve`] = val;
                cb();
                ctx.reRenderModal();
            });
        });

        // Bind Operator Sliders
        [1, 2, 3].forEach(opNum => {
            const opKey = `op${opNum}`;
            const isCarrier = (opNum === 1);

            // Level / Index
            UIHelpers.bindSlider(`fm-op${opNum}-level`, v => v.toFixed(2), v => {
                m[opKey].level = v;
                cb();
            }, 1, 0.0, isCarrier ? 1.0 : 5.0);

            // Ratio
            UIHelpers.bindSlider(`fm-op${opNum}-ratio`, v => v.toFixed(2), v => {
                m[opKey].ratio = v;
                cb();
            }, 1, 0.25, 16.0);

            // ADSR (A, D, S, R)
            UIHelpers.bindSlider(`fm-op${opNum}-a`, UIHelpers.formatTime, v => {
                m[opKey].attack = v;
                cb();
            }, 2.5, 0.0005, 2.0);

            UIHelpers.bindSlider(`fm-op${opNum}-d`, UIHelpers.formatTime, v => {
                m[opKey].decay = v;
                cb();
            }, 2.5, 0.005, 3.0);

            UIHelpers.bindSlider(`fm-op${opNum}-s`, v => v.toFixed(2), v => {
                m[opKey].sustain = v;
                cb();
            }, 1, 0.0, 1.0);

            UIHelpers.bindSlider(`fm-op${opNum}-r`, UIHelpers.formatTime, v => {
                m[opKey].release = v;
                cb();
            }, 2.5, 0.005, 5.0);
        });

        // Op3 Feedback
        UIHelpers.bindSlider('fm-op3-fb', v => Math.round(v * 100) + '%', v => {
            if (!m.op3) m.op3 = {};
            m.op3.feedback = v;
            cb();
        }, 1, 0.0, 1.0);

        // Vertical Root Midi Slider
        UIHelpers.bindSlider('fm-root-slider', UIHelpers.midiToNoteName, v => {
            m.rootMidi = Math.round(v);
            cb();
        }, 1, 24, 72);
    }
};

export const FMCORE = {
    color: 'cyan',
    defaults: () => ({
        type: 'FMCORE',
        level: 0.85,
        ratio: 1.0,
        fine: 0,
        index: 1.0,
        feedback: 0.0,
        rootMidi: 48
    }),
    onNormalize: (m) => {
        if (m.level === undefined) m.level = 0.85;
        if (m.ratio === undefined) m.ratio = 1.0;
        if (m.fine === undefined) m.fine = 0;
        if (m.index === undefined) m.index = 1.0;
        if (m.feedback === undefined) m.feedback = 0.0;
        if (m.rootMidi === undefined) m.rootMidi = 48;
    },
    ports: () => ({
        in: [
            { port: 'pitch_in', color: 'bg-yellow-400' },
            { port: 'mod_in', color: 'bg-blue-500' },
            { port: 'index_cv', color: 'bg-yellow-400' }
        ],
        out: [
            { port: 'wave_out', color: 'bg-blue-500' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderStandardPorts(renderP, ports.in || [], ports.out || []),
    renderGrid: (m, ctx) => {
        const rootM = m.rootMidi ?? 48;
        const noteStr = UIHelpers.midiToNoteName(rootM);
        const isPitchPatched = ctx?.patched?.has('pitch_in') || ctx?.patched?.has('cv_in');
        const hasMod = ctx?.patched?.has('mod_in') || ctx?.patched?.has('wave_in');
        const ratioStr = Number(m.ratio ?? 1.0).toFixed(2);
        const idxStr = Number(m.index ?? 1.0).toFixed(1);

        return `
            <div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none text-cyan-300">
                <div class="flex items-center gap-1">
                    <span class="text-[7.5px] font-bold uppercase tracking-wider text-slate-400">FM CORE</span>
                    ${hasMod ? '<span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>' : ''}
                </div>
                <span class="text-[12px] font-mono font-bold text-white tracking-tight">${isPitchPatched ? 'EXT CV' : noteStr}</span>
                <div class="flex items-center gap-1 text-[7.5px] font-mono text-cyan-400/90">
                    <span>x${ratioStr}</span>
                    <span class="text-slate-600">|</span>
                    <span>idx:${idxStr}</span>
                </div>
            </div>`;
    },
    renderModal: (m, ctx) => {
        FMCORE.onNormalize?.(m);
        const rootM = m.rootMidi ?? 48;
        const rootName = UIHelpers.midiToNoteName(rootM);
        const isPitchPatched = ctx?.patched?.has('pitch_in') || ctx?.patched?.has('cv_in');
        const isIdxPatched = ctx?.patched?.has('index_cv') || ctx?.patched?.has('idx_cv');
        const isModPatched = ctx?.patched?.has('mod_in') || ctx?.patched?.has('wave_in');

        return `
            <div class="space-y-1.5 select-none">
                <!-- Top Info Header -->
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[8.5px] font-bold text-cyan-400 uppercase tracking-wider">PM OPERATOR</span>
                        ${isModPatched ? '<span class="px-1 py-0.2 rounded bg-cyan-950 border border-cyan-500/40 text-[6.5px] font-mono text-cyan-300 font-bold">MOD IN</span>' : ''}
                    </div>
                    <span class="text-[7.5px] font-mono text-slate-400">SINE CARRIER</span>
                </div>

                <!-- 6 Vertical Sliders: ROOT -> LEVEL -> RATIO -> INDEX -> FB -> FINE -->
                <div class="flex items-center justify-around py-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 gap-1">
                    ${UIHelpers.createVSliderHTML('fmcore-root', 'ROOT', 24, 72, 1, rootM, 'note', 'yellow', isPitchPatched, isPitchPatched ? 'EXT' : rootName)}
                    ${UIHelpers.createVSliderHTML('fmcore-level', 'LEVEL', 0.0, 1.0, 0.01, m.level ?? 0.85, 'lvl', 'cyan', false, Number(m.level ?? 0.85).toFixed(2))}
                    ${UIHelpers.createVSliderHTML('fmcore-ratio', 'RATIO', 0.25, 16.0, 0.25, m.ratio ?? 1.0, 'rat', 'cyan', false, Number(m.ratio ?? 1.0).toFixed(2))}
                    ${UIHelpers.createVSliderHTML('fmcore-index', 'INDEX', 0.0, 5.0, 0.05, m.index ?? 1.0, 'idx', 'amber', isIdxPatched, isIdxPatched ? 'EXT CV' : Number(m.index ?? 1.0).toFixed(2))}
                    ${UIHelpers.createVSliderHTML('fmcore-fb', 'FB', 0.0, 1.0, 0.01, m.feedback ?? 0.0, 'fb', 'amber', false, Math.round((m.feedback ?? 0) * 100) + '%')}
                    ${UIHelpers.createVSliderHTML('fmcore-fine', 'FINE', -50, 50, 1, m.fine ?? 0, 'cent', 'cyan', false, ((m.fine ?? 0) > 0 ? '+' : '') + Math.round(m.fine ?? 0) + 'c')}
                </div>
            </div>
        `;
    },
    bindEvents: (m, ctx, cb) => {
        UIHelpers.bindSlider('fmcore-root', UIHelpers.midiToNoteName, v => { m.rootMidi = Math.round(v); cb(); }, 1, 24, 72);
        UIHelpers.bindSlider('fmcore-level', v => v.toFixed(2), v => { m.level = v; cb(); }, 1, 0.0, 1.0);
        UIHelpers.bindSlider('fmcore-ratio', v => v.toFixed(2), v => { m.ratio = v; cb(); }, 1, 0.25, 16.0);
        UIHelpers.bindSlider('fmcore-index', v => v.toFixed(2), v => { m.index = v; cb(); }, 1, 0.0, 5.0);
        UIHelpers.bindSlider('fmcore-fb', v => Math.round(v * 100) + '%', v => { m.feedback = v; cb(); }, 1, 0.0, 1.0);
        UIHelpers.bindSlider('fmcore-fine', v => ((v > 0 ? '+' : '') + Math.round(v) + 'c'), v => { m.fine = Math.round(v); cb(); }, 1, -50, 50);
    }
};

// Aliases for backward compatibility
export const FM = FMx3;
export const FM3OP = FMx3;

export const fmDefs = {
    FMx3,
    FMCORE,
    FM,
    FM3OP
};
