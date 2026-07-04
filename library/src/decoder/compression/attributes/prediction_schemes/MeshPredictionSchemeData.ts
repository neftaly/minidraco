// Ported from draco.js src/compression/attributes/prediction_schemes/MeshPredictionSchemeData.js (MIT)

import type { Mesh } from '../../../mesh/Mesh'
import type { MeshAttributeCornerTable } from '../../../mesh/MeshAttributeCornerTable'
import type { CornerTable } from '../../mesh/MeshEdgebreakerDecoderImpl'

/**
 * Stores mesh connectivity data and how it was encoded/decoded.
 */
class MeshPredictionSchemeData {
  _mesh: Mesh | null
  _cornerTable: CornerTable | MeshAttributeCornerTable | null
  _vertexToDataMap: Int32Array | null
  _dataToCornerMap: Int32Array | null

  constructor() {
    this._mesh = null
    this._cornerTable = null
    this._vertexToDataMap = null
    this._dataToCornerMap = null
  }

  set(
    mesh: Mesh | null,
    cornerTable: CornerTable | MeshAttributeCornerTable,
    dataToCornerMap: Int32Array,
    vertexToDataMap: Int32Array,
  ): void {
    this._mesh = mesh
    this._cornerTable = cornerTable
    this._dataToCornerMap = dataToCornerMap
    this._vertexToDataMap = vertexToDataMap
  }

  get cornerTable(): CornerTable | MeshAttributeCornerTable {
    return this._cornerTable!
  }

  get vertexToDataMap(): Int32Array {
    return this._vertexToDataMap!
  }

  get dataToCornerMap(): Int32Array {
    return this._dataToCornerMap!
  }

  isInitialized(): boolean {
    return (
      this._mesh !== null &&
      this._cornerTable !== null &&
      this._vertexToDataMap !== null &&
      this._dataToCornerMap !== null
    )
  }
}

export { MeshPredictionSchemeData }
