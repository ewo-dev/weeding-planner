import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { usePlan } from '@/lib/plan/usePlan'
import { AddConstraintMenu } from './AddConstraintMenu'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function makePlan(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [],
    guests: [
      { id: G(1), name: 'Thomas' },
      { id: G(2), name: 'Marie' },
      { id: G(3), name: 'Luc' },
    ],
    constraints: [{ id: '20000000-0000-4000-8000-000000000001', kind: 'must_together', a: G(1), b: G(2) }],
    assignments: [],
  }
}

/** Probe rendering the plan constraints so tests can assert dispatches. */
function ConstraintProbe() {
  const { plan } = usePlan()
  return (
    <ul data-testid="probe">
      {plan.constraints.map((c) => (
        <li key={c.id}>
          {c.kind}|{c.a}|{c.b}
        </li>
      ))}
    </ul>
  )
}

function renderMenu(sourceGuestId: string | null = G(1)) {
  render(
    <PlanProvider initialPlan={makePlan()}>
      <AddConstraintMenu sourceGuestId={sourceGuestId} />
      <ConstraintProbe />
    </PlanProvider>,
  )
}

function openMenu(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter une contrainte' }))
}

function submit(): void {
  const form = document.querySelector('form')
  if (!form) throw new Error('expected the constraint form')
  fireEvent.submit(form)
}

beforeEach(() => {
  vi.spyOn(repoModule, 'getRepository').mockReturnValue({
    save: vi.fn(async () => undefined),
  } as unknown as PlanRepository)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AddConstraintMenu', () => {
  it('adds a constraint for the source guest', () => {
    renderMenu(G(1))
    openMenu()

    expect(screen.getByText(/Pour/)).toHaveTextContent('Thomas')
    fireEvent.change(screen.getByLabelText('Avec'), { target: { value: G(3) } })
    submit()

    expect(screen.getByTestId('probe')).toHaveTextContent(`must_together|${G(1)}|${G(3)}`)
  })

  it('rejects duplicates with an inline error and dispatches nothing', () => {
    renderMenu(G(1))
    openMenu()

    fireEvent.change(screen.getByLabelText('Avec'), { target: { value: G(2) } })
    submit()

    expect(screen.getByRole('alert')).toHaveTextContent('Cette contrainte existe déjà.')
    expect(screen.getByTestId('probe')).not.toHaveTextContent(G(3))
  })

  it('rejects must vs must_not clashes', () => {
    renderMenu(G(1))
    openMenu()

    fireEvent.change(screen.getByLabelText('Avec'), { target: { value: G(2) } })
    fireEvent.change(screen.getByLabelText('Relation'), { target: { value: 'must_not_together' } })
    submit()

    expect(screen.getByRole('alert')).toHaveTextContent('incompatibles pour la même paire')
  })

  it('picks both sides when no source guest is selected', () => {
    renderMenu(null)
    openMenu()

    fireEvent.change(screen.getByLabelText('Invité A'), { target: { value: G(2) } })
    fireEvent.change(screen.getByLabelText('Invité B'), { target: { value: G(3) } })
    fireEvent.change(screen.getByLabelText('Relation'), { target: { value: 'prefer_together' } })
    submit()

    expect(screen.getByTestId('probe')).toHaveTextContent(`prefer_together|${G(2)}|${G(3)}`)
  })

  it('rejects picking the same guest twice in free mode', () => {
    renderMenu(null)
    openMenu()

    fireEvent.change(screen.getByLabelText('Invité A'), { target: { value: G(2) } })
    fireEvent.change(screen.getByLabelText('Invité B'), { target: { value: G(2) } })
    submit()

    expect(screen.getByRole('alert')).toHaveTextContent('lui-même')
  })
})
