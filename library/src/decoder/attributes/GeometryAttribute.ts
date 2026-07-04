// Ported from draco.js src/attributes/GeometryAttribute.js (MIT)

import { DataType } from '../core/DracoTypes'

import type { DataBuffer } from '../core/DataBuffer'

const Type = {
  INVALID: -1,
  POSITION: 0,
  NORMAL: 1,
  COLOR: 2,
  TEX_COORD: 3,
  GENERIC: 4,
  NAMED_ATTRIBUTES_COUNT: 5,
} as const

class GeometryAttribute {
  _buffer: DataBuffer | null
  _numComponents: number
  _dataType: number
  _normalized: boolean
  _byteStride: number
  _byteOffset: number
  _attributeType: number
  _uniqueId: number

  constructor() {
    this._buffer = null
    this._numComponents = 1
    this._dataType = DataType.FLOAT32
    this._normalized = false
    this._byteStride = 0
    this._byteOffset = 0
    this._attributeType = Type.INVALID
    this._uniqueId = 0
  }

  init(
    attributeType: number,
    buffer: DataBuffer | null,
    numComponents: number,
    dataType: number,
    normalized: boolean,
    byteStride: number,
    byteOffset: number,
  ): void {
    this._buffer = buffer
    this._numComponents = numComponents
    this._dataType = dataType
    this._normalized = normalized
    this._byteStride = byteStride
    this._byteOffset = byteOffset
    this._attributeType = attributeType
  }

  // Returns a Uint8Array view of the buffer starting at the attribute entry.
  getAddress(attIndex: number): Uint8Array {
    const bytePos = this._byteOffset + this._byteStride * attIndex
    return this._buffer!.data.subarray(bytePos)
  }

  copyFrom(srcAtt: GeometryAttribute): boolean {
    this._numComponents = srcAtt._numComponents
    this._dataType = srcAtt._dataType
    this._normalized = srcAtt._normalized
    this._byteStride = srcAtt._byteStride
    this._byteOffset = srcAtt._byteOffset
    this._attributeType = srcAtt._attributeType
    this._uniqueId = srcAtt._uniqueId

    if (srcAtt._buffer === null) {
      this._buffer = null
    } else {
      if (this._buffer === null) {
        return false
      }
      this._buffer.update(srcAtt._buffer.data, srcAtt._buffer.dataSize)
    }
    return true
  }

  resetBuffer(buffer: DataBuffer, byteStride: number, byteOffset: number): void {
    this._buffer = buffer
    this._byteStride = byteStride
    this._byteOffset = byteOffset
  }

  get attributeType(): number {
    return this._attributeType
  }

  get dataType(): number {
    return this._dataType
  }

  get numComponents(): number {
    return this._numComponents
  }

  get buffer(): DataBuffer | null {
    return this._buffer
  }

  get byteStride(): number {
    return this._byteStride
  }

  get byteOffset(): number {
    return this._byteOffset
  }

  get uniqueId(): number {
    return this._uniqueId
  }
  set uniqueId(id: number) {
    this._uniqueId = id
  }
}

export { GeometryAttribute, Type as GeometryAttributeType }
