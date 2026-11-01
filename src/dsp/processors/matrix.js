// ============================================================================
// MATRIX Processor (AudioWorklet)
// 4-Track Gate / Trigger Matrix Sequencer driven by CV scan
// ============================================================================

class MatrixProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.divisions = 16; // 16, 32, 64
    // 4 tracks x 64 steps bitmap/state
    this.patterns = [
      new Uint8Array(64),
      new Uint8Array(64),
      new Uint8Array(64),
      new Uint8Array(64)
    ];

    // Default basic groove on 16 steps
    // Track 1 (BD): 0, 4, 8, 12
    [0, 4, 8, 12].forEach(s => { this.patterns[0][s] = 1; });
    // Track 2 (SD): 4, 12
    [4, 12].forEach(s => { this.patterns[1][s] = 1; });
    // Track 3 (CH): every 2 steps (0, 2, 4, 6, ...)
    for (let s = 0; s < 16; s += 2) { this.patterns[2][s] = 1; }
    // Track 4 (OH): 2, 6, 10, 14
    [2, 6, 10, 14].forEach(s => { this.patterns[3][s] = 1; });

    this.trackModes = ['gate', 'gate', 'gate', 'gate']; // 'gate' or 'trig'
    this.pulseCounters = [0, 0, 0, 0];
    this.pulseLengthSamples = Math.round(0.015 * 48000); // 15ms pulse

    this.lastSlot = -1;
    this.uiThrottleSamples = 0;
    this.latestSlot = 0;

    this.port.onmessage = (e) => {
      const data = e.data;
      if (!data) return;
      if (data.type === 'SET_DIVISIONS') {
        const d = parseInt(data.value, 10);
        if ([16, 32, 64].includes(d)) {
          this.divisions = d;
        }
      } else if (data.type === 'SET_PATTERNS') {
        if (Array.isArray(data.patterns) && data.patterns.length === 4) {
          for (let t = 0; t < 4; t++) {
            const arr = data.patterns[t];
            if (Array.isArray(arr) || arr instanceof Uint8Array) {
              const len = Math.min(64, arr.length);
              for (let i = 0; i < len; i++) {
                this.patterns[t][i] = arr[i] ? 1 : 0;
              }
            }
          }
        }
      } else if (data.type === 'SET_CELL') {
        const t = Math.max(0, Math.min(3, parseInt(data.track, 10) || 0));
        const s = Math.max(0, Math.min(63, parseInt(data.step, 10) || 0));
        this.patterns[t][s] = data.value ? 1 : 0;
      } else if (data.type === 'SET_MODES') {
        if (Array.isArray(data.modes)) {
          for (let t = 0; t < 4; t++) {
            this.trackModes[t] = data.modes[t] === 'trig' ? 'trig' : 'gate';
          }
        }
      }
    };
  }

  process(inputs, outputs, parameters) {
    // Inputs:
    // [0]: cv_in (PIN 5)
    // Outputs:
    // [0]: out_1 (PIN 10)
    // [1]: out_2 (PIN 11)
    // [2]: out_3 (PIN 12)
    // [3]: out_4 (PIN 13)

    const cvIn = inputs[0]?.[0];
    const out1 = outputs[0]?.[0];
    const out2 = outputs[1]?.[0];
    const out3 = outputs[2]?.[0];
    const out4 = outputs[3]?.[0];
    const outs = [out1, out2, out3, out4];

    const bufferLength = 128;
    const divs = this.divisions;

    for (let i = 0; i < bufferLength; i++) {
      let rawIn = cvIn ? cvIn[i] : 0;
      if (rawIn < 0) rawIn = 0;
      if (rawIn > 1) rawIn = 1;

      // Slot index calculation with epsilon protection
      let slot = Math.floor(rawIn * divs + 0.0001);
      if (slot >= divs) slot = divs - 1;
      if (slot < 0) slot = 0;

      this.latestSlot = slot;

      for (let t = 0; t < 4; t++) {
        // Continuous CV: 1.0 while CV IN stays within ON cell, 0.0 when in OFF cell
        const isStepOn = (this.patterns[t][slot] === 1);
        const sig = isStepOn ? 1.0 : 0.0;
        if (outs[t]) outs[t][i] = sig;
      }
    }

    // UI status report ~30fps
    this.uiThrottleSamples += bufferLength;
    if (this.uiThrottleSamples >= 1440) {
      this.uiThrottleSamples = 0;
      this.port.postMessage({
        type: 'MATRIX_STATUS',
        slot: this.latestSlot
      });
    }

    return true;
  }
}

registerProcessor('matrix-processor', MatrixProcessor);

