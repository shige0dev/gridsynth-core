/**
 * GridSynth Audio Registry
 * Aggregates all audio module definitions from ./defs/*.js.
 */

import { vcoAudioDefs } from './defs/vco.js';
import { filterAudioDefs } from './defs/filter.js';
import { ampAudioDefs } from './defs/amp.js?v=187';
import { effectsAudioDefs } from './defs/effects.js?v=187';
import { adsrAudioDefs } from './defs/adsr.js';
import { modAudioDefs } from './defs/mod.js';
import { ioAudioDefs } from './defs/io.js?v=185';
import { seqAudioDefs } from './defs/seq.js';
import { chordAudioDefs } from './defs/chord.js';
import { arpAudioDefs } from './defs/arp.js';
import { patAudioDefs } from './defs/pat.js?v=194';
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
    ...chordAudioDefs,
    ...arpAudioDefs,
    ...patAudioDefs,
    ...markovAudioDefs,
    ...fmAudioDefs
};

export default AUDIO_REGISTRY;
