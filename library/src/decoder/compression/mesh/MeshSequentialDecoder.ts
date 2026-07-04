// Ported from draco.js src/compression/mesh/MeshSequentialDecoder.js (MIT)

import { decodeVarint } from '../../core/VarintDecoding'
import { LinearSequencer } from '../attributes/LinearSequencer'
import { SequentialAttributeDecodersController } from '../attributes/SequentialAttributeDecodersController'
import { decodeSymbols } from '../entropy/SymbolDecoding'
import { MeshDecoder } from './MeshDecoder'

class MeshSequentialDecoder extends MeshDecoder {
  constructor() {
    super()
  }

  override decodeConnectivity(): boolean {
    let numFaces: number | undefined
    let numPoints: number | undefined

    numFaces = decodeVarint(this.buffer()!)
    if (numFaces === undefined) return false
    numPoints = decodeVarint(this.buffer()!)
    if (numPoints === undefined) return false

    // Compressed sequential encoding can only handle (2^32 - 1) / 3 indices.
    if (numFaces > 0xffffffff / 3) {
      return false
    }
    if (numFaces > this.buffer()!.remainingSize / 3) {
      return false
    }

    const connectivityMethod = this.buffer()!.decodeUint8()
    if (connectivityMethod === undefined) {
      return false
    }

    // numFaces is known up front (and bounded by the buffer size checks
    // above), so reserve the face buffer once instead of growing per face
    this.mesh()!._ensureFaceCapacity(numFaces)

    if (connectivityMethod === 0) {
      if (!this._decodeAndDecompressIndices(numFaces)) {
        return false
      }
    } else {
      if (numPoints < 256) {
        for (let i = 0; i < numFaces; ++i) {
          const face = [0, 0, 0]
          for (let j = 0; j < 3; ++j) {
            const val = this.buffer()!.decodeUint8()
            if (val === undefined) return false
            face[j] = val
          }
          this.mesh()!.addFace(face)
        }
      } else if (numPoints < 1 << 16) {
        for (let i = 0; i < numFaces; ++i) {
          const face = [0, 0, 0]
          for (let j = 0; j < 3; ++j) {
            const val = this.buffer()!.decodeUint16()
            if (val === undefined) return false
            face[j] = val
          }
          this.mesh()!.addFace(face)
        }
      } else if (numPoints < 1 << 21) {
        for (let i = 0; i < numFaces; ++i) {
          const face = [0, 0, 0]
          for (let j = 0; j < 3; ++j) {
            const val = decodeVarint(this.buffer()!)
            if (val === undefined) return false
            face[j] = val
          }
          this.mesh()!.addFace(face)
        }
      } else {
        for (let i = 0; i < numFaces; ++i) {
          const face = [0, 0, 0]
          for (let j = 0; j < 3; ++j) {
            const val = this.buffer()!.decodeUint32()
            if (val === undefined) return false
            face[j] = val
          }
          this.mesh()!.addFace(face)
        }
      }
    }

    this.pointCloud()!.setNumPoints(numPoints)
    return true
  }

  override createAttributesDecoder(attDecoderId: number): boolean {
    // Sequential meshes store attribute values directly in point order, so a
    // LinearSequencer drives the SequentialAttributeDecodersController.
    return this.setAttributesDecoder(
      attDecoderId,
      new SequentialAttributeDecodersController(new LinearSequencer(this.pointCloud()!.numPoints())),
    )
  }

  _decodeAndDecompressIndices(numFaces: number): boolean {
    const indicesBuffer = new Uint32Array(numFaces * 3)
    if (!decodeSymbols(numFaces * 3, 1, this.buffer()!, indicesBuffer)) {
      return false
    }
    // Reconstruct the indices from the differences.
    // See MeshSequentialEncoder::CompressAndEncodeIndices() for more details.
    let lastIndexValue = 0 // This will always be >= 0.
    let vertexIndex = 0
    for (let i = 0; i < numFaces; ++i) {
      const face = [0, 0, 0]
      for (let j = 0; j < 3; ++j) {
        const encodedVal = indicesBuffer[vertexIndex++]
        let indexDiff = encodedVal >>> 1
        if (encodedVal & 1) {
          if (indexDiff > lastIndexValue) {
            // Subtracting indexDiff would result in a negative index.
            return false
          }
          indexDiff = -indexDiff
        } else {
          if (indexDiff > 0x7fffffff - lastIndexValue) {
            // Adding indexDiff to lastIndexValue would overflow.
            return false
          }
        }
        const indexValue = (indexDiff + lastIndexValue) | 0
        face[j] = indexValue
        lastIndexValue = indexValue
      }
      this.mesh()!.addFace(face)
    }
    return true
  }
}

export { MeshSequentialDecoder }
