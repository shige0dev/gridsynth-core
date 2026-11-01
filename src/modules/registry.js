/**
 * GridSynth Module Registry
 * Aggregates all modular definitions from ./defs/*.
 */

import { vcoDefs } from './defs/vco.js?v=351';
import { filterDefs } from './defs/filter.js?v=424';
import { ampDefs } from './defs/amp.js?v=436';
import { effectsDefs } from './defs/effects.js?v=424';
import { adsrDefs, ADSR_CURVES } from './defs/adsr.js?v=351';
import { modDefs } from './defs/mod.js?v=514';
import { ioDefs } from './defs/io.js?v=424';
import { scopeDefs } from './defs/scope.js?v=467';
import { subDefs } from './defs/sub.js?v=351';
import { controllerDefs } from './defs/controllers.js?v=355';
import { seqDefs } from './defs/seq.js?v=436';
import { chordDefs } from './defs/chord.js?v=351';
import { arpDefs } from './defs/arp.js?v=424';
import { dist4Defs } from './defs/dist4.js?v=470';
import { patDefs } from './defs/pat.js?v=514';
import { pat2Defs } from './defs/pat2.js?v=517';
import { markovDefs } from './defs/markov.js?v=460';
import { fmDefs } from './defs/fm.js?v=351';
import { scaleDefs } from './defs/scale.js?v=351';
import { rfDefs } from './defs/rf.js?v=396';
import { arDefs } from './defs/ar.js?v=396';
import { waveDefs } from './defs/wave.js?v=402';
import { padDefs } from './defs/pad.js?v=351';
import { countDefs } from './defs/count.js?v=510';
import { lutDefs } from './defs/lut.js?v=510';
import { JOG } from './defs/jog.js?v=494';

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
    ...dist4Defs,
    ...patDefs,
    ...pat2Defs,
    ...markovDefs,
    ...fmDefs,
    ...scaleDefs,
    ...rfDefs,
    ...arDefs,
    ...waveDefs,
    ...padDefs,
    ...countDefs,
    ...lutDefs,
    JOG
};

export { ADSR_CURVES };
export default MODULE_REGISTRY;
