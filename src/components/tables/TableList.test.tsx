import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Table } from '@/types/plan'
import { TableList } from './TableList'

const T = (n: number, name: string, capacity = 8): Table => ({
  id: `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  name,
  shape: 'round',
  capacity,
  position: { x: 0, y: 0 },
})

describe('TableList', () => {
  it('renders one row per table with shape and occupancy', () => {
    render(
      <TableList
        rows={[
          { table: T(1, 'Table Ronde'), seated: 6 },
          { table: { ...T(2, 'Grande table', 10), shape: 'rectangle' }, seated: 0 },
        ]}
        selectedId={null}
        onEdit={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    const ronde = screen.getByRole('button', { name: /^Table Ronde/ })
    expect(ronde).toHaveTextContent('Ronde · 6/8 placés')
    expect(screen.getByRole('button', { name: /^Grande table/ })).toHaveTextContent(
      'Rectangulaire · 0/10 placés',
    )
  })

  it('renders nothing when there are no tables', () => {
    const { container } = render(
      <TableList rows={[]} selectedId={null} onEdit={vi.fn()} onRemove={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('row click edits, × button removes', () => {
    const onEdit = vi.fn()
    const onRemove = vi.fn()
    const table = T(1, 'Table Ronde')
    render(
      <TableList rows={[{ table, seated: 0 }]} selectedId={null} onEdit={onEdit} onRemove={onRemove} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^Table Ronde/ }))
    expect(onEdit).toHaveBeenCalledWith(table.id)

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer Table Ronde' }))
    expect(onRemove).toHaveBeenCalledWith(table.id)
  })
})
