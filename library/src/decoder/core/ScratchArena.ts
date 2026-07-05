// Decode-scoped scratch arena: pooled typed-array buffers for allocations
// whose lifetime is a single decode (traversal flags, seam-patched opposite
// tables, connectivity stacks, ...). Buffers are borrowed during a decode and
// returned all at once by releaseScratch(), called at the end of
// decodeMeshFromBuffer — decodes are synchronous and never interleave, so a
// module-level pool is safe (each worker has its own module instance).
//
// Borrowed buffers may be larger than requested, so callers either must not
// read .length or must use the exact-size subarray the acquire functions
// return. Buffers come back with arbitrary contents; use the *Zeroed variants
// when the algorithm relies on zero-initialization.

const freeInt32: Int32Array[] = []
const freeUint8: Uint8Array[] = []
const freeUint32: Uint32Array[] = []
const borrowedInt32: Int32Array[] = []
const borrowedUint8: Uint8Array[] = []
const borrowedUint32: Uint32Array[] = []

type ScratchArray = Int32Array | Uint8Array | Uint32Array

const acquire = <T extends ScratchArray>(free: T[], borrowed: T[], size: number): T | null => {
  for (let i = free.length - 1; i >= 0; --i) {
    const buffer = free[i]
    if (buffer.length >= size) {
      free[i] = free[free.length - 1]
      free.pop()
      borrowed.push(buffer)
      return buffer
    }
  }
  return null
}

// Exact-size view over a pooled buffer; contents are arbitrary.
export const scratchInt32 = (size: number): Int32Array => {
  const pooled = acquire(freeInt32, borrowedInt32, size)
  if (pooled !== null) return pooled.subarray(0, size)
  const fresh = new Int32Array(size)
  borrowedInt32.push(fresh)
  return fresh
}

// Exact-size view over a pooled buffer; contents are arbitrary.
export const scratchUint32 = (size: number): Uint32Array => {
  const pooled = acquire(freeUint32, borrowedUint32, size)
  if (pooled !== null) return pooled.subarray(0, size)
  const fresh = new Uint32Array(size)
  borrowedUint32.push(fresh)
  return fresh
}

// Exact-size view over a pooled buffer; contents are arbitrary.
export const scratchUint8 = (size: number): Uint8Array => {
  const pooled = acquire(freeUint8, borrowedUint8, size)
  if (pooled !== null) return pooled.subarray(0, size)
  const fresh = new Uint8Array(size)
  borrowedUint8.push(fresh)
  return fresh
}

// Exact-size view over a pooled buffer, cleared to 0.
export const scratchUint8Zeroed = (size: number): Uint8Array => {
  const pooled = acquire(freeUint8, borrowedUint8, size)
  if (pooled !== null) {
    const view = pooled.subarray(0, size)
    view.fill(0)
    return view
  }
  const fresh = new Uint8Array(size)
  borrowedUint8.push(fresh)
  return fresh
}

// Returns every borrowed buffer to the pool. Nothing may hold on to a scratch
// buffer past this point — it runs when the decode's result mesh no longer
// references any of them (result data lives in attribute buffers / faces_).
export const releaseScratch = (): void => {
  // Keep the next decode's LIFO acquisition aligned with the previous decode's
  // allocation order. Releasing in borrow order would make repeated decodes scan
  // most of the free list for every first-fit lookup.
  for (let i = borrowedInt32.length - 1; i >= 0; --i) freeInt32.push(borrowedInt32[i])
  for (let i = borrowedUint8.length - 1; i >= 0; --i) freeUint8.push(borrowedUint8[i])
  for (let i = borrowedUint32.length - 1; i >= 0; --i) freeUint32.push(borrowedUint32[i])
  borrowedInt32.length = 0
  borrowedUint8.length = 0
  borrowedUint32.length = 0
}
