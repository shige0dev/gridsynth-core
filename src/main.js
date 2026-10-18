import { SynthEngine } from './audio/engine.js?v=236';
import { UIController } from './ui/controller.js?v=236';
import { initExternalAPI } from './core/api.js?v=236';

document.addEventListener('DOMContentLoaded', () => {
    const synth = new SynthEngine();
    const ui = new UIController(synth);
    initExternalAPI(ui, synth);
    window.__GS_APP__ = ui;
    window.__GS_SYNTH__ = synth;

    const ro = new ResizeObserver(() => setTimeout(() => ui.renderCables(), 50));
    const frame = document.getElementById('phone-frame');
    if (frame) ro.observe(frame);
});
