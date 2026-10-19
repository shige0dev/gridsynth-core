/**
 * GridSynth Module Registry
 * Aggregates all modular definitions from ./defs/*.
 */

import { vcoDefs } from './defs/vco.js';
import { filterDefs } from './defs/filter.js?v=188';
import { ampDefs } from './defs/amp.js?v=187';
import { effectsDefs } from './defs/effects.js?v=187';
import { adsrDefs, ADSR_CURVES } from './defs/adsr.js';
import { modDefs } from './defs/mod.js?v=263';
import { ioDefs } from './defs/io.js?v=185';
import { seqDefs } from './defs/seq.js';
import { chordDefs } from './defs/chord.js';
import { arpDefs } from './defs/arp.js';
import { patDefs } from './defs/pat.js?v=217';
import { markovDefs } from './defs/markov.js';
import { fmDefs } from './defs/fm.js?v=187';
import { scaleDefs } from './defs/scale.js?v=217';
import { rfDefs } from './defs/rf.js?v=217';
import { arDefs } from './defs/ar.js?v=217';
import { waveDefs } from './defs/wave.js?v=263';

export const MODULE_REGISTRY = {
    ...vcoDefs,
    ...filterDefs,
    ...ampDefs,
    ...effectsDefs,
    ...adsrDefs,
    ...modDefs,
    ...ioDefs,
    ...seqDefs,
    ...chordDefs,
    ...arpDefs,
    ...patDefs,
    ...markovDefs,
    ...fmDefs,
    ...scaleDefs,
    ...rfDefs,
    ...arDefs,
    ...waveDefs
};

export { ADSR_CURVES };
export default MODULE_REGISTRY;

