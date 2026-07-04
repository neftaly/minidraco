// Ported from draco.js src/compression/mesh/MeshEdgebreakerTraversalDecoder.js (MIT)

import { DecoderBuffer } from '../../core/DecoderBuffer'
import { RAnsBitDecoder } from '../bit_coders/RAnsBitDecoder'
import { TOPOLOGY_C } from './MeshEdgebreakerShared'

import type { MeshEdgebreakerDecoderImpl } from './MeshEdgebreakerDecoderImpl'

// Default traversal decoder: reads traversal data directly from a buffer.
class MeshEdgebreakerTraversalDecoder {
  _buffer: DecoderBuffer
  _symbolBuffer: DecoderBuffer
  _startFaceDecoder: RAnsBitDecoder | null
  _attributeConnectivityDecoders: RAnsBitDecoder[] | null
  _numAttributeData: number
  _decoderImpl: MeshEdgebreakerDecoderImpl | null

  constructor() {
    this._buffer = new DecoderBuffer()
    this._symbolBuffer = new DecoderBuffer()
    this._startFaceDecoder = null // RAnsBitDecoder
    this._attributeConnectivityDecoders = null // Array of RAnsBitDecoder
    this._numAttributeData = 0
    this._decoderImpl = null
  }

  init(decoder: MeshEdgebreakerDecoderImpl): void {
    this._decoderImpl = decoder
    const srcBuffer = decoder.getDecoder()!.buffer()!
    this._buffer.init(srcBuffer.dataHead, srcBuffer.remainingSize, srcBuffer.bitstreamVersion)
  }

  bitstreamVersion(): number {
    return this._decoderImpl!.getDecoder()!.bitstreamVersion()
  }

  // Ignored by default; overridden by predictive/valence decoders.
  setNumEncodedVertices(_numVertices: number): void {}

  setNumAttributeData(numData: number): void {
    this._numAttributeData = numData
  }

  // Sets outBuffer to the data encoded after the traversal section.
  start(outBuffer: DecoderBuffer): boolean {
    if (!this.decodeTraversalSymbols()) {
      return false
    }
    if (!this.decodeStartFaces()) {
      return false
    }
    if (!this.decodeAttributeSeams()) {
      return false
    }
    outBuffer.init(this._buffer.dataHead, this._buffer.remainingSize, this._buffer.bitstreamVersion)
    return true
  }

  decodeStartFaceConfiguration(): boolean {
    if (this._startFaceDecoder === null) return false
    return this._startFaceDecoder.decodeNextBit() ? true : false
  }

  decodeSymbol(): number {
    let symbol = this._symbolBuffer.decodeLeastSignificantBits32(1)!
    if (symbol === TOPOLOGY_C) {
      return symbol
    }
    // Non-C symbols carry two additional bits.
    const symbolSuffix = this._symbolBuffer.decodeLeastSignificantBits32(2)!
    symbol |= symbolSuffix << 1
    return symbol
  }

  newActiveCornerReached(_corner: number): void {}

  mergeVertices(_dest: number, _source: number): void {}

  done(): void {
    if (this._symbolBuffer.bitDecoderActive) {
      this._symbolBuffer.endBitDecoding()
    }
    if (this._startFaceDecoder !== null) {
      this._startFaceDecoder.endDecoding()
    }
  }

  get buffer(): DecoderBuffer {
    return this._buffer
  }

  decodeTraversalSymbols(): boolean {
    this._symbolBuffer.init(this._buffer.dataHead, this._buffer.remainingSize, this._buffer.bitstreamVersion)
    const traversalSize = this._symbolBuffer.startBitDecoding(true)
    if (traversalSize === undefined) {
      return false
    }
    // Advance the main buffer past the symbol data.
    this._buffer.init(
      this._symbolBuffer.dataHead,
      this._symbolBuffer.remainingSize,
      this._symbolBuffer.bitstreamVersion,
    )
    if (traversalSize > this._buffer.remainingSize) {
      return false
    }
    this._buffer.advance(traversalSize)
    return true
  }

  decodeStartFaces(): boolean {
    // Start faces are coded with an RAnsBitDecoder.
    try {
      this._startFaceDecoder = this._createRAnsBitDecoder()
      if (this._startFaceDecoder === null) {
        return false
      }
      return this._startFaceDecoder.startDecoding(this._buffer)
    } catch {
      return false
    }
  }

  decodeAttributeSeams(): boolean {
    if (this._numAttributeData > 0) {
      this._attributeConnectivityDecoders = []
      for (let i = 0; i < this._numAttributeData; ++i) {
        const decoder = this._createRAnsBitDecoder()
        if (decoder === null) {
          return false
        }
        if (!decoder.startDecoding(this._buffer)) {
          return false
        }
        this._attributeConnectivityDecoders.push(decoder)
      }
    }
    return true
  }

  _createRAnsBitDecoder(): RAnsBitDecoder | null {
    return new RAnsBitDecoder()
  }
}

export { MeshEdgebreakerTraversalDecoder }
