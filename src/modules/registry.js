/**
 * GridSynth Module Registry
 * Aggregates all modular definitions from ./defs/*.
 */

import { vcoDefs } from './defs/vco.js?v=350';
import { filterDefs } from './defs/filter.js?v=350';
import { ampDefs } from './defs/amp.js?v=350';
import { effectsDefs } from './defs/effects.js?v=350';
import { adsrDefs, ADSR_CURVES } from './defs/adsr.js?v=350';
import { modDefs } from './defs/mod.js?v=350';
import { ioDefs } from './defs/io.js?v=350';
import { scopeDefs } from './defs/scope.js?v=350';
import { subDefs } from './defs/sub.js?v=350';
import { controllerDefs } from './defs/controllers.js?v=350';
import { seqDefs } from './defs/seq.js?v=350';
import { chordDefs } from './defs/chord.js?v=350';
import { arpDefs } from './defs/arp.js?v=350';
import { patDefs } from './defs/pat.js?v=350';
import { markovDefs } from './defs/markov.js?v=350';
import { fmDefs } from './defs/fm.js?v=350';
import { scaleDefs } from './defs/scale.js?v=350';
import { rfDefs } from './defs/rf.js?v=350';
import { arDefs } from './defs/ar.js?v=350';
import { waveDefs } from './defs/wave.js?v=350';
import { padDefs } from './defs/pad.js?v=350';

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
