// Deterministic fuzzing helpers. This module is intentionally free of file I/O,
// clocks, and test-runner APIs so fuzz cases can be reused by tests, scripts,
// or a future long-running harness.

export interface ByteCase {
  name: string
  data: Uint8Array
}

export interface MutationOptions {
  casesPerSource?: number
  seed?: number
}

export interface NoiseOptions {
  count: number
  maxLength: number
  seed?: number
}

export const hashString32 = (input: string): number => {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export const hashBytes32 = (input: ArrayLike<number>): number => {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input[i]
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export const createPrng = (seed: number): (() => number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

const randomInt = (next: () => number, maxExclusive: number): number => Math.floor(next() * maxExclusive)

const randomBytes = (length: number, next: () => number): Uint8Array => {
  const out = new Uint8Array(length)
  for (let i = 0; i < length; i++) out[i] = randomInt(next, 256)
  return out
}

const copy = (input: Uint8Array): Uint8Array => {
  const out = new Uint8Array(input.length)
  out.set(input)
  return out
}

const tailPosition = (input: Uint8Array, next: () => number): number => {
  if (input.length === 0) return 0
  const start = Math.floor(input.length * 0.6)
  return start + randomInt(next, Math.max(1, input.length - start))
}

export const mutateDracoLikeBytes = (input: Uint8Array, sourceName: string, index: number, seed = 0): ByteCase => {
  const next = createPrng((seed ^ hashString32(sourceName) ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0)
  const op = index % 6

  if (input.length === 0) {
    return { name: `${sourceName}:noise-empty-${index}`, data: randomBytes(randomInt(next, 16), next) }
  }

  if (op === 0) {
    const length = randomInt(next, input.length)
    return { name: `${sourceName}:truncate-${length}`, data: input.slice(0, length) }
  }

  if (op === 1) {
    const appended = randomBytes(1 + randomInt(next, 32), next)
    const data = new Uint8Array(input.length + appended.length)
    data.set(input)
    data.set(appended, input.length)
    return { name: `${sourceName}:append-${appended.length}`, data }
  }

  if (op === 2) {
    const data = copy(input)
    const pos = tailPosition(input, next)
    data[pos] ^= 1 << randomInt(next, 8)
    return { name: `${sourceName}:tail-bitflip-${pos}`, data }
  }

  if (op === 3) {
    const data = copy(input)
    const pos = tailPosition(input, next)
    const length = Math.min(1 + randomInt(next, 8), data.length - pos)
    for (let i = 0; i < length; i++) data[pos + i] ^= 0xa5
    return { name: `${sourceName}:tail-xor-${pos}-${length}`, data }
  }

  if (op === 4) {
    const pos = tailPosition(input, next)
    const length = Math.min(1 + randomInt(next, 16), input.length - pos)
    const data = new Uint8Array(input.length - length)
    data.set(input.subarray(0, pos))
    data.set(input.subarray(pos + length), pos)
    return { name: `${sourceName}:delete-${pos}-${length}`, data }
  }

  const data = copy(input)
  // Header byte 7 is the encoded geometry type. This keeps the Draco magic and
  // version intact while forcing public mesh decode to reject non-mesh inputs.
  if (data.length > 7) data[7] = (data[7] + 1 + randomInt(next, 3)) & 0xff
  return { name: `${sourceName}:geometry-type-byte`, data }
}

export const makeMutationCases = (
  sources: readonly { name: string; data: Uint8Array }[],
  options: MutationOptions = {},
): ByteCase[] => {
  const casesPerSource = options.casesPerSource ?? 12
  const seed = options.seed ?? 0xc0decafe
  const cases: ByteCase[] = []
  for (const source of sources) {
    for (let i = 0; i < casesPerSource; i++) {
      cases.push(mutateDracoLikeBytes(source.data, source.name, i, seed))
    }
  }
  return cases
}

export const makeNoiseCases = (options: NoiseOptions): ByteCase[] => {
  const next = createPrng(options.seed ?? 0xabad1dea)
  const cases: ByteCase[] = []
  for (let i = 0; i < options.count; i++) {
    const useHeader = i % 3 === 0
    const length = randomInt(next, options.maxLength + 1)
    const data = randomBytes(length, next)
    if (useHeader && data.length >= 11) {
      data.set([68, 82, 65, 67, 79, 2, 2], 0) // "DRACO", version 2.2
      data[7] = randomInt(next, 3)
      data[8] = randomInt(next, 4)
    }
    cases.push({ name: `noise-${i}-${hashBytes32(data).toString(16)}`, data })
  }
  return cases
}

export const zigZagEncode = (value: number): number => {
  return value >= 0 ? value * 2 : -value * 2 - 1
}

export const encodeDracoVarintUnsigned = (value: number): Uint8Array => {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`invalid varint value ${value}`)
  if (value < 128) return new Uint8Array([value])

  const bytes: number[] = []
  let remaining = value
  while (remaining >= 128) {
    bytes.push((remaining & 0x7f) | 0x80)
    remaining = Math.floor(remaining / 128)
  }
  bytes.push(remaining)
  return new Uint8Array(bytes)
}

export const encodeDracoVarintSigned = (value: number): Uint8Array => encodeDracoVarintUnsigned(zigZagEncode(value))

export const readBitsLsb = (bytes: Uint8Array, bitOffset: number, nbits: number): number => {
  let value = 0
  let bitsRead = 0
  let offset = bitOffset
  while (bitsRead < nbits) {
    const byteOffset = offset >> 3
    if (byteOffset >= bytes.length) break
    const bitShift = offset & 7
    const bitsToRead = Math.min(8 - bitShift, nbits - bitsRead)
    const mask = (1 << bitsToRead) - 1
    value |= ((bytes[byteOffset] >> bitShift) & mask) << bitsRead
    bitsRead += bitsToRead
    offset += bitsToRead
  }
  return value >>> 0
}

export const makeIntegerCases = (count: number, seed = 0x12345678): number[] => {
  const next = createPrng(seed)
  const cases = [0, 1, 2, 63, 64, 65, 126, 127, 128, 129, 255, 256, 16383, 16384, 0x7fffffff]
  while (cases.length < count) cases.push(Math.floor(next() * 0x80000000))
  return cases
}
