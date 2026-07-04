// Ported from draco.js src/compression/attributes/SequentialNormalAttributeDecoder.js (MIT)

import { AttributeOctahedronTransform } from '../../attributes/AttributeOctahedronTransform'
import { DataType } from '../../core/DracoTypes'
import { PredictionSchemeTransformType } from '../config/CompressionShared'
import { createPredictionSchemeForDecoder } from './prediction_schemes/PredictionSchemeDecoderFactory'
import { PredictionSchemeNormalOctahedronCanonicalizedDecodingTransform } from './prediction_schemes/PredictionSchemeNormalOctahedronCanonicalizedDecodingTransform'
import { PredictionSchemeNormalOctahedronDecodingTransform } from './prediction_schemes/PredictionSchemeNormalOctahedronDecodingTransform'
import { SequentialIntegerAttributeDecoder } from './SequentialIntegerAttributeDecoder'

import type { DecoderBuffer } from '../../core/DecoderBuffer'
import type { PointCloudDecoder } from '../point_cloud/PointCloudDecoder'
import type { PredictionSchemeDecoderInterface } from './prediction_schemes/PredictionSchemeDecoderInterface'

// Decoder for attributes encoded with SequentialNormalAttributeEncoder.
class SequentialNormalAttributeDecoder extends SequentialIntegerAttributeDecoder {
  _octahedralTransform: AttributeOctahedronTransform

  constructor() {
    super()
    this._octahedralTransform = new AttributeOctahedronTransform()
  }

  override init(decoder: PointCloudDecoder, attributeId: number): boolean {
    if (!super.init(decoder, attributeId)) {
      return false
    }
    // Only 3-component FLOAT32 normals are supported.
    if (this.attribute!.numComponents !== 3) {
      return false
    }
    if (this.attribute!.dataType !== DataType.FLOAT32) {
      return false
    }
    return true
  }

  // Normals quantize into two octahedral components.
  override getNumValueComponents(): number {
    return 2
  }

  override decodeDataNeededByPortableTransform(pointIds: Int32Array, buffer: DecoderBuffer): boolean {
    if (!this._octahedralTransform.decodeParameters(this.getPortableAttribute()!, buffer)) {
      return false
    }

    return this._octahedralTransform.transferToAttribute(this.portableAttribute!)
  }

  override _storeValues(numPoints: number): boolean {
    return this._octahedralTransform.inverseTransformAttribute(this.getPortableAttribute()!, this.attribute!)
  }

  override createIntPredictionScheme(method: number, transformType: number): PredictionSchemeDecoderInterface | null {
    switch (transformType) {
      case PredictionSchemeTransformType.PREDICTION_TRANSFORM_NORMAL_OCTAHEDRON: {
        const transform = new PredictionSchemeNormalOctahedronDecodingTransform()
        return createPredictionSchemeForDecoder(method, this.attributeId, this.decoder!, transform)
      }
      case PredictionSchemeTransformType.PREDICTION_TRANSFORM_NORMAL_OCTAHEDRON_CANONICALIZED: {
        const transform = new PredictionSchemeNormalOctahedronCanonicalizedDecodingTransform()
        return createPredictionSchemeForDecoder(method, this.attributeId, this.decoder!, transform)
      }
      default:
        return null
    }
  }
}

export { SequentialNormalAttributeDecoder }
