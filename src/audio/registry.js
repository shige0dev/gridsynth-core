/**
 * GridSynth Audio Registry
 * Aggregates all audio module definitions from ./defs/*.js.
 */

import { vcoAudioDefs } from './defs/vco.js?v=351';
import { filterAudioDefs } from './defs/filter.js?v=351';
import { ampAudioDefs } from './defs/amp.js?v=351';
import { effectsAudioDefs } from './defs/effects.js?v=351';
import { adsrAudioDefs } from './defs/adsr.js?v=351';
import { modAudioDefs } from './defs/mod.js?v=424';
import { ioAudioDefs } from './defs/io.js?v=424';
import { scopeAudioDefs } from './defs/scope.js?v=353';
import { subAudioDefs } from './defs/sub.js?v=351';
import { controllerAudioDefs } from './defs/controllers.js?v=355';
import { seqAudioDefs } from './defs/seq.js?v=424';
import { countAudioDefs } from './defs/count.js?v=429';
import { chordAudioDefs } from './defs/chord.js?v=351';
import { arpAudioDefs } from './defs/arp.js?v=424';
import { state4AudioDefs } from './defs/state4.js?v=429';
import { patAudioDefs } from './defs/pat.js?v=351';
import { markovAudioDefs } from './defs/markov.js?v=424';
import { fmAudioDefs } from './defs/fm.js?v=351';
import { scaleAudioDefs } from './defs/scale.js?v=351';
import { rfAudioDefs } from './defs/rf.js?v=351';
import { arAudioDefs } from './defs/ar.js?v=351';
import { waveAudioDefs } from './defs/wave.js?v=351';
import { padAudioDefs } from './defs/pad.js?v=351';

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
    ...countAudioDefs,
    ...chordAudioDefs,
    ...arpAudioDefs,
    ...state4AudioDefs,
    ...patAudioDefs,
    ...markovAudioDefs,
    ...fmAudioDefs,
    ...scaleAudioDefs,
    ...rfAudioDefs,
    ...arAudioDefs,
    ...waveAudioDefs,
    ...padAudioDefs
};

export default AUDIO_REGISTRY;
