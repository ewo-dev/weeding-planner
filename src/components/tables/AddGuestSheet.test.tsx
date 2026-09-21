import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { usePlan } from '@/lib/plan/usePlan'
import { AddGuestSheet } from './AddGuestSheet'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// Table 1 (cap 4): Alice seat 1, Bob seat 3. Carol + Dave unseated.
function fixture(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [{ id: T(1), name: 'Table 1', shape: 'round', capacity: 4, position: { x: 0, y: 0 } }],
    guests: [
      { id: G(1), name: 'Alice' },
      { id: G(2), name: 'Bob' },
      { id: G(3), name: 'Carol' },
      { id: G(4), name: 'Dave' },
    ],
    constraints: [],
    assignments: [
      { guestId: G(1), tableId: T(1), seatIndex: 0 },
      { guestId: G(2), tableId: T(1), seatIndex: 2 },
    ],
  }
}

function AssignmentsProbe() {
  const { plan } = usePlan()
  return (
    <output data-testid="assignments-probe">
      {plan.assignments.map((a) => `${a.guestId}@${a.tableId}:${a.seatIndex}`).join(',')}
    </output>
  )
}

function renderSheet(plan: Plan = fixture(), onClose: () => void = vi.fn()) {
  render(
    <PlanProvider initialPlan={plan}>
      <AssignmentsProbe />
      <AddGuestSheet tableId={T(1)} onClose={onClose} />
    </PlanProvider>,
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

describe('AddGuestSheet', () => {
  it('lists unseated guests first, then seats of the fixed table', () => {
    renderSheet()

    expect(screen.getByRole('dialog', { name: 'Ajouter à Table 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Placer Carol à Table 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Placer Dave à Table 1' })).toBeInTheDocument()
    // Seated guests are not offered.
    expect(screen.queryByRole('button', { name: /Placer Alice/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Placer Carol à Table 1' }))
    // Seats 1 and 3 taken: only 2 and 4 are free.
    expect(screen.queryByRole('button', { name: 'Place 1' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Place 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Place 4' })).toBeInTheDocument()
  })

  it('places the guest on the chosen seat and closes', () => {
    const onClose = vi.fn()
    renderSheet(fixture(), onClose)

    fireEvent.click(screen.getByRole('button', { name: 'Placer Carol à Table 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Place 2' }))

    expect(onClose).toHaveBeenCalled()
    expect(screen.getByTestId('assignments-probe')).toHaveTextContent(`${G(3)}@${T(1)}:1`)
  })

  it('goes back from seats to the guest list', () => {
    renderSheet()

    fireEvent.click(screen.getByRole('button', { name: 'Placer Carol à Table 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tous les invités' }))

    expect(screen.getByRole('button', { name: 'Placer Dave à Table 1' })).toBeInTheDocument()
  })

  it('explains when every guest is already seated', () => {
    const plan = fixture()
    renderSheet({
      ...plan,
      assignments: [
        ...plan.assignments,
        { guestId: G(3), tableId: T(1), seatIndex: 1 },
        { guestId: G(4), tableId: T(1), seatIndex: 3 },
      ],
    })

    // Table is now full: explicit message instead of a silent dead end.
    expect(screen.getByText(/Cette table est complète/)).toBeInTheDocument()
  })
})
