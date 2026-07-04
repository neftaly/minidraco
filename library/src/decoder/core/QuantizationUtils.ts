// Ported from draco.js src/core/QuantizationUtils.js (MIT)
// (Decoder-only: the encoder-side Quantizer is not ported.)

export class Dequantizer {
  _delta: number

  constructor() {
    this._delta = 1.0
  }

  initFromRange(range: number, maxQuantizedValue: number): boolean {
    if (maxQuantizedValue <= 0) return false
    // C++ computes delta_ as `range / static_cast<float>(max_quantized_value)` in float32.
    // JS double division is 1-2 ULP off the WASM decoder, so fround every step.
    this._delta = Math.fround(range / Math.fround(maxQuantizedValue))
    return true
  }

  get delta(): number {
    return this._delta
  }
}
