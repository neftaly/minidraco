// Ported from draco.js src/compression/entropy/SymbolDecoding.js (MIT)

import { SymbolCodingMethod } from '../config/CompressionShared'
import { RAnsSymbolDecoder } from './RAnsSymbolDecoder'

import type { DecoderBuffer } from '../../core/DecoderBuffer'

// Decodes numValues entropy-coded symbols into outValues (Uint32Array).
// numComponents is used for tagged coding. Returns false on error.
export function decodeSymbols(
  numValues: number,
  numComponents: number,
  srcBuffer: DecoderBuffer,
  outValues: Uint32Array,
): boolean {
  if (numValues === 0) {
    return true
  }
  const scheme = srcBuffer.decodeUint8()
  if (scheme === undefined) {
    return false
  }
  if (scheme === SymbolCodingMethod.SYMBOL_CODING_TAGGED) {
    return decodeTaggedSymbols(numValues, numComponents, srcBuffer, outValues)
  } else if (scheme === SymbolCodingMethod.SYMBOL_CODING_RAW) {
    return decodeRawSymbols(numValues, srcBuffer, outValues)
  }
  return false
}

function decodeTaggedSymbols(
  numValues: number,
  numComponents: number,
  srcBuffer: DecoderBuffer,
  outValues: Uint32Array,
): boolean {
  const tagDecoder = new RAnsSymbolDecoder(5)
  if (!tagDecoder.create(srcBuffer)) {
    return false
  }

  if (!tagDecoder.startDecoding(srcBuffer)) {
    return false
  }

  if (numValues > 0 && tagDecoder.numSymbols === 0) {
    return false
  }

  srcBuffer.startBitDecoding(false)
  // After startBitDecoding(false) the buffer is in bit mode, so getBits can be
  // called directly, skipping decodeLeastSignificantBits32's per-component dispatch.
  const bd = srcBuffer._bitDecoder
  // tagDecoder.decodeSymbol() is just a delegation to ans_.ransRead(); hoist it.
  const tagAns = tagDecoder.ans_
  let valueId = 0
  for (let i = 0; i < numValues; i += numComponents) {
    const bitLength = tagAns.ransRead()
    for (let j = 0; j < numComponents; ++j) {
      const val = bd.getBits(bitLength)
      if (val === undefined) {
        return false
      }
      outValues[valueId++] = val
    }
  }
  tagDecoder.endDecoding()
  srcBuffer.endBitDecoding()
  return true
}

function decodeRawSymbolsInternal(
  uniqueSymbolsBitLength: number,
  numValues: number,
  srcBuffer: DecoderBuffer,
  outValues: Uint32Array,
): boolean {
  const decoder = new RAnsSymbolDecoder(uniqueSymbolsBitLength)
  if (!decoder.create(srcBuffer)) {
    return false
  }

  if (numValues > 0 && decoder.numSymbols === 0) {
    return false
  }

  if (!decoder.startDecoding(srcBuffer)) {
    return false
  }
  decoder.ans_.decodeSymbols(outValues, numValues)
  decoder.endDecoding()
  return true
}

function decodeRawSymbols(numValues: number, srcBuffer: DecoderBuffer, outValues: Uint32Array): boolean {
  const maxBitLength = srcBuffer.decodeUint8()
  if (maxBitLength === undefined) {
    return false
  }
  if (maxBitLength < 1 || maxBitLength > 18) {
    return false
  }
  return decodeRawSymbolsInternal(maxBitLength, numValues, srcBuffer, outValues)
}
