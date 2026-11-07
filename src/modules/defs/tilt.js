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
        // Standardized panel bars shared with SPK, MIX, etc.
        const barHtmls = ['x', 'y', 'z'].map(ax => UIHelpers.renderPanelBars([
            {
                pct: 50,
                width: 'w-2',
                innerCls: `tilt-bar-${ax} sensor-bar-${ax} transition-all duration-75`,
                color: 'bg-gradient-to-t from-teal-500 to-cyan-300'
            }
        ], { noWrapper: true, heightCls: 'h-7' }));

        return `
            <div class="relative w-full h-full pointer-events-none select-none">
                <div class="absolute left-[5px] bottom-[16px] flex flex-col items-start leading-none pointer-events-none">
                    <span class="text-[7.5px] font-mono font-bold text-teal-400/90 tracking-tight">3-AXIS</span>
                    <span class="text-[6.5px] font-mono text-slate-500 font-semibold tracking-tighter">TILT</span>
                </div>
                <div class="absolute bottom-[14px] left-[2px] right-[2px] flex justify-between items-end pointer-events-none select-none">
                    <div class="w-2"></div>
                    <div class="w-2"></div>
                    <div class="w-2"></div>
                    ${['x', 'y', 'z'].map((ax, idx) => `
                        <div class="w-2 flex flex-col items-center gap-0.5">
                            <span class="font-mono text-[6.5px] font-bold text-slate-400 leading-none uppercase">${ax}</span>
                            ${barHtmls[idx]}
                        </div>
                    `).join('')}
                </div>
            </div>`;
    },

    renderModal: (m) => {
        const isTared = Boolean(m.tareX || m.tareY || m.tareZ);

        return `
            <div class="flex flex-col gap-2 p-1 select-none text-[9px] w-[164px] mx-auto">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] font-mono font-bold text-teal-300 tracking-wider">3-AXIS TILT</span>
                    <span id="tilt-modal-status" class="px-1.5 py-0.2 rounded text-[6.5px] font-mono font-bold bg-slate-900 text-slate-500 border border-slate-800">NO SENSOR</span>
                </div>

                <!-- Live Meters -->
                <div class="bg-slate-950/80 rounded border border-slate-800/90 p-1.5 space-y-1.5">
                    ${[
                        { id: 'x', label: 'X (ROLL)' },
                        { id: 'y', label: 'Y (PITCH)' },
                        { id: 'z', label: 'Z (VERT)' }
                    ].map(ax => `
                        <div class="space-y-0.5">
                            <div class="flex justify-between items-center text-[7.5px] font-mono leading-none">
                                <span class="text-slate-400 font-semibold">${ax.label}</span>
                                <span id="tilt-modal-val-${ax.id}" class="text-teal-300 font-bold font-mono">0.00</span>
                            </div>
                            <div class="h-2 w-full bg-slate-900 rounded-sm relative overflow-hidden border border-slate-800">
                                <div class="absolute top-0 bottom-0 left-1/2 w-[1px] bg-slate-600/80 z-10"></div>
                                <div id="tilt-modal-bar-${ax.id}" class="absolute top-0 bottom-0 bg-gradient-to-r from-teal-500 to-cyan-300 transition-all duration-75" style="left:50%; width:0%;"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Zero Point Calibration (Tare / Reset) -->
                <div class="space-y-1 pt-1 border-t border-slate-800/80">
                    <div class="flex justify-between items-center text-[7px] text-slate-400">
                        <span class="font-bold uppercase tracking-wider">ゼロ点基準</span>
                        <span class="font-mono text-[6.5px] px-1 py-0.2 rounded ${isTared ? 'bg-amber-950/80 text-amber-300 border border-amber-500/50' : 'bg-slate-900 text-slate-500 border border-slate-800'}">${isTared ? '校正中 (TARED)' : '机上水平 (DEFAULT)'}</span>
                    </div>
                    <div class="flex gap-1">
                        <button id="tilt-tare-btn" class="flex-1 py-1 rounded bg-slate-900 hover:bg-teal-950/80 text-teal-300 border border-teal-500/60 font-bold text-[7.5px] transition active:scale-95 shadow-sm">
                            現在の角度を0点にする
                        </button>
                        ${isTared ? `
                            <button id="tilt-reset-tare-btn" class="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold text-[7.5px] transition active:scale-95">
                                机上水平に戻す
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
                if (ctx.showToast) ctx.showToast('現在の角度を0点として校正しました');
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
            if (ctx.showToast) ctx.showToast('机上水平の初期状態に戻しました');
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
                    statusEl.textContent = 'LIVE 30Hz';
                    statusEl.className = 'px-1.5 py-0.2 rounded text-[6.5px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 shadow-[0_0_6px_rgba(52,211,153,0.3)]';
                } else {
                    statusEl.textContent = 'DESKTOP / NO SENSOR';
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

                const barEl = targetModal.querySelector(`#tilt-modal-bar-${ax}`) || targetModal.querySelector(`#sensor-modal-bar-${ax}`);
                if (barEl) {
                    const v = Math.max(-1, Math.min(1, vals[ax]));
                    if (v >= 0) {
                        barEl.style.left = '50%';
                        barEl.style.width = `${v * 50}%`;
                    } else {
                        barEl.style.left = `${50 - Math.abs(v) * 50}%`;
                        barEl.style.width = `${Math.abs(v) * 50}%`;
                    }
                }
            });
        }
    }
};

export const SENSOR = TILT;
export const SNS = TILT;
export const tiltDefs = { TILT, SENSOR, SNS };
