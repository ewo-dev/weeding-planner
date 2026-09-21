import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import type { Guest } from '@/types/plan'
import { GuestList } from './GuestList'

const G = (n: number, name: string): Guest => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  name,
})

// Rows are drag sources and the list is the unseat dropzone, so every render
// needs a DndContext ancestor (provided by SeatingEditor in production).
function renderList(children: ReactNode) {
  return render(<DndContext>{children}</DndContext>)
}

function listProps() {
  return { selectedId: null, onEdit: vi.fn(), onRemove: vi.fn() }
}

describe('GuestList', () => {
  it('renders Unseated / Seated sections with counts and hides empty sections', () => {
    const onEdit = vi.fn()
    const onRemove = vi.fn()
    renderList(
      <GuestList
        unseated={[G(1, 'Carol')]}
        seated={[{ guest: G(2, 'Alice'), tableName: 'Table 1' }]}
        selectedId={null}
        onEdit={onEdit}
        onRemove={onRemove}
      />,
    )

    expect(screen.getByText('Non placés (1)')).toBeInTheDocument()
    expect(screen.getByText('Placés (1)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Carol/ })).toBeInTheDocument()
    const aliceRow = screen.getByRole('button', { name: /^Alice/ })
    expect(aliceRow).toHaveTextContent('Table 1')
    // The list doubles as the unseat dropzone.
    expect(screen.getByTestId('unseat-dropzone')).toBeInTheDocument()
  })

  it('renders just the (empty) dropzone when both sections are empty', () => {
    renderList(<GuestList unseated={[]} seated={[]} {...listProps()} />)

    expect(screen.queryByText(/placés \(\d+\)/)).not.toBeInTheDocument()
    expect(screen.getByTestId('unseat-dropzone')).toBeInTheDocument()
  })

  it('row click edits, × button removes', () => {
    const onEdit = vi.fn()
    const onRemove = vi.fn()
    const carol = G(1, 'Carol')
    renderList(
      <GuestList unseated={[carol]} seated={[]} selectedId={null} onEdit={onEdit} onRemove={onRemove} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^Carol/ }))
    expect(onEdit).toHaveBeenCalledWith(carol.id)

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer Carol' }))
    expect(onRemove).toHaveBeenCalledWith(carol.id)
  })
})
