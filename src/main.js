export const APP_VERSION = 'v1.0.0683';

import { SynthEngine } from './audio/engine.js?v=679';
import { UIController } from './ui/controller.js?v=679';
import { initExternalAPI } from './core/api.js?v=679';

function applyDeviceMode() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
        (window.innerWidth < 768);
    document.documentElement.classList.toggle('is-mobile-device', isMobile);
    document.documentElement.classList.toggle('is-desktop-device', !isMobile);
}
applyDeviceMode();
window.addEventListener('resize', applyDeviceMode);

function initApp() {
    const verDisp = document.getElementById('app-version-disp');
    if (verDisp) verDisp.textContent = APP_VERSION;
    const aboutVerDisp = document.getElementById('about-app-version');
    if (aboutVerDisp) aboutVerDisp.textContent = `GridSynth Mobile ${APP_VERSION}`;
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

    // Safeguard: Prevent outer window/body from scrolling on mobile browsers
    window.addEventListener('scroll', () => {
        if (window.scrollY !== 0 || window.scrollX !== 0) {
            window.scrollTo(0, 0);
        }
    }, { passive: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
