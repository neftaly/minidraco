// One-shot child process for cold-load measurements. The parent starts a fresh
// Bun process for each sample so module caches do not leak between runs.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(import.meta.dir, '../..')
const scenario = process.argv[2]

const elapsedMs = async (fn: () => unknown | Promise<unknown>): Promise<number> => {
  const start = Bun.nanoseconds()
  await fn()
  return Number(Bun.nanoseconds() - start) / 1e6
}

let elapsed: number

const readFixtureBuffer = (fixture: string): ArrayBuffer => {
  const data = new Uint8Array(readFileSync(resolve(repoRoot, `library/src/__tests__/fixtures/${fixture}`)))
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
}

const assertIndexCount = (geometry: { index?: { count: number } | null } | void, expected: number) => {
  if (!geometry?.index || geometry.index.count !== expected) {
    throw new Error(`unexpected index count ${geometry?.index?.count}`)
  }
}

if (scenario === 'import:index') {
  elapsed = await elapsedMs(() => import('../dist/index.js'))
} else if (scenario === 'import:three') {
  elapsed = await elapsedMs(() => import('../dist/three.js'))
} else if (scenario === 'first-decode:cube') {
  const data = new Uint8Array(readFixtureBuffer('cube_att.obj.edgebreaker.cl10.2.2.drc'))
  elapsed = await elapsedMs(async () => {
    const { decodeDracoMesh } = await import('../dist/index.js')
    const mesh = decodeDracoMesh(data)
    if (mesh.numFaces() !== 12) throw new Error(`unexpected face count ${mesh.numFaces()}`)
  })
} else if (scenario === 'first-decode:three-sync') {
  const buffer = readFixtureBuffer('cube_att.obj.edgebreaker.cl10.2.2.drc')
  elapsed = await elapsedMs(async () => {
    const { MiniDRACOLoader } = await import('../dist/three.js')
    const loader = new MiniDRACOLoader()
    loader.setWorkerLimit(0)
    const geometry = await loader.decodeDracoFile(buffer)
    assertIndexCount(geometry, 36)
  })
} else if (scenario === 'first-decode:three-worker-cube') {
  const buffer = readFixtureBuffer('cube_att.obj.edgebreaker.cl10.2.2.drc')
  elapsed = await elapsedMs(async () => {
    const { MiniDRACOLoader } = await import('../dist/three.js')
    const loader = new MiniDRACOLoader().setWorkerLimit(1)
    try {
      const geometry = await loader.decodeDracoFile(buffer)
      assertIndexCount(geometry, 36)
    } finally {
      loader.dispose()
    }
  })
} else if (scenario === 'worker:first-bunny') {
  const buffer = readFixtureBuffer('bunny.drc')
  const { MiniDRACOLoader } = await import('../dist/three.js')
  elapsed = await elapsedMs(async () => {
    const loader = new MiniDRACOLoader().setWorkerLimit(1)
    try {
      const geometry = await loader.decodeDracoFile(buffer)
      assertIndexCount(geometry, 208353)
    } finally {
      loader.dispose()
    }
  })
} else if (scenario === 'worker:preloaded-bunny') {
  const buffer = readFixtureBuffer('bunny.drc')
  const { MiniDRACOLoader } = await import('../dist/three.js')
  const loader = new MiniDRACOLoader().setWorkerLimit(1)
  loader.preload()
  await new Promise(resolve => setTimeout(resolve, 200))
  elapsed = await elapsedMs(async () => {
    try {
      const geometry = await loader.decodeDracoFile(buffer)
      assertIndexCount(geometry, 208353)
    } finally {
      loader.dispose()
    }
  })
} else {
  throw new Error(`unknown load benchmark scenario ${scenario}`)
}

console.log(JSON.stringify({ scenario, elapsedMs: elapsed }))
