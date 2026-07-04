// Ported from draco.js src/compression/mesh/traverser/MeshAttributeIndicesEncodingObserver.js (MIT)

import type { Mesh } from '../../../mesh/Mesh'
import type { MeshAttributeCornerTable } from '../../../mesh/MeshAttributeCornerTable'
import type { CornerTable, MeshAttributeIndicesEncodingData } from '../MeshEdgebreakerDecoderImpl'
import type { MeshTraversalSequencer } from './MeshTraversalSequencer'

// Observer that records vertex visit order during mesh traversal.
// Used to generate encoding/decoding order for attribute values.
class MeshAttributeIndicesEncodingObserver {
  _attConnectivity: CornerTable | MeshAttributeCornerTable
  _encodingData: MeshAttributeIndicesEncodingData
  _mesh: Mesh
  _sequencer: MeshTraversalSequencer
  _vertexToEncodedMap: Int32Array
  _encodedToCornerMap: Int32Array
  _faces: Int32Array

  constructor(
    attConnectivity: CornerTable | MeshAttributeCornerTable,
    mesh: Mesh,
    sequencer: MeshTraversalSequencer,
    encodingData: MeshAttributeIndicesEncodingData,
  ) {
    this._attConnectivity = attConnectivity
    this._encodingData = encodingData
    this._mesh = mesh
    this._sequencer = sequencer
    this._vertexToEncodedMap = encodingData.vertexToEncodedAttributeValueIndexMap
    this._encodedToCornerMap = encodingData.encodedAttributeValueIndexToCornerMap
    this._faces = mesh.faces_
  }

  onNewVertexVisited(vertex: number, corner: number): void {
    const pointId = this._faces[corner]
    this._sequencer.addPointId(pointId)

    const numValues = this._encodingData.numValues
    this._encodedToCornerMap[numValues] = corner
    this._vertexToEncodedMap[vertex] = numValues
    this._encodingData.numValues++
  }
}

export { MeshAttributeIndicesEncodingObserver }
