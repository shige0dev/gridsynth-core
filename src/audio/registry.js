/**
 * GridSynth Audio Registry
 * Aggregates all audio module definitions from ./defs/*.js.
 */

import { vcoAudioDefs } from './defs/vco.js';
import { filterAudioDefs } from './defs/filter.js';
import { ampAudioDefs } from './defs/amp.js?v=187';
import { effectsAudioDefs } from './defs/effects.js?v=187';
import { adsrAudioDefs } from './defs/adsr.js';
import { modAudioDefs } from './defs/mod.js?v=259';
import { ioAudioDefs } from './defs/io.js?v=185';
import { seqAudioDefs } from './defs/seq.js';
import { chordAudioDefs } from './defs/chord.js';
import { arpAudioDefs } from './defs/arp.js';
import { patAudioDefs } from './defs/pat.js?v=217';
import { markovAudioDefs } from './defs/markov.js';
import { fmAudioDefs } from './defs/fm.js';
import { scaleAudioDefs } from './defs/scale.js?v=217';
import { rfAudioDefs } from './defs/rf.js?v=217';
import { arAudioDefs } from './defs/ar.js?v=217';
import { waveAudioDefs } from './defs/wave.js?v=259';

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
    ...fmAudioDefs,
    ...scaleAudioDefs,
    ...rfAudioDefs,
    ...arAudioDefs,
    ...waveAudioDefs
};

export default AUDIO_REGISTRY;

