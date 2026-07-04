# Benchmark results

<!-- Generated from BENCH.json + BENCH.browser.json by library/scripts/benchmd.ts — do not edit by hand. -->

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
| `canine-bundle.glb`               |   5.00 ms |   4.40 ms |        9.30 ms | 🔴 1.14x slower       | 🟢 1.86x faster   |
| `player-bundle.glb`               |   9.30 ms |   9.40 ms |        7.20 ms | ⚪ even               | 🔴 1.29x slower   |
| `static-bundle.glb`               |  52.00 ms |  94.30 ms |       49.40 ms | 🟢 1.81x faster       | 🔴 1.05x slower   |
| `IridescentDishWithOlives.glb`    |  68.30 ms |  70.60 ms |       63.60 ms | ⚪ even               | 🔴 1.07x slower   |
| `LittlestTokyo.glb`               |  87.50 ms | 175.00 ms |       89.30 ms | 🟢 2.00x faster       | ⚪ even           |
| `ShaderBall2.glb`                 |  13.40 ms |  19.60 ms |       15.10 ms | 🟢 1.46x faster       | 🟢 1.13x faster   |
| `bath_day.glb`                    |  39.00 ms |  52.90 ms |       39.50 ms | 🟢 1.36x faster       | ⚪ even           |
| `duck.glb`                        |   1.70 ms |   3.30 ms |        2.10 ms | 🟢 1.94x faster       | 🟢 1.24x faster   |
| `ferrari.glb`                     |  35.60 ms |  89.30 ms |       28.40 ms | 🟢 2.51x faster       | 🔴 1.25x slower   |
| `forest_house.glb`                |  26.00 ms |  30.10 ms |       24.90 ms | 🟢 1.16x faster       | ⚪ even           |
| `gears.glb`                       |   2.90 ms |   4.90 ms |        2.10 ms | 🟢 1.69x faster       | 🔴 1.38x slower   |
| `kira.glb`                        | 259.50 ms | 245.50 ms |      230.20 ms | 🔴 1.06x slower       | 🔴 1.13x slower   |
| `minimalistic_modern_bedroom.glb` |  32.90 ms |  38.90 ms |       33.50 ms | 🟢 1.18x faster       | ⚪ even           |
| `nemetona.glb`                    | 187.60 ms | 198.00 ms |      143.60 ms | 🟢 1.06x faster       | 🔴 1.31x slower   |
| `pool.glb`                        |  41.90 ms |  48.70 ms |       43.00 ms | 🟢 1.16x faster       | ⚪ even           |
| `rolex.glb`                       |  32.10 ms |  64.20 ms |       22.50 ms | 🟢 2.00x faster       | 🔴 1.43x slower   |
| `venice_mask.glb`                 |  72.90 ms | 157.20 ms |       66.60 ms | 🟢 2.16x faster       | 🔴 1.09x slower   |

Medians of independent runs carry roughly ±10% JIT/thermal noise (more for the loader wall
clock) — treat this as the cross-decoder picture, not a micro-optimization ranking.
