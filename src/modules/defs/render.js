// src/modules/defs/render.js
// RENDER - 3D Graphics Renderer & Framebuffer Generator (1:1 Square Master Buffer)
import { UIHelpers } from '../../ui/helpers.js?v=351';

export const STYLE_OVERRIDES = [
    { id: 'auto', label: 'AUTO' },
    { id: 'wire', label: 'WIRE' },
    { id: 'solid', label: 'SOLID' },
    { id: 'normal', label: 'NORMAL' },
    { id: 'toon', label: 'TOON' },
    { id: 'neon', label: 'NEON' },
    { id: 'point', label: 'POINT' },
    { id: 'glass', label: 'GLASS' }
];

export const RENDER = {
    color: 'emerald',
    defaults: () => ({
        type: 'RENDER',
        camX: 0.0,
        camY: 0.0,
        camZ: 5.0,
        targetX: 0.0,
        targetY: 0.0,
        targetZ: 0.0,
        fov: 45.0,
        camRoll: 0.0,
        materialOverride: 'auto', // 'auto' | 'wire' | 'solid' | 'normal' | 'toon' | 'neon'
        vrIpd: 0
    }),
    ports: () => ({
        in: [
            { port: 'fov_in', pin: 4, color: 'bg-yellow-400', label: 'FOV' },
            { port: 'obj_in', pin: 5, color: 'bg-purple-500', label: 'OBJ' }
        ],
        out: [
            { port: 'video_out', pin: 10, color: 'bg-emerald-800', label: 'VID' }
        ]
    }),
    renderPorts: (m, renderP, ports) => UIHelpers.renderChassisPorts(renderP, ports),
    renderGrid: (m) => {
        const cx = Number(m.camX ?? 0).toFixed(1);
        const cy = Number(m.camY ?? 0).toFixed(1);
        const cz = Number(m.camZ ?? 5).toFixed(1);
        const fov = Math.round(m.fov ?? 45);
        const roll = Math.round(m.camRoll ?? 0);
        const tx = Number(m.targetX ?? 0).toFixed(1);
        const ty = Number(m.targetY ?? 0).toFixed(1);
        const tz = Number(m.targetZ ?? 0).toFixed(1);
        const style = (m.materialOverride || 'auto').toUpperCase();

        return `
        <div class="flex flex-col items-center justify-center leading-none gap-0.5 pointer-events-none select-none font-mono text-center">
            <div class="flex flex-col items-center gap-0.5">
                <span class="text-[7px] font-bold text-amber-400">CAM POS</span>
                <span data-render-cam class="text-[8.5px] font-bold text-emerald-300 tracking-tight">${cx}, ${cy}, ${cz}</span>
            </div>
            <div class="flex items-center gap-1.5 text-[7px]">
                <div class="flex flex-col items-center">
                    <span class="text-[6.5px] text-slate-400 font-bold">FOV</span>
                    <span data-render-fov class="font-bold text-cyan-300">${fov}°</span>
                </div>
                <div class="flex flex-col items-center">
                    <span class="text-[6.5px] text-slate-400 font-bold">STYLE</span>
                    <span class="font-bold text-purple-300">${style}</span>
                </div>
            </div>
            <div class="flex flex-col items-center gap-0.5">
                <span class="text-[6.5px] text-slate-400 font-bold">TARGET</span>
                <span data-render-target class="text-[7.5px] font-medium text-slate-300 tracking-tight">${tx}, ${ty}, ${tz}</span>
            </div>
        </div>`;
    },
    renderModal: (m) => {
        const curOverride = m.materialOverride || 'auto';

        return `
        <div class="flex flex-col gap-2 p-1.5 bg-slate-900 text-slate-200 select-none w-full">
            <!-- Viewfinder Preview Container (Full Width 1:1 Square) -->
            <div class="relative w-full aspect-square bg-black border border-slate-800 rounded overflow-hidden flex items-center justify-center mx-auto">
                <canvas class="render-modal-canvas w-full h-full block bg-black" width="400" height="400"></canvas>
                <button id="render-vr-btn" class="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-emerald-950/90 hover:bg-emerald-800 border border-emerald-500/70 text-emerald-300 text-[7.5px] font-mono font-bold tracking-wider shadow cursor-pointer" title="スマホゴーグル用 横全画面ステレオ表示">VR STEREO</button>
            </div>

            <!-- Section 1: Material Style Override -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <div class="flex items-center justify-between">
                    <span class="text-[8px] font-mono font-bold text-purple-400 uppercase tracking-wider" title="マテリアル一括上書き">STYLE OVERRIDE</span>
                    <span class="text-[7.5px] font-mono text-slate-400">${curOverride === 'auto' ? 'AUTO' : 'FORCED'}</span>
                </div>
                <div class="grid grid-cols-4 gap-1">
                    ${STYLE_OVERRIDES.map(s => `
                        <button data-override="${s.id}" class="render-override-btn py-1 rounded text-[8px] font-mono font-bold border transition ${curOverride === s.id ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}">${s.label}</button>
                    `).join('')}
                </div>
            </div>

            <!-- Section 2: Camera Position & Optics -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <span class="text-[8px] font-mono font-bold text-cyan-400 uppercase tracking-wider">CAMERA POSITION & OPTICS</span>
                <div class="grid grid-cols-3 gap-1.5 text-[8.5px] font-mono">
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>CAM X</span><span id="render-val-camx">${(m.camX ?? 0).toFixed(1)}</span></div>
                        <input type="range" id="render-slide-camx" min="-10" max="10" step="0.2" value="${m.camX ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>CAM Y</span><span id="render-val-camy">${(m.camY ?? 0).toFixed(1)}</span></div>
                        <input type="range" id="render-slide-camy" min="-10" max="10" step="0.2" value="${m.camY ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>CAM Z</span><span id="render-val-camz">${(m.camZ ?? 5).toFixed(1)}</span></div>
                        <input type="range" id="render-slide-camz" min="1.0" max="20.0" step="0.2" value="${m.camZ ?? 5}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-1.5 text-[8.5px] font-mono pt-0.5">
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span title="視野角">FOV</span><span id="render-val-fov">${Math.round(m.fov ?? 45)}°</span></div>
                        <input type="range" id="render-slide-fov" min="15" max="110" step="1" value="${m.fov ?? 45}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-500">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span title="回転角">ROLL</span><span id="render-val-roll">${Math.round(m.camRoll ?? 0)}°</span></div>
                        <input type="range" id="render-slide-roll" min="-180" max="180" step="5" value="${m.camRoll ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-cyan-500">
                    </div>
                </div>
            </div>

            <!-- Section 3: LookAt Target -->
            <div class="flex flex-col gap-1 border-t border-slate-800 pt-1">
                <span class="text-[8px] font-mono font-bold text-amber-400 uppercase tracking-wider" title="注視点">LOOKAT TARGET</span>
                <div class="grid grid-cols-3 gap-1.5 text-[8.5px] font-mono">
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>AIM X</span><span id="render-val-tgx">${(m.targetX ?? 0).toFixed(1)}</span></div>
                        <input type="range" id="render-slide-tgx" min="-5" max="5" step="0.1" value="${m.targetX ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>AIM Y</span><span id="render-val-tgy">${(m.targetY ?? 0).toFixed(1)}</span></div>
                        <input type="range" id="render-slide-tgy" min="-5" max="5" step="0.1" value="${m.targetY ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500">
                    </div>
                    <div class="flex flex-col gap-0.5">
                        <div class="flex justify-between text-slate-400"><span>AIM Z</span><span id="render-val-tgz">${(m.targetZ ?? 0).toFixed(1)}</span></div>
                        <input type="range" id="render-slide-tgz" min="-5" max="5" step="0.1" value="${m.targetZ ?? 0}" class="h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500">
                    </div>
                </div>
            </div>
        </div>`;
    },
    bindEvents: (m, ctx, onChange) => {
        const root = ctx?.getDialogElement ? (ctx.getDialogElement() || document) : document;

        // Override Buttons
        root.querySelectorAll('.render-override-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                m.materialOverride = e.currentTarget.dataset.override;
                ctx.reRenderModal?.();
                onChange?.();
            });
        });

        const bindSlider = (id, prop, dispId, fmt = (v) => v.toFixed(2)) => {
            const input = root.querySelector('#' + id);
            const disp = root.querySelector('#' + dispId);
            if (!input) return;
            input.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                m[prop] = val;
                if (disp) disp.textContent = fmt(val);
                onChange?.();
            });
        };

        // Camera Position
        bindSlider('render-slide-camx', 'camX', 'render-val-camx', v => v.toFixed(1));
        bindSlider('render-slide-camy', 'camY', 'render-val-camy', v => v.toFixed(1));
        bindSlider('render-slide-camz', 'camZ', 'render-val-camz', v => v.toFixed(1));
        // Optics
        bindSlider('render-slide-fov', 'fov', 'render-val-fov', v => `${Math.round(v)}°`);
        bindSlider('render-slide-roll', 'camRoll', 'render-val-roll', v => `${Math.round(v)}°`);
        // LookAt Target
        bindSlider('render-slide-tgx', 'targetX', 'render-val-tgx', v => v.toFixed(1));
        bindSlider('render-slide-tgy', 'targetY', 'render-val-tgy', v => v.toFixed(1));
        bindSlider('render-slide-tgz', 'targetZ', 'render-val-tgz', v => v.toFixed(1));

        // VR Stereo Fullscreen Overlay (Smartphone Goggles - Parallel SBS, 2048x2048)
        const vrBtn = root.querySelector('#render-vr-btn');
        if (vrBtn) {
            vrBtn.addEventListener('click', () => {
                document.getElementById('render-vr-overlay')?.remove();

                const overlay = document.createElement('div');
                overlay.id = 'render-vr-overlay';
                overlay.className = 'fixed inset-0 z-[9999] bg-black select-none overflow-hidden flex items-center justify-center';
                overlay.innerHTML = `
                    <div id="vr-stage" class="relative flex items-center justify-center overflow-hidden bg-black">
                        <!-- Short Top & Bottom Center Divider Lines -->
                        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-5 bg-white/45 pointer-events-none z-10"></div>
                        <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[2px] h-5 bg-white/45 pointer-events-none z-10"></div>

                        <!-- Parallel Stereo Canvases (Independent L / R 50% slots) -->
                        <div class="flex items-center w-full h-full">
                            <div class="w-1/2 h-full flex items-center justify-center overflow-hidden">
                                <canvas id="vr-cvs-l" width="2048" height="2048" class="bg-black shrink-0"></canvas>
                            </div>
                            <div class="w-1/2 h-full flex items-center justify-center overflow-hidden">
                                <canvas id="vr-cvs-r" width="2048" height="2048" class="bg-black shrink-0"></canvas>
                            </div>
                        </div>

                        <!-- Tap-Toggle HUD (Top-Right, Compact, IPD shifted left + EXIT) -->
                        <div id="vr-hud" class="absolute top-2 right-2 z-20 flex items-center gap-2 px-2 py-1 rounded bg-slate-900/80 border border-slate-700 backdrop-blur-sm text-[8.5px] font-mono text-slate-200 transition-opacity duration-200">
                            <label class="flex items-center gap-1">
                                <span class="text-amber-400 font-bold">IPD</span>
                                <input id="vr-ipd" type="range" min="-140" max="20" step="2" value="${m.vrIpd ?? 0}" class="w-16 h-1 accent-amber-400 cursor-pointer">
                            </label>
                            <button id="vr-exit-btn" class="px-1.5 py-0.5 rounded bg-rose-700 hover:bg-rose-600 text-white font-bold border border-rose-500 cursor-pointer">EXIT</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlay);

                const stage = overlay.querySelector('#vr-stage');
                const cvsL = overlay.querySelector('#vr-cvs-l');
                const cvsR = overlay.querySelector('#vr-cvs-r');
                const ctxL = cvsL.getContext('2d');
                const ctxR = cvsR.getContext('2d');
                const hud = overlay.querySelector('#vr-hud');

                const layoutStage = () => {
                    const vw = window.innerWidth;
                    const vh = window.innerHeight;
                    const isPortrait = vh > vw;
                    const sw = isPortrait ? vh : vw;
                    const sh = isPortrait ? vw : vh;

                    stage.style.width = `${sw}px`;
                    stage.style.height = `${sh}px`;
                    stage.style.transform = isPortrait ? 'rotate(90deg)' : 'none';

                    const ipd = Number(m.vrIpd ?? 0);
                    const eyeSize = Math.floor(Math.min(sh * 0.90, sw * 0.45));
                    cvsL.style.width = `${eyeSize}px`;
                    cvsL.style.height = `${eyeSize}px`;
                    cvsR.style.width = `${eyeSize}px`;
                    cvsR.style.height = `${eyeSize}px`;
                    cvsL.style.transform = `translateX(${-ipd * 0.5}px)`;
                    cvsR.style.transform = `translateX(${ipd * 0.5}px)`;
                };

                layoutStage();
                window.addEventListener('resize', layoutStage);

                try {
                    if (overlay.requestFullscreen) {
                        overlay.requestFullscreen().then(() => {
                            try { screen.orientation?.lock?.('landscape')?.catch?.(() => {}); } catch (_) {}
                        }).catch(() => {});
                    }
                } catch (_) {}

                let hudVisible = true;
                overlay.addEventListener('click', () => {
                    hudVisible = !hudVisible;
                    hud.style.opacity = hudVisible ? '1' : '0';
                    hud.style.pointerEvents = hudVisible ? 'auto' : 'none';
                });
                hud.addEventListener('click', (e) => e.stopPropagation());

                overlay.querySelector('#vr-ipd').addEventListener('input', (e) => {
                    m.vrIpd = parseFloat(e.target.value);
                    layoutStage();
                    onChange?.();
                });

                let rafId = 0;
                const renderLoop = () => {
                    if (!document.body.contains(overlay)) return;
                    const app = window.__GS_APP__;
                    const synth = window.__GS_SYNTH__;
                    const pageId = m.pageId || app?.currentPageId || '0';
                    const inst = synth?.modules?.[`${pageId}/${m.id}`] || synth?.modules?.[m.id];
                    if (inst?.renderStereo) {
                        inst.renderStereo(ctxL, ctxR, 0.8);
                    }
                    rafId = requestAnimationFrame(renderLoop);
                };
                rafId = requestAnimationFrame(renderLoop);

                const closeVr = () => {
                    cancelAnimationFrame(rafId);
                    window.removeEventListener('resize', layoutStage);
                    const app = window.__GS_APP__;
                    const synth = window.__GS_SYNTH__;
                    const pageId = m.pageId || app?.currentPageId || '0';
                    const inst = synth?.modules?.[`${pageId}/${m.id}`] || synth?.modules?.[m.id];
                    inst?.setResolution?.(512);
                    try { screen.orientation?.unlock?.(); } catch (_) {}
                    try {
                        if (document.fullscreenElement) {
                            document.exitFullscreen().catch(() => {});
                        }
                    } catch (_) {}
                    overlay.remove();
                };
                overlay.querySelector('#vr-exit-btn').addEventListener('click', closeVr);
            });
        }
    },
    updateLive: (cell, data, isPlaying, modal, m) => {
        if (!cell || !data) return;
        const srcCanvas = data.canvas;

        // 1. Update camera info readout on module cell panel
        const camEl = cell.querySelector('[data-render-cam]');
        const fovEl = cell.querySelector('[data-render-fov]');
        const rollEl = cell.querySelector('[data-render-roll]');
        const targetEl = cell.querySelector('[data-render-target]');

        const cx = Number(data.camX ?? m?.camX ?? 0).toFixed(1);
        const cy = Number(data.camY ?? m?.camY ?? 0).toFixed(1);
        const cz = Number(data.camZ ?? m?.camZ ?? 5).toFixed(1);
        const fov = Math.round(data.fov ?? m?.fov ?? 45);
        const roll = Math.round(data.roll ?? m?.camRoll ?? 0);
        const tx = Number(data.targetX ?? m?.targetX ?? 0).toFixed(1);
        const ty = Number(data.targetY ?? m?.targetY ?? 0).toFixed(1);
        const tz = Number(data.targetZ ?? m?.targetZ ?? 0).toFixed(1);

        if (camEl) camEl.textContent = `${cx}, ${cy}, ${cz}`;
        if (fovEl) fovEl.textContent = `${fov}°${data.isCvFov ? '*' : ''}`;
        if (rollEl) rollEl.textContent = `${roll}°`;
        if (targetEl) targetEl.textContent = `${tx}, ${ty}, ${tz}`;

        // 2. Render to modal preview canvas if open (1:1 square)
        if (modal) {
            const mCvs = modal.querySelector('.render-modal-canvas');
            if (mCvs && srcCanvas) {
                const mCtx = mCvs.getContext('2d');
                mCtx.clearRect(0, 0, mCvs.width, mCvs.height);
                mCtx.drawImage(srcCanvas, 0, 0, srcCanvas.width, srcCanvas.height, 0, 0, mCvs.width, mCvs.height);
            }
        }
    }
};

export const renderDefs = {
    RENDER
};
export default renderDefs;
