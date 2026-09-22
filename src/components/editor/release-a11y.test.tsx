import { fireEvent, render, screen } from '@testing-library/react'
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
import { TableDetailSheet } from '@/components/tables/TableDetailSheet'
import { MoveGuestSheet } from '@/components/guests/MoveGuestSheet'
import { GuestRow } from '@/components/guests/GuestRow'

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

  it('exposes the mobile table detail as a named dialog with a labelled close', () => {
    const seated: Plan = {
      ...plan(),
      tables: [{ ...table(), capacity: 2 }],
      guests: [{ id: G, name: 'Alice' }],
      assignments: [{ guestId: G, tableId: T, seatIndex: 0 }],
    }
    render(
      <PlanProvider initialPlan={seated}>
        <TableDetailSheet tableId={T} onClose={vi.fn()} />
      </PlanProvider>,
    )

    expect(screen.getByRole('dialog', { name: 'Détails de Table 1' })).toBeInTheDocument()
    // Backdrop and Fermer both carry the table name for screen readers.
    expect(screen.getByRole('button', { name: 'Fermer les détails de Table 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument()
  })

  it('exposes the list-driven placement flow with named 44 px targets', () => {
    const placement: Plan = {
      ...plan(),
      tables: [{ ...table(), name: 'Table Ronde', capacity: 3 }],
      guests: [
        { id: G, name: 'Alice' },
        { id: '00000000-0000-4000-8000-000000000002', name: 'Carol' },
      ],
      assignments: [{ guestId: G, tableId: T, seatIndex: 0 }],
    }
    render(
      <DndContext>
        <PlanProvider initialPlan={placement}>
          <GuestRow
            guest={{ id: '00000000-0000-4000-8000-000000000002', name: 'Carol' }}
            tableName={null}
            selected={false}
            hasConflict={false}
            onEdit={vi.fn()}
            onRemove={vi.fn()}
            onMove={vi.fn()}
          />
          <MoveGuestSheet guestId="00000000-0000-4000-8000-000000000002" onClose={vi.fn()} />
        </PlanProvider>
      </DndContext>,
    )

    // Step 1 of the placement flow: the list entry point and the sheet.
    const placer = screen.getByRole('button', { name: 'Placer Carol' })
    expect(placer).toHaveClass('min-h-[44px]')
    expect(screen.getByRole('dialog', { name: 'Placer Carol' })).toBeInTheDocument()
    const tableButton = screen.getByRole('button', { name: 'Table Ronde, 1 sur 3' })
    expect(tableButton).toHaveClass('min-h-[44px]')

    // Step 2: every seat offer is a named 44 px target.
    fireEvent.click(tableButton)
    for (const seat of screen.getAllByRole('button', { name: /^Place / })) {
      expect(seat).toHaveClass('min-h-[44px]')
    }
  })
})
