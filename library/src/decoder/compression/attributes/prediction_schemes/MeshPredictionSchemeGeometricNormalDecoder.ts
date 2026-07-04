// Ported from draco.js src/compression/attributes/prediction_schemes/MeshPredictionSchemeGeometricNormalDecoder.js (MIT)

import { RAnsBitDecoder } from '../../bit_coders/RAnsBitDecoder'
import { NormalPredictionMode } from '../../config/CompressionShared'
import { OctahedronToolBox } from '../NormalCompressionUtils'
import { MeshPredictionSchemeDecoder } from './MeshPredictionSchemeDecoder'
import { MeshPredictionSchemeGeometricNormalPredictorArea } from './MeshPredictionSchemeGeometricNormalPredictorArea'

import type { PointAttribute } from '../../../attributes/PointAttribute'
import type { DecoderBuffer } from '../../../core/DecoderBuffer'
import type { MeshPredictionSchemeData } from './MeshPredictionSchemeData'
import type { PredictionSchemeDecodingTransform } from './PredictionSchemeDecoder'

const GEOMETRY_ATTRIBUTE_POSITION = 0

/**
 * Decoder for geometric normal prediction. Predicts normals using the
 * surrounding triangle geometry, then converts to octahedral coordinates.
 */
class MeshPredictionSchemeGeometricNormalDecoder extends MeshPredictionSchemeDecoder {
  _predictor: MeshPredictionSchemeGeometricNormalPredictorArea
  _octahedronToolBox: OctahedronToolBox
  _flipNormalBitDecoder: RAnsBitDecoder

  constructor(
    attribute: PointAttribute,
    transform: PredictionSchemeDecodingTransform,
    meshData: MeshPredictionSchemeData,
  ) {
    super(attribute, transform, meshData)
    this._predictor = new MeshPredictionSchemeGeometricNormalPredictorArea(meshData)
    this._octahedronToolBox = new OctahedronToolBox()
    this._flipNormalBitDecoder = new RAnsBitDecoder()
  }

  override isInitialized(): boolean {
    if (!this._predictor.isInitialized()) return false
    if (!this._meshData.isInitialized()) return false
    if (!this._octahedronToolBox.isInitialized()) return false
    return true
  }

  override getNumParentAttributes(): number {
    return 1
  }

  override getParentAttributeType(i: number): number {
    return GEOMETRY_ATTRIBUTE_POSITION
  }

  override setParentAttribute(att: PointAttribute): boolean {
    if (att.attributeType !== GEOMETRY_ATTRIBUTE_POSITION) return false
    if (att.numComponents !== 3) return false
    this._predictor.setPositionAttribute(att)
    return true
  }

  setQuantizationBits(q: number): void {
    this._octahedronToolBox.setQuantizationBits(q)
  }

  override decodePredictionData(buffer: DecoderBuffer): boolean {
    if (!this._transform.decodeTransformData(buffer)) return false

    if (buffer.bitstreamVersion < 0x0202) {
      const predictionMode = buffer.decodeUint8()
      if (predictionMode === undefined) return false
      if (predictionMode > NormalPredictionMode.TRIANGLE_AREA) return false
      if (!this._predictor.setNormalPredictionMode(predictionMode)) return false
    }

    if (!this._flipNormalBitDecoder.startDecoding(buffer)) return false

    return true
  }

  override computeOriginalValues(
    inCorr: Int32Array,
    outData: Int32Array,
    size: number,
    numComponents: number,
    entryToPointIdMap: Int32Array,
  ): boolean {
    this.setQuantizationBits(this._transform.quantizationBits!())
    this._predictor.setEntryToPointIdMap(entryToPointIdMap)

    const cornerMapSize = this._meshData.dataToCornerMap.length

    // Cache integer positions once so the per-corner ring traversal reads from
    // a flat array instead of mappedIndex + convertValue per fetch.
    this._predictor.buildPositionCache(cornerMapSize)

    const predNormal3D = new Int32Array(3)
    const predNormalOct = new Int32Array(2)

    for (let dataId = 0; dataId < cornerMapSize; ++dataId) {
      const cornerId = this._meshData.dataToCornerMap[dataId]
      this._predictor.computePredictedValue(cornerId, predNormal3D)

      this._octahedronToolBox.canonicalizeIntegerVector(predNormal3D)

      if (this._flipNormalBitDecoder.decodeNextBit()) {
        predNormal3D[0] = -predNormal3D[0]
        predNormal3D[1] = -predNormal3D[1]
        predNormal3D[2] = -predNormal3D[2]
      }

      this._octahedronToolBox.integerVectorToQuantizedOctahedralCoords(predNormal3D, predNormalOct)

      const dataOffset = dataId * 2
      this._transform.computeOriginalValue(predNormalOct, 0, inCorr, dataOffset, outData, dataOffset)
    }

    this._flipNormalBitDecoder.endDecoding()
    return true
  }
}

export { MeshPredictionSchemeGeometricNormalDecoder }
