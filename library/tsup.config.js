import { defineConfig } from 'tsup'

// JS and d.ts are split into separate passes. `minidraco/three` stays
// decomplected from the decoder core by lazy-importing `minidraco`, but the
// worker is emitted in its own no-splitting JS pass. Next/Turbopack deploys
// worker URLs as media assets and can miss sibling chunks imported by that
// worker asset, so worker.js must be self-contained.
//
// The d.ts passes stay separate so tsup does not hoist shared public types into
// a content-hashed `Mesh-<hash>.d.ts` file.
export default defineConfig([
  {
    entry: { index: 'src/index.ts', three: 'src/three/index.ts', 'three/vite': 'src/three/vite.ts' },
    clean: true,
    format: ['esm'],
    dts: false,
    splitting: true,
    external: ['three'],
  },
  {
    entry: { worker: 'src/worker.ts' },
    format: ['esm'],
    dts: false,
    splitting: false,
  },
  {
    entry: { 'worker-vite': 'src/worker.ts' },
    format: ['esm'],
    dts: false,
    splitting: false,
    external: ['./index.js'],
  },
  {
    entry: { index: 'src/index.ts', worker: 'src/worker.ts' },
    format: ['esm'],
    dts: { only: true },
    splitting: false,
  },
  {
    entry: { three: 'src/three/index.ts' },
    format: ['esm'],
    dts: { only: true },
    splitting: false,
    external: ['three'],
  },
  {
    entry: { 'three/vite': 'src/three/vite.ts' },
    format: ['esm'],
    dts: { only: true },
    splitting: false,
    external: ['three'],
  },
])
