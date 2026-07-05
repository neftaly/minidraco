// Default Three.js loader entry. This keeps the worker as a separately emitted,
// self-contained asset for frameworks that serve worker URLs as static files
// without following the worker's own imports (notably Next/Turbopack).
import { MiniDRACOLoaderBase } from './core'

export type { AttributeIDs, AttributeTypes, MiniDRACOLoaderOptions } from './core'

class MiniDRACOLoader extends MiniDRACOLoaderBase {
  override _createWorker(): Worker | null {
    // `new URL('./worker.js', import.meta.url)` is recognized by webpack /
    // turbopack / vite and emitted as a hashed static asset; unbundled, it
    // resolves to the self-contained dist/worker.js next to this file.
    // Kept as a standalone expression so bundlers emit a plain asset URL
    // instead of owning the worker graph.
    const workerUrl = this._workerUrl ?? new URL('./worker.js', import.meta.url)
    return this._createWorkerFromUrl(workerUrl)
  }
}

export { MiniDRACOLoader, MiniDRACOLoader as DRACOLoader }
