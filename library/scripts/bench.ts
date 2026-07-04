// Benchmark: decode every Draco primitive of every bundle GLB and every
// draco.js sample model with each decoder, several times, and report
// per-file totals. Full runs also rewrite BENCH.md and BENCH.json at the
// repo root; both are checked in so perf work can diff against them.
//
//   bun run bench            # all decoders, writes BENCH.md + BENCH.json
//   bun run bench --quick    # fewer iterations, doesn't touch the outputs
import { writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { resolve } from 'node:path'

import {
  BUNDLE_GLBS,
  SAMPLE_DRCS,
  SAMPLE_GLBS,
  decodeWithDraco3d,
  decodeWithDracoJs,
  decodeWithMinidraco,
  extractPrimitives,
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

for (const modelPath of [...BUNDLE_GLBS, ...SAMPLE_GLBS, ...SAMPLE_DRCS]) {
  const file = modelPath.split('/').pop()!
  const primitives = extractPrimitives(modelPath)

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
const header = ['file', 'prims', 'faces', ...decoderNames]
const rows = results.map(r => [
  r.file,
  String(r.primitives),
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

if (QUICK) {
  console.log('\n(quick run — BENCH.md/BENCH.json not updated)')
} else {
  const benchMdPath = resolve(import.meta.dir, '../../BENCH.md')
  const benchJsonPath = resolve(import.meta.dir, '../../BENCH.json')
  // Local date, YYYY-MM-DD (toISOString would be UTC)
  const date = new Date().toLocaleDateString('en-CA')

  // Machine-readable results, checked into the repo so perf work can diff
  // against the previous run (ms values rounded — sub-µs digits are noise)
  const json = {
    date,
    runtime: `bun ${Bun.version}`,
    engine: 'JavaScriptCore',
    cpu: cpus()[0]?.model ?? 'unknown',
    warmupRuns: WARMUP_RUNS,
    timedRuns: TIMED_RUNS,
    results: results.map(r => ({
      file: r.file,
      primitives: r.primitives,
      points: r.points,
      faces: r.faces,
      medianMs: Object.fromEntries(Object.entries(r.medianMs).map(([k, v]) => [k, Number(v.toFixed(3))])),
    })),
  }
  writeFileSync(benchJsonPath, `${JSON.stringify(json, null, 2)}\n`)

  // How minidraco compares against another decoder's time, as a human-readable
  // verdict. Differences within 5% are called even — that's inside run noise.
  const versus = (miniMs: number, otherMs: number): string => {
    const ratio = otherMs / miniMs
    if (ratio >= 1.05) return `🟢 ${ratio.toFixed(2)}x faster`
    if (ratio <= 1 / 1.05) return `🔴 ${(1 / ratio).toFixed(2)}x slower`
    return '⚪ even'
  }

  const tableHeader = [
    'file',
    'prims',
    'faces',
    'minidraco',
    'draco.js',
    'draco3d (wasm)',
    'minidraco vs draco.js',
    'minidraco vs wasm',
  ]
  const tableRows = results.map(r => {
    const mini = r.medianMs['minidraco']
    const js = r.medianMs['draco.js']
    const wasm = r.medianMs['draco3d (wasm)']
    return [
      `\`${r.file}\``,
      String(r.primitives),
      r.faces.toLocaleString('en-US'),
      `${mini.toFixed(2)} ms`,
      `${js.toFixed(2)} ms`,
      `${wasm.toFixed(2)} ms`,
      versus(mini, js),
      versus(mini, wasm),
    ]
  })

  // file and the two verdict columns are left-aligned, numeric columns right-aligned
  const leftAligned = (i: number) => i === 0 || i >= tableHeader.length - 2
  const columnWidths = tableHeader.map((h, i) => Math.max(h.length, ...tableRows.map(r => r[i].length)))
  const formatMdRow = (row: string[]) =>
    `| ${row.map((cell, i) => (leftAligned(i) ? cell.padEnd(columnWidths[i]) : cell.padStart(columnWidths[i]))).join(' | ')} |`
  const separatorRow = `| ${columnWidths.map((w, i) => (leftAligned(i) ? '-'.repeat(w) : `${'-'.repeat(w - 1)}:`)).join(' | ')} |`

  const lines = [
    '# Benchmark results',
    '',
    '<!-- Generated by `bun run bench` — do not edit by hand. -->',
    '',
    'Raw single-threaded Draco decode time: every Draco primitive of each file is decoded',
    `sequentially, and the table reports the median of ${TIMED_RUNS} such runs (after ${WARMUP_RUNS} warmup runs).`,
    'The corpus is the production bundle GLBs from `example/public/models` plus the sample models',
    'shipped in [mrdoob/draco.js](https://github.com/mrdoob/draco.js) (`samples/`, used straight',
    'from the installed dependency). The last two columns say how minidraco compares to each other',
    'decoder: 🟢 minidraco is faster, 🔴 minidraco is slower, ⚪ within 5% (run noise).',
    '',
    `- Date: ${date}`,
    `- Runtime: bun ${Bun.version} (JavaScriptCore)`,
    `- CPU: ${cpus()[0]?.model ?? 'unknown'}`,
    '',
    formatMdRow(tableHeader),
    separatorRow,
    ...tableRows.map(formatMdRow),
    '',
    'Medians of independent runs still carry roughly ±10% JIT/thermal noise — treat this as the',
    'cross-decoder picture, not a micro-optimization ranking. V8 (browsers) ranks the decoders',
    'differently than JSC; see the in-browser benchmark at `/bench` in the example app.',
    '',
  ]

  writeFileSync(benchMdPath, lines.join('\n'))
  // Let oxfmt own the final table padding — emoji column widths are hard to
  // reproduce by hand and the file must pass `oxfmt --check`
  const oxfmt = Bun.spawnSync(['bunx', 'oxfmt', benchMdPath, benchJsonPath])
  if (oxfmt.exitCode !== 0) console.warn(`oxfmt failed on bench outputs: ${oxfmt.stderr.toString().trim()}`)
  console.log(`\nWrote ${benchMdPath} and ${benchJsonPath}`)
}
