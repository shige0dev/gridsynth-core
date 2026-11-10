// src/audio/defs/mod.js
/**
 * Modulation & Logic Audio Definitions
 * Re-exports individual modules for modular organization and backward compatibility.
 */

export { LFO } from './lfo.js';
export { CLK } from './clk.js';
export { SWITCH, THROUGH, SH } from './sh.js';
export { MATH1, MATH2 } from './math.js';

import { LFO } from './lfo.js';
import { CLK } from './clk.js';
import { SWITCH, THROUGH, SH } from './sh.js';
import { MATH1, MATH2 } from './math.js';

export const modAudioDefs = {
    LFO,
    CLK,
    SWITCH,
    THROUGH,
    MATH1,
    MATH2,
    SH
};
