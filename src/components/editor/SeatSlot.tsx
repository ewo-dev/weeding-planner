'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { Guest } from '@/types/plan'
import { seatDropId } from './dnd'
import { GuestChip } from './GuestChip'
import { MoveGuestSheet } from '@/components/guests/MoveGuestSheet'

interface SeatSlotProps {
  tableId: string
  tableName: string
  seatIndex: number
  guest: Guest | null
}

/**
 * One seat (docs/07-components.md § 6): droppable slot with a stable
 * `seat:{tableId}:{n}` id. The slot is a 44 px touch target
 * (docs/09-design-system.md § 15); the empty-seat visual stays a small
 * outlined circle centered inside it (docs/09-design-system.md § 12).
 * Filled seats render the guest's initial dot, itself draggable for
 * seat-to-seat moves.
 */
export function SeatSlot({ tableId, tableName, seatIndex, guest }: SeatSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: seatDropId(tableId, seatIndex),
    data: { kind: 'seat', tableId, seatIndex },
  })
  // Tap-to-place sheet for seated guests (docs/10-interactions.md § 5
  // mobile path). Local state: each filled slot owns its own sheet.
  const [moveGuestId, setMoveGuestId] = useState<string | null>(null)

  // Human-facing seat numbers are 1-based; the DnD id stays 0-based (§ 4).
  const label = `Place ${seatIndex + 1} de ${tableName}, ${guest ? guest.name : 'vide'}`

  return (
    <div
      ref={setNodeRef}
      role="group"
      aria-label={label}
      data-over={isOver || undefined}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors motion-safe:transition-colors ${
        isOver ? 'bg-brand-soft ring-2 ring-brand' : ''
      }`}
    >
      {guest ? (
        <>
          <GuestChip guest={guest} variant="seat" onSelect={setMoveGuestId} />
          {moveGuestId && <MoveGuestSheet guestId={moveGuestId} onClose={() => setMoveGuestId(null)} />}
        </>
      ) : (
        <span aria-hidden="true" className="block h-3 w-3 rounded-full border-2 border-border bg-surface" />
      )}
    </div>
  )
}
