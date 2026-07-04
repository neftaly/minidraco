// Ported from draco.js src/attributes/AttributeTransform.js (MIT)

import { AttributeTransformData } from './AttributeTransformData'

import type { DecoderBuffer } from '../core/DecoderBuffer'
import type { PointAttribute } from './PointAttribute'

class AttributeTransform {
  // Virtual: override in subclass.
  copyToAttributeTransformData(_outData: AttributeTransformData): void {}

  transferToAttribute(attribute: PointAttribute): boolean {
    const transformData = new AttributeTransformData()
    this.copyToAttributeTransformData(transformData)
    attribute.setAttributeTransformData(transformData)
    return true
  }

  // Virtual: override in subclass.
  inverseTransformAttribute(_attribute: PointAttribute, _targetAttribute: PointAttribute): boolean {
    return false
  }

  // Virtual: override in subclass.
  decodeParameters(_attribute: PointAttribute, _decoderBuffer: DecoderBuffer): boolean {
    return false
  }
}

export { AttributeTransform }
