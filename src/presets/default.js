import { preset01 } from './demos/01_delay_techno.js?v=349';
import { preset02 } from './demos/02_keyboard_lead.js?v=349';
import { preset03 } from './demos/03_wavefold_ar_fr.js?v=349';
import { preset04 } from './demos/04_random_sh_delay.js?v=349';
import { preset05 } from './demos/05_subpatch_multi_groove.js?v=349';
import { preset06 } from './demos/06_strudel_house_bassline.js?v=349';
import { preset07 } from './demos/07_dub_techno_deep_space.js?v=349';
import { preset08 } from './demos/08_markov_generative_chains.js?v=349';
import { preset09 } from './demos/09_fm_heavy_techno_groove.js?v=349';
import { preset10 } from './demos/10_fm_simple_test.js?v=349';
import { preset11 } from './demos/11_fmcore_2op_demo.js?v=349';
import { preset12 } from './demos/12_chord_arpeggio.js?v=349';
import { preset13 } from './demos/13_wave_chop.js?v=349';
import { preset14 } from './demos/14_16_pad_drumkit.js?v=349';

export const getDefaultPresets = () => ({
    '01_DELAY_TECHNO': preset01,
    '02_KEYBOARD_LEAD': preset02,
    '03_WAVEFOLD_AR_FR': preset03,
    '04_RANDOM_SH_DELAY': preset04,
    '05_SUBPATCH_MULTI_GROOVE': preset05,
    '06_STRUDEL_HOUSE_BASSLINE': preset06,
    '07_DUB_TECHNO_DEEP_SPACE': preset07,
    '08_MARKOV_GENERATIVE_CHAINS': preset08,
    '09_FM_HEAVY_TECHNO': preset09,
    '10_FM_CRYSTAL_GROOVE': preset10,
    '11_FMCORE_2OP_DEMO': preset11,
    '12_CHORD_ARPEGGIO': preset12,
    '13_WAVE_CHOP': preset13,
    '14_16_PAD_DRUMKIT': preset14
});
