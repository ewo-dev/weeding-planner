import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Guest, Plan, Table } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { Button } from '@/components/ui/Button'
import { DragGhost } from './DragGhost'
import { SeatSlot } from './SeatSlot'
import { TableCard } from './TableCard'

const T = '10000000-0000-4000-8000-000000000001'
const G = '00000000-0000-4000-8000-000000000001'

function table(): Table {
  return { id: T, name: 'Table 1', shape: 'rectangle', capacity: 2, position: { x: 0, y: 0 } }
}

function plan(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [table()],
    guests: [],
    constraints: [],
    assignments: [],
  }
}

beforeEach(() => {
  vi.spyOn(repoModule, 'getRepository').mockReturnValue({
    save: vi.fn(async () => undefined),
  } as unknown as PlanRepository)
})

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Release-validation invariants (docs/11-roadmap.md step 15,
 * docs/09-design-system.md § 15): tables and seats expose accessible names,
 * table drag handles are named, the drag ghost respects reduced motion, and
 * the default button meets the 44 px touch target.
 */
describe('release a11y invariants', () => {
  it('exposes the table group name and a named drag handle', () => {
    render(
      <DndContext>
        <PlanProvider initialPlan={plan()}>
          <TableCard table={table()} guests={[]} />
        </PlanProvider>
      </DndContext>,
    )

    expect(screen.getByRole('group', { name: /Table Table 1/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Déplacer Table 1' })).toBeInTheDocument()
  })

  it('exposes empty seats with a 44 px touch target', () => {
    render(
      <DndContext>
        <SeatSlot tableId={T} tableName="Table 1" seatIndex={0} guest={null} />
      </DndContext>,
    )

    const seat = screen.getByRole('group', { name: 'Place 1 de Table 1, vide' })
    expect(seat).toBeInTheDocument()
    expect(seat).toHaveClass('h-11', 'w-11')
  })

  it('renders seated guest chips as 44 px accessible buttons', () => {
    const guest: Guest = { id: G, name: 'Alice' }
    render(
      <DndContext>
        <PlanProvider
          initialPlan={{
            ...plan(),
            guests: [guest],
            assignments: [{ guestId: G, tableId: T, seatIndex: 0 }],
          }}
        >
          <TableCard table={table()} guests={[guest]} />
        </PlanProvider>
      </DndContext>,
    )

    const chip = screen.getByRole('button', { name: 'Alice' })
    expect(chip).toHaveClass('h-11', 'w-11')
  })

  it('gates drag-ghost motion behind motion-safe (reduced motion)', () => {
    const { container } = render(
      <DragGhost kind="guest" guest={{ id: G, name: 'Alice' }} />,
    )

    const ghost = container.firstElementChild
    expect(ghost).not.toBeNull()
    const classes = ghost?.className ?? ''
    expect(classes).toMatch('motion-safe:rotate-1')
    expect(classes).toMatch('motion-safe:scale-105')
    expect(classes).not.toMatch(/(?:^|\s)rotate-1(?:\s|$)/)
    expect(classes).not.toMatch(/(?:^|\s)scale-105(?:\s|$)/)
  })

  it('meets the 44 px touch target on the default button size', () => {
    render(<Button>Enregistrer</Button>)

    expect(screen.getByRole('button', { name: 'Enregistrer' })).toHaveClass('h-11')
  })
})
