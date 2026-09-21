import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Guest, Table } from '@/types/plan'
import { DragGhost } from './DragGhost'

describe('DragGhost', () => {
  it('renders the guest name with its initial', () => {
    const guest: Guest = { id: 'g1', name: 'Alice' }
    const { container } = render(<DragGhost kind="guest" guest={guest} />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('shadow-lg')
  })

  it('renders the table name with occupancy', () => {
    const table: Table = {
      id: 't1',
      name: 'Table 1',
      shape: 'round',
      capacity: 8,
      position: { x: 0, y: 0 },
    }
    render(<DragGhost kind="table" table={table} seated={3} />)

    expect(screen.getByText('Table 1')).toBeInTheDocument()
    expect(screen.getByText('3/8')).toBeInTheDocument()
  })
})
