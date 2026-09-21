import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import type { Guest } from '@/types/plan'
import { SeatSlot } from './SeatSlot'

const alice: Guest = { id: '00000000-0000-4000-8000-000000000001', name: 'Alice' }

function renderSlot(guest: Guest | null) {
  return render(
    <DndContext>
      <SeatSlot tableId="t1" tableName="Table 1" seatIndex={2} guest={guest} />
    </DndContext>,
  )
}

describe('SeatSlot', () => {
  it('labels an empty seat (1-based number for humans)', () => {
    renderSlot(null)

    expect(screen.getByLabelText('Place 3 de Table 1, vide')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('labels an occupied seat and renders the guest chip', () => {
    renderSlot(alice)

    expect(screen.getByLabelText('Place 3 de Table 1, Alice')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alice' })).toBeInTheDocument()
  })
})
