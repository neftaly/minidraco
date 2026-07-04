export { Decoder } from './decoder/compression/Decode'
export { DecoderBuffer } from './decoder/core/DecoderBuffer'
export { DataType } from './decoder/core/DracoTypes'
export { EncodedGeometryType } from './decoder/compression/config/CompressionShared'
export { GeometryAttributeType } from './decoder/attributes/GeometryAttribute'
export { Mesh } from './decoder/mesh/Mesh'
export { PointAttribute } from './decoder/attributes/PointAttribute'

import { EncodedGeometryType } from './decoder/compression/config/CompressionShared'
import { Decoder } from './decoder/compression/Decode'
import { DecoderBuffer } from './decoder/core/DecoderBuffer'
import { Mesh } from './decoder/mesh/Mesh'

// Decodes a raw Draco bitstream (e.g. the KHR_draco_mesh_compression bufferView
// of a glTF file) into a Mesh. Throws on malformed or non-mesh input.
export const decodeDracoMesh = (data: Uint8Array): Mesh => {
  const buffer = new DecoderBuffer()
  buffer.init(data, data.length)

  if (Decoder.getEncodedGeometryType(buffer) !== EncodedGeometryType.TRIANGULAR_MESH) {
    throw new Error('minidraco: Input is not a Draco triangular mesh.')
  }

  const decoder = new Decoder()
  const result = decoder.decodeMeshFromBuffer(buffer)

  if (!result.ok || result.mesh === null) {
    throw new Error(`minidraco: ${result.message}`)
  }

  return result.mesh
}
