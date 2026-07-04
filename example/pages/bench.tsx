import { useCallback, useEffect, useState } from 'react'

import { decodeDracoMesh } from 'minidraco'

import { Decoder as DracoJsDecoder } from 'draco.js/src/compression/Decode.js'
import { DecoderBuffer as DracoJsDecoderBuffer } from 'draco.js/src/core/DecoderBuffer.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { DECODER_KINDS, getDracoLoader } from '../lib/loaders'

import type { DecoderKind } from '../lib/loaders'

const MODELS = [
  { label: 'Canine bundle', url: '/models/canine-bundle.glb' },
  { label: 'Player bundle', url: '/models/player-bundle.glb' },
  { label: 'Static bundle', url: '/models/static-bundle.glb' },
]

const RUNS = 5

interface BenchRow {
  model: string
  decoder: DecoderKind
  medianMs: number
  runsMs: number[]
}

const median = (values: number[]) => [...values].toSorted((a, b) => a - b)[Math.floor(values.length / 2)]!

const BenchPage = () => {
  const [rows, setRows] = useState<BenchRow[]>([])
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState('')

  // Raw-decoder debug handles for scripted pure-decode benchmarks (no GLTF
  // parse overhead) from the devtools console / automated browser checks.
  useEffect(() => {
    ;(window as any).__decoders = {
      minidraco: (data: Uint8Array) => decodeDracoMesh(data),
      dracoJs: (data: Uint8Array) => {
        const buffer = new DracoJsDecoderBuffer()
        buffer.init(data, data.length)
        const result = new DracoJsDecoder().decodeMeshFromBuffer(buffer)
        if (!result.ok) throw new Error(result.message)
        return result.mesh
      },
    }
  }, [])

  const run = useCallback(async () => {
    setRunning(true)
    setRows([])
    const results: BenchRow[] = []

    try {
      for (const model of MODELS) {
        const response = await fetch(model.url)
        const bytes = await response.arrayBuffer()

        for (const decoder of DECODER_KINDS) {
          setStatus(`${model.label} — ${decoder}…`)
          const runsMs: number[] = []

          // Warmup + timed runs against long-lived loaders (worker pools and
          // wasm modules stay warm, as in a real app). A fresh ArrayBuffer
          // copy per parse defeats the per-buffer decode caches inside the
          // loaders.
          const dracoLoader = getDracoLoader(decoder)
          for (let i = 0; i < RUNS + 1; i++) {
            const gltfLoader = new GLTFLoader()
            gltfLoader.setDRACOLoader(dracoLoader)
            const start = performance.now()
            await gltfLoader.parseAsync(bytes.slice(0), '')
            const elapsed = performance.now() - start
            if (i > 0) runsMs.push(elapsed)
          }

          results.push({ model: model.label, decoder, medianMs: median(runsMs), runsMs })
          setRows([...results])
        }
      }
      setStatus('Done')
    } catch (error) {
      setStatus(String(error))
    } finally {
      setRunning(false)
    }
  }, [])

  return (
    <div className="min-h-full bg-neutral-900 p-8 text-white">
      <h1 className="mb-2 text-xl font-semibold">minidraco in-browser benchmark</h1>
      <p className="mb-4 max-w-xl text-sm text-neutral-400">
        Full GLTFLoader.parse time (median of {RUNS} runs after warmup) for each Draco decoder backend, with long-lived
        loaders (warm worker pools). minidraco and the wasm decoder run in worker pools; draco.js decodes on the main
        thread.
      </p>

      <button
        className="mb-6 rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
        onClick={run}
        disabled={running}
      >
        {running ? 'Running…' : 'Run benchmark'}
      </button>

      <p className="mb-4 text-sm text-neutral-400">{status}</p>

      {rows.length > 0 && (
        <table className="text-sm">
          <thead>
            <tr className="text-left text-neutral-400">
              <th className="pr-6 pb-2">Model</th>
              <th className="pr-6 pb-2">Decoder</th>
              <th className="pr-6 pb-2">Median</th>
              <th className="pb-2">Runs</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={`${row.model}:${row.decoder}`} className="border-t border-neutral-800">
                <td className="py-1 pr-6">{row.model}</td>
                <td className="pr-6 font-mono">{row.decoder}</td>
                <td className="pr-6 font-mono">{row.medianMs.toFixed(1)} ms</td>
                <td className="font-mono text-neutral-400">{row.runsMs.map(ms => ms.toFixed(0)).join(' / ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default BenchPage
