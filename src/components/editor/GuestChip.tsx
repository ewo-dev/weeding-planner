'use client'

import { useDraggable } from '@dnd-kit/core'
import type { Guest } from '@/types/plan'
import { guestDragId } from './dnd'

export type GuestChipVariant = 'card' | 'seat'

interface GuestChipProps {
  guest: Guest
  variant: GuestChipVariant
  /** Tap handler (mobile tap-to-place). Drag still works: the 6-px pointer
   * activation keeps click intact when the pointer doesn't move. */
  onSelect?: (guestId: string) => void
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
export function GuestChip({ guest, variant, onSelect }: GuestChipProps) {
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
        onClick={() => onSelect?.(guest.id)}
        {...listeners}
        {...attributes}
        // 44-px touch target (docs/09-design-system.md § 15); the visible
        // place card is inset inside the target (docs/09 § 12 elevated look).
        className="flex h-11 w-11 touch-none items-center justify-center transition-transform active:scale-95"
      >
        <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[6px] border border-border-strong bg-linen shadow-sm">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[5px] border-b border-border bg-surface-muted/70"
          />
          <span className="relative -mt-px font-text-display text-sm font-semibold leading-none text-text">
            {initial}
          </span>
        </span>
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
