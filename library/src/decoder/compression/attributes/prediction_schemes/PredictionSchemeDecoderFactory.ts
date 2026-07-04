// Ported from draco.js src/compression/attributes/prediction_schemes/PredictionSchemeDecoderFactory.js (MIT)

import { PredictionSchemeMethod, PredictionSchemeTransformType } from '../../config/CompressionShared'
import { MeshPredictionSchemeConstrainedMultiParallelogramDecoder } from './MeshPredictionSchemeConstrainedMultiParallelogramDecoder'
import { MeshPredictionSchemeData } from './MeshPredictionSchemeData'
import { MeshPredictionSchemeGeometricNormalDecoder } from './MeshPredictionSchemeGeometricNormalDecoder'
import { MeshPredictionSchemeMultiParallelogramDecoder } from './MeshPredictionSchemeMultiParallelogramDecoder'
import { MeshPredictionSchemeParallelogramDecoder } from './MeshPredictionSchemeParallelogramDecoder'
import { MeshPredictionSchemeTexCoordsPortableDecoder } from './MeshPredictionSchemeTexCoordsPortableDecoder'
import { PredictionSchemeDeltaDecoder } from './PredictionSchemeDeltaDecoder'

import type { PointAttribute } from '../../../attributes/PointAttribute'
import type { MeshDecoder } from '../../mesh/MeshDecoder'
import type { PointCloudDecoder } from '../../point_cloud/PointCloudDecoder'
import type { MeshPredictionSchemeDecoder } from './MeshPredictionSchemeDecoder'
import type { PredictionSchemeDecoder, PredictionSchemeDecodingTransform } from './PredictionSchemeDecoder'

function createMeshPredictionSchemeDecoder(
  method: number,
  attribute: PointAttribute,
  transform: PredictionSchemeDecodingTransform,
  meshData: MeshPredictionSchemeData,
  bitstreamVersion: number,
  transformType: number,
): MeshPredictionSchemeDecoder | null {
  // Normal octahedron transforms only support geometric normal prediction.
  if (
    transformType === PredictionSchemeTransformType.PREDICTION_TRANSFORM_NORMAL_OCTAHEDRON_CANONICALIZED ||
    transformType === PredictionSchemeTransformType.PREDICTION_TRANSFORM_NORMAL_OCTAHEDRON
  ) {
    if (method === PredictionSchemeMethod.MESH_PREDICTION_GEOMETRIC_NORMAL) {
      return new MeshPredictionSchemeGeometricNormalDecoder(attribute, transform, meshData)
    }
    return null
  }

  // Wrap and delta transforms accept any mesh prediction scheme.
  switch (method) {
    case PredictionSchemeMethod.MESH_PREDICTION_PARALLELOGRAM:
      return new MeshPredictionSchemeParallelogramDecoder(attribute, transform, meshData)

    case PredictionSchemeMethod.MESH_PREDICTION_MULTI_PARALLELOGRAM:
      return new MeshPredictionSchemeMultiParallelogramDecoder(attribute, transform, meshData)

    case PredictionSchemeMethod.MESH_PREDICTION_CONSTRAINED_MULTI_PARALLELOGRAM:
      return new MeshPredictionSchemeConstrainedMultiParallelogramDecoder(attribute, transform, meshData)

    case PredictionSchemeMethod.MESH_PREDICTION_TEX_COORDS_PORTABLE:
      return new MeshPredictionSchemeTexCoordsPortableDecoder(attribute, transform, meshData)

    case PredictionSchemeMethod.MESH_PREDICTION_GEOMETRIC_NORMAL:
      return new MeshPredictionSchemeGeometricNormalDecoder(attribute, transform, meshData)

    default:
      return null
  }
}

/**
 * Creates a prediction scheme for a decoder and method. If the method is
 * mesh-based and mesh data is available, builds the matching mesh scheme;
 * otherwise falls back to a delta decoder.
 */
function createPredictionSchemeForDecoder(
  method: number,
  attId: number,
  decoder: PointCloudDecoder,
  transform: PredictionSchemeDecodingTransform,
): PredictionSchemeDecoder | null {
  if (method === PredictionSchemeMethod.PREDICTION_NONE) {
    return null
  }

  const att = decoder.pointCloud()!.attribute(attId)

  if (decoder.getGeometryType() === 1) {
    // TRIANGULAR_MESH
    const meshDecoder = decoder as MeshDecoder
    const cornerTable = meshDecoder.getCornerTable()
    const encodingData = meshDecoder.getAttributeEncodingData(attId)

    if (cornerTable !== null && encodingData !== null) {
      const meshData = new MeshPredictionSchemeData()
      const attCornerTable = meshDecoder.getAttributeCornerTable(attId)

      if (attCornerTable !== null) {
        meshData.set(
          meshDecoder.mesh(),
          attCornerTable,
          encodingData.encodedAttributeValueIndexToCornerMap,
          encodingData.vertexToEncodedAttributeValueIndexMap,
        )
      } else {
        meshData.set(
          meshDecoder.mesh(),
          cornerTable,
          encodingData.encodedAttributeValueIndexToCornerMap,
          encodingData.vertexToEncodedAttributeValueIndexMap,
        )
      }

      const transformType = transform.getType ? transform.getType() : -1
      const ret = createMeshPredictionSchemeDecoder(
        method,
        att,
        transform,
        meshData,
        decoder.bitstreamVersion(),
        transformType,
      )
      if (ret !== null) return ret
    }
  }

  return new PredictionSchemeDeltaDecoder(att, transform)
}

export { createPredictionSchemeForDecoder }
