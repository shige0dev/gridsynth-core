/**
 * GridSynth Audio Registry
 * Aggregates all audio module definitions from ./defs/*.js.
 */

import { vcoAudioDefs } from './defs/vco.js';
import { filterAudioDefs } from './defs/filter.js';
import { ampAudioDefs } from './defs/amp.js';
import { effectsAudioDefs } from './defs/effects.js';
import { adsrAudioDefs } from './defs/adsr.js';
import { modAudioDefs } from './defs/mod.js';
import { ioAudioDefs } from './defs/io.js';
import { seqAudioDefs } from './defs/seq.js';
import { patAudioDefs } from './defs/pat.js';
import { markovAudioDefs } from './defs/markov.js';
import { fmAudioDefs } from './defs/fm.js';

export const AUDIO_REGISTRY = {
    ...vcoAudioDefs,
    ...filterAudioDefs,
    ...ampAudioDefs,
    ...effectsAudioDefs,
    ...adsrAudioDefs,
    ...modAudioDefs,
    ...ioAudioDefs,
    ...seqAudioDefs,
    ...patAudioDefs,
    ...markovAudioDefs,
    ...fmAudioDefs
};

export default AUDIO_REGISTRY;
