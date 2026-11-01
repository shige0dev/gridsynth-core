// ============================================================================
// LUT Processor (AudioWorklet)
// Arbitrary Function Generator / Look-Up Table with Linear Interpolation
// ============================================================================

class LutProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.divisions = 16;
    this.quantize = false; // Pitch quantize (1V/Oct semitones: 1/12V)
    // Default table: 0..1
    this.table = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      this.table[i] = i / 255.0;
    }

    this.latestIn = 0;
    this.latestOut = 0;
    this.uiThrottleSamples = 0;

    this.port.onmessage = (e) => {
      const data = e.data;
      if (!data) return;
      if (data.type === 'SET_DIVISIONS') {
        const d = parseInt(data.value, 10);
        if ([16, 32, 64, 256].includes(d)) {
          this.divisions = d;
        }
      } else if (data.type === 'SET_QUANTIZE') {
        this.quantize = data.value === true;
      } else if (data.type === 'SET_TABLE') {
        if (Array.isArray(data.table) || data.table instanceof Float32Array) {
          const len = Math.min(256, data.table.length);
          for (let i = 0; i < len; i++) {
            this.table[i] = Math.max(0, Math.min(1, Number(data.table[i]) || 0));
          }
        }
      } else if (data.type === 'SET_POINT') {
        const idx = Math.max(0, Math.min(255, parseInt(data.index, 10)));
        const val = Math.max(0, Math.min(1, Number(data.value) || 0));
        this.table[idx] = val;
      }
    };
  }

  process(inputs, outputs, parameters) {
    // Inputs:
    // [0]: cv_in (PIN 5)
    // Outputs:
    // [0]: cv_out (PIN 10)

    const cvIn = inputs[0]?.[0];
    const cvOut = outputs[0]?.[0];
    const bufferLength = 128;
    const divs = this.divisions;
    const isQ = this.quantize === true;

    let lastSampleIn = 0;
    let lastSampleOut = 0;

    for (let i = 0; i < bufferLength; i++) {
      // Clamp input to 0.0 .. 1.0
      let rawIn = cvIn ? cvIn[i] : 0;
      if (rawIn < 0) rawIn = 0;
      if (rawIn > 1) rawIn = 1;
      lastSampleIn = rawIn;

      // Step mode: discrete bucket mapping
      let idx = Math.floor(rawIn * divs);
      if (idx >= divs) idx = divs - 1;
      // Map division index into 256 table space
      const slotW256 = 256 / divs;
      const tableIdx = Math.min(255, Math.floor(idx * slotW256));
      let outVal = this.table[tableIdx] ?? 0;

      // Pitch Quantize (1V/Oct semitones -> 1/12V step)
      if (isQ) {
        outVal = Math.round(outVal * 12) / 12.0;
      }

      lastSampleOut = outVal;
      if (cvOut) cvOut[i] = outVal;
    }

    this.latestIn = lastSampleIn;
    this.latestOut = lastSampleOut;

    // Send status to UI ~30fps
    this.uiThrottleSamples += bufferLength;
    if (this.uiThrottleSamples >= 1440) {
      this.uiThrottleSamples = 0;
      this.port.postMessage({
        type: 'LUT_STATUS',
        inVal: this.latestIn,
        outVal: this.latestOut
      });
    }

    return true;
  }
}

registerProcessor('lut-processor', LutProcessor);
