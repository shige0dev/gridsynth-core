const CACHE_NAME = 'gridsynth-v1.0.0851';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './css/style.css',
  './src/audio/defs/adsr.js',
  './src/audio/defs/amp.js',
  './src/audio/defs/ar.js',
  './src/audio/defs/chord.js',
  './src/audio/defs/clk.js',
  './src/audio/defs/controllers.js',
  './src/audio/defs/count.js',
  './src/audio/defs/display.js',
  './src/audio/defs/dist4.js',
  './src/audio/defs/effects.js',
  './src/audio/defs/filter.js',
  './src/audio/defs/fm.js',
  './src/audio/defs/geo.js',
  './src/audio/defs/io.js',
  './src/audio/defs/lfo.js',
  './src/audio/defs/lut.js',
  './src/audio/defs/markov.js',
  './src/audio/defs/math.js',
  './src/audio/defs/matrix.js',
  './src/audio/defs/mod.js',
  './src/audio/defs/move.js',
  './src/audio/defs/pad.js',
  './src/audio/defs/particle.js',
  './src/audio/defs/pat.js',
  './src/audio/defs/path.js',
  './src/audio/defs/render.js',
  './src/audio/defs/rf.js',
  './src/audio/defs/rotate.js',
  './src/audio/defs/scale.js',
  './src/audio/defs/scatter.js',
  './src/audio/defs/scope.js',
  './src/audio/defs/seq.js',
  './src/audio/defs/sh.js',
  './src/audio/defs/slct4.js',
  './src/audio/defs/sub.js',
  './src/audio/defs/tilt.js',
  './src/audio/defs/val.js',
  './src/audio/defs/vco.js',
  './src/audio/defs/vertex.js',
  './src/audio/defs/vfx.js',
  './src/audio/defs/vmix.js',
  './src/audio/defs/wave.js',
  './src/audio/defs/wave3d.js',
  './src/audio/engine.js',
  './src/audio/helpers.js',
  './src/audio/multi-osc.js',
  './src/audio/registry.js',
  './src/audio/wave-codec.js',
  './src/core/api.js',
  './src/core/musical.js',
  './src/core/patch.js',
  './src/core/pat-tokens.js',
  './src/core/signals.js',
  './src/core/strudel-parser.js',
  './src/core/sub-utils.js',
  './src/core/utils.js',
  './src/dsp/processors/adsr.js',
  './src/dsp/processors/adsr-core.js',
  './src/dsp/processors/ar.js',
  './src/dsp/processors/chord.js',
  './src/dsp/processors/clock.js',
  './src/dsp/processors/common.js',
  './src/dsp/processors/count.js',
  './src/dsp/processors/cv-delay.js',
  './src/dsp/processors/dist4.js',
  './src/dsp/processors/fm.js',
  './src/dsp/processors/fm-core.js',
  './src/dsp/processors/fold.js',
  './src/dsp/processors/lfo.js',
  './src/dsp/processors/lut.js',
  './src/dsp/processors/markov.js',
  './src/dsp/processors/math.js',
  './src/dsp/processors/matrix.js',
  './src/dsp/processors/pad.js',
  './src/dsp/processors/pat.js',
  './src/dsp/processors/rf.js',
  './src/dsp/processors/scale.js',
  './src/dsp/processors/scope.js',
  './src/dsp/processors/seq.js',
  './src/dsp/processors/sh.js',
  './src/dsp/processors/slct4.js',
  './src/dsp/processors/wave.js',
  './src/dsp/wave-grain-shifter.js',
  './src/dsp/worklet-processors.js',
  './src/main.js',
  './src/modules/defs/adsr.js',
  './src/modules/defs/amp.js',
  './src/modules/defs/ar.js',
  './src/modules/defs/chord.js',
  './src/modules/defs/clk.js',
  './src/modules/defs/controllers.js',
  './src/modules/defs/count.js',
  './src/modules/defs/display.js',
  './src/modules/defs/dist4.js',
  './src/modules/defs/effects.js',
  './src/modules/defs/filter.js',
  './src/modules/defs/fm.js',
  './src/modules/defs/geo.js',
  './src/modules/defs/io.js',
  './src/modules/defs/lfo.js',
  './src/modules/defs/lut.js',
  './src/modules/defs/markov.js',
  './src/modules/defs/math.js',
  './src/modules/defs/matrix.js',
  './src/modules/defs/mod.js',
  './src/modules/defs/move.js',
  './src/modules/defs/pad.js',
  './src/modules/defs/particle.js',
  './src/modules/defs/pat.js',
  './src/modules/defs/path.js',
  './src/modules/defs/render.js',
  './src/modules/defs/rf.js',
  './src/modules/defs/rotate.js',
  './src/modules/defs/scale.js',
  './src/modules/defs/scatter.js',
  './src/modules/defs/scope.js',
  './src/modules/defs/seq.js',
  './src/modules/defs/sh.js',
  './src/modules/defs/slct4.js',
  './src/modules/defs/sub.js',
  './src/modules/defs/tilt.js',
  './src/modules/defs/val.js',
  './src/modules/defs/vco.js',
  './src/modules/defs/vertex.js',
  './src/modules/defs/vfx.js',
  './src/modules/defs/vmix.js',
  './src/modules/defs/wave.js',
  './src/modules/defs/wave3d.js',
  './src/modules/registry.js',
  './src/presets/default.js',
  './src/presets/demos/01_delay_techno.js',
  './src/presets/demos/02_keyboard_lead.js',
  './src/presets/demos/03_wavefold_ar_fr.js',
  './src/presets/demos/04_random_sh_delay.js',
  './src/presets/demos/05_subpatch_multi_groove.js',
  './src/presets/demos/06_strudel_house_bassline.js',
  './src/presets/demos/07_dub_techno_deep_space.js',
  './src/presets/demos/08_markov_generative_chains.js',
  './src/presets/demos/09_fm_heavy_techno_groove.js',
  './src/presets/demos/11_fmcore_2op_demo.js',
  './src/presets/demos/12_chord_arpeggio.js',
  './src/presets/demos/13_wave_chop.js',
  './src/presets/demos/14_16_pad_drumkit.js',
  './src/presets/demos/15_3d_video_wall.js',
  './src/presets/subpatches.js',
  './src/ui/controller.js',
  './src/ui/dialogs/add-module-dialog.js',
  './src/ui/dialogs/alert-dialog.js',
  './src/ui/dialogs/numpad-dialog.js',
  './src/ui/helpers.js',
  './src/ui/json-io-dialog.js',
  './src/ui/managers/cable-manager.js',
  './src/ui/managers/dock-manager.js',
  './src/ui/managers/interaction-manager.js',
  './src/ui/managers/modal-manager.js',
  './src/ui/managers/page-manager.js',
  './src/ui/managers/preset-manager.js',
  './src/ui/managers/row-manager.js',
  './src/ui/managers/toolbar-manager.js',
  './src/ui/wave-modal.js',
  './src/ui/wave-view.js',
  './src/vendor/lame.min.js',
  './src/vendor/lucide.min.js',
  './src/vendor/tailwindcss.js',
  './src/vendor/three.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          const cleanUrl = new URL(req.url);
          cleanUrl.search = '';
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, clone.clone()).catch(() => {});
            cache.put(cleanUrl.toString(), clone).catch(() => {});
          });
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        if (req.mode === 'navigate') {
          return caches.match('./index.html', { ignoreSearch: true });
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});
