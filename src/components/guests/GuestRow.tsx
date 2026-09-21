'use client'

import type { Guest } from '@/types/plan'

interface GuestRowProps {
  guest: Guest
  tableName: string | null
  selected: boolean
  onEdit: (guestId: string) => void
  onRemove: (guestId: string) => void
}

/**
 * One guest row (docs/07-components.md § 7). Clicking the row selects the
 * guest and opens the editor; the × button removes (confirmation is owned by
 * the parent per docs/10-interactions.md § 12).
 */
export function GuestRow({ guest, tableName, selected, onEdit, onRemove }: GuestRowProps) {
  return (
    <li
      className={`flex items-center gap-1 rounded ${
        selected ? 'bg-brand-soft' : 'hover:bg-surface'
      }`}
    >
      <button
        type="button"
        onClick={() => onEdit(guest.id)}
        aria-pressed={selected}
        className="min-w-0 flex-1 px-3 py-2.5 text-left"
      >
        <span className="block truncate text-sm font-medium text-text">{guest.name}</span>
        {(guest.group ?? tableName) && (
          <span className="block truncate text-xs text-text-muted">
            {[guest.group, tableName].filter(Boolean).join(' · ')}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onRemove(guest.id)}
        aria-label={`Supprimer ${guest.name}`}
        title={`Supprimer ${guest.name}`}
        className="shrink-0 px-3 py-2.5 text-base leading-none text-text-muted transition-colors hover:text-danger"
      >
        ×
      </button>
    </li>
  )
}
