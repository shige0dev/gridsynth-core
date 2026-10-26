export const APP_VERSION = 'v1.0.0425';

import { SynthEngine } from './audio/engine.js?v=425';
import { UIController } from './ui/controller.js?v=425';
import { initExternalAPI } from './core/api.js?v=425';

function applyDeviceMode() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 768);
    document.documentElement.classList.toggle('is-mobile-device', isMobile);
    document.documentElement.classList.toggle('is-desktop-device', !isMobile);
}
applyDeviceMode();
window.addEventListener('resize', applyDeviceMode);

function initApp() {
    const verDisp = document.getElementById('app-version-disp');
    if (verDisp) verDisp.textContent = APP_VERSION;
    window.__APP_VERSION__ = APP_VERSION;
    const synth = new SynthEngine();
    const ui = new UIController(synth);
    initExternalAPI(ui, synth);
    window.__GS_APP__ = ui;
    window.__GS_SYNTH__ = synth;

    const ro = new ResizeObserver(() => setTimeout(() => {
        ui.renderCables();
    }, 50));
    const frame = document.getElementById('phone-frame');
    if (frame) ro.observe(frame);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
