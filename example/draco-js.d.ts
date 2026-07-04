// draco.js (mrdoob) ships untyped ESM sources — the example only touches a
// tiny slice of its API, typed loosely here.
declare module 'draco.js/src/compression/Decode.js' {
  export class Decoder {
    decodeMeshFromBuffer(buffer: unknown): { mesh: any; ok: boolean; message: string }
    static getEncodedGeometryType(buffer: unknown): number
  }
}

declare module 'draco.js/src/core/DecoderBuffer.js' {
  export class DecoderBuffer {
    init(data: Uint8Array, length: number): void
  }
}
