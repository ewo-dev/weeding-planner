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
  it('lists seats in order with occupants and "Place libre" for empty ones', () => {
    const assignments: Assignment[] = [
      { guestId: G(2), tableId: T, seatIndex: 1 },
      { guestId: G(1), tableId: T, seatIndex: 0 },
    ]
    render(<PrintTable table={table()} guests={guests()} assignments={assignments} />)

    expect(screen.getByRole('heading', { name: 'Table Ronde' })).toBeInTheDocument()
    expect(screen.getByText('2 / 4')).toBeInTheDocument()
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(4)
    expect(rows[0]).toHaveTextContent('Place 1')
    expect(rows[0]).toHaveTextContent('Alice')
    expect(rows[1]).toHaveTextContent('Place 2')
    expect(rows[1]).toHaveTextContent('Bob')
    expect(rows[2]).toHaveTextContent('Place 3')
    expect(rows[2]).toHaveTextContent('Place libre')
    expect(rows[3]).toHaveTextContent('Place 4')
    expect(rows[3]).toHaveTextContent('Place libre')
  })

  it('shows the empty state for a table with no assignments', () => {
    render(<PrintTable table={table()} guests={guests()} assignments={[]} />)

    expect(screen.getByText('0 / 4')).toBeInTheDocument()
    expect(screen.getByText('Aucun invité placé.')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('degrades unknown guest ids to a placeholder instead of "Place libre"', () => {
    const assignments: Assignment[] = [{ guestId: G(9), tableId: T, seatIndex: 0 }]
    render(<PrintTable table={table()} guests={guests()} assignments={assignments} />)

    // Seat 0 keeps its assignment but renders the unknown-guest placeholder.
    expect(screen.getByText(/invité inconnu/i)).toBeInTheDocument()
    // Seats 1, 2, 3 still show "Place libre".
    expect(screen.getAllByText('Place libre')).toHaveLength(3)
  })
})
