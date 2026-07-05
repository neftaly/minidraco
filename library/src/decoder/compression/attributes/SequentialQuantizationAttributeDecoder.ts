// Ported from draco.js src/compression/attributes/SequentialQuantizationAttributeDecoder.js (MIT)

import { AttributeQuantizationTransform } from '../../attributes/AttributeQuantizationTransform'
import { DataType } from '../../core/DracoTypes'
import { SequentialIntegerAttributeDecoder } from './SequentialIntegerAttributeDecoder'

import type { DecoderBuffer } from '../../core/DecoderBuffer'
import type { PointCloudDecoder } from '../point_cloud/PointCloudDecoder'

// Decoder for attribute values encoded with the
// SequentialQuantizationAttributeEncoder.
class SequentialQuantizationAttributeDecoder extends SequentialIntegerAttributeDecoder {
  _quantizationTransform: AttributeQuantizationTransform

  constructor() {
    super()
    this._quantizationTransform = new AttributeQuantizationTransform()
  }

  override init(decoder: PointCloudDecoder, attributeId: number): boolean {
    if (!super.init(decoder, attributeId)) {
      return false
    }
    const attribute = decoder.pointCloud()!.attribute(attributeId)!
    // Only floating point attributes can be quantized.
    if (attribute.dataType !== DataType.FLOAT32) {
      return false
    }
    return true
  }

  override decodeDataNeededByPortableTransform(pointIds: Int32Array, buffer: DecoderBuffer): boolean {
    if (!this._decodeQuantizedDataInfo()) {
      return false
    }

    return this._quantizationTransform.transferToAttribute(this.portableAttribute!)
  }

  // Override: dequantize the values instead of a generic integer store.
  override _storeValues(numPoints: number): boolean {
    return this._dequantizeValues(numPoints)
  }

  _decodeQuantizedDataInfo(): boolean {
    let att = this.portableAttribute
    if (att === null) {
      // Null only in backward-compatibility mode; fall back to the raw attribute.
      att = this.attribute
    }
    return this._quantizationTransform.decodeParameters(att!, this.decoder!.buffer()!)
  }

  _dequantizeValues(_numValues: number): boolean {
    return this._quantizationTransform.inverseTransformAttribute(this.portableAttribute!, this.attribute!)
  }
}

export { SequentialQuantizationAttributeDecoder }
