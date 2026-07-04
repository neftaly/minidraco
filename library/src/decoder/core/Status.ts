// Ported from draco.js src/core/Status.js (MIT)

export const StatusCode = {
  OK: 0,
  DRACO_ERROR: -1,
  IO_ERROR: -2,
  INVALID_PARAMETER: -3,
  UNSUPPORTED_VERSION: -4,
  UNKNOWN_VERSION: -5,
  UNSUPPORTED_FEATURE: -6,
} as const

export type StatusCode = (typeof StatusCode)[keyof typeof StatusCode]

export class Status {
  code: number
  errorMsg: string

  constructor(code: number = StatusCode.OK, errorMsg = '') {
    this.code = code
    this.errorMsg = errorMsg
  }

  ok(): boolean {
    return this.code === StatusCode.OK
  }
}

export function okStatus(): Status {
  return new Status(StatusCode.OK)
}
