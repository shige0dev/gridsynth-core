// src/modules/defs/mod.js
/**
 * Modulation & Logic Module Definitions
 * Re-exports individual modules for modular organization and backward compatibility.
 */

export { LFO } from './lfo.js';
export { CLK } from './clk.js';
export { SWITCH, SH } from './sh.js';
export { MATH1, MATH2 } from './math.js';

import { LFO } from './lfo.js';
import { CLK } from './clk.js';
import { SWITCH, SH } from './sh.js';
import { MATH1, MATH2 } from './math.js';

export const modDefs = {
    LFO,
    CLK,
    SWITCH,
    MATH1,
    MATH2,
    SH
};
