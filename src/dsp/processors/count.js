// ============================================================================
// COUNT Processor (AudioWorklet)
// 256 Binary Counter / Frequency Divider with Carry Out and CV Output
// ============================================================================

class CountProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.count = 0;
    this.max = 16;       // Default 16 (0..15)
    this.prevClk = 0;
    this.prevReset = 0;

    // Carry pulse generator (15ms high on overflow/carry)
    this.carryCounter = 0;

    // Throttle UI notification (~30fps)
    this.uiThrottleSamples = 0;
    this.lastReportedCount = -1;

    this.port.onmessage = (e) => {
      const data = e.data;
      if (!data) return;
      if (data.type === 'SET_MAX') {
        const newMax = parseInt(data.value, 10);
        if (Number.isFinite(newMax) && newMax >= 1 && newMax <= 1024) {
          this.max = newMax;
          if (this.count >= this.max) {
            this.count = 0;
          }
        }
      } else if (data.type === 'RESET') {
        this.count = 0;
        this.carryCounter = 0;
      }
    };
  }

  process(inputs, outputs, parameters) {
    // Inputs:
    // [0]: clk_in (PIN 5)
    // [1]: reset_in (PIN 4)
    // Outputs:
    // [0]: cv_out (PIN 10)
    // [1]: carry_out (PIN 11)

    const clkIn = inputs[0]?.[0];
    const resetIn = inputs[1]?.[0];
    const cvOut = outputs[0]?.[0];
    const carryOut = outputs[1]?.[0];

    const bufferLength = 128;
    const pulseLengthSamples = Math.round(0.015 * 48000); // ~15ms = 720 samples

    for (let i = 0; i < bufferLength; i++) {
      const clkVal = clkIn ? clkIn[i] : 0;
      const resetVal = resetIn ? resetIn[i] : 0;

      // 1. Reset check (Rising edge > 0.3)
      if (resetVal >= 0.3 && this.prevReset < 0.3) {
        this.count = 0;
        this.carryCounter = 0;
      }
      this.prevReset = resetVal;

      // 2. Clock check (Rising edge > 0.3)
      if (clkVal >= 0.3 && this.prevClk < 0.3) {
        this.count++;
        if (this.count >= this.max) {
          this.count = 0;
          this.carryCounter = pulseLengthSamples; // Trigger carry pulse
        }
      }
      this.prevClk = clkVal;

      // 3. Carry pulse decrement
      let carrySig = 0;
      if (this.carryCounter > 0) {
        carrySig = 1.0;
        this.carryCounter--;
      }

      // 4. CV output: normalized 0.0V .. 1.0V (count / max)
      const cvVal = this.max > 0 ? (this.count / this.max) : 0;

      if (cvOut) cvOut[i] = cvVal;
      if (carryOut) carryOut[i] = carrySig;
    }

    // UI Message Throttling (~1440 samples = 30ms @ 48kHz)
    this.uiThrottleSamples += bufferLength;
    if (this.uiThrottleSamples >= 1440) {
      this.uiThrottleSamples = 0;
      if (this.count !== this.lastReportedCount) {
        this.lastReportedCount = this.count;
        this.port.postMessage({
          type: 'COUNT',
          count: this.count,
          max: this.max
        });
      }
    }

    return true;
  }
}

registerProcessor('count-processor', CountProcessor);
