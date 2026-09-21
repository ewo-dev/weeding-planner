import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import type { Guest } from '@/types/plan'
import { GuestChip } from './GuestChip'

const G = (n: number, name: string, group?: string): Guest => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  name,
  ...(group ? { group } : {}),
})

function renderChip(guest: Guest, variant: 'card' | 'seat') {
  return render(
    <DndContext>
      <GuestChip guest={guest} variant={variant} />
    </DndContext>,
  )
}

describe('GuestChip', () => {
  it('card shows the initial, the name and the group badge', () => {
    renderChip(G(1, 'Alice', 'Famille'), 'card')

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Famille')).toBeInTheDocument()
    // Initial dot (first letter, uppercased).
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('card omits the group badge when the guest has no group', () => {
    renderChip(G(1, 'Bob'), 'card')

    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.queryByText('Famille')).not.toBeInTheDocument()
  })

  it('seat renders the initial dot as an accessible button', () => {
    renderChip(G(1, 'marie'), 'seat')

    const button = screen.getByRole('button', { name: 'marie' })
    expect(button).toHaveTextContent('M')
  })
})
