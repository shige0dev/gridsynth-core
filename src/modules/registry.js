/**
 * GridSynth Module Registry
 * Aggregates all modular definitions from ./defs/*.
 */

import { vcoDefs } from './defs/vco.js?v=348';
import { filterDefs } from './defs/filter.js?v=348';
import { ampDefs } from './defs/amp.js?v=348';
import { effectsDefs } from './defs/effects.js?v=348';
import { adsrDefs, ADSR_CURVES } from './defs/adsr.js?v=348';
import { modDefs } from './defs/mod.js?v=348';
import { ioDefs } from './defs/io.js?v=348';
import { scopeDefs } from './defs/scope.js?v=348';
import { subDefs } from './defs/sub.js?v=348';
import { controllerDefs } from './defs/controllers.js?v=348';
import { seqDefs } from './defs/seq.js?v=348';
import { chordDefs } from './defs/chord.js?v=348';
import { arpDefs } from './defs/arp.js?v=348';
import { patDefs } from './defs/pat.js?v=348';
import { markovDefs } from './defs/markov.js?v=348';
import { fmDefs } from './defs/fm.js?v=348';
import { scaleDefs } from './defs/scale.js?v=348';
import { rfDefs } from './defs/rf.js?v=348';
import { arDefs } from './defs/ar.js?v=348';
import { waveDefs } from './defs/wave.js?v=348';
import { padDefs } from './defs/pad.js?v=348';

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
