import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { usePlan } from '@/lib/plan/usePlan'
import { TableDetailPanel } from './TableDetailPanel'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// Table 1 (cap 4): Alice seat 1, Bob seat 3. Carol unseated.
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
    <ul data-testid="assignments-probe">
      {plan.assignments.map((a) => (
        <li key={a.guestId}>
          {a.guestId}|{a.tableId}|{a.seatIndex}
        </li>
      ))}
    </ul>
  )
}

function renderDetail(plan: Plan = fixture(), onClose: () => void = vi.fn()) {
  return render(
    <PlanProvider initialPlan={plan}>
      <TableDetailPanel tableId={T(1)} onClose={onClose} />
      <AssignmentsProbe />
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

describe('TableDetailPanel', () => {
  it('shows occupancy, seated guests with seat numbers, and empty seats', () => {
    renderDetail()

    expect(screen.getByRole('region', { name: 'Détails de la table' })).toBeInTheDocument()
    expect(screen.getByText('Table 1')).toBeInTheDocument()
    expect(screen.getByText('Ronde · 2/4 placés')).toBeInTheDocument()
    expect(screen.getByText('Place 1')).toBeInTheDocument()
    expect(screen.getByText(/Alice/)).toBeInTheDocument()
    expect(screen.getByText('Place 3')).toBeInTheDocument()
    expect(screen.getByText(/Bob/)).toBeInTheDocument()
    expect(screen.getByText('Places libres (2)')).toBeInTheDocument()
  })

  it('retires a guest via an undoable unseat action', () => {
    renderDetail()

    fireEvent.click(screen.getByRole('button', { name: 'Retirer Alice de Table 1' }))

    const probe = screen.getByTestId('assignments-probe')
    expect(probe).not.toHaveTextContent(`${G(1)}|${T(1)}`)
    expect(probe).toHaveTextContent(`${G(2)}|${T(1)}|2`)
  })

  it('opens the placement sheet to reassign a guest', () => {
    renderDetail()

    const moveButtons = screen.getAllByRole('button', { name: 'Déplacer' })
    fireEvent.click(moveButtons[0])
    expect(screen.getByRole('dialog', { name: 'Placer Alice' })).toBeInTheDocument()
  })

  it('closes and opens table configuration from the detail', () => {
    const onClose = vi.fn()
    renderDetail(fixture(), onClose)

    fireEvent.click(screen.getByRole('button', { name: 'Configurer' }))
    expect(screen.getByText('Configurer la table')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByText('Configurer la table')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders nothing for an unknown table', () => {
    render(
      <PlanProvider initialPlan={fixture()}>
        <TableDetailPanel tableId="missing" onClose={vi.fn()} />
      </PlanProvider>,
    )

    expect(screen.queryByRole('region', { name: 'Détails de la table' })).not.toBeInTheDocument()
  })
})
