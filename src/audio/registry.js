/**
 * GridSynth Audio Registry
 * Aggregates all audio module definitions from ./defs/*.js.
 */

import { vcoAudioDefs } from './defs/vco.js?v=348';
import { filterAudioDefs } from './defs/filter.js?v=348';
import { ampAudioDefs } from './defs/amp.js?v=348';
import { effectsAudioDefs } from './defs/effects.js?v=348';
import { adsrAudioDefs } from './defs/adsr.js?v=348';
import { modAudioDefs } from './defs/mod.js?v=348';
import { ioAudioDefs } from './defs/io.js?v=348';
import { scopeAudioDefs } from './defs/scope.js?v=348';
import { subAudioDefs } from './defs/sub.js?v=348';
import { controllerAudioDefs } from './defs/controllers.js?v=348';
import { seqAudioDefs } from './defs/seq.js?v=348';
import { chordAudioDefs } from './defs/chord.js?v=348';
import { arpAudioDefs } from './defs/arp.js?v=348';
import { patAudioDefs } from './defs/pat.js?v=348';
import { markovAudioDefs } from './defs/markov.js?v=348';
import { fmAudioDefs } from './defs/fm.js?v=348';
import { scaleAudioDefs } from './defs/scale.js?v=348';
import { rfAudioDefs } from './defs/rf.js?v=348';
import { arAudioDefs } from './defs/ar.js?v=348';
import { waveAudioDefs } from './defs/wave.js?v=348';
import { padAudioDefs } from './defs/pad.js?v=348';

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
    ...arpAudioDefs,
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
