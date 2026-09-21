import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { PlanStatsBar } from './PlanStatsBar'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// 5 guests, 3 tables of capacity 4, 2 seated, one must_together between two
// unseated guests (both unseated -> the pair is NOT satisfied, so 1 conflict).
function fixture(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [1, 2, 3].map((n) => ({
      id: T(n),
      name: `Table ${n}`,
      shape: 'round' as const,
      capacity: 4,
      position: { x: 0, y: (n - 1) * 160 },
    })),
    guests: [
      { id: G(1), name: 'Alice' },
      { id: G(2), name: 'Bob' },
      { id: G(3), name: 'Carol' },
      { id: G(4), name: 'Dave' },
      { id: G(5), name: 'Eve' },
    ],
    constraints: [{ id: '20000000-0000-4000-8000-000000000001', kind: 'must_together', a: G(3), b: G(4) }],
    assignments: [
      { guestId: G(1), tableId: T(1), seatIndex: 0 },
      { guestId: G(2), tableId: T(1), seatIndex: 1 },
    ],
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

describe('PlanStatsBar', () => {
  it('renders guests, tables, seats, unseated and conflicts', () => {
    render(
      <PlanProvider initialPlan={fixture()}>
        <PlanStatsBar />
      </PlanProvider>,
    )

    expect(screen.getByTestId('stat-guests')).toHaveTextContent('5')
    expect(screen.getByTestId('stat-tables')).toHaveTextContent('3')
    expect(screen.getByTestId('stat-seats-total')).toHaveTextContent('12')
    expect(screen.getByTestId('stat-seats-occupied')).toHaveTextContent('2')
    expect(screen.getByTestId('stat-seats-free')).toHaveTextContent('10')
    expect(screen.getByTestId('stat-unseated')).toHaveTextContent('3')
    expect(screen.getByTestId('stat-conflicts')).toHaveTextContent('1')
    // Non-zero conflict count is highlighted.
    expect(screen.getByTestId('stat-conflicts')).toHaveClass('text-danger')
  })
})