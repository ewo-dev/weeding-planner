import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Guest, Plan, Table } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { usePlan } from '@/lib/plan/usePlan'
import { TableCard } from './TableCard'

const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function table(overrides: Partial<Table> = {}): Table {
  return {
    id: T(1),
    name: 'Table 1',
    shape: 'round',
    capacity: 4,
    position: { x: 100, y: 80 },
    ...overrides,
  }
}

function makePlan(tables: Table[], guests: Guest[] = [], assignments: Plan['assignments'] = []): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables,
    guests,
    constraints: [],
    assignments,
  }
}

function TableNames() {
  const { plan } = usePlan()
  return <ul data-testid="probe">{plan.tables.map((t) => <li key={t.id}>{t.name}</li>)}</ul>
}

function renderCard(t: Table, guests: Guest[] = [], planTables?: Table[]) {
  // Seat placement comes from the plan assignments, like in production.
  const assignments = guests.map((guest, seatIndex) => ({ guestId: guest.id, tableId: t.id, seatIndex }))
  render(
    <DndContext>
      <PlanProvider initialPlan={makePlan(planTables ?? [t], guests, assignments)}>
        <TableCard table={t} guests={guests} />
        <TableNames />
      </PlanProvider>
    </DndContext>,
  )
}

function renderSelectableCard(t: Table, selected: boolean, onSelect: (tableId: string) => void) {
  render(
    <DndContext>
      <PlanProvider initialPlan={makePlan([t])}>
        <TableCard table={t} guests={[]} selected={selected} onSelect={onSelect} />
      </PlanProvider>
    </DndContext>,
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

describe('TableCard', () => {
  it('renders one slot per capacity with occupancy and position', () => {
    renderCard(table())

    const card = screen.getByTestId(`table-card-${T(1)}`)
    expect(card).toHaveStyle({ left: '100px', top: '80px' })
    // 4 empty seats, 1-based human labels.
    expect(screen.getByLabelText('Place 1 de Table 1, vide')).toBeInTheDocument()
    expect(screen.getByLabelText('Place 4 de Table 1, vide')).toBeInTheDocument()
    expect(screen.getByText('0/4')).toBeInTheDocument()
  })

  it('renders seated guests with occupancy', () => {
    const alice: Guest = { id: G(1), name: 'Alice' }
    renderCard(table(), [alice])

    expect(screen.getByLabelText('Place 1 de Table 1, Alice')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alice' })).toBeInTheDocument()
    expect(screen.getByText('1/4')).toBeInTheDocument()
  })

  it('renames on Enter', () => {
    renderCard(table())

    fireEvent.click(screen.getByRole('button', { name: 'Table 1' }))
    const input = screen.getByRole('textbox', { name: 'Nom de la table' })
    fireEvent.change(input, { target: { value: 'Table VIP' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByTestId('probe')).toHaveTextContent('Table VIP')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('reverts duplicate names silently', () => {
    const other = table({ id: T(2), name: 'Table VIP' })
    renderCard(table(), [], [table(), other])

    fireEvent.click(screen.getByRole('button', { name: 'Table 1' }))
    const input = screen.getByRole('textbox', { name: 'Nom de la table' })
    fireEvent.change(input, { target: { value: 'Table VIP' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Table 1' })).toBeInTheDocument()
  })

  it('cancels rename on Escape', () => {
    renderCard(table())

    fireEvent.click(screen.getByRole('button', { name: 'Table 1' }))
    const input = screen.getByRole('textbox', { name: 'Nom de la table' })
    fireEvent.change(input, { target: { value: 'Changed' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.getByRole('button', { name: 'Table 1' })).toBeInTheDocument()
    expect(screen.getByTestId('probe')).not.toHaveTextContent('Changed')
  })

  it('marks the selected card with emphasis and reports surface taps', () => {
    const onSelect = vi.fn()
    renderSelectableCard(table(), true, onSelect)

    const surface = screen.getByLabelText('Déplacer Table 1')
    expect(surface).toHaveAttribute('aria-pressed', 'true')
    expect(surface).toHaveAttribute('data-selected', 'true')

    fireEvent.click(surface)
    expect(onSelect).toHaveBeenCalledWith(T(1))
  })

  it('leaves unselected cards without emphasis', () => {
    renderSelectableCard(table(), false, vi.fn())

    expect(screen.getByLabelText('Déplacer Table 1')).toHaveAttribute('aria-pressed', 'false')
  })
})
