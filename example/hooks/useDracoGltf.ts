import { useEffect, useState } from 'react'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { getDracoLoader } from '../lib/loaders'

import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

import type { DecoderKind } from '../lib/loaders'

export interface DracoGltfResult {
  gltf: GLTF | null
  error: string | null
  // Total GLTFLoader.parse time (network excluded), and the portion of it
  // spent inside Draco decodeGeometry calls.
  parseMs: number
  decodeMs: number
  decodeCalls: number
}

// Loads a Draco-compressed GLB with the selected decoder backend, timing the
// Draco portion of the parse. The GLB bytes are fetched once per URL; a fresh
// ArrayBuffer copy is handed to each parse so per-decoder task caches (keyed
// by buffer identity) can't short-circuit a re-decode.
export const useDracoGltf = (url: string, decoder: DecoderKind): DracoGltfResult => {
  const [result, setResult] = useState<DracoGltfResult>({
    gltf: null,
    error: null,
    parseMs: 0,
    decodeMs: 0,
    decodeCalls: 0,
  })

  useEffect(() => {
    let cancelled = false
    setResult({ gltf: null, error: null, parseMs: 0, decodeMs: 0, decodeCalls: 0 })

    const load = async () => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
      const bytes = await response.arrayBuffer()
      if (cancelled) return

      const dracoLoader = getDracoLoader(decoder)

      // Wrap decodeDracoFile (the entry point GLTFLoader calls) to time the
      // Draco portion of the parse. GLTFLoader issues every primitive's decode
      // concurrently, so per-call durations overlap heavily (each one includes
      // time spent queued behind the others); report the wall-clock span from
      // the first decode starting to the last one finishing instead of a sum.
      // Loaders are long-lived singletons, so the wrapper is installed once
      // and reads a per-load timing context. Untyped assignment: three's
      // DRACOLoader typings don't expose the method's full signature.
      const anyLoader = dracoLoader as any
      if (!anyLoader.__timingWrapped) {
        anyLoader.__timingWrapped = true
        const originalDecode = anyLoader.decodeDracoFile.bind(anyLoader)
        anyLoader.decodeDracoFile = (...args: unknown[]) => {
          const timing = anyLoader.__timing
          const start = performance.now()
          if (timing && start < timing.firstStart) timing.firstStart = start
          const promise = originalDecode(...args)
          return promise.then((geometry: unknown) => {
            const end = performance.now()
            if (timing) {
              if (end > timing.lastEnd) timing.lastEnd = end
              timing.calls += 1
            }
            return geometry
          })
        }
      }
      const timing = { firstStart: Infinity, lastEnd: 0, calls: 0 }
      anyLoader.__timing = timing

      const gltfLoader = new GLTFLoader()
      gltfLoader.setDRACOLoader(dracoLoader)

      const parseStart = performance.now()
      const gltf = await gltfLoader.parseAsync(bytes.slice(0), '')
      const parseMs = performance.now() - parseStart

      if (cancelled) return
      const decodeMs = timing.calls > 0 ? timing.lastEnd - timing.firstStart : 0
      setResult({ gltf, error: null, parseMs, decodeMs, decodeCalls: timing.calls })
    }

    load().catch(error => {
      if (!cancelled) setResult({ gltf: null, error: String(error), parseMs: 0, decodeMs: 0, decodeCalls: 0 })
    })

    return () => {
      cancelled = true
    }
  }, [url, decoder])

  return result
}
