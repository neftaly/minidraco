// Ported from draco.js src/compression/entropy/RAnsSymbolDecoder.js (MIT)

import { RAnsDecoder } from './ANSCoding'

import type { DecoderBuffer } from '../../core/DecoderBuffer'

// rANS precision for the given unique-symbols bit length, clamped to [12, 20].
function computeRAnsPrecisionFromUniqueSymbolsBitLength(symbolsBitLength: number): number {
  const unclamped = Math.trunc((3 * symbolsBitLength) / 2)
  if (unclamped < 12) return 12
  if (unclamped > 20) return 20
  return unclamped
}

// Decodes symbols using rANS. uniqueSymbolsBitLength must match the encoder's.
export class RAnsSymbolDecoder {
  uniqueSymbolsBitLength_: number
  ransPrecisionBits_: number
  ransPrecision_: number
  numSymbols_: number
  ans_: RAnsDecoder

  constructor(uniqueSymbolsBitLength: number) {
    this.uniqueSymbolsBitLength_ = uniqueSymbolsBitLength
    this.ransPrecisionBits_ = computeRAnsPrecisionFromUniqueSymbolsBitLength(uniqueSymbolsBitLength)
    this.ransPrecision_ = 1 << this.ransPrecisionBits_
    this.numSymbols_ = 0
    this.ans_ = new RAnsDecoder(this.ransPrecisionBits_)
  }

  get numSymbols(): number {
    return this.numSymbols_
  }

  // Initialize the decoder and decode the probability table.
  create(buffer: DecoderBuffer): boolean {
    if (buffer.bitstreamVersion === 0) {
      return false
    }

    const val = buffer.decodeVarintUint32()
    if (val === undefined) return false
    this.numSymbols_ = val

    // Reject an unreasonably high symbol count.
    if (Math.trunc(this.numSymbols_ / 64) > buffer.remainingSize) {
      return false
    }

    const numSymbols = this.numSymbols_
    if (numSymbols === 0) {
      return true
    }
    const probabilityTable = this.ans_.ransAllocateTables(numSymbols)

    // Read via a local cursor instead of a decodeUint8() call per byte.
    const data = buffer.data!
    const startPos = buffer.decodedSize
    const endPos = startPos + buffer.remainingSize
    let pos = startPos
    for (let i = 0; i < numSymbols; ++i) {
      if (pos >= endPos) return false
      const probData = data[pos++]

      // Low 2 bits = token: 0-2 is the extra-byte count, 3 is run-length of zero-prob entries.
      const token = probData & 3
      if (token === 3) {
        const offset = probData >> 2
        if (i + offset >= numSymbols) {
          return false
        }
        probabilityTable.fill(0, i, i + offset + 1)
        i += offset
      } else {
        const extraBytes = token
        let prob = probData >> 2
        for (let b = 0; b < extraBytes; ++b) {
          if (pos >= endPos) return false
          // Shift 8 bits per extra byte, minus 2 for the two token bits.
          prob |= data[pos++] << (8 * (b + 1) - 2)
        }
        probabilityTable[i] = prob
      }
    }
    buffer.advance(pos - startPos)

    if (!this.ans_.ransBuildLookUpTable(this.numSymbols_)) {
      return false
    }
    return true
  }

  // Starts decoding, advancing buffer past the encoded data.
  startDecoding(buffer: DecoderBuffer): boolean {
    const bytesEncoded = buffer.decodeVarintUint64()
    if (bytesEncoded === undefined) return false

    if (bytesEncoded > buffer.remainingSize) {
      return false
    }

    // Absolute offsets into the source buffer — avoids a dataHead subarray
    // allocation per symbol decoder (thousands per primitive-heavy GLB).
    const base = buffer.decodedSize
    buffer.advance(Number(bytesEncoded))
    if (this.ans_.readInit(buffer.data, base + Number(bytesEncoded), base) !== 0) {
      return false
    }
    return true
  }

  endDecoding(): void {
    this.ans_.readEnd()
  }
}
