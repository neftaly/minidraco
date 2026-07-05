// Ported from draco.js src/compression/mesh/MeshEdgebreakerTraversalPredictiveDecoder.js (MIT)

import { scratchInt32 } from '../../core/ScratchArena'
import { TOPOLOGY_C, TOPOLOGY_S, TOPOLOGY_L, TOPOLOGY_R, TOPOLOGY_E } from './MeshEdgebreakerShared'
import { MeshEdgebreakerTraversalDecoder } from './MeshEdgebreakerTraversalDecoder'

import type { DecoderBuffer } from '../../core/DecoderBuffer'
import type { RAnsBitDecoder } from '../bit_coders/RAnsBitDecoder'
import type { CornerTable, MeshEdgebreakerDecoderImpl } from './MeshEdgebreakerDecoderImpl'

// Decoder for traversal encoded with the
// MeshEdgebreakerTraversalPredictiveEncoder. The decoder maintains valences
// of the decoded portion of the traversed mesh and it uses them to predict
// symbols that are about to be decoded.
class MeshEdgebreakerTraversalPredictiveDecoder extends MeshEdgebreakerTraversalDecoder {
  _cornerTable: CornerTable | null
  _numVertices: number
  _lastSymbol: number
  _predictedSymbol: number
  _vertexValences: Int32Array
  _predictionDecoder: RAnsBitDecoder | null

  constructor() {
    super()
    this._cornerTable = null
    this._numVertices = 0
    this._lastSymbol = -1
    this._predictedSymbol = -1
    this._vertexValences = new Int32Array(0)
    this._predictionDecoder = null // RAnsBitDecoder
  }

  override init(decoder: MeshEdgebreakerDecoderImpl): void {
    super.init(decoder)
    this._cornerTable = decoder.getCornerTable()
  }

  override setNumEncodedVertices(numVertices: number): void {
    this._numVertices = numVertices
  }

  override start(outBuffer: DecoderBuffer): boolean {
    if (!super.start(outBuffer)) {
      return false
    }
    const numSplitSymbols = outBuffer.decodeInt32()
    if (numSplitSymbols === undefined || numSplitSymbols < 0) {
      return false
    }
    if (numSplitSymbols >= this._numVertices) {
      return false
    }
    this._vertexValences = scratchInt32(this._numVertices).fill(0)
    this._predictionDecoder = this._createRAnsBitDecoder()
    if (this._predictionDecoder === null) {
      return false
    }
    if (!this._predictionDecoder.startDecoding(outBuffer)) {
      return false
    }
    return true
  }

  override decodeSymbol(): number {
    if (this._predictedSymbol !== -1) {
      // The bit confirms whether the prediction was correct.
      if (this._predictionDecoder!.decodeNextBit()) {
        this._lastSymbol = this._predictedSymbol
        return this._predictedSymbol
      }
    }
    // No prediction or mis-predicted: decode directly.
    this._lastSymbol = super.decodeSymbol()
    return this._lastSymbol
  }

  override newActiveCornerReached(corner: number): void {
    const cornerToVertex = this._cornerTable!._cornerToVertex!
    const valences = this._vertexValences
    const next = corner % 3 === 2 ? corner - 2 : corner + 1
    const prev = corner % 3 === 0 ? corner + 2 : corner - 1
    const vertNext = cornerToVertex[next]
    const vertPrev = cornerToVertex[prev]

    switch (this._lastSymbol) {
      case TOPOLOGY_C:
      case TOPOLOGY_S:
        valences[vertNext] += 1
        valences[vertPrev] += 1
        break
      case TOPOLOGY_R:
        valences[cornerToVertex[corner]] += 1
        valences[vertNext] += 1
        valences[vertPrev] += 2
        break
      case TOPOLOGY_L:
        valences[cornerToVertex[corner]] += 1
        valences[vertNext] += 2
        valences[vertPrev] += 1
        break
      case TOPOLOGY_E:
        valences[cornerToVertex[corner]] += 2
        valences[vertNext] += 2
        valences[vertPrev] += 2
        break
      default:
        break
    }

    if (this._lastSymbol === TOPOLOGY_C || this._lastSymbol === TOPOLOGY_R) {
      if (valences[vertNext] < 6) {
        this._predictedSymbol = TOPOLOGY_R
      } else {
        this._predictedSymbol = TOPOLOGY_C
      }
    } else {
      this._predictedSymbol = -1
    }
  }

  override mergeVertices(dest: number, source: number): void {
    this._vertexValences[dest] += this._vertexValences[source]
  }
}

export { MeshEdgebreakerTraversalPredictiveDecoder }
