// Ported from draco.js src/compression/config/DecoderOptions.js (MIT)

// C++ typedefs this as DracoOptions<GeometryAttribute::Type>; here attribute keys
// are plain integers handled natively by Map, so a bare subclass suffices.

import { DracoOptions } from './DracoOptions'

export class DecoderOptions extends DracoOptions {
  constructor() {
    super()
  }
}
