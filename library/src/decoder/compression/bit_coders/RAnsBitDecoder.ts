// Ported from draco.js src/compression/bit_coders/RAnsBitDecoder.js (MIT)

import { AnsDecoder, ansReadInit, ansReadEnd, ANS_L_BASE, ANS_P8_PRECISION } from '../entropy/ANSCoding'

import type { DecoderBuffer } from '../../core/DecoderBuffer'

// Decodes bits encoded with RAnsBitEncoder.
export class RAnsBitDecoder {
  ansDecoder_: AnsDecoder
  probZero_: number
  p_: number

  constructor() {
    this.ansDecoder_ = new AnsDecoder()
    this.probZero_ = 0
    this.p_ = 0 // ANS_P8_PRECISION - probZero, precomputed
  }

  // Returns false when the data is invalid.
  startDecoding(sourceBuffer: DecoderBuffer): boolean {
    this.clear()

    const probZero = sourceBuffer.decodeUint8()
    if (probZero === undefined) {
      return false
    }
    this.probZero_ = probZero
    this.p_ = ANS_P8_PRECISION - probZero

    const sizeInBytes = sourceBuffer.decodeVarintUint32()
    if (sizeInBytes === undefined) return false

    if (sizeInBytes > sourceBuffer.remainingSize) {
      return false
    }

    // Absolute offsets into the source buffer — avoids a dataHead subarray
    // allocation per bit decoder.
    const base = sourceBuffer.decodedSize
    if (ansReadInit(this.ansDecoder_, sourceBuffer.data, base + sizeInBytes, base) !== 0) {
      return false
    }
    sourceBuffer.advance(sizeInBytes)
    return true
  }

  decodeNextBit(): boolean {
    const ans = this.ansDecoder_
    const p = this.p_
    if (ans.state < ANS_L_BASE && ans.bufOffset > ans.bufStart) {
      ans.state = (ans.state << 8) | ans.buf![--ans.bufOffset]
    }
    const x = ans.state
    const quot = x >>> 8
    const rem = x & 0xff
    const xn = quot * p
    if (rem < p) {
      ans.state = xn + rem
      return true
    }
    ans.state = x - xn - p
    return false
  }

  endDecoding(): void {}

  clear(): void {
    ansReadEnd(this.ansDecoder_)
  }
}
