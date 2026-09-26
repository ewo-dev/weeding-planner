import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { ACTIVE_PLAN_KEY } from '@/components/layout/createBlankPlan'
import PrintPage from './page'

const { pushMock, replaceMock } = vi.hoisted(() => ({ pushMock: vi.fn(), replaceMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}))

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function makePlan(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Plan à imprimer',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [{ id: T(1), name: 'Table 1', shape: 'round', capacity: 4, position: { x: 0, y: 0 } }],
    guests: [
      { id: G(1), name: 'Alice' },
      { id: G(2), name: 'Bob' },
    ],
    constraints: [],
    assignments: [{ guestId: G(1), tableId: T(1), seatIndex: 0 }],
  }
}

let loadSpy: Mock<(id: string) => Promise<Plan | null>>

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  loadSpy = vi.fn()
  const stub = {
    list: vi.fn(async () => []),
    load: loadSpy,
    save: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  } as unknown as PlanRepository
  vi.spyOn(repoModule, 'getRepository').mockReturnValue(stub)
  pushMock.mockClear()
  replaceMock.mockClear()
})

describe('PrintPage', () => {
  it('redirects to / when no active plan key is set', async () => {
    render(<PrintPage />)

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/fr'))
    expect(loadSpy).not.toHaveBeenCalled()
  })

  it('redirects to / when the active plan cannot be loaded', async () => {
    localStorage.setItem(ACTIVE_PLAN_KEY, 'plan-id')
    loadSpy.mockResolvedValue(null)

    render(<PrintPage />)

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/fr'))
    expect(loadSpy).toHaveBeenCalledWith('plan-id')
  })

  it('renders nothing while loading', () => {
    localStorage.setItem(ACTIVE_PLAN_KEY, 'plan-id')
    loadSpy.mockImplementation(() => new Promise<Plan | null>(() => {})) // never resolves

    const { container } = render(<PrintPage />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the print layout with tables and counts when a plan loads', async () => {
    localStorage.setItem(ACTIVE_PLAN_KEY, 'plan-id')
    loadSpy.mockResolvedValue(makePlan())

    render(<PrintPage />)

    expect(await screen.findByRole('heading', { name: 'Plan à imprimer' })).toBeInTheDocument()
    expect(screen.getByText(/1 \/ 2 invités placés/)).toBeInTheDocument()
    expect(screen.getByLabelText('Table 1')).toBeInTheDocument()
    // Alice appears in the seat list and the index; assert both spots.
    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByLabelText('Non placés')).toBeInTheDocument()
    expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByLabelText('Index alphabétique')).toBeInTheDocument()
  })

  it('shows the friendly error state when loading fails', async () => {
    localStorage.setItem(ACTIVE_PLAN_KEY, 'plan-id')
    loadSpy.mockRejectedValue(new Error('storage boom'))

    render(<PrintPage />)

    expect(await screen.findByText(/Le plan n'a pas pu être chargé/i)).toBeInTheDocument()
    expect(screen.getByText('storage boom')).toBeInTheDocument()
  })
})
