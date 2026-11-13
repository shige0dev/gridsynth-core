// src/modules/defs/particle.js
// PARTICLE - Dedicated 3D Point Cloud / Particle Generator Module
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const PARTICLE_DISTS = [
    { id: 'sphere', label: 'SPHERE' },
    { id: 'cube', label: 'CUBE' },
    { id: 'ring', label: 'RING' },
    { id: 'spiral', label: 'SPIRAL' }
];

export const PARTICLE_CV_TARGETS = [
    { id: 'spread', label: 'SPREAD' },
    { id: 'size', label: 'SIZE' },
    { id: 'speed', label: 'SPEED' }
];

export const PARTICLE = {
    color: 'purple',
    defaults: () => ({
        type: 'PARTICLE',
        dist: 'sphere',
        count: 400,
        spread: 1.5,
        pointSize: 3.0,
        speed: 0.4,
        cvTarget: 'spread',
        color: '#22d3ee'
    }),
    ports: () => ({
        in: [
            { port: 'cv_in', pin: 4, color: 'bg-yellow-400', label: 'CV' },
            { port: 'obj_in', pin: 5, color: 'bg-purple-500', label: 'OBJ' },
            { port: 'gate_in', pin: 6, color: 'bg-red-500', label: 'TRIG' }
        ],
        out: [
            { port: 'obj_out', pin: 10, color: 'bg-purple-500', label: 'OBJ' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m, ctx) => {
        const isObj = Boolean(ctx?.patched?.has('obj_in'));
        const distName = isObj ? 'OBJ IN' : (m?.dist || 'sphere').toUpperCase();
        const cnt = Math.round(Number(m?.count ?? 400));
        const ptSz = Number(m?.pointSize ?? 3.0).toFixed(1);
        return `
        <div class="flex flex-col items-center justify-center w-full h-full pointer-events-none select-none text-center">
            <span class="text-[11px] font-mono font-extrabold text-cyan-300 tracking-wider">${distName}</span>
            <span class="text-[7px] font-mono font-bold text-slate-400 uppercase tracking-tight">[${cnt} PTS · S${ptSz}]</span>
        </div>`;
    },
    renderModal: (m, ctx) => {
        const isObjPatched = Boolean(ctx?.patched?.has('obj_in'));
        const isCvPatched = Boolean(ctx?.patched?.has('cv_in'));
        const curDist = m.dist || 'sphere';
        const count = Math.round(Number(m.count ?? 400));
        const spread = Number(m.spread ?? 1.5);
        const pointSize = Number(m.pointSize ?? 3.0);
        const speed = Number(m.speed ?? 0.4);
        const cvTarget = m.cvTarget || 'spread';
        const curCol = (m.color || '#22d3ee').toLowerCase();

        return `
        <div id="particle-modal-root" class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1">
                <span class="text-xs font-mono font-bold text-purple-400">PARTICLE</span>
                <span class="text-[8px] font-mono font-bold ${isObjPatched ? 'text-purple-300 bg-purple-950/80 px-1 rounded border border-purple-500/40' : 'text-slate-400'}">
                    ${isObjPatched ? 'SOURCE: OBJ IN' : 'GENERATOR'}
                </span>
            </div>

            <!-- Distribution -->
            <div class="flex flex-col gap-1 ${isObjPatched ? 'opacity-40 pointer-events-none' : ''}">
                <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">DISTRIBUTION</span>
                <div class="grid grid-cols-4 gap-1">
                    ${PARTICLE_DISTS.map(d => `
                        <button data-dist="${d.id}" class="pt-dist-btn py-1 rounded text-[8px] font-mono font-bold border transition ${curDist === d.id ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'}">${d.label}</button>
                    `).join('')}
                </div>
            </div>

            <!-- Sliders -->
            <div class="flex flex-col gap-1.5 bg-slate-950/60 p-2 rounded border border-slate-800">
                <div class="flex flex-col gap-0.5">
                    <div class="flex justify-between text-[8px] font-mono">
                        <span class="text-slate-400 font-bold">COUNT</span>
                        <span id="pt-count-val" class="text-cyan-300 font-bold">${count}</span>
                    </div>
                    <input id="pt-count-sl" type="range" min="50" max="2000" step="50" value="${count}" class="w-full accent-purple-500 h-1.5 bg-slate-800 rounded cursor-pointer">
                </div>

                <div class="flex flex-col gap-0.5">
                    <div class="flex justify-between text-[8px] font-mono">
                        <span class="text-slate-400 font-bold">${isObjPatched ? 'JITTER / SCATTER' : 'SPREAD'}</span>
                        <span id="pt-spread-val" class="text-cyan-300 font-bold">${spread.toFixed(1)}</span>
                    </div>
                    <input id="pt-spread-sl" type="range" min="0.0" max="4.0" step="0.1" value="${spread}" class="w-full accent-purple-500 h-1.5 bg-slate-800 rounded cursor-pointer">
                </div>

                <div class="flex flex-col gap-0.5">
                    <div class="flex justify-between text-[8px] font-mono">
                        <span class="text-slate-400 font-bold">POINT SIZE</span>
                        <span id="pt-size-val" class="text-cyan-300 font-bold">${pointSize.toFixed(1)}</span>
                    </div>
                    <input id="pt-size-sl" type="range" min="0.5" max="12.0" step="0.5" value="${pointSize}" class="w-full accent-purple-500 h-1.5 bg-slate-800 rounded cursor-pointer">
                </div>

                <div class="flex flex-col gap-0.5">
                    <div class="flex justify-between text-[8px] font-mono">
                        <span class="text-slate-400 font-bold">DRIFT SPEED</span>
                        <span id="pt-speed-val" class="text-cyan-300 font-bold">${speed.toFixed(2)}</span>
                    </div>
                    <input id="pt-speed-sl" type="range" min="0.0" max="2.0" step="0.05" value="${speed}" class="w-full accent-purple-500 h-1.5 bg-slate-800 rounded cursor-pointer">
                </div>
            </div>

            <!-- CV Target -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <div class="flex items-center justify-between">
                    <span class="text-[8px] font-mono font-bold text-amber-400 uppercase tracking-wider">CV TARGET (PIN4)</span>
                    <span class="text-[7.5px] font-mono ${isCvPatched ? 'text-amber-300 font-bold' : 'text-slate-500'}">${isCvPatched ? 'ACTIVE' : 'UNPATCHED'}</span>
                </div>
                <div class="grid grid-cols-3 gap-1">
                    ${PARTICLE_CV_TARGETS.map(t => `
                        <button data-cvt="${t.id}" class="pt-cvt-btn py-1 rounded text-[8px] font-mono font-bold border transition ${cvTarget === t.id ? 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-500/40' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${t.label}</button>
                    `).join('')}
                </div>
            </div>

            <!-- Color -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <div class="flex items-center justify-between">
                    <span class="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">COLOR</span>
                    <span id="pt-col-hex" class="text-[8px] font-mono font-bold text-cyan-300 uppercase">${curCol}</span>
                </div>
                <input id="pt-color-picker" type="color" value="${curCol}" class="w-full h-6 p-0.5 rounded bg-slate-800 border border-slate-600 cursor-pointer" title="カラーセレクタ">
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        const dialog = ctx?.getDialogElement ? ctx.getDialogElement() : null;
        const root = dialog?.querySelector('#particle-modal-root') || document.getElementById('particle-modal-root');
        if (!root) return;

        root.querySelectorAll('.pt-dist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.dist = e.currentTarget.dataset.dist;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });

        root.querySelectorAll('.pt-cvt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.cvTarget = e.currentTarget.dataset.cvt;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });

        const colPicker = root.querySelector('#pt-color-picker');
        if (colPicker) {
            colPicker.addEventListener('input', (e) => {
                m.color = e.target.value;
                const hexEl = root.querySelector('#pt-col-hex');
                if (hexEl) hexEl.textContent = m.color.toLowerCase();
                onChange?.();
            });
            colPicker.addEventListener('change', () => {
                ctx.reRenderModal?.();
            });
        }

        const bindRange = (slId, valId, key, fmt) => {
            const sl = root.querySelector(`#${slId}`);
            const disp = root.querySelector(`#${valId}`);
            if (!sl) return;
            sl.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                m[key] = v;
                if (disp) disp.textContent = fmt(v);
                onChange?.();
            });
        };

        bindRange('pt-count-sl', 'pt-count-val', 'count', v => String(Math.round(v)));
        bindRange('pt-spread-sl', 'pt-spread-val', 'spread', v => v.toFixed(1));
        bindRange('pt-size-sl', 'pt-size-val', 'pointSize', v => v.toFixed(1));
        bindRange('pt-speed-sl', 'pt-speed-val', 'speed', v => v.toFixed(2));
    },
    updateLive: () => {}
};

export const particleDefs = {
    PARTICLE
};
export default particleDefs;
