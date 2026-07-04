// Ported from draco.js src/compression/mesh/MeshDecoder.js (MIT)

import { EncodedGeometryType } from '../config/CompressionShared'
import { PointCloudDecoder } from '../point_cloud/PointCloudDecoder'

import type { DecoderBuffer } from '../../core/DecoderBuffer'
import type { Status } from '../../core/Status'
import type { Mesh } from '../../mesh/Mesh'
import type { MeshAttributeCornerTable } from '../../mesh/MeshAttributeCornerTable'
import type { DecoderOptions } from '../config/DecoderOptions'
import type { CornerTable, MeshAttributeIndicesEncodingData } from './MeshEdgebreakerDecoderImpl'

class MeshDecoder extends PointCloudDecoder {
  _mesh: Mesh | null

  constructor() {
    super()
    this._mesh = null
  }

  override getGeometryType(): number {
    return EncodedGeometryType.TRIANGULAR_MESH
  }

  decodeMesh(options: DecoderOptions, inBuffer: DecoderBuffer, outMesh: Mesh): Status {
    this._mesh = outMesh
    return this.decode(options, inBuffer, outMesh)
  }

  getCornerTable(): CornerTable | null {
    return null
  }

  getAttributeCornerTable(_attId: number): MeshAttributeCornerTable | null {
    return null
  }

  getAttributeEncodingData(_attId: number): MeshAttributeIndicesEncodingData | null {
    return null
  }

  mesh(): Mesh | null {
    return this._mesh
  }

  override decodeGeometryData(): boolean {
    if (this._mesh === null) {
      return false
    }
    if (!this.decodeConnectivity()) {
      return false
    }
    return super.decodeGeometryData()
  }

  // Overridden by derived classes.
  decodeConnectivity(): boolean {
    return false
  }
}

export { MeshDecoder }
