'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { Guest } from '@/types/plan'
import { seatDropId } from './dnd'
import { GuestChip } from './GuestChip'
import { MoveGuestSheet } from '@/components/guests/MoveGuestSheet'
import { useMessages, format } from '@/lib/i18n'

interface SeatSlotProps {
  tableId: string
  tableName: string
  seatIndex: number
  guest: Guest | null
}

/**
 * One seat (docs/07-components.md § 6): droppable slot with a stable
 * `seat:{tableId}:{n}` id. Touch target remains the 44px pad; the visual is a
 * **place card** (docs/09-design-system.md § 12 elevated look) instead of a
 * plain dot: a linen rounded square with the guest's initial and a hairline
 * fold, or a small outlined circle when the seat is empty.
 */
export function SeatSlot({ tableId, tableName, seatIndex, guest }: SeatSlotProps) {
  const t = useMessages()
  const { setNodeRef, isOver } = useDroppable({
    id: seatDropId(tableId, seatIndex),
    data: { kind: 'seat', tableId, seatIndex },
  })
  // Tap-to-place sheet for seated guests (docs/10-interactions.md § 5
  // mobile path). Local state: each filled slot owns its own sheet.
  const [moveGuestId, setMoveGuestId] = useState<string | null>(null)

  // Human-facing seat numbers are 1-based; the DnD id stays 0-based (§ 4).
  const label = format(t.editor.seatAriaLabel, {
    n: seatIndex + 1,
    table: tableName,
    state: guest ? guest.name : t.editor.seatEmpty,
  })

  const dropState = isOver ? 'bg-accent-soft ring-2 ring-accent/30 rounded-lg' : ''

  return (
    <div
      ref={setNodeRef}
      role="group"
      aria-label={label}
      data-over={isOver || undefined}
      className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors motion-safe:transition-colors ${dropState}`}
    >
      {guest ? (
        <>
          <GuestChip guest={guest} variant="seat" onSelect={setMoveGuestId} />
          {moveGuestId && <MoveGuestSheet guestId={moveGuestId} onClose={() => setMoveGuestId(null)} />}
        </>
      ) : (
        <span aria-hidden="true" className="block h-3 w-3 rounded-full border-2 border-border-strong bg-linen" />
      )}
    </div>
  )
}
