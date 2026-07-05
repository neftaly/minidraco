// Pure/stateless benchmark helpers shared by the shell scripts.

export interface SampleStats {
  min: number
  p25: number
  median: number
  p75: number
  max: number
  mean: number
}

export interface MemoryDelta {
  rss: number
  heapTotal: number
  heapUsed: number
  external: number
  arrayBuffers: number
}

export const sorted = (values: readonly number[]): number[] => [...values].sort((a, b) => a - b)

export const percentileSorted = (values: readonly number[], percentile: number): number => {
  if (values.length === 0) return NaN
  const index = Math.min(values.length - 1, Math.max(0, Math.floor((values.length - 1) * percentile)))
  return values[index]
}

export const summarizeSamples = (values: readonly number[]): SampleStats => {
  const ordered = sorted(values)
  const total = ordered.reduce((sum, value) => sum + value, 0)
  return {
    min: ordered[0] ?? NaN,
    p25: percentileSorted(ordered, 0.25),
    median: percentileSorted(ordered, 0.5),
    p75: percentileSorted(ordered, 0.75),
    max: ordered[ordered.length - 1] ?? NaN,
    mean: ordered.length === 0 ? NaN : total / ordered.length,
  }
}

export const median = (values: readonly number[]): number => summarizeSamples(values).median

export const subtractMemory = (after: NodeJS.MemoryUsage, before: NodeJS.MemoryUsage): MemoryDelta => ({
  rss: after.rss - before.rss,
  heapTotal: after.heapTotal - before.heapTotal,
  heapUsed: after.heapUsed - before.heapUsed,
  external: after.external - before.external,
  arrayBuffers: after.arrayBuffers - before.arrayBuffers,
})

export const clampPositive = (value: number): number => (value > 0 ? value : 0)

export const formatMs = (value: number): string => `${value.toFixed(2)} ms`

export const formatBytes = (value: number): string => {
  const sign = value < 0 ? '-' : ''
  let abs = Math.abs(value)
  const units = ['B', 'KB', 'MB', 'GB']
  let unit = 0
  while (abs >= 1024 && unit < units.length - 1) {
    abs /= 1024
    unit++
  }
  return `${sign}${unit === 0 ? abs.toFixed(0) : abs.toFixed(2)} ${units[unit]}`
}

export const table = (header: readonly string[], rows: readonly (readonly string[])[]): string => {
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map(row => row[i]?.length ?? 0)))
  const formatRow = (row: readonly string[]) => row.map((cell, i) => cell.padEnd(widths[i])).join('  ')
  return [formatRow(header), widths.map(w => '-'.repeat(w)).join('  '), ...rows.map(formatRow)].join('\n')
}
