// Ported from draco.js src/attributes/AttributeTransformType.js (MIT)

export const AttributeTransformType = {
  INVALID: -1,
  NO_TRANSFORM: 0,
  QUANTIZATION_TRANSFORM: 1,
  OCTAHEDRON_TRANSFORM: 2,
} as const

export type AttributeTransformType = (typeof AttributeTransformType)[keyof typeof AttributeTransformType]
