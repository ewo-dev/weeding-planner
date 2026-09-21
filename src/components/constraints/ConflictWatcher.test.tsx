import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { usePlan } from '@/lib/plan/usePlan'
import { moveGuest, renamePlan } from '@/lib/plan/actions'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { ConflictWatcher } from './ConflictWatcher'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// Alice + Bob seated together at Table 1 with must_together: satisfied.
// Table 2 is empty.
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
      { id: T(1), name: 'Table 1', shape: 'round', capacity: 8, position: { x: 0, y: 0 } },
      { id: T(2), name: 'Table 2', shape: 'round', capacity: 8, position: { x: 0, y: 160 } },
    ],
    guests: [
      { id: G(1), name: 'Alice' },
      { id: G(2), name: 'Bob' },
    ],
    constraints: [{ id: '20000000-0000-4000-8000-000000000001', kind: 'must_together', a: G(1), b: G(2) }],
    assignments: [
      { guestId: G(1), tableId: T(1), seatIndex: 0 },
      { guestId: G(2), tableId: T(1), seatIndex: 1 },
    ],
  }
}

function Harness() {
  const { dispatch } = usePlan()
  return (
    <>
      <button type="button" onClick={() => dispatch(moveGuest(G(2), T(2), 0))}>
        move-bob-away
      </button>
      <button type="button" onClick={() => dispatch(renamePlan('Renamed'))}>
        rename
      </button>
    </>
  )
}

function renderWatcher() {
  render(
    <ToastProvider>
      <PlanProvider initialPlan={fixture()}>
        <ConflictWatcher />
        <Harness />
      </PlanProvider>
    </ToastProvider>,
  )
}

beforeEach(() => {
  vi.spyOn(repoModule, 'getRepository').mockReturnValue({
    save: vi.fn(async () => undefined),
  } as unknown as PlanRepository)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ConflictWatcher', () => {
  it('stays silent on mount and on conflict-free dispatches', () => {
    renderWatcher()

    // Mount baseline (satisfied pair) toasts nothing.
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'rename' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('warns on a fresh violation with Undo and Keep actions', () => {
    renderWatcher()

    fireEvent.click(screen.getByRole('button', { name: 'move-bob-away' }))

    expect(
      screen.getByText('Conflit : Alice doit être avec Bob, mais ils sont à des tables différentes.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Garder' })).toBeInTheDocument()
  })

  it('Keep dismisses without undoing; Undo restores and reports success', () => {
    renderWatcher()

    fireEvent.click(screen.getByRole('button', { name: 'move-bob-away' }))
    expect(
      screen.getByText('Conflit : Alice doit être avec Bob, mais ils sont à des tables différentes.'),
    ).toBeInTheDocument()

    // Keep anyway: toast gone, violation stands, no further toast.
    fireEvent.click(screen.getByRole('button', { name: 'Garder' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    // Moving Bob again targets his current seat: a reducer no-op, and the
    // violation was already seen — so no second toast either way.
    fireEvent.click(screen.getByRole('button', { name: 'move-bob-away' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('Undo from the toast restores the seating and shows the success toast', () => {
    renderWatcher()

    fireEvent.click(screen.getByRole('button', { name: 'move-bob-away' }))
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.getByText('Conflit résolu : Alice et Bob.')).toBeInTheDocument()
  })
})
