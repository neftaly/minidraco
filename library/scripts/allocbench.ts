// Allocation / GC-churn benchmark for minidraco. JavaScript runtimes do not
// expose total allocation counters, so this reports a practical proxy: heap and
// ArrayBuffer growth before forced GC, retained memory after forced GC, and GC
// pause time.
//
//   bun run bench:alloc            # bundle GLBs, writes BENCH.alloc.json + BENCH.md
//   bun run bench:alloc --quick    # fewer iterations, print only
//   bun library/scripts/allocbench.ts static-bundle.glb bunny.drc  # filtered print only

import { renameSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { resolve } from 'node:path'

import { dataTypeLength } from '../src/decoder/core/DracoTypes'
import { decodeDracoMesh } from '../src/index'
import { clampPositive, formatBytes, formatMs, subtractMemory, summarizeSamples, table } from './bench-core'
import { writeBenchMd } from './benchmd'
import { BUNDLE_GLBS, SAMPLE_DRCS, SAMPLE_GLBS, decodeWithMinidraco, extractPrimitives } from './harness'

import type { DracoPrimitive } from './harness'

interface AllocResult {
  file: string
  mode: string
  primitives: number
  medianMs: number
  minMs: number
  heapGrowthBytes: number
  retainedHeapBytes: number
  arrayBufferGrowthBytes: number
  arrayBufferFloorBytes: number
  arrayBufferGapBytes: number
  retainedArrayBufferBytes: number
  gcMedianMs: number
}

interface ArrayBufferFloors {
  decode: number
  decodeAndExtract: number
}

const corpus = [...BUNDLE_GLBS, ...SAMPLE_GLBS, ...SAMPLE_DRCS]
const QUICK = process.argv.includes('--quick')
const requested = process.argv.slice(2).filter(arg => !arg.startsWith('--'))
const TIMED_RUNS = QUICK ? 5 : 15
const WARMUP_RUNS = QUICK ? 1 : 3
const WRITE_OUTPUTS = !QUICK && requested.length === 0
const repoRoot = resolve(import.meta.dir, '../..')

const models = requested.length
  ? requested.map(name => {
      const path = corpus.find(p => p.endsWith(`/${name}`))
      if (!path) throw new Error(`unknown model ${name}`)
      return path
    })
  : BUNDLE_GLBS

const runGc = (): number => {
  const start = performance.now()
  Bun.gc(true)
  return performance.now() - start
}

const decodeOnly = (primitives: DracoPrimitive[]): number => {
  let checksum = 0
  for (const p of primitives) {
    const mesh = decodeDracoMesh(p.data)
    checksum += mesh.numPoints() + mesh.numFaces()
  }
  return checksum
}

const decodeAndExtract = (primitives: DracoPrimitive[]): number => {
  let checksum = 0
  for (const p of primitives) {
    const decoded = decodeWithMinidraco(p)
    checksum += decoded.numPoints + decoded.indices.length
  }
  return checksum
}

const outputArrayBufferFloors = (primitives: DracoPrimitive[]): ArrayBufferFloors => {
  let decode = 0
  let extract = 0

  for (const p of primitives) {
    const mesh = decodeDracoMesh(p.data)
    const faceBytes = mesh.numFaces() * 3 * Uint32Array.BYTES_PER_ELEMENT
    decode += faceBytes
    extract += faceBytes

    for (let i = 0; i < mesh.numAttributes(); i++) {
      const attribute = mesh.attribute(i)
      decode += attribute.size * attribute.byteStride
      if (!attribute.isMappingIdentity) {
        decode += attribute.indicesMapSize * Uint32Array.BYTES_PER_ELEMENT
      }
    }

    for (const uniqueId of Object.values(p.attributes)) {
      const attribute = mesh.getAttributeByUniqueId(uniqueId)
      if (!attribute) throw new Error(`minidraco: missing attribute with unique id ${uniqueId}`)
      extract += mesh.numPoints() * attribute.numComponents * dataTypeLength(attribute.dataType)
    }
  }

  return { decode, decodeAndExtract: decode + extract }
}

const modes = [
  ['decode', decodeOnly],
  ['decode+extract', decodeAndExtract],
] as const

const results: AllocResult[] = []

const writeJsonAtomic = (path: string, value: unknown): void => {
  const tempPath = `${path}.${process.pid}.tmp`
  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`)
  renameSync(tempPath, path)
}

for (const model of models) {
  const file = model.split('/').at(-1) ?? model
  const primitives = extractPrimitives(model)

  for (const [mode, decode] of modes) {
    for (let i = 0; i < WARMUP_RUNS; i++) decode(primitives)

    const times: number[] = []
    const heapGrowth: number[] = []
    const retainedHeap: number[] = []
    const arrayBufferGrowth: number[] = []
    const retainedArrayBuffers: number[] = []
    const gcTimes: number[] = []
    let checksum = 0

    for (let i = 0; i < TIMED_RUNS; i++) {
      runGc()
      const before = process.memoryUsage()

      const start = performance.now()
      checksum ^= decode(primitives)
      times.push(performance.now() - start)

      const afterDecode = process.memoryUsage()
      const gcMs = runGc()
      const afterGc = process.memoryUsage()

      const growth = subtractMemory(afterDecode, before)
      const retained = subtractMemory(afterGc, before)
      heapGrowth.push(clampPositive(growth.heapUsed))
      retainedHeap.push(retained.heapUsed)
      arrayBufferGrowth.push(clampPositive(growth.arrayBuffers))
      retainedArrayBuffers.push(retained.arrayBuffers)
      gcTimes.push(gcMs)
    }

    // Make it observable that all timed decodes happened.
    if (checksum < 0) console.log('')

    const timeStats = summarizeSamples(times)
    results.push({
      file,
      mode,
      primitives: primitives.length,
      minMs: timeStats.min,
      medianMs: timeStats.median,
      heapGrowthBytes: summarizeSamples(heapGrowth).median,
      retainedHeapBytes: summarizeSamples(retainedHeap).median,
      arrayBufferGrowthBytes: summarizeSamples(arrayBufferGrowth).median,
      arrayBufferFloorBytes: 0,
      arrayBufferGapBytes: 0,
      retainedArrayBufferBytes: summarizeSamples(retainedArrayBuffers).median,
      gcMedianMs: summarizeSamples(gcTimes).median,
    })
  }
}

const floorsByFile = new Map<string, ArrayBufferFloors>()
for (const model of models) {
  const file = model.split('/').at(-1) ?? model
  floorsByFile.set(file, outputArrayBufferFloors(extractPrimitives(model)))
}
for (const r of results) {
  const floors = floorsByFile.get(r.file)!
  r.arrayBufferFloorBytes = r.mode === 'decode+extract' ? floors.decodeAndExtract : floors.decode
  r.arrayBufferGapBytes = r.arrayBufferGrowthBytes - r.arrayBufferFloorBytes
}

console.log('')
console.log(`minidraco allocation/GC proxy, bun ${Bun.version}`)
console.log(`Median of ${TIMED_RUNS} runs after ${WARMUP_RUNS} warmup${WARMUP_RUNS === 1 ? '' : 's'}`)
console.log('')
console.log(
  table(
    [
      'file',
      'mode',
      'prims',
      'min',
      'median',
      'heap+',
      'heap retained',
      'arraybuf+',
      'arraybuf floor',
      'arraybuf gap',
      'arraybuf retained',
      'gc median',
    ],
    results.map(r => [
      r.file,
      r.mode,
      String(r.primitives),
      formatMs(r.minMs),
      formatMs(r.medianMs),
      formatBytes(r.heapGrowthBytes),
      formatBytes(r.retainedHeapBytes),
      formatBytes(r.arrayBufferGrowthBytes),
      formatBytes(r.arrayBufferFloorBytes),
      formatBytes(r.arrayBufferGapBytes),
      formatBytes(r.retainedArrayBufferBytes),
      formatMs(r.gcMedianMs),
    ]),
  ),
)
console.log('')
console.log(
  'heap+/arraybuf+ are measured before forced GC; retained columns are after forced GC; floor is typed-array output payload only.',
)

if (WRITE_OUTPUTS) {
  const json = {
    date: new Date().toLocaleDateString('en-CA'),
    runtime: `bun ${Bun.version}`,
    engine: 'JavaScriptCore',
    cpu: cpus()[0]?.model ?? 'unknown',
    warmupRuns: WARMUP_RUNS,
    timedRuns: TIMED_RUNS,
    results: results.map(r => ({
      ...r,
      minMs: Number(r.minMs.toFixed(3)),
      medianMs: Number(r.medianMs.toFixed(3)),
      heapGrowthBytes: Math.round(r.heapGrowthBytes),
      retainedHeapBytes: Math.round(r.retainedHeapBytes),
      arrayBufferGrowthBytes: Math.round(r.arrayBufferGrowthBytes),
      retainedArrayBufferBytes: Math.round(r.retainedArrayBufferBytes),
      gcMedianMs: Number(r.gcMedianMs.toFixed(3)),
    })),
  }
  const path = resolve(repoRoot, 'BENCH.alloc.json')
  writeJsonAtomic(path, json)
  console.log(`\nWrote ${path}`)
  writeBenchMd()
} else {
  const reason = QUICK ? 'quick run' : 'filtered run'
  console.log(`\n(${reason} — BENCH.alloc.json/BENCH.md not updated)`)
}
