// Tracks package artifact size and browser-deployed payload size. The browser
// section minifies dist assets without rebundling local dist imports, then
// reports entry graphs so shared decoder chunks are counted once.
//
//   bun run --filter minidraco build
//   bun library/scripts/sizebench.ts          # writes BENCH.size.json
//   bun library/scripts/sizebench.ts --quick  # print only

import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { resolve } from 'node:path'
import { brotliCompressSync, gzipSync } from 'node:zlib'

import { formatBytes, table } from './bench-core'
import { writeBenchMd } from './benchmd'

interface SizeRow {
  file: string
  rawBytes: number
  gzipBytes: number
  brotliBytes: number
}

interface BrowserBundleRow extends SizeRow {
  entry: string
  assets?: string[]
}

const QUICK = process.argv.includes('--quick')
const repoRoot = resolve(import.meta.dir, '../..')
const distDir = resolve(import.meta.dir, '../dist')

if (!existsSync(resolve(distDir, 'index.js'))) {
  throw new Error('library/dist does not exist. Run `bun run --filter minidraco build` first.')
}

const sizeRow = (file: string, bytes: Uint8Array): SizeRow => ({
  file,
  rawBytes: bytes.byteLength,
  gzipBytes: gzipSync(bytes, { level: 9 }).byteLength,
  brotliBytes: brotliCompressSync(bytes).byteLength,
})

const packageArtifacts = (): SizeRow[] =>
  readdirSync(distDir)
    .filter(name => name.endsWith('.js') || name.endsWith('.d.ts'))
    .toSorted()
    .map(file => sizeRow(file, readFileSync(resolve(distDir, file))))

const jsArtifacts = (): string[] =>
  readdirSync(distDir)
    .filter(name => name.endsWith('.js'))
    .toSorted()

const browserAsset = async (file: string, allJs: string[]): Promise<BrowserBundleRow> => {
  const entrypoint = resolve(distDir, file)
  const localExternals = allJs.filter(other => other !== file).map(other => resolve(distDir, other))
  const buildConfig = {
    entrypoints: [entrypoint],
    external: ['three', ...localExternals],
    format: 'esm',
    minify: true,
    target: 'browser',
    write: false,
  } as Parameters<typeof Bun.build>[0] & { write: false }
  const result = await Bun.build(buildConfig)
  if (!result.success) {
    throw new Error(result.logs.map(log => log.message).join('\n') || `Bun.build failed for ${file}`)
  }
  const jsOutput = result.outputs.find(output => output.path.endsWith('.js')) ?? result.outputs[0]
  const row = sizeRow(file.replace(/\.js$/, '.min.js'), new Uint8Array(await jsOutput.arrayBuffer()))
  return { entry: file, ...row }
}

const localImportFiles = (file: string, allJs: string[], includeDynamic: boolean): string[] => {
  const jsSet = new Set(allJs)
  const imports = new Set<string>()
  const code = readFileSync(resolve(distDir, file), 'utf8')
  const collect = (pattern: RegExp) => {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(code)) !== null) {
      const specifier = match[1]
      if (!specifier?.startsWith('./')) continue
      const imported = specifier.slice(2)
      if (jsSet.has(imported)) imports.add(imported)
    }
  }

  collect(/\b(?:import|export)\s*(?:[^"'()]*?\s*from\s*)?["'](\.\/[^"']+\.js)["']/g)
  if (includeDynamic) collect(/\bimport\s*\(\s*["'](\.\/[^"']+\.js)["']\s*\)/g)

  return allJs.filter(imported => imports.has(imported))
}

const assetGraph = (roots: string[], allJs: string[], includeDynamic = false): string[] => {
  const seen = new Set<string>()
  const visit = (file: string) => {
    if (seen.has(file)) return
    seen.add(file)
    for (const imported of localImportFiles(file, allJs, includeDynamic)) visit(imported)
  }
  for (const root of roots) visit(root)
  return allJs.filter(file => seen.has(file))
}

const unionGraph = (graphs: string[][], allJs: string[]): string[] => {
  const seen = new Set(graphs.flat())
  return allJs.filter(file => seen.has(file))
}

const sameGraph = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((file, index) => file === b[index])

const graphRow = (
  entry: string,
  file: string,
  assets: string[],
  assetRows: Map<string, BrowserBundleRow>,
): BrowserBundleRow => {
  const total = { entry, file, rawBytes: 0, gzipBytes: 0, brotliBytes: 0, assets }
  for (const asset of assets) {
    const row = assetRows.get(asset)
    if (!row) throw new Error(`Missing browser asset row for ${asset}`)
    total.rawBytes += row.rawBytes
    total.gzipBytes += row.gzipBytes
    total.brotliBytes += row.brotliBytes
  }
  return total
}

const deployedAssets = async (): Promise<BrowserBundleRow[]> => {
  const allJs = jsArtifacts()
  return Promise.all(allJs.map(file => browserAsset(file, allJs)))
}

const deployedBundles = (assets: BrowserBundleRow[]): BrowserBundleRow[] => {
  const allJs = jsArtifacts()
  const assetRows = new Map(assets.map(row => [row.entry, row]))
  const root = assetGraph(['index.js'], allJs)
  const threeMain = assetGraph(['three.js'], allJs)
  const worker = assetGraph(['worker.js'], allJs)
  const threeWorker = unionGraph([threeMain, worker], allJs)
  const threeSyncFallback = assetGraph(['three.js'], allJs, true)

  const rows = [
    graphRow('minidraco', 'minidraco graph.min.js', root, assetRows),
    graphRow('minidraco/three main', 'minidraco/three main graph.min.js', threeMain, assetRows),
    graphRow('minidraco worker graph', 'minidraco worker graph.min.js', worker, assetRows),
    graphRow('minidraco/three main + worker graph', 'minidraco/three main + worker graph', threeWorker, assetRows),
  ]

  if (!sameGraph(threeSyncFallback, threeMain)) {
    rows.push(
      graphRow(
        'minidraco/three sync fallback graph',
        'minidraco/three sync fallback graph',
        threeSyncFallback,
        assetRows,
      ),
    )
  }

  return rows
}

const printRows = (title: string, rows: SizeRow[]) => {
  console.log('')
  console.log(title)
  console.log('')
  console.log(
    table(
      ['file', 'raw', 'gzip', 'brotli'],
      rows.map(row => [row.file, formatBytes(row.rawBytes), formatBytes(row.gzipBytes), formatBytes(row.brotliBytes)]),
    ),
  )
}

const artifactRows = packageArtifacts()
const assetRows = await deployedAssets()
const bundleRows = deployedBundles(assetRows)

printRows('library/dist package artifacts', artifactRows)
printRows('browser-deployed minified assets', assetRows)
printRows('browser-deployed minified entry graphs', bundleRows)

if (!QUICK) {
  const json = {
    date: new Date().toLocaleDateString('en-CA'),
    runtime: `bun ${Bun.version}`,
    engine: 'JavaScriptCore',
    cpu: cpus()[0]?.model ?? 'unknown',
    packageArtifacts: artifactRows,
    browserAssets: assetRows,
    browserBundles: bundleRows,
  }
  const path = resolve(repoRoot, 'BENCH.size.json')
  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, `${JSON.stringify(json, null, 2)}\n`)
  renameSync(tempPath, path)
  const oxfmt = Bun.spawnSync([process.execPath, 'x', 'oxfmt', path])
  if (oxfmt.exitCode !== 0) console.warn(`oxfmt failed on BENCH.size.json: ${oxfmt.stderr.toString().trim()}`)
  console.log(`\nWrote ${path}`)
  writeBenchMd()
}
