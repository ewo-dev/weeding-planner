import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { TableDetailSheet } from './TableDetailSheet'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function fixture(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [{ id: T(1), name: 'Table 1', shape: 'round', capacity: 2, position: { x: 0, y: 0 } }],
    guests: [{ id: G(1), name: 'Alice' }],
    constraints: [],
    assignments: [{ guestId: G(1), tableId: T(1), seatIndex: 0 }],
  }
}

function renderSheet(onClose: () => void = vi.fn()) {
  render(
    <PlanProvider initialPlan={fixture()}>
      <TableDetailSheet tableId={T(1)} onClose={onClose} />
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

describe('TableDetailSheet', () => {
  it('renders the table detail as a mobile dialog', () => {
    renderSheet()

    expect(screen.getByRole('dialog', { name: 'Détails de Table 1' })).toBeInTheDocument()
    expect(screen.getByText(/Alice/)).toBeInTheDocument()
    expect(screen.getByText('Places libres (1)')).toBeInTheDocument()
  })

  it('closes via the Fermer button, the backdrop, and Escape', () => {
    const onClose = renderSheet()

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Fermer les détails de Table 1' }))
    expect(onClose).toHaveBeenCalledTimes(2)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(3)
  })
})
