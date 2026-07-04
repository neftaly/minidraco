// Ported from draco.js src/compression/config/CompressionShared.js (MIT)

// Latest Draco bit-stream versions.
export const kDracoPointCloudBitstreamVersionMajor = 2
export const kDracoPointCloudBitstreamVersionMinor = 3
export const kDracoMeshBitstreamVersionMajor = 2
export const kDracoMeshBitstreamVersionMinor = 2

export function DRACO_BITSTREAM_VERSION(major: number, minor: number): number {
  return (major << 8) | minor
}

export const EncodedGeometryType = {
  INVALID_GEOMETRY_TYPE: -1,
  POINT_CLOUD: 0,
  TRIANGULAR_MESH: 1,
  NUM_ENCODED_GEOMETRY_TYPES: 2,
} as const
export type EncodedGeometryType = (typeof EncodedGeometryType)[keyof typeof EncodedGeometryType]

export const MeshEncoderMethod = {
  MESH_SEQUENTIAL_ENCODING: 0,
  MESH_EDGEBREAKER_ENCODING: 1,
} as const
export type MeshEncoderMethod = (typeof MeshEncoderMethod)[keyof typeof MeshEncoderMethod]

export const SequentialAttributeEncoderType = {
  SEQUENTIAL_ATTRIBUTE_ENCODER_GENERIC: 0,
  SEQUENTIAL_ATTRIBUTE_ENCODER_INTEGER: 1,
  SEQUENTIAL_ATTRIBUTE_ENCODER_QUANTIZATION: 2,
  SEQUENTIAL_ATTRIBUTE_ENCODER_NORMALS: 3,
} as const
export type SequentialAttributeEncoderType =
  (typeof SequentialAttributeEncoderType)[keyof typeof SequentialAttributeEncoderType]

export const PredictionSchemeMethod = {
  PREDICTION_NONE: -2,
  PREDICTION_UNDEFINED: -1,
  PREDICTION_DIFFERENCE: 0,
  MESH_PREDICTION_PARALLELOGRAM: 1,
  MESH_PREDICTION_MULTI_PARALLELOGRAM: 2,
  MESH_PREDICTION_TEX_COORDS_DEPRECATED: 3,
  MESH_PREDICTION_CONSTRAINED_MULTI_PARALLELOGRAM: 4,
  MESH_PREDICTION_TEX_COORDS_PORTABLE: 5,
  MESH_PREDICTION_GEOMETRIC_NORMAL: 6,
  NUM_PREDICTION_SCHEMES: 7,
} as const
export type PredictionSchemeMethod = (typeof PredictionSchemeMethod)[keyof typeof PredictionSchemeMethod]

export const PredictionSchemeTransformType = {
  PREDICTION_TRANSFORM_NONE: -1,
  PREDICTION_TRANSFORM_DELTA: 0,
  PREDICTION_TRANSFORM_WRAP: 1,
  PREDICTION_TRANSFORM_NORMAL_OCTAHEDRON: 2,
  PREDICTION_TRANSFORM_NORMAL_OCTAHEDRON_CANONICALIZED: 3,
  NUM_PREDICTION_SCHEME_TRANSFORM_TYPES: 4,
} as const
export type PredictionSchemeTransformType =
  (typeof PredictionSchemeTransformType)[keyof typeof PredictionSchemeTransformType]

export const MeshTraversalMethod = {
  MESH_TRAVERSAL_DEPTH_FIRST: 0,
  MESH_TRAVERSAL_PREDICTION_DEGREE: 1,
  NUM_TRAVERSAL_METHODS: 2,
} as const
export type MeshTraversalMethod = (typeof MeshTraversalMethod)[keyof typeof MeshTraversalMethod]

export const MeshEdgebreakerConnectivityEncodingMethod = {
  MESH_EDGEBREAKER_STANDARD_ENCODING: 0,
  MESH_EDGEBREAKER_PREDICTIVE_ENCODING: 1, // Deprecated.
  MESH_EDGEBREAKER_VALENCE_ENCODING: 2,
} as const
export type MeshEdgebreakerConnectivityEncodingMethod =
  (typeof MeshEdgebreakerConnectivityEncodingMethod)[keyof typeof MeshEdgebreakerConnectivityEncodingMethod]

// Draco header V1
export class DracoHeader {
  dracoString: Int8Array
  versionMajor: number
  versionMinor: number
  encoderType: number
  encoderMethod: number
  flags: number

  constructor() {
    this.dracoString = new Int8Array(5)
    this.versionMajor = 0
    this.versionMinor = 0
    this.encoderType = 0
    this.encoderMethod = 0
    this.flags = 0
  }
}

export const NormalPredictionMode = {
  ONE_TRIANGLE: 0, // To be deprecated.
  TRIANGLE_AREA: 1,
} as const
export type NormalPredictionMode = (typeof NormalPredictionMode)[keyof typeof NormalPredictionMode]

export const SymbolCodingMethod = {
  SYMBOL_CODING_TAGGED: 0,
  SYMBOL_CODING_RAW: 1,
  NUM_SYMBOL_CODING_METHODS: 2,
} as const
export type SymbolCodingMethod = (typeof SymbolCodingMethod)[keyof typeof SymbolCodingMethod]

// Mask for setting and getting the bit for metadata in |flags| of header.
export const METADATA_FLAG_MASK = 0x8000
