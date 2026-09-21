import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { Workspace } from './Workspace'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function makePlan(withTables: boolean): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: withTables
      ? [
          { id: T(1), name: 'Table Ronde', shape: 'round', capacity: 2, position: { x: 50, y: 60 } },
          { id: T(2), name: 'Table Longue', shape: 'rectangle', capacity: 3, position: { x: 400, y: 60 } },
        ]
      : [],
    guests: [{ id: G(1), name: 'Alice' }],
    constraints: [],
    assignments: withTables ? [{ guestId: G(1), tableId: T(1), seatIndex: 0 }] : [],
  }
}

function renderWorkspace(withTables: boolean) {
  render(
    <DndContext>
      <PlanProvider initialPlan={makePlan(withTables)}>
        <Workspace />
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

describe('Workspace', () => {
  it('renders one card per table with seats and seated guests', () => {
    renderWorkspace(true)

    expect(screen.getByTestId('workspace')).toBeInTheDocument()
    expect(screen.getByTestId(`table-card-${T(1)}`)).toBeInTheDocument()
    expect(screen.getByTestId(`table-card-${T(2)}`)).toBeInTheDocument()
    // Round cap-2 card: 2 slots; rectangle cap-3 card: 3 slots.
    expect(screen.getByLabelText('Place 1 de Table Ronde, Alice')).toBeInTheDocument()
    expect(screen.getByLabelText('Place 2 de Table Ronde, vide')).toBeInTheDocument()
    expect(screen.getByLabelText('Place 3 de Table Longue, vide')).toBeInTheDocument()
  })

  it('shows the empty hint when there are no tables', () => {
    renderWorkspace(false)

    expect(screen.getByText(/Aucune table pour l’instant/)).toBeInTheDocument()
    expect(screen.queryByTestId(`table-card-${T(1)}`)).not.toBeInTheDocument()
  })
})
