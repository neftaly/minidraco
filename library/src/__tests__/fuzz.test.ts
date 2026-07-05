import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'

import {
  encodeDracoVarintSigned,
  encodeDracoVarintUnsigned,
  makeIntegerCases,
  makeMutationCases,
  makeNoiseCases,
  readBitsLsb,
} from '../../scripts/fuzz-core'
import { dracoDataTypeToArray, getDraco3dModule } from '../../scripts/harness'
import { Decoder } from '../decoder/compression/Decode'
import { AnsDecoder, RAnsDecoder, ansReadInit } from '../decoder/compression/entropy/ANSCoding'
import { CornerTable, MeshEdgebreakerDecoderImpl } from '../decoder/compression/mesh/MeshEdgebreakerDecoderImpl'
import { MeshEdgebreakerTraversalDecoder } from '../decoder/compression/mesh/MeshEdgebreakerTraversalDecoder'
import { convertSymbolToSignedInt, convertSymbolsToSignedInts } from '../decoder/core/BitUtils'
import { DecoderBuffer } from '../decoder/core/DecoderBuffer'
import { decodeVarint } from '../decoder/core/VarintDecoding'
import { MetadataDecoder } from '../decoder/metadata/MetadataDecoder'
import { decodeDracoMesh } from '../index'

interface ReferenceDecode {
  numPoints: number
  numFaces: number
  indices: Uint32Array
  attributes: { uniqueId: number; numComponents: number; data: ArrayLike<number> }[]
}

const fixturesDir = `${import.meta.dir}/fixtures`
const smallFixtures = readdirSync(fixturesDir)
  .filter(name => name.endsWith('.drc') && statSync(`${fixturesDir}/${name}`).size <= 2048)
  .toSorted()
  .map(name => ({ name, data: new Uint8Array(readFileSync(`${fixturesDir}/${name}`)) }))

const decodeReference = async (data: Uint8Array): Promise<ReferenceDecode> => {
  const m = await getDraco3dModule()
  const buffer = new m.DecoderBuffer()
  buffer.Init(data, data.length)
  const decoder = new m.Decoder()
  const mesh = new m.Mesh()
  const status = decoder.DecodeBufferToMesh(buffer, mesh)
  if (!status.ok()) {
    const message = status.error_msg()
    m.destroy(mesh)
    m.destroy(decoder)
    m.destroy(buffer)
    throw new Error(message)
  }

  const numPoints = mesh.num_points()
  const numFaces = mesh.num_faces()
  const indices = new Uint32Array(numFaces * 3)
  const indexPtr = m._malloc(indices.byteLength)
  decoder.GetTrianglesUInt32Array(mesh, indices.byteLength, indexPtr)
  indices.set(new Uint32Array(m.HEAPU32.buffer, indexPtr, numFaces * 3))
  m._free(indexPtr)

  const attributes: ReferenceDecode['attributes'] = []
  for (let i = 0; i < mesh.num_attributes(); i++) {
    const attribute = decoder.GetAttribute(mesh, i)
    const dataType = attribute.data_type()
    const numComponents = attribute.num_components()
    const numValues = numPoints * numComponents
    const Ctor = dracoDataTypeToArray(dataType)
    const array = new Ctor(numValues)
    const ptr = m._malloc(array.byteLength)
    decoder.GetAttributeDataArrayForAllPoints(mesh, attribute, dataType, array.byteLength, ptr)
    array.set(new Ctor(m.HEAPU8.buffer, ptr, numValues) as never)
    m._free(ptr)
    attributes.push({ uniqueId: attribute.unique_id(), numComponents, data: array })
  }

  m.destroy(mesh)
  m.destroy(decoder)
  m.destroy(buffer)
  return { numPoints, numFaces, indices, attributes }
}

const tryReference = async (data: Uint8Array) => {
  try {
    return { ok: true as const, value: await decodeReference(data) }
  } catch (error) {
    return { ok: false as const, error }
  }
}

const tryMinidraco = (data: Uint8Array) => {
  try {
    return { ok: true as const, value: decodeDracoMesh(data) }
  } catch (error) {
    return { ok: false as const, error }
  }
}

const ulpDiff = (a: number, b: number): number => {
  if (a === b) return 0
  if (Number.isNaN(a) || Number.isNaN(b)) return Infinity
  const bufA = new Int32Array(new Float32Array([a]).buffer)[0]
  const bufB = new Int32Array(new Float32Array([b]).buffer)[0]
  return Math.abs(bufA - bufB)
}

const compareMesh = (actual: ReturnType<typeof decodeDracoMesh>, expected: ReferenceDecode, label: string) => {
  expect(actual.numPoints()).toBe(expected.numPoints)
  expect(actual.numFaces()).toBe(expected.numFaces)

  const indices = new Uint32Array(expected.numFaces * 3)
  indices.set(actual.faces_.subarray(0, expected.numFaces * 3))
  expect(indices).toEqual(expected.indices)

  for (const expectedAttribute of expected.attributes) {
    const actualAttribute = actual.getAttributeByUniqueId(expectedAttribute.uniqueId)
    if (!actualAttribute) throw new Error(`${label}: missing attribute ${expectedAttribute.uniqueId}`)

    expect(actualAttribute.numComponents).toBe(expectedAttribute.numComponents)
    const Ctor = expectedAttribute.data.constructor as new (length: number) => never
    const actualData = actualAttribute.extractTo(Ctor as never, expected.numPoints) as ArrayLike<number>
    expect(actualData.length).toBe(expectedAttribute.data.length)

    const isFloat = expectedAttribute.data instanceof Float32Array
    for (let i = 0; i < expectedAttribute.data.length; i++) {
      const a = actualData[i]
      const e = expectedAttribute.data[i]
      if (a === e) continue
      if (isFloat && ulpDiff(a, e) <= 1) continue
      throw new Error(`${label}: attribute ${expectedAttribute.uniqueId} differs at ${i}: ${a} !== ${e}`)
    }
  }
}

describe('decoder fuzz', () => {
  test('bounded fixture mutations agree with draco3d accept/reject behavior', async () => {
    const cases = makeMutationCases(smallFixtures, { casesPerSource: 8, seed: 0x5eeded })
    for (const c of cases) {
      const expected = await tryReference(c.data)
      const actual = tryMinidraco(c.data)

      if (!expected.ok) {
        expect(actual.ok, `${c.name} should reject like draco3d`).toBe(false)
        continue
      }

      expect(actual.ok, `${c.name} should decode like draco3d`).toBe(true)
      if (actual.ok) compareMesh(actual.value, expected.value, c.name)
    }
  }, 30000)

  test('header-shaped byte noise rejects through the public mesh API', () => {
    const cases = makeNoiseCases({ count: 96, maxLength: 96, seed: 0x5151f00d })
    for (const c of cases) {
      const actual = tryMinidraco(c.data)
      expect(actual.ok, `${c.name} unexpectedly decoded`).toBe(false)
      if (!actual.ok) expect(actual.error).toBeInstanceOf(Error)
    }
  })
})

describe('decoder primitive fuzz', () => {
  test('header geometry type peeks never advance the caller buffer', () => {
    for (const fixture of smallFixtures) {
      const buffer = new DecoderBuffer()
      buffer.init(fixture.data)
      expect(buffer.decodeUint8()).toBe(68)
      const before = buffer.decodedSize
      Decoder.getEncodedGeometryType(buffer)
      expect(buffer.decodedSize).toBe(before)
    }

    for (const c of makeNoiseCases({ count: 32, maxLength: 32, seed: 0x600d })) {
      const buffer = new DecoderBuffer()
      buffer.init(c.data)
      const before = buffer.decodedSize
      Decoder.getEncodedGeometryType(buffer)
      expect(buffer.decodedSize).toBe(before)
    }
  })

  test('Draco varints round-trip unsigned and signed integer cases', () => {
    const unsignedCases = makeIntegerCases(256, 0xdec0de)
    for (const value of unsignedCases) {
      const buffer = new DecoderBuffer()
      buffer.init(encodeDracoVarintUnsigned(value))
      expect(decodeVarint(buffer, false)).toBe(value)
      expect(buffer.remainingSize).toBe(0)
    }

    for (const magnitude of makeIntegerCases(256, 0xfaded).map(value => value & 0x3fffffff)) {
      const signedCases = magnitude === 0 ? [0] : [magnitude, -magnitude]
      for (const value of signedCases) {
        const buffer = new DecoderBuffer()
        buffer.init(encodeDracoVarintSigned(value))
        expect(decodeVarint(buffer, true)).toBe(value)
        expect(buffer.remainingSize).toBe(0)
      }
    }
  })

  test('bulk zigzag conversion matches scalar conversion', () => {
    const input = new Uint32Array(makeIntegerCases(512, 0xfeedface))
    const actual = new Int32Array(input.length)
    convertSymbolsToSignedInts(input, input.length, actual)
    for (let i = 0; i < input.length; i++) {
      expect(actual[i]).toBe(convertSymbolToSignedInt(input[i]))
    }
  })

  test('bit decoder matches a pure least-significant-bit reader', () => {
    const bytes = new Uint8Array(257)
    for (let i = 0; i < bytes.length; i++) bytes[i] = (Math.imul(i + 17, 73) ^ (i >>> 1)) & 0xff

    const chunks = [1, 2, 3, 5, 8, 13, 21, 31, 32, 7, 4, 16, 29, 6, 10, 32, 1, 17]
    const buffer = new DecoderBuffer()
    buffer.init(bytes)
    buffer.startBitDecoding(false)

    let bitOffset = 0
    for (const nbits of chunks) {
      expect(buffer.decodeLeastSignificantBits32(nbits)).toBe(readBitsLsb(bytes, bitOffset, nbits))
      bitOffset += nbits
    }
    buffer.endBitDecoding()
    expect(buffer.decodedSize).toBe(Math.ceil(bitOffset / 8))
  })

  test('bit decoder rejects reads that extend past the end of the byte stream', () => {
    const buffer = new DecoderBuffer()
    buffer.init(new Uint8Array([0xff]))
    buffer.startBitDecoding(false)
    expect(buffer.decodeLeastSignificantBits32(9)).toBeUndefined()
    expect(buffer.decodeLeastSignificantBits32(8)).toBe(0xff)
    buffer.endBitDecoding()
    expect(buffer.decodedSize).toBe(1)
  })

  test('edgebreaker bit overreads reject instead of decoding as zero bits', () => {
    const impl = new MeshEdgebreakerDecoderImpl(MeshEdgebreakerTraversalDecoder)
    const cornerTable = new CornerTable()
    cornerTable.reset(1, 3)
    impl._cornerTable = cornerTable
    impl._isVertHole = new Uint8Array(3)

    impl._traversalDecoder._symbolBuffer.init(new Uint8Array())
    impl._traversalDecoder._symbolBuffer.startBitDecoding(false)
    expect(impl._decodeConnectivity(1)).toBe(-1)
    impl._traversalDecoder._symbolBuffer.endBitDecoding()

    const splitBuffer = new DecoderBuffer()
    splitBuffer.init(new Uint8Array([1, 0, 0]))
    expect(impl._decodeHoleAndTopologySplitEvents(splitBuffer)).toBe(-1)
  })

  test('DecoderBuffer clamps oversized dataSize to the actual byte length', () => {
    const buffer = new DecoderBuffer()
    buffer.init(new Uint8Array([1, 2]), 4)
    expect(buffer.remainingSize).toBe(2)
    expect(buffer.decodeUint32()).toBeUndefined()
    expect(buffer.decodeBytesView(3)).toBeUndefined()
  })

  test('DecoderBuffer rejects invalid byte and bit sizes without moving the cursor', () => {
    const empty = new DecoderBuffer()
    empty.init(new Uint8Array([1, 2]), Number.NaN)
    expect(empty.remainingSize).toBe(0)
    expect(empty.decodeUint8()).toBeUndefined()

    const buffer = new DecoderBuffer()
    buffer.init(new Uint8Array([0xab, 0xcd]), 2.9)
    expect(buffer.remainingSize).toBe(2)

    const beforeByteReads = buffer.decodedSize
    expect(buffer.decodeBytes(-1)).toBeUndefined()
    expect(buffer.decodeBytesView(Number.NaN)).toBeUndefined()
    expect(buffer.decodedSize).toBe(beforeByteReads)

    expect(buffer.startBitDecoding(false)).toBe(0)
    expect(buffer.decodeLeastSignificantBits32(-1)).toBeUndefined()
    expect(buffer.decodeLeastSignificantBits32(1.5)).toBeUndefined()
    expect(buffer.decodeLeastSignificantBits32(33)).toBeUndefined()
    expect(buffer.decodeLeastSignificantBits32(8)).toBe(0xab)
    buffer.endBitDecoding()
    expect(buffer.decodedSize).toBe(1)
  })

  test('metadata skipper consumes valid metadata exactly and rejects truncated values', () => {
    const valid = new Uint8Array([
      0, // no per-attribute metadata
      1, // one geometry metadata entry
      3,
      0x66,
      0x6f,
      0x6f, // "foo"
      2,
      0xaa,
      0xbb,
      1, // one nested metadata block
      3,
      0x62,
      0x61,
      0x72, // "bar"
      0, // nested block has no entries
      0, // nested block has no children
    ])
    const validBuffer = new DecoderBuffer()
    validBuffer.init(valid)
    expect(new MetadataDecoder().skipGeometryMetadata(validBuffer)).toBe(true)
    expect(validBuffer.remainingSize).toBe(0)

    const truncatedValue = new DecoderBuffer()
    truncatedValue.init(new Uint8Array([0, 1, 1, 0x6b, 2, 0xaa]))
    expect(new MetadataDecoder().skipGeometryMetadata(truncatedValue)).toBe(false)
  })

  test('short rANS states with 4-byte marker reject before reading outside the slice', () => {
    for (const length of [1, 2, 3]) {
      const bytes = new Uint8Array(length).fill(0)
      bytes[length - 1] = 0xc0
      const decoder = new RAnsDecoder(8)
      expect(decoder.readInit(bytes, bytes.length, 0)).toBe(1)
      expect(decoder.readInit(new Uint8Array([9, ...bytes, 9]), 1 + bytes.length, 1)).toBe(1)
    }

    const decoder = new RAnsDecoder(8)
    expect(decoder.readInit(new Uint8Array([0, 0, 0, 0xc0]), 4, 0)).toBe(0)
  })

  test('ANS readers reject absolute offsets outside the supplied byte slice', () => {
    const bytes = new Uint8Array([0])

    expect(ansReadInit(new AnsDecoder(), bytes, 1, 0)).toBe(0)
    expect(ansReadInit(new AnsDecoder(), bytes, 2, 0)).toBe(1)
    expect(ansReadInit(new AnsDecoder(), bytes, 1, -1)).toBe(1)
    expect(ansReadInit(new AnsDecoder(), bytes, 1.5, 0)).toBe(1)

    expect(new RAnsDecoder(8).readInit(bytes, 1, 0)).toBe(0)
    expect(new RAnsDecoder(8).readInit(bytes, 2, 0)).toBe(1)
    expect(new RAnsDecoder(8).readInit(bytes, 1, -1)).toBe(1)
    expect(new RAnsDecoder(8).readInit(bytes, 1.5, 0)).toBe(1)
  })
})
