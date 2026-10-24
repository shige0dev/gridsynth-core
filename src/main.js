export const APP_VERSION = 'v1.0.0308';

import { SynthEngine } from './audio/engine.js?v=308';
import { UIController } from './ui/controller.js?v=308';
import { initExternalAPI } from './core/api.js?v=308';

document.addEventListener('DOMContentLoaded', () => {
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
        ui.interactionManager?.updateRowHandleRail?.();
    }, 50));
    const frame = document.getElementById('phone-frame');
    if (frame) ro.observe(frame);
});
