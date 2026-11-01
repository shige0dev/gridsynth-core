// ============================================================================
// LUT Processor (AudioWorklet)
// Arbitrary Function Generator / Look-Up Table with Linear Interpolation
// ============================================================================

class LutProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.divisions = 16;
    this.interp = 'linear'; // 'step' | 'linear'
    // Default table: linear ramp 0..1
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
      } else if (data.type === 'SET_INTERP') {
        this.interp = data.value === 'step' ? 'step' : 'linear';
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
    const isStep = this.interp === 'step';

    let lastSampleIn = 0;
    let lastSampleOut = 0;

    for (let i = 0; i < bufferLength; i++) {
      // Clamp input to 0.0 .. 1.0
      let rawIn = cvIn ? cvIn[i] : 0;
      if (rawIn < 0) rawIn = 0;
      if (rawIn > 1) rawIn = 1;
      lastSampleIn = rawIn;

      let outVal = 0;
      if (isStep) {
        // Step mode: discrete bucket mapping
        let idx = Math.floor(rawIn * divs);
        if (idx >= divs) idx = divs - 1;
        // Map division index into 256 table space
        const tableIdx = Math.floor((idx / (divs - 1 || 1)) * 255);
        outVal = this.table[tableIdx] ?? 0;
      } else {
        // Linear interpolation between the discrete divisions
        const pos = rawIn * (divs - 1);
        const idxLow = Math.floor(pos);
        const idxHigh = Math.min(divs - 1, idxLow + 1);
        const frac = pos - idxLow;

        const tableIdxLow = Math.floor((idxLow / (divs - 1 || 1)) * 255);
        const tableIdxHigh = Math.floor((idxHigh / (divs - 1 || 1)) * 255);

        const v0 = this.table[tableIdxLow] ?? 0;
        const v1 = this.table[tableIdxHigh] ?? 0;
        outVal = v0 + (v1 - v0) * frac;
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
