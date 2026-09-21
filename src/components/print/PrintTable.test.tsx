import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Assignment, Guest, Table } from '@/types/plan'
import { PrintTable } from './PrintTable'

const T = '10000000-0000-4000-8000-000000000001'
const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function table(): Table {
  return { id: T, name: 'Table Ronde', shape: 'round', capacity: 4, position: { x: 0, y: 0 } }
}

function guests(): Guest[] {
  return [
    { id: G(1), name: 'Alice' },
    { id: G(2), name: 'Bob' },
  ]
}

describe('PrintTable', () => {
  it('lists seated guests ordered by seat index with occupancy', () => {
    const assignments: Assignment[] = [
      { guestId: G(2), tableId: T, seatIndex: 1 },
      { guestId: G(1), tableId: T, seatIndex: 0 },
    ]
    render(<PrintTable table={table()} guests={guests()} assignments={assignments} />)

    expect(screen.getByRole('heading', { name: 'Table Ronde' })).toBeInTheDocument()
    expect(screen.getByText('Ronde · 2/4 places occupées')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual(['Alice', 'Bob'])
    expect(screen.getByText('2 places libres.')).toBeInTheDocument()
  })

  it('shows the empty state for a table with no assignments', () => {
    render(<PrintTable table={table()} guests={guests()} assignments={[]} />)

    expect(screen.getByText('Aucun invité placé.')).toBeInTheDocument()
  })

  it('degrades unknown guest ids to a placeholder', () => {
    const assignments: Assignment[] = [{ guestId: G(9), tableId: T, seatIndex: 0 }]
    render(<PrintTable table={table()} guests={guests()} assignments={assignments} />)

    expect(screen.getByText('(invité inconnu)')).toBeInTheDocument()
  })
})
