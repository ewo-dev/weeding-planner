import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Plan } from '@/types/plan'
import { PrintLayout } from './PrintLayout'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}))

function makePlan(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Mariage Alice & Bob',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [
      { id: '10000000-0000-4000-8000-000000000001', name: 'Table 1', shape: 'round', capacity: 4, position: { x: 0, y: 0 } },
    ],
    guests: [
      { id: '00000000-0000-4000-8000-000000000001', name: 'Alice' },
      { id: '00000000-0000-4000-8000-000000000002', name: 'Bob' },
      { id: '00000000-0000-4000-8000-000000000003', name: 'Carol' },
    ],
    constraints: [],
    assignments: [
      { guestId: '00000000-0000-4000-8000-000000000001', tableId: '10000000-0000-4000-8000-000000000001', seatIndex: 0 },
    ],
  }
}

function renderLayout(plan: Plan = makePlan()) {
  render(
    <PrintLayout plan={plan}>
      <section aria-label="Table 1">table one</section>
    </PrintLayout>,
  )
}

beforeEach(() => {
  pushMock.mockClear()
  vi.spyOn(window, 'print').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PrintLayout', () => {
  it('renders the header, table blocks, unseated section, and alphabetical index', () => {
    renderLayout()

    expect(screen.getByRole('heading', { name: 'Mariage Alice & Bob' })).toBeInTheDocument()
    expect(screen.getByText(/1 \/ 3 invités placés/)).toBeInTheDocument()
    expect(screen.getByText(/2 invités non placés/)).toBeInTheDocument()
    expect(screen.getByLabelText('Table 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Non placés')).toBeInTheDocument()
    // Carol appears in both the unseated list and the alphabetical index.
    expect(screen.getAllByText('Carol').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByLabelText('Index alphabétique')).toBeInTheDocument()
  })

  it('omits the unseated section when everyone is seated', () => {
    const plan = makePlan()
    renderLayout({
      ...plan,
      assignments: [
        { guestId: '00000000-0000-4000-8000-000000000001', tableId: plan.tables[0].id, seatIndex: 0 },
        { guestId: '00000000-0000-4000-8000-000000000002', tableId: plan.tables[0].id, seatIndex: 1 },
        { guestId: '00000000-0000-4000-8000-000000000003', tableId: plan.tables[0].id, seatIndex: 2 },
      ],
    })

    expect(screen.queryByLabelText('Non placés')).not.toBeInTheDocument()
    expect(screen.getByText(/3 \/ 3 invités placés/)).toBeInTheDocument()
  })

  it('lists guests alphabetically in the index with their seat assignment', () => {
    renderLayout()

    const index = screen.getByLabelText('Index alphabétique')
    const items = index.querySelectorAll('li')
    const orderedNames = Array.from(items).map((item) => item.querySelector('span')?.textContent)
    expect(orderedNames).toEqual(['Alice', 'Bob', 'Carol'])
    expect(index.textContent).toContain('Place 1')
    expect(index.textContent).toContain('Non placé')
  })

  it('navigates back to the editor and opens the print dialog', () => {
    renderLayout()

    fireEvent.click(screen.getByRole('button', { name: 'Retour à l’éditeur' }))
    expect(pushMock).toHaveBeenCalledWith('/editor')

    fireEvent.click(screen.getByRole('button', { name: 'Imprimer' }))
    expect(window.print).toHaveBeenCalledTimes(1)
  })
})
