'use client'

import { useDraggable } from '@dnd-kit/core'
import type { Guest } from '@/types/plan'
import { guestDragId } from '@/components/editor/dnd'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { ArrowRightLeft, X } from 'lucide-react'

interface GuestRowProps {
  guest: Guest
  tableName: string | null
  selected: boolean
  /** Mandatory placement conflict involving this guest (§ 14 badge). */
  hasConflict: boolean
  onEdit: (guestId: string) => void
  onRemove: (guestId: string) => void
  /** Tap-to-place sheet (docs/10-interactions.md § 5 mobile path). */
  onMove: (guestId: string) => void
}

/**
 * One guest row (docs/07-components.md § 7). Clicking the row selects the
 * guest and opens the editor; the × button removes (confirmation is owned by
 * the parent per docs/10-interactions.md § 12).
 *
 * The row button doubles as the guest drag source (`guest:{id}`): the 6-px
 * pointer activation keeps click-to-select intact, and keyboard users get one
 * tab stop (Enter edits, Space drags). Requires a `<DndContext>` ancestor —
 * provided by `<SeatingEditor>`.
 */
export function GuestRow({ guest, tableName, selected, hasConflict, onEdit, onRemove, onMove }: GuestRowProps) {
  const { setNodeRef, listeners, attributes } = useDraggable({
    id: guestDragId(guest.id),
    data: { kind: 'guest', guestId: guest.id },
  })

  const initial = guest.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <li
      className={`group flex items-center gap-1 rounded-lg border border-transparent transition-colors ${
        selected ? 'bg-brand-soft border-brand/20' : 'hover:bg-surface-muted hover:border-border'
      }`}
    >
      {/* touch-pan-y: vertical list scrolling stays native on touch; a
          horizontal move still activates the 6-px PointerSensor drag. */}
      <button
        ref={setNodeRef}
        type="button"
        onClick={() => onEdit(guest.id)}
        {...listeners}
        {...attributes}
        aria-pressed={selected}
        className="flex min-h-[48px] min-w-0 flex-1 touch-pan-y items-center gap-3 px-3 py-1.5 text-left"
      >
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface border border-border text-sm font-semibold text-text">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-text">{guest.name}</span>
          {(guest.group ?? tableName) && (
            <span className="block truncate text-xs text-text-muted">
              {[guest.group, tableName].filter(Boolean).join(' · ')}
            </span>
          )}
        </span>
      </button>
      {hasConflict && (
        <span
          role="img"
          aria-label={`Conflit de placement pour ${guest.name}`}
          title="Conflit de placement — voir les contraintes"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-danger text-xs font-bold text-white"
        >
          !
        </span>
      )}
      {tableName === null ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onMove(guest.id)}
          aria-label={`Placer ${guest.name}`}
          title={`Placer ${guest.name}`}
          className="min-h-[44px] shrink-0"
        >
          Placer
        </Button>
      ) : (
        <IconButton
          type="button"
          onClick={() => onMove(guest.id)}
          label={`Déplacer ${guest.name}`}
          title={`Déplacer ${guest.name}`}
          icon={<ArrowRightLeft className="h-5 w-5" />}
        />
      )}
      <IconButton
        type="button"
        onClick={() => onRemove(guest.id)}
        label={`Supprimer ${guest.name}`}
        title={`Supprimer ${guest.name}`}
        icon={<X className="h-5 w-5" />}
        className="opacity-100 transition-opacity group-hover:opacity-100 sm:opacity-0 sm:focus:opacity-100 sm:focus-visible:opacity-100"
      />
    </li>
  )
}
