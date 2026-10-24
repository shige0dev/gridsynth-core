/**
 * GridSynth Audio Registry
 * Aggregates all audio module definitions from ./defs/*.js.
 */

import { vcoAudioDefs } from './defs/vco.js?v=349';
import { filterAudioDefs } from './defs/filter.js?v=349';
import { ampAudioDefs } from './defs/amp.js?v=349';
import { effectsAudioDefs } from './defs/effects.js?v=349';
import { adsrAudioDefs } from './defs/adsr.js?v=349';
import { modAudioDefs } from './defs/mod.js?v=349';
import { ioAudioDefs } from './defs/io.js?v=349';
import { scopeAudioDefs } from './defs/scope.js?v=349';
import { subAudioDefs } from './defs/sub.js?v=349';
import { controllerAudioDefs } from './defs/controllers.js?v=349';
import { seqAudioDefs } from './defs/seq.js?v=349';
import { chordAudioDefs } from './defs/chord.js?v=349';
import { arpAudioDefs } from './defs/arp.js?v=349';
import { patAudioDefs } from './defs/pat.js?v=349';
import { markovAudioDefs } from './defs/markov.js?v=349';
import { fmAudioDefs } from './defs/fm.js?v=349';
import { scaleAudioDefs } from './defs/scale.js?v=349';
import { rfAudioDefs } from './defs/rf.js?v=349';
import { arAudioDefs } from './defs/ar.js?v=349';
import { waveAudioDefs } from './defs/wave.js?v=349';
import { padAudioDefs } from './defs/pad.js?v=349';

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
