'use client'

import { useDroppable } from '@dnd-kit/core'
import type { Guest } from '@/types/plan'
import { UNSEAT_DROP_ID } from '@/components/editor/dnd'
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
 * no-result states.
 *
 * The whole list is the `seat:unseat` dropzone (docs/10-interactions.md
 * § 3.1): dropping a seated guest here unseats them. The wrapper always
 * renders so the dropzone exists even with an empty list. Requires a
 * `<DndContext>` ancestor — provided by `<SeatingEditor>`.
 */
export function GuestList({ unseated, seated, selectedId, onEdit, onRemove }: GuestListProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: UNSEAT_DROP_ID,
    data: { kind: 'unseat' },
  })

  const sectionTitle = 'text-xs font-semibold uppercase tracking-wide text-text-muted'

  return (
    <div
      ref={setNodeRef}
      data-testid="unseat-dropzone"
      className={`space-y-4 rounded-lg transition-colors ${isOver ? 'bg-brand-soft ring-2 ring-brand' : ''}`}
    >
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
