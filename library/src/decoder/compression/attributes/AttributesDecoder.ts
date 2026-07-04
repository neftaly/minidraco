// Ported from draco.js src/compression/attributes/AttributesDecoder.js (MIT)

import { GeometryAttribute, GeometryAttributeType } from '../../attributes/GeometryAttribute'
import { PointAttribute } from '../../attributes/PointAttribute'
import { DataType, dataTypeLength } from '../../core/DracoTypes'
import { decodeVarint } from '../../core/VarintDecoding'
import { AttributesDecoderInterface } from './AttributesDecoderInterface'

import type { DecoderBuffer } from '../../core/DecoderBuffer'
import type { PointCloud } from '../../point_cloud/PointCloud'
import type { PointCloudDecoder } from '../point_cloud/PointCloudDecoder'

// Base class for AttributesDecoders; shared functionality for all of them.
class AttributesDecoder extends AttributesDecoderInterface {
  _pointAttributeIds: number[]
  // Inverse of _pointAttributeIds: point attribute id -> local id.
  _pointAttributeToLocalIdMap: number[]
  _pointCloudDecoder: PointCloudDecoder | null
  _pointCloud: PointCloud | null

  constructor() {
    super()
    this._pointAttributeIds = []
    this._pointAttributeToLocalIdMap = []
    this._pointCloudDecoder = null
    this._pointCloud = null
  }

  override init(decoder: PointCloudDecoder, pointCloud: PointCloud): boolean {
    this._pointCloudDecoder = decoder
    this._pointCloud = pointCloud
    return true
  }

  override decodeAttributesDecoderData(buffer: DecoderBuffer): boolean {
    let numAttributes: number | undefined

    numAttributes = decodeVarint(buffer, false)
    if (numAttributes === undefined) return false

    if (numAttributes === 0) {
      return false
    }
    if (numAttributes > 5 * buffer.remainingSize) {
      // Unreasonably high; reject.
      return false
    }

    this._pointAttributeIds.length = numAttributes
    const pc = this._pointCloud!

    for (let i = 0; i < numAttributes; i++) {
      const attType = buffer.decodeUint8()
      if (attType === undefined) return false

      const dataType = buffer.decodeUint8()
      if (dataType === undefined) return false

      const numComponents = buffer.decodeUint8()
      if (numComponents === undefined) return false

      const normalized = buffer.decodeUint8()
      if (normalized === undefined) return false

      if (attType >= GeometryAttributeType.NAMED_ATTRIBUTES_COUNT) {
        return false
      }
      if (dataType === DataType.INVALID || dataType >= DataType.TYPES_COUNT) {
        return false
      }

      if (numComponents === 0) {
        return false
      }

      const ga = new GeometryAttribute()
      ga.init(attType, null, numComponents, dataType, normalized > 0, dataTypeLength(dataType) * numComponents, 0)

      const uniqueId = decodeVarint(buffer, false)
      if (uniqueId === undefined) return false
      ga.uniqueId = uniqueId

      const pa = new PointAttribute(ga)
      const attId = pc.addAttribute(pa)
      pc.attribute(attId)!.uniqueId = uniqueId
      this._pointAttributeIds[i] = attId

      if (attId >= this._pointAttributeToLocalIdMap.length) {
        const oldLen = this._pointAttributeToLocalIdMap.length
        this._pointAttributeToLocalIdMap.length = attId + 1
        for (let j = oldLen; j <= attId; j++) {
          this._pointAttributeToLocalIdMap[j] = -1
        }
      }
      this._pointAttributeToLocalIdMap[attId] = i
    }
    return true
  }

  override getAttributeId(i: number): number {
    return this._pointAttributeIds[i]
  }

  override getNumAttributes(): number {
    return this._pointAttributeIds.length
  }

  override getDecoder(): PointCloudDecoder | null {
    return this._pointCloudDecoder
  }

  override decodeAttributes(buffer: DecoderBuffer): boolean {
    if (!this.decodePortableAttributes(buffer)) {
      return false
    }
    if (!this.decodeDataNeededByPortableTransforms(buffer)) {
      return false
    }
    if (!this.transformAttributesToOriginalFormat()) {
      return false
    }
    return true
  }

  getLocalIdForPointAttribute(pointAttributeId: number): number {
    if (pointAttributeId >= this._pointAttributeToLocalIdMap.length) {
      return -1
    }
    return this._pointAttributeToLocalIdMap[pointAttributeId]
  }

  // Must be overridden by derived classes.
  decodePortableAttributes(_buffer: DecoderBuffer): boolean {
    return false
  }

  decodeDataNeededByPortableTransforms(_buffer: DecoderBuffer): boolean {
    return true
  }

  transformAttributesToOriginalFormat(): boolean {
    return true
  }
}

export { AttributesDecoder }
