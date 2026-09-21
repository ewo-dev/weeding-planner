import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan, Table } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { usePlan } from '@/lib/plan/usePlan'
import { TableConfigSheet } from './TableConfigSheet'

const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function table(): Table {
  return { id: T(1), name: 'Table 1', shape: 'round', capacity: 8, position: { x: 0, y: 0 } }
}

function makePlan(tables: Table[]): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables,
    guests: [],
    constraints: [],
    assignments: [],
  }
}

/** Probe rendering the plan tables so tests can assert dispatches. */
function TableProbe() {
  const { plan } = usePlan()
  return (
    <ul data-testid="probe">
      {plan.tables.map((t) => (
        <li key={t.id}>
          {t.name}|{t.shape}|{t.capacity}
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

function renderSheet(tables: Table[], seated = 0, takenNames: string[] = []) {
  const onClose = vi.fn()
  render(
    <PlanProvider initialPlan={makePlan(tables)}>
      <TableConfigSheet table={tables[0]} seated={seated} takenNames={takenNames} onClose={onClose} />
      <TableProbe />
    </PlanProvider>,
  )
  return onClose
}

beforeEach(() => {
  vi.spyOn(repoModule, 'getRepository').mockReturnValue({
    save: vi.fn(async () => undefined),
  } as unknown as PlanRepository)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TableConfigSheet', () => {
  it('edits name, shape and capacity on submit', () => {
    const onClose = renderSheet([table()])

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Table VIP' } })
    fireEvent.change(screen.getByLabelText('Forme'), { target: { value: 'rectangle' } })
    fireEvent.change(screen.getByLabelText('Places'), { target: { value: '10' } })
    submit()

    expect(screen.getByTestId('probe')).toHaveTextContent('Table VIP|rectangle|10')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('rejects a duplicate name with an inline error', () => {
    const onClose = renderSheet([table()], 0, ['Table VIP'])

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Table VIP' } })
    submit()

    expect(screen.getByRole('alert')).toHaveTextContent('déjà utilisé')
    expect(screen.getByTestId('probe')).toHaveTextContent('Table 1|round|8')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('rejects an out-of-range capacity', () => {
    const onClose = renderSheet([table()])

    fireEvent.change(screen.getByLabelText('Places'), { target: { value: '0' } })
    submit()

    expect(screen.getByRole('alert')).toHaveTextContent('entre 1 et 20')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('asks for confirmation when shrinking below the seated count', () => {
    const onClose = renderSheet([table()], 6)

    fireEvent.change(screen.getByLabelText('Places'), { target: { value: '4' } })
    submit()

    // Confirmation step lists the impact; nothing dispatched yet.
    expect(screen.getByText('Réduire la capacité ?')).toBeInTheDocument()
    expect(screen.getByTestId('probe')).toHaveTextContent('Table 1|round|8')
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Réduire quand même' }))
    expect(screen.getByTestId('probe')).toHaveTextContent('Table 1|round|4')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('confirmation can be cancelled back to the form', () => {
    renderSheet([table()], 6)

    fireEvent.change(screen.getByLabelText('Places'), { target: { value: '4' } })
    submit()
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.getByLabelText('Places')).toBeInTheDocument()
    expect(screen.getByTestId('probe')).toHaveTextContent('Table 1|round|8')
  })
})
