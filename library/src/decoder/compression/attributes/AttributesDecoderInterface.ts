// Ported from draco.js src/compression/attributes/AttributesDecoderInterface.js (MIT)

import type { PointAttribute } from '../../attributes/PointAttribute'
import type { DecoderBuffer } from '../../core/DecoderBuffer'
import type { PointCloud } from '../../point_cloud/PointCloud'
import type { PointCloudDecoder } from '../point_cloud/PointCloudDecoder'

// Abstract interface used by PointCloudDecoder; methods must be overridden.
class AttributesDecoderInterface {
  constructor() {}

  init(_decoder: PointCloudDecoder, _pointCloud: PointCloud): boolean {
    return false
  }

  decodeAttributesDecoderData(_buffer: DecoderBuffer): boolean {
    return false
  }

  decodeAttributes(_buffer: DecoderBuffer): boolean {
    return false
  }

  getAttributeId(_i: number): number {
    return -1
  }

  getNumAttributes(): number {
    return 0
  }

  getDecoder(): PointCloudDecoder | null {
    return null
  }

  // Attribute data in portable (post-transform) format; identical on encoder
  // and decoder, so usable by predictors.
  getPortableAttribute(_pointAttributeId: number): PointAttribute | null {
    return null
  }
}

export { AttributesDecoderInterface }
