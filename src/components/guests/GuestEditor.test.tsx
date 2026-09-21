import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Guest, Plan } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { usePlan } from '@/lib/plan/usePlan'
import { GuestEditor } from './GuestEditor'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function makePlan(guests: Guest[]): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [],
    guests,
    constraints: [],
    assignments: [],
  }
}

function blankPlan(): Plan {
  return makePlan([])
}

/** Probe rendering the plan guests so tests can assert dispatches. */
function GuestNames() {
  const { plan } = usePlan()
  return (
    <ul data-testid="probe">
      {plan.guests.map((guest) => (
        <li key={guest.id}>
          {guest.name}|{guest.group ?? ''}|{guest.notes ?? ''}
        </li>
      ))}
    </ul>
  )
}

function submit(): void {
  const form = document.querySelector('form')
  if (!form) throw new Error('expected a form')
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

describe('GuestEditor', () => {
  it('creates a guest on submit and closes', () => {
    const onClose = vi.fn()
    render(
      <PlanProvider initialPlan={blankPlan()}>
        <GuestEditor guest={null} onClose={onClose} onDelete={vi.fn()} />
        <GuestNames />
      </PlanProvider>,
    )

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Eve' } })
    fireEvent.change(screen.getByLabelText(/Groupe/), { target: { value: 'Amis' } })
    submit()

    expect(screen.getByTestId('probe')).toHaveTextContent('Eve|Amis|')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('edits the guest name on submit', () => {
    const onClose = vi.fn()
    const alice: Guest = { id: G(1), name: 'Alice' }
    render(
      <PlanProvider initialPlan={makePlan([alice])}>
        <GuestEditor guest={alice} onClose={onClose} onDelete={vi.fn()} />
        <GuestNames />
      </PlanProvider>,
    )

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Alicia' } })
    submit()

    expect(screen.getByTestId('probe')).toHaveTextContent('Alicia||')
    expect(screen.getByTestId('probe')).not.toHaveTextContent('Alice||')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('rejects an empty name with an inline error and dispatches nothing', () => {
    const onClose = vi.fn()
    render(
      <PlanProvider initialPlan={blankPlan()}>
        <GuestEditor guest={null} onClose={onClose} onDelete={vi.fn()} />
        <GuestNames />
      </PlanProvider>,
    )

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: '   ' } })
    submit()

    expect(screen.getByRole('alert')).toHaveTextContent('Le nom est requis')
    expect(screen.getByTestId('probe')).toBeEmptyDOMElement()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('delete button calls onDelete without dispatching', () => {
    const onDelete = vi.fn()
    const alice: Guest = { id: G(1), name: 'Alice' }
    render(
      <PlanProvider initialPlan={makePlan([alice])}>
        <GuestEditor guest={alice} onClose={vi.fn()} onDelete={onDelete} />
        <GuestNames />
      </PlanProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))

    expect(onDelete).toHaveBeenCalledWith(alice.id)
    // Guest untouched until the parent confirms.
    expect(screen.getByTestId('probe')).toHaveTextContent('Alice||')
  })

  it('has no delete button in create mode', () => {
    render(
      <PlanProvider initialPlan={blankPlan()}>
        <GuestEditor guest={null} onClose={vi.fn()} onDelete={vi.fn()} />
      </PlanProvider>,
    )

    expect(screen.queryByRole('button', { name: 'Supprimer' })).not.toBeInTheDocument()
  })
})
