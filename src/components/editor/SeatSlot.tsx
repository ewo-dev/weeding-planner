'use client'

import { useDroppable } from '@dnd-kit/core'
import type { Guest } from '@/types/plan'
import { seatDropId } from './dnd'
import { GuestChip } from './GuestChip'

interface SeatSlotProps {
  tableId: string
  tableName: string
  seatIndex: number
  guest: Guest | null
}

/**
 * One seat (docs/07-components.md § 6): droppable slot with a stable
 * `seat:{tableId}:{n}` id. Empty seats render a 12-px-outlined-style circle
 * (sized up to 32 px for the 44-px-adjacent touch target baseline —
 * docs/09-design-system.md § 12 vs § 15); filled seats render the guest's
 * initial dot, itself draggable for seat-to-seat moves.
 */
export function SeatSlot({ tableId, tableName, seatIndex, guest }: SeatSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: seatDropId(tableId, seatIndex),
    data: { kind: 'seat', tableId, seatIndex },
  })

  // Human-facing seat numbers are 1-based; the DnD id stays 0-based (§ 4).
  const label = `Place ${seatIndex + 1} de ${tableName}, ${guest ? guest.name : 'vide'}`

  return (
    <div
      ref={setNodeRef}
      aria-label={label}
      data-over={isOver || undefined}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
        isOver ? 'bg-brand-soft ring-2 ring-brand' : ''
      }`}
    >
      {guest ? (
        <GuestChip guest={guest} variant="seat" />
      ) : (
        <span aria-hidden="true" className="block h-3 w-3 rounded-full border-2 border-border" />
      )}
    </div>
  )
}
