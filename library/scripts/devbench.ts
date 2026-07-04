// Dev-loop micro-benchmark: minidraco only, min/p25/median of 30 runs after
// warmup. Min time is the most stable metric for comparing code versions;
// the cross-decoder bench.ts is for headline numbers, not for optimization
// decisions (interleaving decoders adds ±10% JIT noise).
import { decodeWithMinidraco, extractDracoPrimitives } from './harness'

const models = ['player-bundle', 'static-bundle', 'canine-bundle']

for (const model of models) {
  const primitives = extractDracoPrimitives(`${import.meta.dir}/../../example/public/models/${model}.glb`)
  for (let i = 0; i < 5; i++) for (const p of primitives) decodeWithMinidraco(p)

  const times: number[] = []
  for (let i = 0; i < 30; i++) {
    const start = performance.now()
    for (const p of primitives) decodeWithMinidraco(p)
    times.push(performance.now() - start)
  }
  times.sort((a, b) => a - b)
  console.log(`${model}  min: ${times[0].toFixed(2)}  p25: ${times[7].toFixed(2)}  median: ${times[15].toFixed(2)}`)
}
