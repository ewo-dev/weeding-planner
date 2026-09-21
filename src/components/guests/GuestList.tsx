'use client'

import type { Guest } from '@/types/plan'
import { GuestRow } from './GuestRow'

export interface SeatedGuest {
  guest: Guest
  tableName: string | null
}

interface GuestListProps {
  unseated: Guest[]
  seated: SeatedGuest[]
  selectedId: string | null
  onEdit: (guestId: string) => void
  onRemove: (guestId: string) => void
}

/**
 * Guest list split into Unseated / Seated sections (docs/07-components.md
 * § 7). Empty sections are hidden; the parent owns the fully-empty and
 * no-result states. Returns null when there is nothing to show.
 */
export function GuestList({ unseated, seated, selectedId, onEdit, onRemove }: GuestListProps) {
  if (unseated.length === 0 && seated.length === 0) return null

  const sectionTitle = 'text-xs font-semibold uppercase tracking-wide text-text-muted'

  return (
    <div className="space-y-4">
      {unseated.length > 0 && (
        <section aria-label="Non placés">
          <h3 className={sectionTitle}>Non placés ({unseated.length})</h3>
          <ul className="mt-1">
            {unseated.map((guest) => (
              <GuestRow
                key={guest.id}
                guest={guest}
                tableName={null}
                selected={guest.id === selectedId}
                onEdit={onEdit}
                onRemove={onRemove}
              />
            ))}
          </ul>
        </section>
      )}

      {seated.length > 0 && (
        <section aria-label="Placés">
          <h3 className={sectionTitle}>Placés ({seated.length})</h3>
          <ul className="mt-1">
            {seated.map(({ guest, tableName }) => (
              <GuestRow
                key={guest.id}
                guest={guest}
                tableName={tableName}
                selected={guest.id === selectedId}
                onEdit={onEdit}
                onRemove={onRemove}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
