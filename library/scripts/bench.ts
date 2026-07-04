// Benchmark: decode every Draco primitive of every bundle GLB with each
// decoder, several times, and report per-file totals.
//
//   bun run bench            # all decoders
//   bun run bench --quick    # fewer iterations
import {
  BUNDLE_GLBS,
  decodeWithDraco3d,
  decodeWithDracoJs,
  decodeWithMinidraco,
  extractDracoPrimitives,
  getDraco3dModule,
} from './harness'

import type { DracoPrimitive } from './harness'

const QUICK = process.argv.includes('--quick')
const WARMUP_RUNS = QUICK ? 1 : 3
const TIMED_RUNS = QUICK ? 3 : 10

interface BenchResult {
  file: string
  primitives: number
  points: number
  faces: number
  medianMs: Record<string, number>
}

const median = (values: number[]): number => {
  const sorted = [...values].toSorted((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const bench = async (
  name: string,
  primitives: DracoPrimitive[],
  decode: (p: DracoPrimitive) => unknown | Promise<unknown>,
) => {
  for (let i = 0; i < WARMUP_RUNS; i++) for (const p of primitives) await decode(p)

  const times: number[] = []
  for (let i = 0; i < TIMED_RUNS; i++) {
    const start = performance.now()
    for (const p of primitives) await decode(p)
    times.push(performance.now() - start)
  }
  return median(times)
}

const results: BenchResult[] = []

// Force wasm module compilation before timing starts
await getDraco3dModule()

for (const glbPath of BUNDLE_GLBS) {
  const file = glbPath.split('/').pop()!
  const primitives = extractDracoPrimitives(glbPath)

  let points = 0
  let faces = 0
  for (const p of primitives) {
    const decoded = decodeWithMinidraco(p)
    points += decoded.numPoints
    faces += decoded.indices.length / 3
  }

  const medianMs: Record<string, number> = {
    minidraco: await bench('minidraco', primitives, decodeWithMinidraco),
    'draco.js': await bench('draco.js', primitives, decodeWithDracoJs),
    'draco3d (wasm)': await bench('draco3d', primitives, decodeWithDraco3d),
  }

  results.push({ file, primitives: primitives.length, points, faces, medianMs })
}

console.log('')
console.log(`Median decode time over ${TIMED_RUNS} runs (all primitives per file), bun ${Bun.version}`)
console.log('')

const decoderNames = Object.keys(results[0].medianMs)
const header = ['file', 'prims', 'points', 'faces', ...decoderNames]
const rows = results.map(r => [
  r.file,
  String(r.primitives),
  String(r.points),
  String(r.faces),
  ...decoderNames.map(d => `${r.medianMs[d].toFixed(2)} ms`),
])

const widths = header.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)))
const formatRow = (row: string[]) => row.map((cell, i) => cell.padEnd(widths[i])).join('  ')

console.log(formatRow(header))
console.log(widths.map(w => '-'.repeat(w)).join('  '))
for (const row of rows) console.log(formatRow(row))

console.log('')
for (const r of results) {
  const mini = r.medianMs['minidraco']
  const js = r.medianMs['draco.js']
  const wasm = r.medianMs['draco3d (wasm)']
  console.log(
    `${r.file}: minidraco is ${(js / mini).toFixed(2)}x vs draco.js, ${(wasm / mini).toFixed(2)}x vs wasm (>1 means minidraco is faster)`,
  )
}
