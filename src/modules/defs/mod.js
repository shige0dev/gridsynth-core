// src/modules/defs/mod.js
/**
 * Modulation & Logic Module Definitions
 * Re-exports individual modules for modular organization and backward compatibility.
 */

export { LFO } from './lfo.js';
export { CLK } from './clk.js';
export { THROUGH, SH } from './sh.js';
export { MATH1, MATH2 } from './math.js';

import { LFO } from './lfo.js';
import { CLK } from './clk.js';
import { THROUGH, SH } from './sh.js';
import { MATH1, MATH2 } from './math.js';

export const modDefs = {
    LFO,
    CLK,
    THROUGH,
    MATH1,
    MATH2,
    SH
};
