import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { usePlan } from '@/lib/plan/usePlan'
import { TablesPanel } from './TablesPanel'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const C = (n: number): string => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// 2 tables (Table 1 cap 8 with Alice + Bob seated, Table 2 cap 6 empty),
// plus Carol unseated.
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
      { id: T(2), name: 'Table 2', shape: 'rectangle', capacity: 6, position: { x: 0, y: 160 } },
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

function renderPanel(plan: Plan = fixture()): void {
  render(
    <PlanProvider initialPlan={plan}>
      <TablesPanel />
    </PlanProvider>,
  )
}

function submitForm(): void {
  const form = document.querySelector('form')
  if (!form) throw new Error('expected a form')
  fireEvent.submit(form)
}

// jsdom does not implement the <dialog> imperative API; stub it so
// showModal()/close() behave like in a browser (same as PlanList.test.tsx).
beforeAll(() => {
  if (typeof HTMLDialogElement === 'function') {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true
    }
    HTMLDialogElement.prototype.close = function close() {
      this.open = false
    }
  }
})

beforeEach(() => {
  vi.spyOn(repoModule, 'getRepository').mockReturnValue({
    save: vi.fn(async () => undefined),
  } as unknown as PlanRepository)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TablesPanel', () => {
  it('renders counts and one row per table with occupancy', () => {
    renderPanel()

    expect(screen.getByTestId('table-count')).toHaveTextContent('2 tables · 14 places')
    expect(screen.getByRole('button', { name: /^Table 1/ })).toHaveTextContent('Ronde · 2/8 placés')
    expect(screen.getByRole('button', { name: /^Table 2/ })).toHaveTextContent(
      'Rectangulaire · 0/6 placés',
    )
  })

  it('adds a table with a unique name and the current defaults', () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: '+ Ajouter' }))

    expect(screen.getByRole('button', { name: /^Table 3/ })).toHaveTextContent('Ronde · 0/8 placés')
    expect(screen.getByTestId('table-count')).toHaveTextContent('3 tables · 22 places')
  })

  it('edits the selected table through the config sheet', () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: /^Table 2/ }))
    expect(screen.getByText('Configurer la table')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Table VIP' } })
    submitForm()

    expect(screen.getByRole('button', { name: /^Table VIP/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Table 2/ })).not.toBeInTheDocument()
  })

  it('bulk apply updates all tables and becomes the default for new tables', () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Configurer' }))
    fireEvent.change(screen.getByLabelText('Places'), { target: { value: '10' } })
    submitForm()

    expect(screen.getByRole('button', { name: /^Table 1/ })).toHaveTextContent('Ronde · 2/10 placés')
    expect(screen.getByTestId('table-count')).toHaveTextContent('2 tables · 20 places')

    // New tables inherit the bulk values.
    fireEvent.click(screen.getByRole('button', { name: '+ Ajouter' }))
    expect(screen.getByRole('button', { name: /^Table 3/ })).toHaveTextContent('0/10 placés')
  })

  it('deletes an empty table directly (no dialog)', () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer Table 2' }))

    expect(screen.queryByRole('button', { name: /^Table 2/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Supprimer cette table ?')).not.toBeInTheDocument()
    expect(screen.getByTestId('table-count')).toHaveTextContent('1 tables · 8 places')
  })

  it('asks for confirmation when the table has seated guests, then unseats them', () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer Table 1' }))
    expect(screen.getByText('Supprimer cette table ?')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()

    // Cancel keeps the table.
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.getByRole('button', { name: /^Table 1/ })).toBeInTheDocument()

    // Confirm deletes the table; its guests are unseated, not deleted.
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer Table 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(screen.queryByRole('button', { name: /^Table 1/ })).not.toBeInTheDocument()
    expect(screen.getByTestId('table-count')).toHaveTextContent('1 tables · 6 places')
  })

  it('Escape closes the config sheet', () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: /^Table 1/ }))
    expect(screen.getByText('Configurer la table')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Configurer la table')).not.toBeInTheDocument()
  })

  it('shows an empty state when the plan has no tables', () => {
    renderPanel({ ...fixture(), tables: [], assignments: [] })

    expect(screen.getByTestId('table-count')).toHaveTextContent('0 tables · 0 places')
    expect(screen.getByText('Aucune table pour l’instant')).toBeInTheDocument()
  })

  it('disables Generate with no tables', () => {
    renderPanel({ ...fixture(), tables: [], assignments: [] })

    expect(screen.getByRole('button', { name: 'Générer' })).toBeDisabled()
  })
})

/** One table (cap 2), Alice + Bob unseated with must_together. */
function generateFixture(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [{ id: T(1), name: 'Table 1', shape: 'round', capacity: 2, position: { x: 0, y: 0 } }],
    guests: [
      { id: G(1), name: 'Alice' },
      { id: G(2), name: 'Bob' },
    ],
    constraints: [{ id: C(1), kind: 'must_together', a: G(1), b: G(2) }],
    assignments: [],
  }
}

function UndoHarness() {
  const { plan, undo } = usePlan()
  return (
    <>
      <button type="button" onClick={undo}>
        undo-now
      </button>
      <ul data-testid="assignments-probe">
        {plan.assignments.map((a) => (
          <li key={a.guestId}>
            {a.guestId}|{a.tableId}|{a.seatIndex}
          </li>
        ))}
      </ul>
    </>
  )
}

function renderGeneratePanel(plan: Plan) {
  render(
    <PlanProvider initialPlan={plan}>
      <TablesPanel />
      <UndoHarness />
    </PlanProvider>,
  )
}

describe('TablesPanel generation', () => {
  it('previews, applies and seats the pair together; undo restores exactly', async () => {
    renderGeneratePanel(generateFixture())

    fireEvent.click(screen.getByRole('button', { name: 'Générer' }))
    expect(await screen.findByText('Plan généré')).toBeInTheDocument()
    expect(screen.getByText(/Toutes les relations obligatoires/)).toBeInTheDocument()
    expect(screen.getByText('2 invités placés.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Appliquer' }))
    expect(screen.queryByText('Plan généré')).not.toBeInTheDocument()

    const probe = screen.getByTestId('assignments-probe')
    expect(probe.children).toHaveLength(2)
    // Both seated at the same table (mandatory pair respected).
    expect(probe).toHaveTextContent(`${G(1)}|${T(1)}`)
    expect(probe).toHaveTextContent(`${G(2)}|${T(1)}`)

    fireEvent.click(screen.getByRole('button', { name: 'undo-now' }))
    expect(screen.getByTestId('assignments-probe')).toBeEmptyDOMElement()
  })

  it('discards the preview without seating anyone', async () => {
    renderGeneratePanel(generateFixture())

    fireEvent.click(screen.getByRole('button', { name: 'Générer' }))
    expect(await screen.findByText('Plan généré')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Abandonner' }))
    expect(screen.queryByText('Plan généré')).not.toBeInTheDocument()
    expect(screen.getByTestId('assignments-probe')).toBeEmptyDOMElement()
  })

  it('regenerates a fresh preview without closing', async () => {
    renderGeneratePanel(generateFixture())

    fireEvent.click(screen.getByRole('button', { name: 'Générer' }))
    expect(await screen.findByText('Plan généré')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Régénérer' }))
    expect(await screen.findByText('Plan généré')).toBeInTheDocument()
  })

  it('shows an error when the engine rejects the plan', async () => {
    renderGeneratePanel({
      ...generateFixture(),
      constraints: [
        { id: C(1), kind: 'must_together', a: G(1), b: G(2) },
        { id: C(2), kind: 'must_not_together', a: G(1), b: G(2) },
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: 'Générer' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('La génération a échoué')
    expect(screen.queryByText('Plan généré')).not.toBeInTheDocument()
  })
})
