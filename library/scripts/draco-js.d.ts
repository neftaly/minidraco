// draco.js (mrdoob) and draco3d ship untyped sources — the harness only
// touches a tiny slice of their APIs, typed loosely here.
declare module 'draco3d'

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
