import { UIHelpers } from '../../ui/helpers.js';

export const TILT = {
    color: 'teal',
    defaults: () => ({
        type: 'TILT',
        smooth: 0.7,
        tareX: 0,
        tareY: 0,
        tareZ: 0
    }),
    ports: () => ({
        in: [],
        out: [
            { port: 'x_out', pin: 8, color: 'bg-yellow-400' },
            { port: 'y_out', pin: 9, color: 'bg-yellow-400' },
            { port: 'z_out', pin: 10, color: 'bg-yellow-400' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),

    renderGrid: (m) => {
        return `
            <div class="flex flex-col items-center justify-center w-full h-full pointer-events-none select-none">
                <div class="flex items-center justify-center gap-1.5 my-auto">
                    ${['x', 'y', 'z'].map(ax => `
                        <div class="flex flex-col items-center gap-0.5">
                            <div class="w-2.5 h-7 rounded-xs p-[1px] border border-slate-600 bg-slate-950/40 relative panel-bar-slot flex flex-col justify-end">
                                <div class="w-full tilt-bar-${ax} sensor-bar-${ax} bg-gradient-to-t from-teal-500 to-cyan-300 rounded-xs transition-all duration-75" style="height: 50%;"></div>
                            </div>
                            <span class="font-mono text-[6.5px] font-bold text-slate-400 leading-none uppercase">${ax}</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    },

    renderModal: (m) => {
        const isTared = Boolean(m.tareX || m.tareY || m.tareZ);

        return `
            <div class="flex flex-col gap-2.5 p-1 select-none text-[9px] w-[164px] mx-auto">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] font-mono font-bold text-teal-300 tracking-wider">3-AXIS TILT</span>
                    <span id="tilt-modal-status" class="px-1.5 py-0.2 rounded text-[6.5px] font-mono font-bold bg-slate-900 text-slate-500 border border-slate-800">NO SENSOR</span>
                </div>

                <!-- Live Values (Simple 3 columns without nested border frames) -->
                <div class="grid grid-cols-3 gap-2 py-1 select-none text-center">
                    ${['x', 'y', 'z'].map(ax => `
                        <div class="flex flex-col items-center justify-center">
                            <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">${ax}</span>
                            <span id="tilt-modal-val-${ax}" class="text-[14px] font-mono font-extrabold text-teal-300 tracking-tight leading-none">+0.00</span>
                        </div>
                    `).join('')}
                </div>

                <!-- Zero Point Calibration (Tare / Reset) -->
                <div class="space-y-1 pt-1.5 border-t border-slate-800/80">
                    <div class="flex justify-between items-center text-[7px] text-slate-400">
                        <span class="font-bold uppercase tracking-wider font-mono">ZERO REF</span>
                        <span class="font-mono text-[6.5px] px-1 py-0.2 rounded ${isTared ? 'bg-amber-950/80 text-amber-300 border border-amber-500/50' : 'bg-slate-900 text-slate-500 border border-slate-800'}">${isTared ? 'CALIBRATED' : 'DEFAULT'}</span>
                    </div>
                    <div class="flex gap-1">
                        <button id="tilt-tare-btn" class="flex-1 py-1 rounded bg-slate-900 hover:bg-teal-950/80 text-teal-300 border border-teal-500/60 font-bold text-[7.5px] transition active:scale-95 shadow-sm font-mono tracking-wider">
                            CALIBRATE
                        </button>
                        ${isTared ? `
                            <button id="tilt-reset-tare-btn" class="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold text-[7.5px] transition active:scale-95">
                                DEFAULT
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>`;
    },

    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;

        // Tare button (sets current tilt as 0 reference)
        root.querySelector('#tilt-tare-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const inst = ctx.synth?.modules?.[`${ctx.currentPageId}/${m.id}`] || ctx.synth?.modules?.[m.id];
            if (inst?.getRaw) {
                const raw = inst.getRaw();
                m.tareX = raw.x;
                m.tareY = raw.y;
                m.tareZ = raw.z;
                if (ctx.showToast) ctx.showToast('傾きをキャリブレーションしました');
                ctx.reRenderModal();
                onChange();
            }
        });

        // Reset Tare button (reverts back to flat horizontal on desk)
        root.querySelector('#tilt-reset-tare-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            m.tareX = 0;
            m.tareY = 0;
            m.tareZ = 0;
            if (ctx.showToast) ctx.showToast('初期状態（DEFAULT）に戻しました');
            ctx.reRenderModal();
            onChange();
        });
    },

    updateLive: (cell, data, isPlaying, targetModal, m) => {
        if (!data) return;
        const { x = 0, y = 0, z = 0, active = false } = data;

        // Update cell standardized bars
        if (cell) {
            const vals = { x, y, z };
            ['x', 'y', 'z'].forEach(ax => {
                const bar = cell.querySelector(`.tilt-bar-${ax}`) || cell.querySelector(`.sensor-bar-${ax}`);
                if (!bar) return;
                const v = Math.max(-1, Math.min(1, vals[ax]));
                const pct = Math.max(0, Math.min(100, Math.round(((v + 1) / 2) * 100)));
                bar.style.height = `${pct}%`;
            });
        }

        // Update target modal if open
        if (targetModal) {
            const statusEl = targetModal.querySelector('#tilt-modal-status') || targetModal.querySelector('#sensor-modal-status');
            if (statusEl) {
                if (active) {
                    statusEl.textContent = 'ACTIVE';
                    statusEl.className = 'px-1.5 py-0.2 rounded text-[6.5px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50';
                } else {
                    statusEl.textContent = 'NO SENSOR';
                    statusEl.className = 'px-1.5 py-0.2 rounded text-[6.5px] font-mono font-bold bg-slate-900 text-slate-500 border border-slate-800';
                }
            }

            const vals = { x, y, z };
            ['x', 'y', 'z'].forEach(ax => {
                const valEl = targetModal.querySelector(`#tilt-modal-val-${ax}`) || targetModal.querySelector(`#sensor-modal-val-${ax}`);
                if (valEl) {
                    const v = vals[ax];
                    valEl.textContent = (v >= 0 ? '+' : '') + v.toFixed(2);
                }
            });
        }
    }
};

export const SENSOR = TILT;
export const SNS = TILT;
export const tiltDefs = { TILT, SENSOR, SNS };
