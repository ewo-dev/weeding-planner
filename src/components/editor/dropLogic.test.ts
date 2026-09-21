import { describe, expect, it } from 'vitest'
import type { Plan } from '@/types/plan'
import { isFullTableDrop, resolveGuestDrop, resolveTableDrop } from './dropLogic'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// Table 1 (cap 4) seats Alice:0 + Bob:1; Carol is unseated.
function fixture(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [
      { id: T(1), name: 'Table 1', shape: 'round', capacity: 4, position: { x: 100, y: 100 } },
      { id: T(2), name: 'Table 2', shape: 'rectangle', capacity: 2, position: { x: 400, y: 100 } },
    ],
    guests: [
      { id: G(1), name: 'Alice' },
      { id: G(2), name: 'Bob' },
      { id: G(3), name: 'Carol' },
    ],
    constraints: [],
    assignments: [
      { guestId: G(1), tableId: T(1), seatIndex: 0 },
      { guestId: G(2), tableId: T(1), seatIndex: 1 },
    ],
  }
}

describe('resolveGuestDrop', () => {
  it('moves an unseated guest onto an empty seat', () => {
    expect(resolveGuestDrop(fixture(), G(3), `seat:${T(1)}:2`)).toEqual({
      type: 'moveGuest',
      guestId: G(3),
      toTableId: T(1),
      toSeatIndex: 2,
    })
  })

  it('moves a seated guest to another table', () => {
    expect(resolveGuestDrop(fixture(), G(1), `seat:${T(2)}:0`)).toEqual({
      type: 'moveGuest',
      guestId: G(1),
      toTableId: T(2),
      toSeatIndex: 0,
    })
  })

  it('rejects occupied seats (snap back)', () => {
    // Occupied by someone else.
    expect(resolveGuestDrop(fixture(), G(3), `seat:${T(1)}:0`)).toBeNull()
    // Dropping back onto the guest's own slot is a no-op.
    expect(resolveGuestDrop(fixture(), G(1), `seat:${T(1)}:0`)).toBeNull()
  })

  it('rejects out-of-range seats and unknown targets', () => {
    expect(resolveGuestDrop(fixture(), G(3), `seat:${T(1)}:4`)).toBeNull()
    expect(resolveGuestDrop(fixture(), G(3), `seat:${T(1)}:-1`)).toBeNull()
    expect(resolveGuestDrop(fixture(), G(3), `seat:${T(9)}:0`)).toBeNull()
    expect(resolveGuestDrop(fixture(), G(3), 'workspace')).toBeNull()
    expect(resolveGuestDrop(fixture(), G(3), null)).toBeNull()
    expect(resolveGuestDrop(fixture(), G(3), 'nonsense')).toBeNull()
  })

  it('rejects unknown guests', () => {
    expect(resolveGuestDrop(fixture(), G(9), `seat:${T(1)}:2`)).toBeNull()
  })

  it('unseats a seated guest via the unseat dropzone', () => {
    expect(resolveGuestDrop(fixture(), G(1), 'seat:unseat')).toEqual({
      type: 'unseatGuest',
      guestId: G(1),
    })
  })

  it('unseat is a no-op for an already-unseated guest', () => {
    expect(resolveGuestDrop(fixture(), G(3), 'seat:unseat')).toBeNull()
  })
})

describe('resolveTableDrop', () => {
  const bounds = { width: 1200, height: 900 }

  it('moves the table to the rounded, clamped point', () => {
    expect(resolveTableDrop(fixture(), T(1), { x: 200.6, y: 300.4 }, bounds)).toEqual({
      type: 'updateTable',
      tableId: T(1),
      patch: { position: { x: 201, y: 300 } },
    })
  })

  it('clamps to the 16 px inset', () => {
    expect(resolveTableDrop(fixture(), T(1), { x: -50, y: 5000 }, bounds)).toEqual({
      type: 'updateTable',
      tableId: T(1),
      patch: { position: { x: 16, y: 884 } },
    })
  })

  it('returns null for unknown tables and unchanged positions', () => {
    expect(resolveTableDrop(fixture(), T(9), { x: 200, y: 300 }, bounds)).toBeNull()
    expect(resolveTableDrop(fixture(), T(1), { x: 100, y: 100 }, bounds)).toBeNull()
  })
})

describe('isFullTableDrop', () => {
  // Table 1 (cap 4) is filled Alice:0 + Bob:1 + Carol:2 + Dan:3.
  function fullFixture(): Plan {
    return {
      ...fixture(),
      guests: [
        { id: G(1), name: 'Alice' },
        { id: G(2), name: 'Bob' },
        { id: G(3), name: 'Carol' },
        { id: G(4), name: 'Dan' },
      ],
      assignments: [
        { guestId: G(1), tableId: T(1), seatIndex: 0 },
        { guestId: G(2), tableId: T(1), seatIndex: 1 },
        { guestId: G(3), tableId: T(1), seatIndex: 2 },
        { guestId: G(4), tableId: T(1), seatIndex: 3 },
      ],
    }
  }

  it('flags a seat inside a full table', () => {
    expect(isFullTableDrop(fullFixture(), `seat:${T(1)}:3`)).toBe(true)
  })

  it('does not flag a table that still has free seats', () => {
    // `fixture` has only Alice:0 + Bob:1 seated in a cap-4 table.
    expect(isFullTableDrop(fixture(), `seat:${T(1)}:3`)).toBe(false)
  })

  it('returns false for unknown tables and unrelated drop targets', () => {
    expect(isFullTableDrop(fullFixture(), `seat:${T(9)}:0`)).toBe(false)
    expect(isFullTableDrop(fullFixture(), 'seat:unseat')).toBe(false)
    expect(isFullTableDrop(fullFixture(), 'workspace')).toBe(false)
    expect(isFullTableDrop(fullFixture(), null)).toBe(false)
  })
})
