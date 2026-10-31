/**
 * GridSynth Audio Registry
 * Aggregates all audio module definitions from ./defs/*.js.
 */

import { vcoAudioDefs } from './defs/vco.js?v=459';
import { filterAudioDefs } from './defs/filter.js?v=459';
import { ampAudioDefs } from './defs/amp.js?v=459';
import { effectsAudioDefs } from './defs/effects.js?v=459';
import { adsrAudioDefs } from './defs/adsr.js?v=459';
import { modAudioDefs } from './defs/mod.js?v=459';
import { ioAudioDefs } from './defs/io.js?v=459';
import { scopeAudioDefs } from './defs/scope.js?v=467';
import { subAudioDefs } from './defs/sub.js?v=459';
import { controllerAudioDefs } from './defs/controllers.js?v=459';
import { seqAudioDefs } from './defs/seq.js?v=459';
import { chordAudioDefs } from './defs/chord.js?v=459';
import { arpAudioDefs } from './defs/arp.js?v=459';
import { state4AudioDefs } from './defs/state4.js?v=459';
import { patAudioDefs } from './defs/pat.js?v=467';
import { markovAudioDefs } from './defs/markov.js?v=459';
import { fmAudioDefs } from './defs/fm.js?v=459';
import { scaleAudioDefs } from './defs/scale.js?v=459';
import { rfAudioDefs } from './defs/rf.js?v=459';
import { arAudioDefs } from './defs/ar.js?v=459';
import { waveAudioDefs } from './defs/wave.js?v=459';
import { padAudioDefs } from './defs/pad.js?v=459';

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
