import { describe, expect, it } from 'vitest'
import type { Assignment, Constraint, Guest, Plan, Table } from '@/types/plan'
import {
  conflicts,
  constraintsForGuest,
  guestById,
  seatedCount,
  seatedGuestsByTable,
  tableById,
  unseatedGuests,
} from './selectors'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function fixture(): Plan {
  const guests: Guest[] = [
    { id: G(1), name: 'Alice' },
    { id: G(2), name: 'Bob' },
    { id: G(3), name: 'Carol' },
    { id: G(4), name: 'Dave' },
  ]
  const tables: Table[] = [
    { id: T(1), name: 'T1', shape: 'round', capacity: 3, position: { x: 0, y: 0 } },
    { id: T(2), name: 'T2', shape: 'rectangle', capacity: 2, position: { x: 0, y: 160 } },
  ]
  const constraints: Constraint[] = [
    { id: '20000000-0000-4000-8000-000000000001', kind: 'must_together', a: G(1), b: G(2) },
    { id: '20000000-0000-4000-8000-000000000002', kind: 'prefer_together', a: G(2), b: G(3) },
  ]
  const assignments: Assignment[] = [
    { guestId: G(1), tableId: T(1), seatIndex: 0 },
    { guestId: G(2), tableId: T(1), seatIndex: 2 },
    { guestId: G(4), tableId: T(2), seatIndex: 0 },
  ]
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables,
    guests,
    constraints,
    assignments,
  }
}

describe('selectors', () => {
  it('seatedCount returns the number of assignments', () => {
    expect(seatedCount(fixture())).toBe(3)
  })

  it('unseatedGuests returns guests without an assignment', () => {
    expect(unseatedGuests(fixture()).map((g) => g.id)).toEqual([G(3)])
  })

  it('seatedGuestsByTable groups guests in seat-index order', () => {
    const result = seatedGuestsByTable(fixture())
    expect(result.get(T(1))?.map((g) => g.id)).toEqual([G(1), G(2)]) // seats 0 and 2
    expect(result.get(T(2))?.map((g) => g.id)).toEqual([G(4)])
    expect(result.has('nope')).toBe(false)
  })

  it('guestById finds a guest or undefined', () => {
    expect(guestById(fixture(), G(2))?.name).toBe('Bob')
    expect(guestById(fixture(), 'nope')).toBeUndefined()
  })

  it('tableById finds a table or undefined', () => {
    expect(tableById(fixture(), T(1))?.name).toBe('T1')
    expect(tableById(fixture(), 'nope')).toBeUndefined()
  })

  it('constraintsForGuest returns constraints touching the guest', () => {
    const result = constraintsForGuest(fixture(), G(2))
    expect(result.map((c) => c.id)).toEqual([
      '20000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002',
    ])
    expect(constraintsForGuest(fixture(), G(4))).toEqual([])
  })

  it('conflicts re-exports the detectConflicts report shape', () => {
    const report = conflicts(fixture())
    expect(report.mandatorySatisfied).toHaveLength(1)
    expect(report.mandatoryUnsatisfied).toHaveLength(0)
    expect(report.preferenceSatisfied).toHaveLength(0)
    expect(report.preferenceUnsatisfied).toHaveLength(1)
    expect(report.separationViolations).toHaveLength(0)
    expect(report.seatedGuests).toBe(3)
    expect(report.unseatedGuests).toBe(1)
    expect(report.overflow).toBe(false)
  })
})