// Cold import / first-decode benchmark. Build dist first, or use
// `bun run bench:load`.

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { formatMs, summarizeSamples, table } from './bench-core'

const QUICK = process.argv.includes('--quick')
const warmupRuns = QUICK ? 1 : 3
const timedRuns = QUICK ? 5 : 15
const childPath = resolve(import.meta.dir, 'loadbench-child.ts')
const distIndex = resolve(import.meta.dir, '../dist/index.js')

if (!existsSync(distIndex)) {
  throw new Error('library/dist does not exist. Run `bun run --filter minidraco build` first.')
}

const scenarios = [
  ['import:index', 'cold import minidraco'],
  ['import:three', 'cold import minidraco/three'],
  ['first-decode:cube', 'cold import + first cube decode'],
  ['first-decode:three-sync', 'cold import minidraco/three + sync cube decode'],
  ['first-decode:three-worker-cube', 'cold import minidraco/three + worker cube decode'],
  ['worker:first-bunny', 'cold worker + first bunny decode'],
  ['worker:preloaded-bunny', 'preloaded worker + first bunny decode'],
] as const

const runChild = (scenario: string): number => {
  const result = Bun.spawnSync([process.execPath, childPath, scenario], {
    cwd: resolve(import.meta.dir, '../..'),
    stderr: 'pipe',
    stdout: 'pipe',
  })
  if (result.exitCode !== 0) {
    throw new Error(`${scenario} failed: ${result.stderr.toString().trim()}`)
  }
  const line = result.stdout.toString().trim()
  return JSON.parse(line).elapsedMs
}

const rows: string[][] = []

for (const [scenario, label] of scenarios) {
  for (let i = 0; i < warmupRuns; i++) runChild(scenario)

  const times: number[] = []
  for (let i = 0; i < timedRuns; i++) times.push(runChild(scenario))
  const stats = summarizeSamples(times)
  rows.push([label, formatMs(stats.min), formatMs(stats.p25), formatMs(stats.median), formatMs(stats.p75)])
}

console.log('')
console.log(`minidraco cold-load benchmark, bun ${Bun.version}`)
console.log(`Median of ${timedRuns} fresh child processes after ${warmupRuns} warmup${warmupRuns === 1 ? '' : 's'}`)
console.log('')
console.log(table(['scenario', 'min', 'p25', 'median', 'p75'], rows))
