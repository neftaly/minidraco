// Web Worker entry for MiniDRACOLoader's worker pool. Bundled self-contained
// (no imports) by tsup, so it can be spawned as a module worker via
// `new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })`
// from the library dist, or inlined into an app bundle by webpack/turbopack.
import { decodeDracoMesh } from './index'

interface DecodeRequest {
  id: number
  buffer: ArrayBuffer
  attributeIDs: Record<string, number | string>
  attributeTypes: Record<string, string>
  useUniqueIDs: boolean
}

interface AttributeResult {
  name: string
  array: ArrayBufferView
  itemSize: number
}

const typedArrayMap: Record<string, new (length: number) => any> = {
  Float32Array,
  Int8Array,
  Int16Array,
  Int32Array,
  Uint8Array,
  Uint16Array,
  Uint32Array,
}

// Draco GeometryAttribute type ids (POSITION..GENERIC), matching
// GeometryAttributeType in the decoder.
const attributeTypeMap: Record<string, number> = {
  POSITION: 0,
  NORMAL: 1,
  COLOR: 2,
  TEX_COORD: 3,
  GENERIC: 4,
}

self.onmessage = (event: MessageEvent<DecodeRequest>) => {
  const { id, buffer, attributeIDs, attributeTypes, useUniqueIDs } = event.data

  try {
    const mesh = decodeDracoMesh(new Uint8Array(buffer))
    const numPoints = mesh.numPoints()
    const numFaces = mesh.numFaces()

    const indices = new Uint32Array(numFaces * 3)
    indices.set(mesh.faces_.subarray(0, numFaces * 3))

    const attributes: AttributeResult[] = []
    const transfer: ArrayBuffer[] = [indices.buffer]

    for (const attributeName in attributeIDs) {
      const OutputTypedArray = typedArrayMap[attributeTypes[attributeName]]
      if (!OutputTypedArray) continue

      let attribute
      if (useUniqueIDs) {
        attribute = mesh.getAttributeByUniqueId(attributeIDs[attributeName] as number)
      } else {
        const typeEnum = attributeTypeMap[attributeIDs[attributeName] as string]
        if (typeEnum === undefined) continue
        attribute = mesh.getNamedAttribute(typeEnum)
      }
      if (!attribute) continue

      const array = attribute.extractTo(OutputTypedArray, numPoints)
      attributes.push({ name: attributeName, array, itemSize: attribute.numComponents })
      transfer.push(array.buffer as ArrayBuffer)
    }

    ;(self as unknown as Worker).postMessage({ id, ok: true, numPoints, indices, attributes }, transfer)
  } catch (error) {
    ;(self as unknown as Worker).postMessage({ id, ok: false, error: String(error) })
  }
}
