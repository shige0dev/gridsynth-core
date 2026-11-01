import { UIHelpers } from '../../ui/helpers.js?v=351';

const TRACK_COLORS = ['#38bdf8', '#f43f5e', '#34d399', '#fbbf24']; // Sky, Rose, Emerald, Amber
const TRACK_NAMES = ['BD / T1', 'SD / T2', 'CH / T3', 'OH / T4'];

export const MATRIX = {
    color: 'indigo',
    defaults: () => {
        const p1 = new Array(64).fill(0);
        const p2 = new Array(64).fill(0);
        const p3 = new Array(64).fill(0);
        const p4 = new Array(64).fill(0);
        // Default groove
        [0, 4, 8, 12].forEach(s => { p1[s] = 1; });
        [4, 12].forEach(s => { p2[s] = 1; });
        for (let s = 0; s < 16; s += 2) { p3[s] = 1; }
        [2, 6, 10, 14].forEach(s => { p4[s] = 1; });

        return {
            type: 'MATRIX',
            divisions: 16, // 16, 32, 64
            patterns: [p1, p2, p3, p4],
            modes: ['gate', 'gate', 'gate', 'gate'], // 'gate' or 'trig'
            name: 'MATRIX'
        };
    },
    ports: () => ({
        in: [{ port: 'cv_in', pin: 4, color: 'bg-yellow-400' }],
        out: [
            { port: 'out_1', pin: 7, color: 'bg-red-500' },
            { port: 'out_2', pin: 8, color: 'bg-red-500' },
            { port: 'out_3', pin: 9, color: 'bg-red-500' },
            { port: 'out_4', pin: 10, color: 'bg-red-500' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),

    // Grid Panel: Same size and container as WAVE / LUT (w-14 h-7)
    renderGrid: (m) => {
        return `
            <div class="flex items-center justify-center w-full h-full pointer-events-none">
                <div class="w-14 h-7 rounded border border-slate-600 bg-slate-950 p-[1px] relative flex items-center justify-center shadow-inner panel-bar-slot">
                    <canvas id="matrix-grid-canvas-${m.id}" class="w-full h-full block rounded-[3px] bg-slate-950" width="112" height="56"></canvas>
                </div>
            </div>
        `;
    },

    drawGridCanvas: (cvs, m, activeSlot = 0) => {
        if (!cvs) return;
        const ctx2d = cvs.getContext('2d');
        if (!ctx2d) return;

        const w = cvs.width;
        const h = cvs.height;
        ctx2d.clearRect(0, 0, w, h);

        const divs = m.divisions || 16;
        const patterns = m.patterns || [];
        const rowH = h / 4;
        const colW = w / divs;

        // Draw cells (All white)
        ctx2d.fillStyle = '#ffffff';
        for (let t = 0; t < 4; t++) {
            const pat = patterns[t] || [];
            const y = t * rowH;
            for (let s = 0; s < divs; s++) {
                if (pat[s] === 1) {
                    const x = s * colW;
                    ctx2d.fillRect(x + 0.5, y + 0.5, Math.max(1, colW - 1), Math.max(1, rowH - 1));
                }
            }
        }

        // Live playhead indicator
        if (typeof activeSlot === 'number' && activeSlot >= 0 && activeSlot < divs) {
            const liveX = activeSlot * colW + colW * 0.5;
            ctx2d.strokeStyle = '#f59e0b';
            ctx2d.lineWidth = 1.5;
            ctx2d.beginPath();
            ctx2d.moveTo(liveX, 0);
            ctx2d.lineTo(liveX, h);
            ctx2d.stroke();
        }
    },

    drawModalCanvas: (cvs, m, activeSlot = 0) => {
        if (!cvs) return;
        const ctx2d = cvs.getContext('2d');
        if (!ctx2d) return;

        const w = cvs.width;
        const h = cvs.height;
        ctx2d.clearRect(0, 0, w, h);

        const divs = m.divisions || 16;
        const patterns = m.patterns || [];
        const rowH = h / 4;
        const colW = w / divs;

        // Background track zebra
        for (let t = 0; t < 4; t++) {
            const y = t * rowH;
            ctx2d.fillStyle = t % 2 === 0 ? 'rgba(15, 23, 42, 0.6)' : 'rgba(2, 6, 23, 0.9)';
            ctx2d.fillRect(0, y, w, rowH);

            // Row divider
            ctx2d.strokeStyle = 'rgba(51, 65, 85, 0.4)';
            ctx2d.lineWidth = 1;
            ctx2d.beginPath();
            ctx2d.moveTo(0, y + rowH);
            ctx2d.lineTo(w, y + rowH);
            ctx2d.stroke();
        }

        // Vertical step dividers
        for (let s = 0; s <= divs; s++) {
            const x = s * colW;
            const isBar = (s % 4 === 0);
            ctx2d.strokeStyle = isBar ? 'rgba(71, 85, 105, 0.6)' : 'rgba(30, 41, 59, 0.3)';
            ctx2d.lineWidth = isBar ? 1.5 : 0.8;
            ctx2d.beginPath();
            ctx2d.moveTo(x, 0);
            ctx2d.lineTo(x, h);
            ctx2d.stroke();
        }

        // Render active ON cells (All pure white with crisp glow)
        ctx2d.fillStyle = '#f8fafc';
        for (let t = 0; t < 4; t++) {
            const pat = patterns[t] || [];
            const y = t * rowH;
            for (let s = 0; s < divs; s++) {
                if (pat[s] === 1) {
                    const x = s * colW;
                    ctx2d.fillRect(x + 1, y + 1.5, Math.max(1, colW - 2), Math.max(1, rowH - 3));
                }
            }
        }

        // Live playhead indicator
        if (typeof activeSlot === 'number' && activeSlot >= 0 && activeSlot < divs) {
            const liveX = activeSlot * colW + colW * 0.5;
            ctx2d.strokeStyle = '#f59e0b';
            ctx2d.lineWidth = 2.0;
            ctx2d.beginPath();
            ctx2d.moveTo(liveX, 0);
            ctx2d.lineTo(liveX, h);
            ctx2d.stroke();
        }
    },

    updateLive: (cell, data, isPlaying, modalEl, m) => {
        const slot = data?.slot ?? 0;

        const cellCanvas = cell?.querySelector(`#matrix-grid-canvas-${m.id}`) || document.getElementById(`matrix-grid-canvas-${m.id}`);
        if (cellCanvas) {
            MATRIX.drawGridCanvas(cellCanvas, m, slot);
        }

        if (modalEl) {
            const modalCanvas = modalEl.querySelector('#matrix-modal-canvas') || document.getElementById('matrix-modal-canvas');
            if (modalCanvas) {
                MATRIX.drawModalCanvas(modalCanvas, m, slot);
            }
            const stepDisp = modalEl.querySelector('#matrix-step-disp');
            if (stepDisp) {
                stepDisp.textContent = `${slot + 1} / ${m.divisions || 16}`;
            }
        }
    },

    renderModal: (m) => {
        const divs = m.divisions || 16;
        const divOptions = [16, 32, 64];

        return `
            <div class="space-y-1.5 p-1 select-none w-full">
                <!-- 1行目: Steps切り替え + 現在ステップ + CLEAR ALL -->
                <div class="flex items-center justify-between gap-1 pb-1 border-b border-slate-800">
                    <div class="flex items-center gap-1 shrink-0">
                        <span class="text-[8.5px] font-mono text-slate-400 font-bold uppercase">STEPS:</span>
                        <div class="inline-flex rounded border border-slate-700 overflow-hidden">
                            ${divOptions.map(opt => `
                                <button class="matrix-div-btn px-2.5 py-0.5 text-[9px] font-mono font-bold transition-colors ${divs === opt ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}" data-div="${opt}">
                                    ${opt}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="flex items-center gap-1">
                            <span class="text-[8px] font-mono text-slate-400 font-bold uppercase">STEP:</span>
                            <span id="matrix-step-disp" class="text-[9px] font-mono font-bold text-amber-400">1 / ${divs}</span>
                        </div>
                        <button id="matrix-clear-btn" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 border border-slate-700 text-[8px] font-mono font-bold transition-colors">
                            CLEAR ALL
                        </button>
                    </div>
                </div>

                <!-- Main Matrix Canvas: 正方形セル比率 (aspect 4:1) -->
                <div class="relative bg-slate-950 p-1 rounded-lg border border-indigo-500/40 shadow-inner w-full">
                    <canvas id="matrix-modal-canvas" class="modal-canvas-4x1 rounded bg-slate-950 touch-none cursor-pointer border border-slate-800" width="560" height="140"></canvas>
                </div>
            </div>
        `;
    },

    bindEvents: (m, ctx, cb) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;

        // Division selector buttons
        root.querySelectorAll('.matrix-div-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newDiv = parseInt(e.currentTarget.dataset.div, 10);
                m.divisions = newDiv;
                const fullId = `${ctx.currentPageId || 0}/${m.id}`;
                const inst = ctx.synth?.modules?.[fullId] || ctx.synth?.modules?.[m.id];
                if (inst?.nodes?.w?.port) {
                    inst.nodes.w.port.postMessage({ type: 'SET_DIVISIONS', value: newDiv });
                }
                ctx.reRenderModal();
                ctx.reRenderGrid?.();
                cb();
            });
        });

        // Mode toggles (GATE / TRIG)
        root.querySelectorAll('.matrix-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const t = parseInt(e.currentTarget.dataset.track, 10);
                if (!Array.isArray(m.modes)) m.modes = ['gate', 'gate', 'gate', 'gate'];
                m.modes[t] = m.modes[t] === 'trig' ? 'gate' : 'trig';
                const fullId = `${ctx.currentPageId || 0}/${m.id}`;
                const inst = ctx.synth?.modules?.[fullId] || ctx.synth?.modules?.[m.id];
                if (inst?.nodes?.w?.port) {
                    inst.nodes.w.port.postMessage({ type: 'SET_MODES', modes: m.modes });
                }
                ctx.reRenderModal();
                cb();
            });
        });

        // Clear all button
        root.querySelector('#matrix-clear-btn')?.addEventListener('click', () => {
            m.patterns = [
                new Array(64).fill(0),
                new Array(64).fill(0),
                new Array(64).fill(0),
                new Array(64).fill(0)
            ];
            const fullId = `${ctx.currentPageId || 0}/${m.id}`;
            const inst = ctx.synth?.modules?.[fullId] || ctx.synth?.modules?.[m.id];
            if (inst?.nodes?.w?.port) {
                inst.nodes.w.port.postMessage({ type: 'SET_PATTERNS', patterns: m.patterns });
            }
            ctx.reRenderModal();
            ctx.reRenderGrid?.();
            cb();
        });

        // Canvas touch & drag grid toggle
        const canvas = root.querySelector('#matrix-modal-canvas');
        if (canvas) {
            let isDragging = false;
            let dragPaintValue = 1;
            let lastCellKey = '';

            const toggleCellAtPointer = (e, isFirstTap = false) => {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

                const divs = m.divisions || 16;
                const slot = Math.max(0, Math.min(divs - 1, Math.floor((x / rect.width) * divs)));
                const track = Math.max(0, Math.min(3, Math.floor((y / rect.height) * 4)));
                const key = `${track}:${slot}`;

                if (key === lastCellKey && !isFirstTap) return;
                lastCellKey = key;

                if (!Array.isArray(m.patterns) || m.patterns.length !== 4) {
                    m.patterns = [new Array(64).fill(0), new Array(64).fill(0), new Array(64).fill(0), new Array(64).fill(0)];
                }

                if (isFirstTap) {
                    dragPaintValue = m.patterns[track][slot] ? 0 : 1;
                }
                m.patterns[track][slot] = dragPaintValue;

                const fullId = `${ctx.currentPageId || 0}/${m.id}`;
                const inst = ctx.synth?.modules?.[fullId] || ctx.synth?.modules?.[m.id];
                if (inst?.nodes?.w?.port) {
                    inst.nodes.w.port.postMessage({
                        type: 'SET_CELL',
                        track,
                        step: slot,
                        value: dragPaintValue
                    });
                }
                MATRIX.drawModalCanvas(canvas, m, inst?.read?.()?.slot ?? 0);
                ctx.reRenderGrid?.();
                cb();
            };

            canvas.addEventListener('pointerdown', (e) => {
                isDragging = true;
                canvas.setPointerCapture(e.pointerId);
                toggleCellAtPointer(e, true);
            });

            canvas.addEventListener('pointermove', (e) => {
                if (!isDragging) return;
                toggleCellAtPointer(e, false);
            });

            const stopDrag = (e) => {
                if (isDragging) {
                    isDragging = false;
                    lastCellKey = '';
                    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
                }
            };

            canvas.addEventListener('pointerup', stopDrag);
            canvas.addEventListener('pointercancel', stopDrag);

            // Initial render of modal canvas
            MATRIX.drawModalCanvas(canvas, m, 0);
        }
    }
};

export const matrixDefs = {
    MATRIX
};
export default matrixDefs;

