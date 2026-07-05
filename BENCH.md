# Benchmark results

<!-- Generated from BENCH*.json by library/scripts/benchmd.ts — do not edit by hand. -->

Median decode time per file (every Draco primitive decoded sequentially per run). The corpus
is the production bundle GLBs from `example/public/models` plus the sample models shipped in
[mrdoob/draco.js](https://github.com/mrdoob/draco.js) (`samples/`, used straight from the
installed dependency). The last two columns say how minidraco compares to each other decoder:
🟢 minidraco is faster, 🔴 minidraco is slower, ⚪ within 5% (run noise).

## Bun — single-threaded (JavaScriptCore)

Raw decode via `bun run bench`, median of 10 runs after 3 warmups.

- Date: 2026-07-05
- Runtime: bun 1.3.14 (JavaScriptCore)
- CPU: Apple M3

| file                              | prims |   faces | minidraco |  draco.js | draco3d (wasm) | minidraco vs draco.js | minidraco vs wasm |
| --------------------------------- | ----: | ------: | --------: | --------: | -------------: | --------------------- | ----------------- |
| `canine-bundle.glb`               |     1 |     532 |   0.70 ms |   0.86 ms |        0.74 ms | 🟢 1.23x faster       | 🟢 1.07x faster   |
| `player-bundle.glb`               |     7 |   2,544 |   2.07 ms |   2.23 ms |        1.36 ms | 🟢 1.08x faster       | 🔴 1.53x slower   |
| `static-bundle.glb`               |   488 | 220,879 |  48.22 ms |  51.45 ms |       49.99 ms | 🟢 1.07x faster       | ⚪ even           |
| `IridescentDishWithOlives.glb`    |     4 |  24,448 |   3.86 ms |   3.76 ms |        4.46 ms | ⚪ even               | 🟢 1.16x faster   |
| `LittlestTokyo.glb`               |    71 | 141,802 |  70.93 ms |  76.14 ms |       76.46 ms | 🟢 1.07x faster       | 🟢 1.08x faster   |
| `ShaderBall2.glb`                 |     3 |  13,388 |   4.15 ms |   4.66 ms |        4.96 ms | 🟢 1.12x faster       | 🟢 1.19x faster   |
| `bath_day.glb`                    |    22 |  32,158 |   5.48 ms |   5.99 ms |        5.56 ms | 🟢 1.09x faster       | ⚪ even           |
| `duck.glb`                        |     1 |   4,212 |   0.78 ms |   0.87 ms |        1.11 ms | 🟢 1.11x faster       | 🟢 1.42x faster   |
| `ferrari.glb`                     |    51 | 358,788 |  61.59 ms |  62.16 ms |       76.20 ms | ⚪ even               | 🟢 1.24x faster   |
| `forest_house.glb`                |    12 |  10,956 |   2.59 ms |   2.85 ms |        2.74 ms | 🟢 1.10x faster       | 🟢 1.06x faster   |
| `gears.glb`                       |     3 |  21,696 |   2.95 ms |   3.05 ms |        3.44 ms | ⚪ even               | 🟢 1.17x faster   |
| `kira.glb`                        |    43 |  51,601 |   9.32 ms |   9.25 ms |       11.16 ms | ⚪ even               | 🟢 1.20x faster   |
| `minimalistic_modern_bedroom.glb` |     4 |  10,457 |   2.69 ms |   2.71 ms |        2.99 ms | ⚪ even               | 🟢 1.11x faster   |
| `nemetona.glb`                    |     1 | 320,352 | 128.36 ms | 137.70 ms |      140.29 ms | 🟢 1.07x faster       | 🟢 1.09x faster   |
| `pool.glb`                        |     2 |  22,280 |   4.85 ms |   5.47 ms |        3.98 ms | 🟢 1.13x faster       | 🔴 1.22x slower   |
| `rolex.glb`                       |    24 | 120,336 |  37.32 ms |  37.11 ms |       41.25 ms | ⚪ even               | 🟢 1.11x faster   |
| `venice_mask.glb`                 |     5 | 295,600 |  74.08 ms |  78.97 ms |       80.19 ms | 🟢 1.07x faster       | 🟢 1.08x faster   |
| `bunny.drc`                       |     1 |  69,451 |   7.93 ms |   8.44 ms |        4.11 ms | 🟢 1.06x faster       | 🔴 1.93x slower   |
| `car.drc`                         |     1 |   1,744 |   0.07 ms |   2.85 ms |        0.13 ms | 🟢 38.01x faster      | 🟢 1.71x faster   |
| `duck.drc`                        |     1 |   4,212 |   1.04 ms |   1.07 ms |        1.08 ms | ⚪ even               | ⚪ even           |

## Browser — single-threaded raw decode (V8)

All three decoders run synchronously on the main thread — no worker pools, no GLTFLoader
overhead. Median of 10 runs after 3 warmups, saved from the example's `/bench` page.

- Date: 2026-07-05
- Browser: Chrome/149.0.0.0 on Macintosh

| file                              | prims |   faces | minidraco |  draco.js | draco3d (wasm) | minidraco vs draco.js | minidraco vs wasm |
| --------------------------------- | ----: | ------: | --------: | --------: | -------------: | --------------------- | ----------------- |
| `canine-bundle.glb`               |     1 |     532 |   0.50 ms |   0.60 ms |        0.40 ms | 🟢 1.20x faster       | 🔴 1.25x slower   |
| `player-bundle.glb`               |     7 |   2,544 |   2.10 ms |   2.20 ms |        2.00 ms | ⚪ even               | 🔴 1.05x slower   |
| `static-bundle.glb`               |   488 | 220,879 |  63.40 ms |  64.90 ms |       83.00 ms | ⚪ even               | 🟢 1.31x faster   |
| `IridescentDishWithOlives.glb`    |     4 |  24,448 |   8.10 ms |   5.60 ms |        8.00 ms | 🔴 1.45x slower       | ⚪ even           |
| `LittlestTokyo.glb`               |    71 | 141,802 |  90.70 ms |  92.90 ms |      136.90 ms | ⚪ even               | 🟢 1.51x faster   |
| `ShaderBall2.glb`                 |     3 |  13,388 |   5.50 ms |   5.70 ms |        9.30 ms | ⚪ even               | 🟢 1.69x faster   |
| `bath_day.glb`                    |    22 |  32,158 |   7.40 ms |   7.60 ms |       10.40 ms | ⚪ even               | 🟢 1.41x faster   |
| `duck.glb`                        |     1 |   4,212 |   1.10 ms |   1.20 ms |        2.00 ms | 🟢 1.09x faster       | 🟢 1.82x faster   |
| `ferrari.glb`                     |    51 | 358,788 |  86.30 ms |  84.80 ms |      137.10 ms | ⚪ even               | 🟢 1.59x faster   |
| `forest_house.glb`                |    12 |  10,956 |   3.40 ms |   3.60 ms |        5.10 ms | 🟢 1.06x faster       | 🟢 1.50x faster   |
| `gears.glb`                       |     3 |  21,696 |   4.40 ms |   4.30 ms |        6.00 ms | ⚪ even               | 🟢 1.36x faster   |
| `kira.glb`                        |    43 |  51,601 |  13.40 ms |  14.00 ms |       20.80 ms | ⚪ even               | 🟢 1.55x faster   |
| `minimalistic_modern_bedroom.glb` |     4 |  10,457 |   3.70 ms |   3.90 ms |        5.50 ms | 🟢 1.05x faster       | 🟢 1.49x faster   |
| `nemetona.glb`                    |     1 | 320,352 | 164.70 ms | 168.50 ms |      224.80 ms | ⚪ even               | 🟢 1.36x faster   |
| `pool.glb`                        |     2 |  22,280 |   4.90 ms |   4.70 ms |        7.10 ms | ⚪ even               | 🟢 1.45x faster   |
| `rolex.glb`                       |    24 | 120,336 |  41.90 ms |  43.40 ms |       71.90 ms | ⚪ even               | 🟢 1.72x faster   |
| `venice_mask.glb`                 |     5 | 295,600 |  90.90 ms |  93.90 ms |      136.00 ms | ⚪ even               | 🟢 1.50x faster   |
| `bunny.drc`                       |     1 |  69,451 |  12.20 ms |   5.80 ms |        6.80 ms | 🔴 2.10x slower       | 🔴 1.79x slower   |
| `car.drc`                         |     1 |   1,744 |   0.00 ms |   2.50 ms |        0.50 ms | 🟢 50.00x faster      | 🟢 10.00x faster  |
| `duck.drc`                        |     1 |   4,212 |   1.10 ms |   1.20 ms |        2.00 ms | 🟢 1.09x faster       | 🟢 1.82x faster   |

## Browser — GLTFLoader wall clock (V8)

Full `GLTFLoader.parse` time with long-lived loaders. Not an apples-to-apples decoder
comparison: minidraco and the wasm decoder parallelize across 4-worker pools while draco.js
decodes on the main thread — this measures what an app actually experiences, including
texture decode and scene-graph setup. Median of 5 runs after 1 warmup, GLBs only
(raw `.drc` files have no glTF container).

- Date: 2026-07-05
- Browser: Chrome/149.0.0.0 on Macintosh

| file                              | minidraco |  draco.js | draco3d (wasm) | minidraco vs draco.js | minidraco vs wasm |
| --------------------------------- | --------: | --------: | -------------: | --------------------- | ----------------- |
| `canine-bundle.glb`               |   7.40 ms |   4.60 ms |       12.10 ms | 🔴 1.61x slower       | 🟢 1.64x faster   |
| `player-bundle.glb`               |  11.40 ms |   9.90 ms |        7.50 ms | 🔴 1.15x slower       | 🔴 1.52x slower   |
| `static-bundle.glb`               |  56.60 ms |  93.60 ms |       51.30 ms | 🟢 1.65x faster       | 🔴 1.10x slower   |
| `IridescentDishWithOlives.glb`    |  63.00 ms |  72.20 ms |       58.80 ms | 🟢 1.15x faster       | 🔴 1.07x slower   |
| `LittlestTokyo.glb`               |  89.80 ms | 182.00 ms |       92.20 ms | 🟢 2.03x faster       | ⚪ even           |
| `ShaderBall2.glb`                 |  16.30 ms |  20.10 ms |       13.60 ms | 🟢 1.23x faster       | 🔴 1.20x slower   |
| `bath_day.glb`                    |  39.80 ms |  50.20 ms |       43.60 ms | 🟢 1.26x faster       | 🟢 1.10x faster   |
| `duck.glb`                        |   3.20 ms |   3.00 ms |        1.90 ms | 🔴 1.07x slower       | 🔴 1.68x slower   |
| `ferrari.glb`                     |  31.90 ms |  90.10 ms |       29.40 ms | 🟢 2.82x faster       | 🔴 1.09x slower   |
| `forest_house.glb`                |  27.30 ms |  27.30 ms |       24.50 ms | ⚪ even               | 🔴 1.11x slower   |
| `gears.glb`                       |   2.60 ms |   4.80 ms |        2.10 ms | 🟢 1.85x faster       | 🔴 1.24x slower   |
| `kira.glb`                        | 259.20 ms | 251.90 ms |      226.80 ms | ⚪ even               | 🔴 1.14x slower   |
| `minimalistic_modern_bedroom.glb` |  33.90 ms |  40.00 ms |       33.00 ms | 🟢 1.18x faster       | ⚪ even           |
| `nemetona.glb`                    | 172.30 ms | 201.80 ms |      145.80 ms | 🟢 1.17x faster       | 🔴 1.18x slower   |
| `pool.glb`                        |  49.10 ms |  48.40 ms |       42.70 ms | ⚪ even               | 🔴 1.15x slower   |
| `rolex.glb`                       |  23.50 ms |  64.60 ms |       23.20 ms | 🟢 2.75x faster       | ⚪ even           |
| `venice_mask.glb`                 |  73.70 ms | 166.30 ms |       77.30 ms | 🟢 2.26x faster       | ⚪ even           |

## Allocation / GC proxy

JavaScript runtimes do not expose total allocation counters, so this records heap and
ArrayBuffer growth before forced GC, retained deltas after forced GC, and forced-GC
pause time. Median of 15 runs after 3 warmups on the production bundle GLBs.

- Date: 2026-07-05
- Runtime: bun 1.3.14 (JavaScriptCore)
- CPU: 11th Gen Intel(R) Core(TM) i7-1185G7 @ 3.00GHz

| file                | mode           | prims |   median |   heap+ | heap retained | arraybuf+ | arraybuf retained | gc median |
| ------------------- | -------------- | ----: | -------: | ------: | ------------: | --------: | ----------------: | --------: |
| `canine-bundle.glb` | decode         |     1 |  1.01 ms |     0 B |           0 B |  27.63 KB |               0 B |   1.48 ms |
| `canine-bundle.glb` | decode+extract |     1 |  0.91 ms |     0 B |           0 B |  33.97 KB |               0 B |   1.74 ms |
| `player-bundle.glb` | decode         |     7 |  2.53 ms |     0 B |           0 B | 131.55 KB |               0 B |   2.48 ms |
| `player-bundle.glb` | decode+extract |     7 |  2.18 ms |     0 B |           0 B | 162.13 KB |               0 B |   1.81 ms |
| `static-bundle.glb` | decode         |   488 | 67.87 ms | 5.37 KB |       5.37 KB |   6.35 MB |               0 B |   3.04 ms |
| `static-bundle.glb` | decode+extract |   488 | 64.26 ms |     0 B |           0 B |   8.93 MB |               0 B |   3.18 ms |

## Deployed size

Minified browser bundles are built from `library/dist` with `three` externalized for
`minidraco/three`. The worker is a separate module-worker asset referenced by
`new URL("./worker.js", import.meta.url)`. Vite worker rows count the worker
payload separately because Vite does not share chunks across the main and worker
graphs by default.

- Date: 2026-07-05
- Runtime: bun 1.3.14

Package artifacts:

| file                |       raw |     gzip |   brotli |
| ------------------- | --------: | -------: | -------: |
| `chunk-PA2WQDT2.js` |  12.45 KB |  3.77 KB |  3.28 KB |
| `index.d.ts`        |   8.20 KB |  1.98 KB |  1.77 KB |
| `index.js`          | 228.28 KB | 39.98 KB | 33.30 KB |
| `three.d.ts`        |   7.96 KB |  1.95 KB |  1.76 KB |
| `three.js`          |     364 B |    230 B |    195 B |
| `three/vite.d.ts`   |   7.96 KB |  1.95 KB |  1.76 KB |
| `three/vite.js`     |     408 B |    253 B |    220 B |
| `worker-vite.js`    |   4.20 KB |  2.24 KB |  2.05 KB |
| `worker.d.ts`       |      13 B |     33 B |     17 B |
| `worker.js`         | 232.28 KB | 42.19 KB | 35.06 KB |

Browser-deployed bundles:

| file                                         |       raw |     gzip |   brotli |
| -------------------------------------------- | --------: | -------: | -------: |
| `minidraco graph.min.js`                     | 102.56 KB | 26.20 KB | 22.52 KB |
| `minidraco/three main graph.min.js`          |   6.61 KB |  2.73 KB |  2.40 KB |
| `minidraco worker graph.min.js`              | 105.27 KB | 27.98 KB | 24.08 KB |
| `minidraco/three main + worker graph`        | 111.89 KB | 30.72 KB | 26.48 KB |
| `minidraco/three/vite main graph.min.js`     |   6.67 KB |  2.76 KB |  2.45 KB |
| `minidraco/three/vite worker graph.min.js`   | 105.47 KB | 28.15 KB | 24.34 KB |
| `minidraco/three/vite main + worker graph`   | 112.14 KB | 30.91 KB | 26.79 KB |
| `minidraco + three/vite main + worker graph` | 214.70 KB | 57.11 KB | 49.31 KB |
| `minidraco/three sync fallback graph`        | 109.18 KB | 28.94 KB | 24.92 KB |

Medians of independent runs carry roughly ±10% JIT/thermal noise (more for the loader wall
clock) — treat this as the cross-decoder picture, not a micro-optimization ranking.
