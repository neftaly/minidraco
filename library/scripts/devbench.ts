import { formatMs, summarizeSamples } from './bench-core'
// Dev-loop micro-benchmark: minidraco only, min/p25/median of 30 runs after
// warmup. Min time is the most stable metric for comparing code versions;
// the cross-decoder bench.ts is for headline numbers, not for optimization
// decisions (interleaving decoders adds ±10% JIT noise).
//
//   bun scripts/devbench.ts                    # the three production bundles
//   bun scripts/devbench.ts bunny.drc kira.glb # any corpus models (see harness)
import { BUNDLE_GLBS, SAMPLE_DRCS, SAMPLE_GLBS, decodeWithMinidraco, extractPrimitives } from './harness'

const corpus = [...BUNDLE_GLBS, ...SAMPLE_GLBS, ...SAMPLE_DRCS]
const requested = process.argv.slice(2)

const models = requested.length
  ? requested.map(name => {
      const path = corpus.find(p => p.endsWith(`/${name}`))
      if (!path) throw new Error(`unknown model ${name}`)
      return path
    })
  : BUNDLE_GLBS

for (const model of models) {
  const name = model.split('/').pop()!
  const primitives = extractPrimitives(model)
  for (let i = 0; i < 5; i++) for (const p of primitives) decodeWithMinidraco(p)

  const times: number[] = []
  for (let i = 0; i < 30; i++) {
    const start = performance.now()
    for (const p of primitives) decodeWithMinidraco(p)
    times.push(performance.now() - start)
  }
  const stats = summarizeSamples(times)
  console.log(`${name}  min: ${formatMs(stats.min)}  p25: ${formatMs(stats.p25)}  median: ${formatMs(stats.median)}`)
}
