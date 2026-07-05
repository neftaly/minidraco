import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import { MiniDRACOLoader } from '../three'
import { MiniDRACOLoader as MiniDRACOLoaderVite } from '../three/vite'

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

const withCapturedWorkers = async <T>(
  fn: (created: { url: string | URL; options?: WorkerOptions }[]) => T | Promise<T>,
): Promise<T> => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Worker')
  const created: { url: string | URL; options?: WorkerOptions }[] = []

  class FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: ((event: ErrorEvent) => void) | null = null

    constructor(url: string | URL, options?: WorkerOptions) {
      created.push({ url, options })
    }

    postMessage() {}

    terminate() {}
  }

  Object.defineProperty(globalThis, 'Worker', { configurable: true, value: FakeWorker })

  try {
    return await fn(created)
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
    expect(loader.setDecoderPath({ wasm: '/draco/draco_decoder.wasm' })).toBe(loader)
    expect(loader.setDecoderConfig({ type: 'js' })).toBe(loader)

    const geometry = await loader.decodeDracoFile(buffer)
    if (!geometry) throw new Error('decodeDracoFile did not return geometry')

    expect(geometry.index?.array).toBeInstanceOf(Uint16Array)
  })

  test('constructor options configure the worker policy', async () => {
    const syncLoader = new MiniDRACOLoader({ workers: false })
    const tunedLoader = new MiniDRACOLoader({ workerLimit: 8, syncByteThreshold: 1234 })
    const buffer = readArrayBuffer(`${import.meta.dir}/fixtures/cube.drc`)

    expect(syncLoader.workerLimit).toBe(0)
    expect(tunedLoader.workerLimit).toBe(8)
    expect(tunedLoader.syncByteThreshold).toBe(1234)

    syncLoader._decodeInWorker = async () => {
      throw new Error('worker path should not run')
    }
    const geometry = await withWorkerAvailable(() => syncLoader.decodeDracoFile(buffer))
    if (!geometry) throw new Error('decodeDracoFile did not return geometry')

    expect(geometry.index?.array).toBeInstanceOf(Uint16Array)
  })

  test('setWorkers toggles the pool while remaining chainable', () => {
    const loader = new MiniDRACOLoader({ workerLimit: 2 })

    expect(loader.setWorkers(false)).toBe(loader)
    expect(loader.workerLimit).toBe(0)
    expect(loader.setWorkers(true)).toBe(loader)
    expect(loader.workerLimit).toBe(4)
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

  test('default loader keeps the self-contained worker URL', async () => {
    const loader = new MiniDRACOLoader()

    await withCapturedWorkers(created => {
      expect(loader._getWorker()).not.toBeNull()
      expect(String(created[0]?.url).endsWith('/worker.js')).toBe(true)
      expect(String(created[0]?.url).includes('worker-vite')).toBe(false)
      expect(created[0]?.options).toEqual({ type: 'module' })
    })

    loader.dispose()
  })

  test('vite loader creates the Vite-owned module worker URL', async () => {
    const loader = new MiniDRACOLoaderVite()

    await withCapturedWorkers(created => {
      expect(loader._getWorker()).not.toBeNull()
      expect(String(created[0]?.url).endsWith('/worker-vite.js')).toBe(true)
      expect(created[0]?.options).toEqual({ type: 'module' })
    })

    loader.dispose()
  })
})
