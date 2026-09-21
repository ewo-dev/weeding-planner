'use client'

import { useDraggable } from '@dnd-kit/core'
import type { Guest } from '@/types/plan'
import { guestDragId } from './dnd'

export type GuestChipVariant = 'card' | 'seat'

interface GuestChipProps {
  guest: Guest
  variant: GuestChipVariant
}

/**
 * Draggable guest chip (docs/07-components.md § 6). Two presentations:
 * - `card`: initial dot + name + group badge (drag overlay).
 * - `seat`: initial dot only (filled seat slot, docs/09-design-system.md § 12).
 *
 * The side-panel list intentionally does NOT use this chip: `GuestRow`'s own
 * button is the draggable there, so each row keeps a single tab stop for
 * both click-to-select and Space-to-drag.
 *
 * The drag source stays in place visually; the ghost follows the pointer
 * (docs/10-interactions.md § 6), so `isDragging` intentionally changes
 * nothing here. `touch-none` lets pointer drags start on touch without the
 * browser stealing the gesture for scrolling.
 */
export function GuestChip({ guest, variant }: GuestChipProps) {
  const { setNodeRef, listeners, attributes } = useDraggable({
    id: guestDragId(guest.id),
    data: { kind: 'guest', guestId: guest.id },
  })

  const initial = guest.name.trim().charAt(0).toUpperCase() || '?'

  if (variant === 'seat') {
    return (
      <button
        ref={setNodeRef}
        type="button"
        title={guest.name}
        aria-label={guest.name}
        {...listeners}
        {...attributes}
        className="flex h-11 w-11 touch-none items-center justify-center rounded-full bg-brand text-sm font-semibold text-text-inverse shadow-sm transition-transform active:scale-95"
      >
        {initial}
      </button>
    )
  }

  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="flex touch-none items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 shadow-sm"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-text-inverse">
        {initial}
      </span>
      <span className="truncate text-sm font-medium text-text">{guest.name}</span>
      {guest.group && (
        <span className="truncate rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-hover">
          {guest.group}
        </span>
      )}
    </span>
  )
}
