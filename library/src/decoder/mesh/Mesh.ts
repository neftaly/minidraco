// Ported from draco.js src/mesh/Mesh.js (MIT)

import { PointCloud } from '../point_cloud/PointCloud'

import type { PointAttribute } from '../attributes/PointAttribute'

export const MeshAttributeElementType = {
  MESH_VERTEX_ATTRIBUTE: 0,
  MESH_CORNER_ATTRIBUTE: 1,
  MESH_FACE_ATTRIBUTE: 2,
} as const

export type MeshAttributeElementType = (typeof MeshAttributeElementType)[keyof typeof MeshAttributeElementType]

class Mesh extends PointCloud {
  // Flat Int32Array, 3 point indices per face, for cache locality and to avoid
  // a per-face allocation. faces_[3*f + c] is corner c of face f; corner index
  // ci maps directly to faces_[ci].
  faces_: Int32Array
  numFaces_: number
  attribute_data_: { elementType: number }[]

  constructor() {
    super()
    this.faces_ = new Int32Array(0)
    this.numFaces_ = 0
    this.attribute_data_ = []
  }

  _ensureFaceCapacity(numFaces: number): void {
    if (this.faces_.length >= numFaces * 3) {
      return
    }
    const grown = new Int32Array(numFaces * 3)
    grown.set(this.faces_)
    this.faces_ = grown
  }

  addFace(face: ArrayLike<number>): void {
    const f = this.numFaces_
    this._ensureFaceCapacity(f + 1)
    const o = f * 3
    this.faces_[o] = face[0]
    this.faces_[o + 1] = face[1]
    this.faces_[o + 2] = face[2]
    this.numFaces_ = f + 1
  }

  setNumFaces(numFaces: number): void {
    this._ensureFaceCapacity(numFaces)
    this.numFaces_ = numFaces
  }

  numFaces(): number {
    return this.numFaces_
  }

  // Allocates a fresh [v0, v1, v2]; hot internal loops read faces_ directly.
  face(faceId: number): number[] {
    const o = faceId * 3
    return [this.faces_[o], this.faces_[o + 1], this.faces_[o + 2]]
  }

  override setAttribute(attId: number, pa: PointAttribute): void {
    super.setAttribute(attId, pa)
    while (this.attribute_data_.length <= attId) {
      this.attribute_data_.push({ elementType: MeshAttributeElementType.MESH_CORNER_ATTRIBUTE })
    }
  }
}

export { Mesh }
