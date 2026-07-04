// Ported from draco.js src/compression/config/DracoOptions.js (MIT)

// Base option class with global options and per-attribute options keyed by
// attribute key (e.g. attribute type or id).
export class DracoOptions {
  _globalOptions: Map<string, unknown>
  _attributeOptions: Map<number, Map<string, unknown>>

  constructor() {
    this._globalOptions = new Map() // name -> value
    this._attributeOptions = new Map() // attributeKey -> Map(name -> value)
  }

  getGlobalBool(name: string, defaultVal: boolean): boolean {
    if (this._globalOptions.has(name)) {
      return !!this._globalOptions.get(name)
    }
    return defaultVal
  }

  findAttributeOptions(attKey: number): Map<string, unknown> | null {
    if (this._attributeOptions.has(attKey)) {
      return this._attributeOptions.get(attKey)!
    }
    return null
  }

  getAttributeBool(attKey: number, name: string, defaultVal: boolean): boolean {
    const attOpts = this.findAttributeOptions(attKey)
    if (attOpts !== null && attOpts.has(name)) {
      return !!attOpts.get(name)
    }
    return this.getGlobalBool(name, defaultVal)
  }
}
