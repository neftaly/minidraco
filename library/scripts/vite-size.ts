import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import { build } from 'vite'

interface Size {
  raw: number
  gzip: number
  brotli: number
}

interface FileSize extends Size {
  file: string
  fallbackOnly: boolean
}

const dist = resolve(import.meta.dir, '../dist')
const root = join(tmpdir(), 'minidraco-vite-size')
const src = join(root, 'src')

const entries: Record<string, string> = {
  default: `
    import { MiniDRACOLoader } from 'minidraco/three'
    globalThis.__loader = new MiniDRACOLoader()
  `,
  vite: `
    import { MiniDRACOLoader } from 'minidraco/three/vite'
    globalThis.__loader = new MiniDRACOLoader()
  `,
  defaultWithCore: `
    import { decodeDracoMesh } from 'minidraco'
    import { MiniDRACOLoader } from 'minidraco/three'
    globalThis.__loader = new MiniDRACOLoader()
    globalThis.__decode = decodeDracoMesh
  `,
  viteWithCore: `
    import { decodeDracoMesh } from 'minidraco'
    import { MiniDRACOLoader } from 'minidraco/three/vite'
    globalThis.__loader = new MiniDRACOLoader()
    globalThis.__decode = decodeDracoMesh
  `,
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else out.push(path)
  }
  return out
}

function size(data: Buffer): Size {
  return {
    raw: data.length,
    gzip: gzipSync(data, { level: 9 }).length,
    brotli: brotliCompressSync(data).length,
  }
}

function addSizes(files: Size[]): Size {
  return files.reduce(
    (sum, file) => ({ raw: sum.raw + file.raw, gzip: sum.gzip + file.gzip, brotli: sum.brotli + file.brotli }),
    {
      raw: 0,
      gzip: 0,
      brotli: 0,
    },
  )
}

const fmt = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`
const fmtSize = (value: Size): string => `${fmt(value.raw)} / ${fmt(value.gzip)} / ${fmt(value.brotli)}`

mkdirSync(src, { recursive: true })
for (const [name, source] of Object.entries(entries)) {
  writeFileSync(join(src, `${name}.ts`), source)
}

const alias = [
  { find: /^minidraco\/three\/vite$/, replacement: join(dist, 'three/vite.js') },
  { find: /^minidraco\/three$/, replacement: join(dist, 'three.js') },
  { find: /^minidraco$/, replacement: join(dist, 'index.js') },
]

const results: { name: string; workerPath: Size; allEmitted: Size; files: FileSize[] }[] = []

for (const name of Object.keys(entries)) {
  const outDir = join(root, `out-${name}`)
  rmSync(outDir, { recursive: true, force: true })

  await build({
    root,
    configFile: false,
    logLevel: 'silent',
    resolve: { alias },
    build: {
      outDir,
      emptyOutDir: true,
      minify: 'esbuild',
      sourcemap: false,
      modulePreload: false,
      target: 'es2020',
      rollupOptions: {
        input: join(src, `${name}.ts`),
        external: ['three'],
        output: {
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
        },
      },
    },
  })

  const files = walk(outDir)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const data = readFileSync(file)
      const text = data.toString('utf8')
      const fileSize = size(data)
      return {
        file: file.slice(outDir.length + 1),
        // When the app does not import minidraco itself, Vite emits the sync
        // fallback decoder as an async chunk. It is not downloaded on the
        // normal worker path, but it is still listed under all-emitted JS.
        fallbackOnly: name.endsWith('WithCore')
          ? false
          : text.includes('decodeDracoMesh') && !text.includes('warmupDeadline'),
        ...fileSize,
      }
    })

  results.push({
    name,
    workerPath: addSizes(files.filter(file => !file.fallbackOnly)),
    allEmitted: addSizes(files),
    files,
  })
}

console.log('scenario                 worker path raw/gzip/br      all emitted raw/gzip/br')
for (const result of results) {
  console.log(`${result.name.padEnd(24)} ${fmtSize(result.workerPath).padEnd(29)} ${fmtSize(result.allEmitted)}`)
}
