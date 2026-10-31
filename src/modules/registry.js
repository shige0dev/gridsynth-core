/**
 * GridSynth Module Registry
 * Aggregates all modular definitions from ./defs/*.
 */

import { vcoDefs } from './defs/vco.js?v=351';
import { filterDefs } from './defs/filter.js?v=424';
import { ampDefs } from './defs/amp.js?v=436';
import { effectsDefs } from './defs/effects.js?v=424';
import { adsrDefs, ADSR_CURVES } from './defs/adsr.js?v=351';
import { modDefs } from './defs/mod.js?v=424';
import { ioDefs } from './defs/io.js?v=424';
import { scopeDefs } from './defs/scope.js?v=424';
import { subDefs } from './defs/sub.js?v=351';
import { controllerDefs } from './defs/controllers.js?v=355';
import { seqDefs } from './defs/seq.js?v=436';
import { chordDefs } from './defs/chord.js?v=351';
import { arpDefs } from './defs/arp.js?v=424';
import { state4Defs } from './defs/state4.js?v=429';
import { patDefs } from './defs/pat.js?v=351';
import { markovDefs } from './defs/markov.js?v=455';
import { fmDefs } from './defs/fm.js?v=351';
import { scaleDefs } from './defs/scale.js?v=351';
import { rfDefs } from './defs/rf.js?v=396';
import { arDefs } from './defs/ar.js?v=396';
import { waveDefs } from './defs/wave.js?v=402';
import { padDefs } from './defs/pad.js?v=351';

export const MODULE_REGISTRY = {
    ...vcoDefs,
    ...filterDefs,
    ...ampDefs,
    ...effectsDefs,
    ...adsrDefs,
    ...modDefs,
    ...ioDefs,
    ...scopeDefs,
    ...subDefs,
    ...controllerDefs,
    ...seqDefs,
    ...chordDefs,
    ...arpDefs,
    ...state4Defs,
    ...patDefs,
    ...markovDefs,
    ...fmDefs,
    ...scaleDefs,
    ...rfDefs,
    ...arDefs,
    ...waveDefs,
    ...padDefs
};

export { ADSR_CURVES };
export default MODULE_REGISTRY;
