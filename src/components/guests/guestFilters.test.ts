import { describe, expect, it } from 'vitest'
import {
  groupByGroup,
  groupByTable,
  sortEnriched,
  type EnrichedGuest,
} from './guestFilters'

function entry(
  id: string,
  name: string,
  overrides: Partial<EnrichedGuest> = {},
): EnrichedGuest {
  return {
    guest: { id, name },
    index: 0,
    tableId: null,
    tableName: null,
    ...overrides,
  }
}

describe('sortEnriched', () => {
  it('sorts by name (French collation, case-insensitive)', () => {
    const sorted = sortEnriched(
      [entry('3', 'Zoé'), entry('1', 'alice'), entry('2', 'Bob')],
      'name',
    )
    expect(sorted.map((e) => e.guest.name)).toEqual(['alice', 'Bob', 'Zoé'])
  })

  it('sorts by group then name, guests without group last', () => {
    const sorted = sortEnriched(
      [
        entry('1', 'Zed', { guest: { id: '1', name: 'Zed', group: 'Amis' } }),
        entry('2', 'Amy'),
        entry('3', 'Bo', { guest: { id: '3', name: 'Bo', group: 'Famille' } }),
      ],
      'group',
    )
    expect(sorted.map((e) => e.guest.name)).toEqual(['Zed', 'Bo', 'Amy'])
  })

  it('sorts by table then name, unseated last', () => {
    const sorted = sortEnriched(
      [
        entry('1', 'Zed', { tableId: 't2', tableName: 'Table B' }),
        entry('2', 'Amy'),
        entry('3', 'Bo', { tableId: 't1', tableName: 'Table A' }),
      ],
      'table',
    )
    expect(sorted.map((e) => e.guest.name)).toEqual(['Bo', 'Zed', 'Amy'])
  })

  it('sorts by most recently added first', () => {
    const sorted = sortEnriched(
      [entry('1', 'A', { index: 0 }), entry('2', 'B', { index: 1 }), entry('3', 'C', { index: 2 })],
      'recent',
    )
    expect(sorted.map((e) => e.guest.name)).toEqual(['C', 'B', 'A'])
  })
})

describe('groupByTable', () => {
  it('groups seated guests ordered by table name', () => {
    const groups = groupByTable(
      [
        entry('1', 'Zed', { tableId: 't2', tableName: 'Table B' }),
        entry('2', 'Amy', { tableId: 't1', tableName: 'Table A' }),
        entry('3', 'Bo', { tableId: 't1', tableName: 'Table A' }),
      ],
      new Map([['t1', 0], ['t2', 1]]),
    )
    expect(groups.map((g) => g.tableName)).toEqual(['Table A', 'Table B'])
    expect(groups[0].guests.map((e) => e.guest.name)).toEqual(['Amy', 'Bo'])
  })
})

describe('groupByGroup', () => {
  it('groups by guest group with "Sans groupe" last', () => {
    const groups = groupByGroup([
      entry('1', 'A'),
      entry('2', 'B', { guest: { id: '2', name: 'B', group: 'Amis' } }),
      entry('3', 'C', { guest: { id: '3', name: 'C', group: 'Famille' } }),
    ])
    expect(groups.map((g) => g.groupName)).toEqual(['Amis', 'Famille', 'Sans groupe'])
  })
})
