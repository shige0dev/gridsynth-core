/**
 * GridSynth Audio Registry
 * Aggregates all audio module definitions from ./defs/*.js.
 */

import { vcoAudioDefs } from './defs/vco.js?v=459';
import { filterAudioDefs } from './defs/filter.js?v=459';
import { ampAudioDefs } from './defs/amp.js?v=459';
import { effectsAudioDefs } from './defs/effects.js?v=459';
import { adsrAudioDefs } from './defs/adsr.js?v=459';
import { modAudioDefs } from './defs/mod.js?v=511';
import { ioAudioDefs } from './defs/io.js?v=459';
import { scopeAudioDefs } from './defs/scope.js?v=467';
import { subAudioDefs } from './defs/sub.js?v=459';
import { controllerAudioDefs } from './defs/controllers.js?v=459';
import { seqAudioDefs } from './defs/seq.js?v=737';
import { chordAudioDefs } from './defs/chord.js?v=641';
import { slct4AudioDefs } from './defs/slct4.js?v=677';
import { dist4AudioDefs } from './defs/dist4.js?v=470';
import { patAudioDefs } from './defs/pat.js?v=563';
import { markovAudioDefs } from './defs/markov.js?v=459';
import { fmAudioDefs } from './defs/fm.js?v=459';
import { rfAudioDefs } from './defs/rf.js?v=459';
import { arAudioDefs } from './defs/ar.js?v=459';
import { waveAudioDefs } from './defs/wave.js?v=459';
import { padAudioDefs } from './defs/pad.js?v=459';
import { countAudioDefs } from './defs/count.js?v=576';
import { lutAudioDefs } from './defs/lut.js?v=573';
import { matrixAudioDefs } from './defs/matrix.js?v=591';
import { valAudioDefs } from './defs/val.js?v=614';
import { tiltAudioDefs } from './defs/tilt.js?v=623';
import { geoAudioDefs } from './defs/geo.js?v=744';
import { particleAudioDefs } from './defs/particle.js?v=740';
import { rotateAudioDefs } from './defs/rotate.js?v=699';
import { moveAudioDefs } from './defs/move.js?v=701';
import { scaleAudioDefs } from './defs/scale.js?v=750';
import { vertexAudioDefs } from './defs/vertex.js?v=714';
import { scatterAudioDefs } from './defs/scatter.js?v=737';
import { renderAudioDefs } from './defs/render.js?v=751';
import { vfxAudioDefs } from './defs/vfx.js?v=709';
import { vmixAudioDefs } from './defs/vmix.js?v=752';
import { displayAudioDefs } from './defs/display.js?v=699';

export const AUDIO_REGISTRY = {
    ...vcoAudioDefs,
    ...filterAudioDefs,
    ...ampAudioDefs,
    ...effectsAudioDefs,
    ...adsrAudioDefs,
    ...modAudioDefs,
    ...ioAudioDefs,
    ...scopeAudioDefs,
    ...subAudioDefs,
    ...controllerAudioDefs,
    ...seqAudioDefs,
    ...chordAudioDefs,
    ...slct4AudioDefs,
    ...dist4AudioDefs,
    ...patAudioDefs,
    ...markovAudioDefs,
    ...fmAudioDefs,
    ...rfAudioDefs,
    ...arAudioDefs,
    ...waveAudioDefs,
    ...padAudioDefs,
    ...countAudioDefs,
    ...lutAudioDefs,
    ...matrixAudioDefs,
    ...valAudioDefs,
    ...tiltAudioDefs,
    ...geoAudioDefs,
    ...particleAudioDefs,
    ...rotateAudioDefs,
    ...moveAudioDefs,
    ...scaleAudioDefs,
    ...vertexAudioDefs,
    ...scatterAudioDefs,
    ...renderAudioDefs,
    ...vfxAudioDefs,
    ...vmixAudioDefs,
    ...displayAudioDefs
};

export default AUDIO_REGISTRY;
