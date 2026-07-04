// Ported from draco.js src/compression/attributes/prediction_schemes/PredictionSchemeWrapDecodingTransform.js (MIT)

import { PredictionSchemeTransformType } from '../../config/CompressionShared'

import type { DecoderBuffer } from '../../../core/DecoderBuffer'

// Unwraps values encoded with the wrap transform: the encoder stored a
// correction wrapped into the data range; decoding adds it to the prediction
// and wraps the result back into [min, max].
class PredictionSchemeWrapDecodingTransform {
  _numComponents: number
  _minValue: number
  _maxValue: number
  _maxDif: number

  constructor() {
    this._numComponents = 0
    this._minValue = 0
    this._maxValue = 0
    this._maxDif = 0
  }

  getType(): number {
    return PredictionSchemeTransformType.PREDICTION_TRANSFORM_WRAP
  }

  init(numComponents: number): void {
    this._numComponents = numComponents
  }

  areCorrectionsPositive(): boolean {
    return false
  }

  computeOriginalValue(
    predictedVals: Int32Array,
    predictedOffset: number,
    corrVals: Int32Array,
    corrOffset: number,
    outOriginalVals: Int32Array,
    outOffset: number,
  ): void {
    const nc = this._numComponents
    const minValue = this._minValue
    const maxValue = this._maxValue
    const maxDif = this._maxDif
    for (let i = 0; i < nc; ++i) {
      let pred = predictedVals[predictedOffset + i]
      if (pred > maxValue) {
        pred = maxValue
      } else if (pred < minValue) {
        pred = minValue
      }
      // 32-bit (| 0) arithmetic to avoid signed overflow.
      let orig = (pred + corrVals[corrOffset + i]) | 0
      if (orig > maxValue) {
        orig -= maxDif
      } else if (orig < minValue) {
        orig += maxDif
      }
      outOriginalVals[outOffset + i] = orig
    }
  }

  decodeTransformData(buffer: DecoderBuffer): boolean {
    const minValue = buffer.decodeInt32()
    if (minValue === undefined) return false
    const maxValue = buffer.decodeInt32()
    if (maxValue === undefined) return false
    if (minValue > maxValue) return false

    this._minValue = minValue
    this._maxValue = maxValue
    return this._initCorrectionBounds()
  }

  _initCorrectionBounds(): boolean {
    const dif = this._maxValue - this._minValue
    if (dif < 0 || dif >= 0x7fffffff) {
      return false
    }
    this._maxDif = 1 + dif
    return true
  }
}

export { PredictionSchemeWrapDecodingTransform }
