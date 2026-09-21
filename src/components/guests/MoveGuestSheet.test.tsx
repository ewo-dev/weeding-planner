import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { usePlan } from '@/lib/plan/usePlan'
import { MoveGuestSheet } from './MoveGuestSheet'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function fixture(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [{ id: T(1), name: 'Table Ronde', shape: 'round', capacity: 3, position: { x: 0, y: 0 } }],
    guests: [
      { id: G(1), name: 'Alice' },
      { id: G(2), name: 'Carol' },
    ],
    constraints: [],
    assignments: [{ guestId: G(1), tableId: T(1), seatIndex: 0 }],
  }
}

/** Probe exposing the live assignments so tests observe dispatches. */
function AssignmentsProbe() {
  const { plan } = usePlan()
  return (
    <output data-testid="assignments-probe">
      {plan.assignments.map((a) => `${a.guestId}@${a.tableId}:${a.seatIndex}`).join(',')}
    </output>
  )
}

function renderSheet(plan: Plan = fixture(), guestId: string | null = G(2), onClose: () => void = vi.fn()) {
  const close = onClose
  render(
    <PlanProvider initialPlan={plan}>
      <AssignmentsProbe />
      <MoveGuestSheet guestId={guestId} onClose={close} />
    </PlanProvider>,
  )
  return { close }
}

beforeEach(() => {
  vi.spyOn(repoModule, 'getRepository').mockReturnValue({
    save: vi.fn(async () => undefined),
  } as unknown as PlanRepository)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MoveGuestSheet', () => {
  it('lists only empty seats for the guest', () => {
    renderSheet()

    expect(screen.getByText('Placer Carol')).toBeInTheDocument()
    // Seat 1 is occupied by Alice: only seats 2 and 3 are offered.
    expect(screen.queryByRole('button', { name: 'Place 1' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Place 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Place 3' })).toBeInTheDocument()
    // Unseated guest has nothing to unseat.
    expect(screen.queryByRole('button', { name: 'Retirer de la table' })).not.toBeInTheDocument()
  })

  it('places the guest on the chosen seat and closes', () => {
    const onClose = vi.fn()
    renderSheet(fixture(), G(2), onClose)

    fireEvent.click(screen.getByRole('button', { name: 'Place 2' }))

    expect(onClose).toHaveBeenCalled()
    expect(screen.getByTestId('assignments-probe')).toHaveTextContent(`${G(1)}@${T(1)}:0,${G(2)}@${T(1)}:1`)
  })

  it('offers unseating for a seated guest', () => {
    const onClose = vi.fn()
    renderSheet(fixture(), G(1), onClose)

    fireEvent.click(screen.getByRole('button', { name: 'Retirer de la table' }))

    expect(onClose).toHaveBeenCalled()
    expect(screen.getByTestId('assignments-probe')).not.toHaveTextContent(G(1))
  })

  it('explains when the plan has no tables', () => {
    renderSheet({ ...fixture(), tables: [], assignments: [] })

    expect(screen.getByText(/Aucune table pour l’instant/)).toBeInTheDocument()
  })
})
