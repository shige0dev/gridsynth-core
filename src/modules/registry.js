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
import { scopeDefs } from './defs/scope.js?v=619';
import { subDefs } from './defs/sub.js?v=351';
import { controllerDefs } from './defs/controllers.js?v=616';
import { seqDefs } from './defs/seq.js?v=738';
import { chordDefs } from './defs/chord.js?v=641';
import { slct4Defs } from './defs/slct4.js?v=677';
import { dist4Defs } from './defs/dist4.js?v=470';
import { patDefs } from './defs/pat.js?v=564';
import { markovDefs } from './defs/markov.js?v=460';
import { fmDefs } from './defs/fm.js?v=351';
import { rfDefs } from './defs/rf.js?v=396';
import { arDefs } from './defs/ar.js?v=396';
import { waveDefs } from './defs/wave.js?v=402';
import { padDefs } from './defs/pad.js?v=618';
import { countDefs } from './defs/count.js?v=578';
import { lutDefs } from './defs/lut.js?v=619';
import { matrixDefs } from './defs/matrix.js?v=619';
import { valDefs } from './defs/val.js?v=618';
import { tiltDefs } from './defs/tilt.js?v=623';
import { geoDefs } from './defs/geo.js?v=766';
import { pathDefs } from './defs/path.js?v=771';
import { particleDefs } from './defs/particle.js?v=757';
import { rotateDefs } from './defs/rotate.js?v=689';
import { moveDefs } from './defs/move.js?v=701';
import { scaleDefs } from './defs/scale.js?v=702';
import { vertexDefs } from './defs/vertex.js?v=714';
import { scatterDefs } from './defs/scatter.js?v=714';
import { renderDefs } from './defs/render.js?v=768';
import { vfxDefs } from './defs/vfx.js?v=770';
import { vmixDefs } from './defs/vmix.js?v=753';
import { displayDefs } from './defs/display.js?v=699';

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
    ...slct4Defs,
    ...dist4Defs,
    ...patDefs,
    ...markovDefs,
    ...fmDefs,
    ...rfDefs,
    ...arDefs,
    ...waveDefs,
    ...padDefs,
    ...countDefs,
    ...lutDefs,
    ...matrixDefs,
    ...valDefs,
    ...tiltDefs,
    ...geoDefs,
    ...pathDefs,
    ...particleDefs,
    ...rotateDefs,
    ...moveDefs,
    ...scaleDefs,
    ...vertexDefs,
    ...scatterDefs,
    ...renderDefs,
    ...vfxDefs,
    ...vmixDefs,
    ...displayDefs
};

export { ADSR_CURVES };
export default MODULE_REGISTRY;
