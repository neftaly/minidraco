// Ported from draco.js src/core/Macros.js (MIT)

// Packs major/minor into a single uint16.
export function bitstreamVersion(major: number, minor: number): number {
  return ((major & 0xff) << 8) | (minor & 0xff)
}
