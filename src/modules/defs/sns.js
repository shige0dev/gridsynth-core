import { UIHelpers } from '../../ui/helpers.js';

const SNS_SENSORS = {
    ACCEL:  { label: 'ACCEL',  desc: 'Accelerometer',       event: 'motion' },
    GRAV:   { label: 'GRAV',   desc: 'Gravity',              event: 'motion' },
    GYRO:   { label: 'GYRO',   desc: 'Gyroscope',            event: 'motion' },
    ORIENT: { label: 'ORIENT', desc: 'Device Orientation',   event: 'orientation' }
};

export const SNS = {
    color: 'teal',
    defaults: () => ({ type: 'SNS', sensor: 'ACCEL' }),
    ports: () => ({
        in: [],
        out: [
            { port: 'x_out', pin: 1, color: 'bg-yellow-400' },
            { port: 'y_out', pin: 2, color: 'bg-yellow-400' },
            { port: 'z_out', pin: 3, color: 'bg-yellow-400' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),

    renderGrid: (m) => {
        const sensor = SNS_SENSORS[m.sensor] || SNS_SENSORS.ACCEL;
        return `
            <div class="flex flex-col items-center justify-center w-full h-full gap-1 pointer-events-none">
                <span class="font-mono text-[9px] font-bold text-teal-300 tracking-widest">${sensor.label}</span>
                <div class="flex items-end justify-center gap-1">
                    ${['x', 'y', 'z'].map(ax => `
                        <div class="w-2 h-7 rounded-sm p-[1px] flex flex-col justify-end border border-slate-600 bg-slate-950/40 relative panel-bar-slot" data-sns-bar="${ax}">
                            <div class="w-full bg-gradient-to-t from-amber-600 to-yellow-400 rounded-xs sns-bar-${ax}" style="height:50%;"></div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    },

    renderModal: (m) => {
        const cur = m.sensor || 'ACCEL';
        return `
            <div class="space-y-2 p-1">
                <div class="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span class="text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Sensor Source</span>
                    <span class="text-[8px] font-mono font-bold text-teal-300">${SNS_SENSORS[cur]?.desc || cur}</span>
                </div>
                <div class="grid grid-cols-2 gap-1">
                    ${Object.entries(SNS_SENSORS).map(([key, s]) => `
                        <button class="sns-sensor-btn py-1.5 px-2 rounded text-[8px] font-bold border transition-all ${cur === key
                            ? 'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }" data-val="${key}">
                            <div class="font-mono">${s.label}</div>
                            <div class="text-[6.5px] font-normal opacity-70 mt-0.5">${s.desc}</div>
                        </button>
                    `).join('')}
                </div>
                <div class="bg-slate-950/80 rounded border border-slate-800 p-1.5">
                    <div class="flex justify-between text-[7px] font-mono text-slate-500 mb-1">
                        <span>OUTPUT</span><span>−1 ～ +1</span>
                    </div>
                    <div class="flex gap-1 text-[7px] font-mono">
                        <span class="px-1.5 py-0.5 rounded bg-slate-800 text-yellow-400">X</span>
                        <span class="px-1.5 py-0.5 rounded bg-slate-800 text-yellow-400">Y</span>
                        <span class="px-1.5 py-0.5 rounded bg-slate-800 text-yellow-400">Z</span>
                    </div>
                </div>
            </div>`;
    },

    bindEvents: (m, ctx, cb) => {
        UIHelpers.bindButtonGroup(
            '.sns-sensor-btn',
            'bg-teal-600 text-white border-teal-400 shadow-sm shadow-teal-500/50',
            'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800',
            val => { m.sensor = val; ctx.reRenderModal(); cb(); }
        );
    },

    updateLive: (cell, data) => {
        if (!data) return;
        const { x = 0, y = 0, z = 0 } = data;
        const vals = { x, y, z };
        ['x', 'y', 'z'].forEach(ax => {
            const slot = cell?.querySelector(`[data-sns-bar="${ax}"]`);
            if (!slot) return;
            const inner = slot.firstElementChild;
            const v = vals[ax]; // -1 ~ +1
            const pct = Math.round((v * 0.5 + 0.5) * 100); // 0~100%
            if (inner) inner.style.height = `${Math.max(2, Math.min(100, pct))}%`;
        });
    }
};

export const snsDefs = { SNS };

