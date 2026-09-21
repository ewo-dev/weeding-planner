import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { ConstraintsPanel } from './ConstraintsPanel'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const C = (n: number): string => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// Alice + Bob seated together at Table 1; Carol unseated.
// must_together(Alice, Carol) is unsatisfied; must_not_together(Alice, Bob)
// is violated.
function fixture(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [{ id: T(1), name: 'Table 1', shape: 'round', capacity: 8, position: { x: 0, y: 0 } }],
    guests: [
      { id: G(1), name: 'Alice' },
      { id: G(2), name: 'Bob' },
      { id: G(3), name: 'Carol' },
    ],
    constraints: [
      { id: C(1), kind: 'must_together', a: G(1), b: G(3) },
      { id: C(2), kind: 'must_not_together', a: G(1), b: G(2) },
    ],
    assignments: [
      { guestId: G(1), tableId: T(1), seatIndex: 0 },
      { guestId: G(2), tableId: T(1), seatIndex: 1 },
    ],
  }
}

function renderPanel(guestId: string | null, plan: Plan = fixture()) {
  render(
    <PlanProvider initialPlan={plan}>
      <ConstraintsPanel guestId={guestId} />
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

describe('ConstraintsPanel', () => {
  it('shows every constraint with violations highlighted when none selected', () => {
    renderPanel(null)

    expect(screen.getByTestId('constraint-count')).toHaveTextContent('(2)')
    expect(screen.getByText('Alice et Carol')).toBeInTheDocument()
    expect(screen.getByText('Alice et Bob')).toBeInTheDocument()
    expect(screen.getAllByText('Non respectée')).toHaveLength(2)
  })

  it('scopes to the selected guest', () => {
    renderPanel(G(3))

    expect(screen.getByText('Contraintes de Carol')).toBeInTheDocument()
    expect(screen.getByTestId('constraint-count')).toHaveTextContent('(1)')
    expect(screen.getByText('Alice et Carol')).toBeInTheDocument()
    expect(screen.queryByText('Alice et Bob')).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no constraints', () => {
    renderPanel(null, { ...fixture(), constraints: [] })

    expect(screen.getByTestId('constraint-count')).toHaveTextContent('(0)')
    expect(screen.getByText('Aucune contrainte pour l’instant.')).toBeInTheDocument()
  })

  it('removes a constraint on × click', () => {
    renderPanel(null)

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer la contrainte entre Alice et Bob' }))

    expect(screen.queryByText('Alice et Bob')).not.toBeInTheDocument()
    expect(screen.getByTestId('constraint-count')).toHaveTextContent('(1)')
  })

  it('adds a constraint through the menu', () => {
    renderPanel(G(2))

    fireEvent.click(screen.getByRole('button', { name: '+ Ajouter une contrainte' }))
    fireEvent.change(screen.getByLabelText('Avec'), { target: { value: G(3) } })
    const form = document.querySelector('form')
    if (!form) throw new Error('expected the constraint form')
    fireEvent.submit(form)

    expect(screen.getByText('Bob et Carol')).toBeInTheDocument()
  })
})
