import { UIHelpers } from '../../ui/helpers.js';

const SMOOTH_PRESETS = [
    { label: 'RAW', val: 0.0, desc: '0% (無補正)' },
    { label: 'LOW', val: 0.4, desc: '40% (弱補正)' },
    { label: 'MED', val: 0.7, desc: '70% (標準・手ブレ除去)' },
    { label: 'HIGH', val: 0.9, desc: '90% (強・振動除去)' }
];

const GAIN_PRESETS = [
    { label: '0.5x', val: 0.5 },
    { label: '1.0x', val: 1.0 },
    { label: '2.0x', val: 2.0 }
];

export const SENSOR = {
    color: 'teal',
    defaults: () => ({
        type: 'SENSOR',
        smooth: 0.7,
        gain: 1.0,
        tareX: 0,
        tareY: 0,
        tareZ: 0
    }),
    ports: () => ({
        in: [],
        out: [
            { port: 'x_out', pin: 10, color: 'bg-yellow-400' },
            { port: 'y_out', pin: 11, color: 'bg-yellow-400' },
            { port: 'z_out', pin: 12, color: 'bg-yellow-400' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),

    renderGrid: (m) => {
        return `
            <div class="flex flex-col items-center justify-between w-full h-full py-1 pointer-events-none select-none">
                <div class="flex flex-col items-center leading-none">
                    <span class="font-mono text-[9px] font-bold text-teal-300 tracking-wider">SENSOR</span>
                    <span class="sensor-status-badge text-[6.5px] font-mono text-slate-500 font-semibold tracking-tighter">TILT 3-AXIS</span>
                </div>
                <div class="flex items-center justify-center gap-1.5 my-auto">
                    ${['x', 'y', 'z'].map(ax => `
                        <div class="flex flex-col items-center gap-0.5">
                            <div class="w-2.5 h-7 rounded-xs p-[1px] border border-slate-700/80 bg-slate-950/80 relative overflow-hidden flex items-center justify-center panel-bar-slot" data-sensor-slot="${ax}">
                                <div class="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-600/70 z-10"></div>
                                <div class="sensor-bar-${ax} absolute left-[1px] right-[1px] bg-gradient-to-t from-teal-500 to-cyan-300 rounded-[1px] transition-all duration-75" style="top:50%; height:0%;"></div>
                            </div>
                            <span class="font-mono text-[6.5px] font-bold text-slate-400 leading-none uppercase">${ax}</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    },

    renderModal: (m) => {
        const curSmooth = m.smooth ?? 0.7;
        const curGain = m.gain ?? 1.0;
        const isTared = (m.tareX || m.tareY || m.tareZ);

        return `
            <div class="flex flex-col gap-2 p-1 select-none text-[9px] w-[164px] mx-auto">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] font-mono font-bold text-teal-300 tracking-wider">3-AXIS TILT SENSOR</span>
                    <span id="sensor-modal-status" class="px-1.5 py-0.2 rounded text-[6.5px] font-mono font-bold bg-slate-900 text-slate-500 border border-slate-800">NO SENSOR</span>
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
                                <span id="sensor-modal-val-${ax.id}" class="text-teal-300 font-bold font-mono">0.00</span>
                            </div>
                            <div class="h-2 w-full bg-slate-900 rounded-sm relative overflow-hidden border border-slate-800">
                                <div class="absolute top-0 bottom-0 left-1/2 w-[1px] bg-slate-600/80 z-10"></div>
                                <div id="sensor-modal-bar-${ax.id}" class="absolute top-0 bottom-0 bg-gradient-to-r from-teal-500 to-cyan-300 transition-all duration-75" style="left:50%; width:0%;"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Smoothing (Low-pass filter) -->
                <div class="space-y-1">
                    <div class="flex justify-between items-center text-[7.5px]">
                        <span class="text-slate-400 font-bold uppercase tracking-wider">SMOOTH (防振フィルター)</span>
                    </div>
                    <div class="grid grid-cols-4 gap-1">
                        ${SMOOTH_PRESETS.map(p => `
                            <button class="sensor-smooth-btn py-1 rounded text-[7.5px] font-mono font-bold border transition-all ${Math.abs(curSmooth - p.val) < 0.05
                                ? 'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/50'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                            }" data-val="${p.val}" title="${p.desc}">
                                ${p.label}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Gain (Sensitivity) -->
                <div class="space-y-1">
                    <div class="flex justify-between items-center text-[7.5px]">
                        <span class="text-slate-400 font-bold uppercase tracking-wider">GAIN (感度)</span>
                    </div>
                    <div class="grid grid-cols-3 gap-1">
                        ${GAIN_PRESETS.map(g => `
                            <button class="sensor-gain-btn py-1 rounded text-[7.5px] font-mono font-bold border transition-all ${Math.abs(curGain - g.val) < 0.05
                                ? 'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/50'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                            }" data-val="${g.val}">
                                ${g.label}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Tare / Calibration -->
                <div class="space-y-1 pt-1 border-t border-slate-800/80">
                    <div class="flex justify-between items-center text-[7px] text-slate-400">
                        <span>ゼロ点校正 (自転車・水平基準)</span>
                        <span class="font-mono text-[6.5px] ${isTared ? 'text-amber-400 font-bold' : 'text-slate-600'}">${isTared ? 'TARED' : 'DEFAULT'}</span>
                    </div>
                    <div class="flex gap-1">
                        <button id="sensor-tare-btn" class="flex-1 py-1 rounded bg-slate-900 hover:bg-teal-950/80 text-teal-300 border border-teal-500/60 font-bold text-[7.5px] transition active:scale-95 shadow-sm">
                            SET TARE (0点校正)
                        </button>
                        <button id="sensor-reset-tare-btn" class="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 font-bold text-[7.5px] transition active:scale-95 ${!isTared ? 'opacity-40 cursor-not-allowed' : ''}">
                            RESET
                        </button>
                    </div>
                </div>

                <!-- iOS Safari Permission button -->
                <button id="sensor-ios-perm-btn" class="w-full py-1 rounded bg-slate-900/90 hover:bg-slate-800 text-slate-400 border border-slate-800 text-[7px] font-mono font-bold transition">
                    ENABLE SENSOR (IOS PERMISSION)
                </button>
            </div>`;
    },

    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;

        // Smooth preset buttons
        root.querySelectorAll('.sensor-smooth-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const val = parseFloat(btn.dataset.val);
                if (!isNaN(val) && m.smooth !== val) {
                    m.smooth = val;
                    ctx.reRenderModal();
                    onChange();
                }
            });
        });

        // Gain preset buttons
        root.querySelectorAll('.sensor-gain-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const val = parseFloat(btn.dataset.val);
                if (!isNaN(val) && m.gain !== val) {
                    m.gain = val;
                    ctx.reRenderModal();
                    onChange();
                }
            });
        });

        // Tare button
        root.querySelector('#sensor-tare-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const inst = ctx.synth?.modules?.[`${ctx.currentPageId}/${m.id}`] || ctx.synth?.modules?.[m.id];
            if (inst?.getRaw) {
                const raw = inst.getRaw();
                m.tareX = raw.x;
                m.tareY = raw.y;
                m.tareZ = raw.z;
                if (ctx.showToast) ctx.showToast('傾きゼロ点を現在位置に校正しました');
                ctx.reRenderModal();
                onChange();
            }
        });

        // Reset Tare button
        root.querySelector('#sensor-reset-tare-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            m.tareX = 0;
            m.tareY = 0;
            m.tareZ = 0;
            if (ctx.showToast) ctx.showToast('ゼロ点校正を初期状態にリセットしました');
            ctx.reRenderModal();
            onChange();
        });

        // iOS Permission button
        root.querySelector('#sensor-ios-perm-btn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
                try {
                    const res = await DeviceMotionEvent.requestPermission();
                    if (res === 'granted') {
                        if (ctx.showToast) ctx.showToast('センサー権限を許可しました');
                    } else {
                        if (ctx.showToast) ctx.showToast('センサー権限が拒否されました');
                    }
                } catch (err) {
                    if (ctx.showToast) ctx.showToast(`権限要求エラー: ${err.message}`);
                }
            } else {
                if (ctx.showToast) ctx.showToast('このブラウザでは権限要求は不要、または非対応です');
            }
        });
    },

    updateLive: (cell, data, isPlaying, targetModal, m) => {
        if (!data) return;
        const { x = 0, y = 0, z = 0, active = false } = data;

        // Update cell
        if (cell) {
            const badge = cell.querySelector('.sensor-status-badge');
            if (badge) {
                if (active) {
                    badge.textContent = 'ACTIVE';
                    badge.className = 'sensor-status-badge text-[6.5px] font-mono text-emerald-400 font-semibold tracking-tighter';
                } else {
                    badge.textContent = 'NO SENSOR';
                    badge.className = 'sensor-status-badge text-[6.5px] font-mono text-slate-500 font-semibold tracking-tighter';
                }
            }

            const vals = { x, y, z };
            ['x', 'y', 'z'].forEach(ax => {
                const bar = cell.querySelector(`.sensor-bar-${ax}`);
                if (!bar) return;
                const v = Math.max(-1, Math.min(1, vals[ax]));
                if (v >= 0) {
                    bar.style.top = `${50 - v * 50}%`;
                    bar.style.height = `${v * 50}%`;
                } else {
                    bar.style.top = '50%';
                    bar.style.height = `${Math.abs(v) * 50}%`;
                }
            });
        }

        // Update target modal if open
        if (targetModal) {
            const statusEl = targetModal.querySelector('#sensor-modal-status');
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
                const valEl = targetModal.querySelector(`#sensor-modal-val-${ax}`);
                if (valEl) {
                    const v = vals[ax];
                    valEl.textContent = (v >= 0 ? '+' : '') + v.toFixed(2);
                }

                const barEl = targetModal.querySelector(`#sensor-modal-bar-${ax}`);
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

export const SNS = SENSOR;
export const sensorDefs = { SENSOR, SNS };
