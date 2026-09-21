import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Guest } from '@/types/plan'
import { GuestList } from './GuestList'

const G = (n: number, name: string): Guest => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  name,
})

describe('GuestList', () => {
  it('renders Unseated / Seated sections with counts and hides empty sections', () => {
    const onEdit = vi.fn()
    const onRemove = vi.fn()
    render(
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
  })

  it('renders nothing when both sections are empty', () => {
    const { container } = render(
      <GuestList unseated={[]} seated={[]} selectedId={null} onEdit={vi.fn()} onRemove={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('row click edits, × button removes', () => {
    const onEdit = vi.fn()
    const onRemove = vi.fn()
    const carol = G(1, 'Carol')
    render(
      <GuestList
        unseated={[carol]}
        seated={[]}
        selectedId={null}
        onEdit={onEdit}
        onRemove={onRemove}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^Carol/ }))
    expect(onEdit).toHaveBeenCalledWith(carol.id)

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer Carol' }))
    expect(onRemove).toHaveBeenCalledWith(carol.id)
  })
})
