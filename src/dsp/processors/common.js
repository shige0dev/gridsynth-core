export const getSR = () => (typeof sampleRate !== 'undefined') ? sampleRate : 48000;

/**
 * Detects a positive-going step/spike (differentiated rising edge) on a signal.
 * Supports stacked/summed triggers (e.g. 0->1, 1->2, 2->3) while ignoring slow ramps.
 */
export const isRisingSpike = (val, prevVal, threshold = 0.4) => (val - prevVal) >= threshold;

