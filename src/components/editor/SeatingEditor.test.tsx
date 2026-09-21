import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { SeatingEditor } from './SeatingEditor'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// Table 1 (cap 4, round) seats Alice:0; Bob is unseated; Table 2 (cap 2,
// rectangle) is empty.
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
      { id: T(1), name: 'Table 1', shape: 'round', capacity: 4, position: { x: 50, y: 60 } },
      { id: T(2), name: 'Table 2', shape: 'rectangle', capacity: 2, position: { x: 400, y: 60 } },
    ],
    guests: [
      { id: G(1), name: 'Alice' },
      { id: G(2), name: 'Bob' },
    ],
    constraints: [],
    assignments: [{ guestId: G(1), tableId: T(1), seatIndex: 0 }],
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

describe('SeatingEditor', () => {
  it('renders the canvas cards, seats and the side-panel dropzone in one context', () => {
    render(
      <ToastProvider>
        <PlanProvider initialPlan={fixture()}>
          <SeatingEditor />
        </PlanProvider>
      </ToastProvider>,
    )

    // Canvas: both cards with their seats.
    expect(screen.getByTestId('workspace')).toBeInTheDocument()
    expect(screen.getByTestId(`table-card-${T(1)}`)).toBeInTheDocument()
    expect(screen.getByTestId(`table-card-${T(2)}`)).toBeInTheDocument()
    expect(screen.getByLabelText('Place 1 de Table 1, Alice')).toBeInTheDocument()
    expect(screen.getByLabelText('Place 2 de Table 2, vide')).toBeInTheDocument()

    // Side panel (desktop aside): unseated Bob's row is a guest drag source,
    // and the list is the unseat dropzone — same DndContext as the canvas.
    expect(screen.getByRole('button', { name: /^Bob/ })).toBeInTheDocument()
    expect(screen.getByTestId('unseat-dropzone')).toBeInTheDocument()
  })
})
