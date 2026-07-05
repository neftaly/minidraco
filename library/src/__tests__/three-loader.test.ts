import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import { MiniDRACOLoader } from '../three'

const taskConfig = {
  attributeIDs: {},
  attributeTypes: {},
  useUniqueIDs: false,
  vertexColorSpace: '',
}

const makeMesh = (numPoints: number, faces: Int32Array) => ({
  numPoints: () => numPoints,
  numFaces: () => faces.length / 3,
  faces_: faces,
})

const readArrayBuffer = (path: string): ArrayBuffer => {
  const data = readFileSync(path)
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
}

const withWorkerUnavailable = async <T>(fn: () => Promise<T>): Promise<T> => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Worker')
  Object.defineProperty(globalThis, 'Worker', { configurable: true, value: undefined })

  try {
    return await fn()
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'Worker', descriptor)
    else Reflect.deleteProperty(globalThis, 'Worker')
  }
}

const withWorkerAvailable = async <T>(fn: () => Promise<T>): Promise<T> => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Worker')
  Object.defineProperty(globalThis, 'Worker', { configurable: true, value: class FakeWorker {} })

  try {
    return await fn()
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'Worker', descriptor)
    else Reflect.deleteProperty(globalThis, 'Worker')
  }
}

describe('MiniDRACOLoader index arrays', () => {
  test('sync decode emits Uint16Array indices for small meshes', async () => {
    const loader = new MiniDRACOLoader().setWorkerLimit(0)
    const buffer = readArrayBuffer(`${import.meta.dir}/fixtures/cube.drc`)

    const geometry = await loader.decodeDracoFile(buffer)
    if (!geometry) throw new Error('decodeDracoFile did not return geometry')

    expect(geometry.index?.array).toBeInstanceOf(Uint16Array)
  })

  test('falls back to sync decode when Worker is unavailable', async () => {
    const loader = new MiniDRACOLoader()
    const buffer = readArrayBuffer(`${import.meta.dir}/fixtures/cube.drc`)

    const geometry = await withWorkerUnavailable(() => loader.decodeDracoFile(buffer))
    if (!geometry) throw new Error('decodeDracoFile did not return geometry')

    expect(geometry.index?.array).toBeInstanceOf(Uint16Array)
  })

  test('DRACOLoader compatibility configuration methods are chainable no-ops', async () => {
    const loader = new MiniDRACOLoader().setWorkerLimit(0)
    const buffer = readArrayBuffer(`${import.meta.dir}/fixtures/cube.drc`)

    expect(loader.setDecoderPath('/draco/')).toBe(loader)
    expect(loader.setDecoderConfig({ type: 'js' })).toBe(loader)

    const geometry = await loader.decodeDracoFile(buffer)
    if (!geometry) throw new Error('decodeDracoFile did not return geometry')

    expect(geometry.index?.array).toBeInstanceOf(Uint16Array)
  })

  test('syncByteThreshold remains an opt-in main-thread decode path', async () => {
    const loader = new MiniDRACOLoader()
    const buffer = readArrayBuffer(`${import.meta.dir}/fixtures/cube.drc`)
    loader.syncByteThreshold = Number.POSITIVE_INFINITY
    loader._decodeInWorker = async () => {
      throw new Error('worker path should not run')
    }

    const geometry = await withWorkerAvailable(() => loader.decodeDracoFile(buffer))
    if (!geometry) throw new Error('decodeDracoFile did not return geometry')

    expect(geometry.index?.array).toBeInstanceOf(Uint16Array)
  })

  test('geometry extraction keeps Uint32Array indices above the 16-bit point threshold', () => {
    const loader = new MiniDRACOLoader()
    const mesh = makeMesh(0x10000, new Int32Array([0, 1, 0xffff]))

    const geometry = loader._buildGeometry(mesh as never, taskConfig)

    expect(geometry.index?.array).toBeInstanceOf(Uint32Array)
  })
})
