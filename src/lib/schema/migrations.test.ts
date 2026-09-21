import { describe, expect, it } from 'vitest'
import { CURRENT_VERSION, migrate } from './migrations'

describe('migrate', () => {
  it('is identity for the current version', () => {
    const raw = { meta: { schemaVersion: CURRENT_VERSION, id: 'x' }, tables: [] }
    expect(migrate(raw)).toEqual(raw)
  })

  it('throws when schemaVersion is missing', () => {
    expect(() => migrate({})).toThrow(/schemaVersion/)
    expect(() => migrate({ meta: { id: 'x' } })).toThrow(/schemaVersion/)
  })

  it('throws on an unknown future version', () => {
    expect(() => migrate({ meta: { schemaVersion: CURRENT_VERSION + 1 } })).toThrow(/future/)
  })

  it('throws on malformed or non-object input', () => {
    expect(() => migrate(null)).toThrow()
    expect(() => migrate('nope')).toThrow()
    expect(() => migrate([1, 2])).toThrow()
  })
})