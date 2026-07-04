// Ported from draco.js src/compression/mesh/MeshEdgebreakerDecoder.js (MIT)

import { MeshEdgebreakerConnectivityEncodingMethod } from '../config/CompressionShared'
import { MeshDecoder } from './MeshDecoder'
import { MeshEdgebreakerDecoderImpl } from './MeshEdgebreakerDecoderImpl'
import { MeshEdgebreakerTraversalDecoder } from './MeshEdgebreakerTraversalDecoder'
import { MeshEdgebreakerTraversalPredictiveDecoder } from './MeshEdgebreakerTraversalPredictiveDecoder'
import { MeshEdgebreakerTraversalValenceDecoder } from './MeshEdgebreakerTraversalValenceDecoder'

import type { MeshAttributeCornerTable } from '../../mesh/MeshAttributeCornerTable'
import type { CornerTable, MeshAttributeIndicesEncodingData } from './MeshEdgebreakerDecoderImpl'

class MeshEdgebreakerDecoder extends MeshDecoder {
  _impl: MeshEdgebreakerDecoderImpl | null

  constructor() {
    super()
    this._impl = null
  }

  override getCornerTable(): CornerTable | null {
    return this._impl ? this._impl.getCornerTable() : null
  }

  override getAttributeCornerTable(attId: number): MeshAttributeCornerTable | null {
    return this._impl ? this._impl.getAttributeCornerTable(attId) : null
  }

  override getAttributeEncodingData(attId: number): MeshAttributeIndicesEncodingData | null {
    return this._impl ? this._impl.getAttributeEncodingData(attId) : null
  }

  override initializeDecoder(): boolean {
    const traversalDecoderType = this.buffer()!.decodeUint8()
    if (traversalDecoderType === undefined) {
      return false
    }

    this._impl = null

    if (traversalDecoderType === MeshEdgebreakerConnectivityEncodingMethod.MESH_EDGEBREAKER_STANDARD_ENCODING) {
      this._impl = new MeshEdgebreakerDecoderImpl(MeshEdgebreakerTraversalDecoder)
    } else if (
      traversalDecoderType === MeshEdgebreakerConnectivityEncodingMethod.MESH_EDGEBREAKER_PREDICTIVE_ENCODING
    ) {
      this._impl = new MeshEdgebreakerDecoderImpl(MeshEdgebreakerTraversalPredictiveDecoder)
    } else if (traversalDecoderType === MeshEdgebreakerConnectivityEncodingMethod.MESH_EDGEBREAKER_VALENCE_ENCODING) {
      this._impl = new MeshEdgebreakerDecoderImpl(MeshEdgebreakerTraversalValenceDecoder)
    }

    if (!this._impl) {
      return false
    }
    if (!this._impl.init(this)) {
      return false
    }
    return true
  }

  override createAttributesDecoder(attDecoderId: number): boolean {
    return this._impl!.createAttributesDecoder(attDecoderId)
  }

  override decodeConnectivity(): boolean {
    return this._impl!.decodeConnectivity()
  }

  override onAttributesDecoded(): boolean {
    return this._impl!.onAttributesDecoded()
  }
}

export { MeshEdgebreakerDecoder }
