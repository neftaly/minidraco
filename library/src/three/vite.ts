// Vite-specific Three.js loader entry. Vite owns the worker graph when the
// worker is constructed directly with new Worker(new URL(...), ...), so this
// entry points at the import-external worker and leaves the default loader's
// self-contained worker out of Vite app bundles.
import { MiniDRACOLoaderBase } from './core'

export type { AttributeIDs, AttributeTypes, MiniDRACOLoaderOptions } from './core'

class MiniDRACOLoader extends MiniDRACOLoaderBase {
  override _createWorker(): Worker | null {
    if (this._workerUrl !== null) return this._createWorkerFromUrl(this._workerUrl)

    return new Worker(new URL('../worker-vite.js', import.meta.url), { type: 'module' })
  }
}

export { MiniDRACOLoader, MiniDRACOLoader as DRACOLoader }
