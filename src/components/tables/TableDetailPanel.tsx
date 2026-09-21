'use client'

import { useState } from 'react'
import { usePlan } from '@/lib/plan/usePlan'
import { unseatGuest } from '@/lib/plan/actions'
import { guestById, tableById } from '@/lib/plan/selectors'
import { MoveGuestSheet } from '@/components/guests/MoveGuestSheet'
import { Button } from '@/components/ui/Button'
import { SHAPE_LABELS } from './tables'
import { AddGuestSheet } from './AddGuestSheet'
import { TableConfigSheet } from './TableConfigSheet'

interface TableDetailContentProps {
  tableId: string
  onClose: () => void
}

/**
 * Shared body of the table detail view (roadmap step 15): name, shape,
 * capacity, occupancy, seated guests with seat numbers, empty seats, and
 * per-guest actions (retirer / déplacer). All mutations dispatch through
 * context and stay undoable (docs/10-interactions.md § 9). Rendered inline
 * by `TableDetailPanel` (desktop) and as a bottom sheet by
 * `TableDetailSheet` (mobile).
 */
export function TableDetailContent({ tableId, onClose }: TableDetailContentProps) {
  const { plan, dispatch } = usePlan()
  const [moveGuestId, setMoveGuestId] = useState<string | null>(null)
  const [addingGuest, setAddingGuest] = useState(false)
  const [configuring, setConfiguring] = useState(false)

  const table = tableById(plan, tableId)
  if (!table) return null

  const seated = plan.assignments
    .filter((a) => a.tableId === table.id)
    .sort((x, y) => x.seatIndex - y.seatIndex)
  const occupiedSeats = new Set(seated.map((a) => a.seatIndex))
  const emptySeats: number[] = []
  for (let seatIndex = 0; seatIndex < table.capacity; seatIndex += 1) {
    if (!occupiedSeats.has(seatIndex)) emptySeats.push(seatIndex)
  }
  const full = seated.length >= table.capacity
  const takenNames = plan.tables.filter((t) => t.id !== table.id).map((t) => t.name)

  if (configuring) {
    return (
      <TableConfigSheet
        key={table.id}
        table={table}
        seated={seated.length}
        takenNames={takenNames}
        onClose={() => setConfiguring(false)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold text-text">{table.name}</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            {SHAPE_LABELS[table.shape]} · {seated.length}/{table.capacity} placés
          </p>
        </div>
        {full && (
          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-hover">
            Complète
          </span>
        )}
      </div>

      {seated.length === 0 ? (
        <p className="text-sm text-text-muted">Aucun invité placé à cette table.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {seated.map((assignment) => {
            const guest = guestById(plan, assignment.guestId)
            if (!guest) return null
            return (
              <li key={guest.id} className="flex min-h-[44px] items-center gap-2 bg-surface px-3 py-1.5">
                <span className="min-w-0 flex-1 truncate text-sm text-text">
                  <span className="font-medium">Place {assignment.seatIndex + 1}</span>
                  <span className="text-text-muted"> — {guest.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setMoveGuestId(guest.id)}
                  className="shrink-0 rounded-md px-2 py-2 text-xs font-medium text-brand hover:bg-brand-soft"
                >
                  Déplacer
                </button>
                <button
                  type="button"
                  onClick={() => dispatch(unseatGuest(guest.id))}
                  aria-label={`Retirer ${guest.name} de ${table.name}`}
                  className="shrink-0 rounded-md px-2 py-2 text-xs font-medium text-text-muted hover:bg-surface-muted hover:text-text"
                >
                  Retirer
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {emptySeats.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Places libres ({emptySeats.length})
          </h4>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {emptySeats.map((seatIndex) => (
              <li
                key={seatIndex}
                className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-text-muted"
              >
                Place {seatIndex + 1}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!full && (
          <Button type="button" onClick={() => setAddingGuest(true)}>
            Ajouter un invité
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={() => setConfiguring(true)}>
          Configurer
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Fermer
        </Button>
      </div>

      {moveGuestId && <MoveGuestSheet guestId={moveGuestId} onClose={() => setMoveGuestId(null)} />}
      {addingGuest && <AddGuestSheet tableId={table.id} onClose={() => setAddingGuest(false)} />}
    </div>
  )
}

interface TableDetailPanelProps {
  tableId: string
  onClose: () => void
}

/**
 * Desktop side panel for one table (roadmap step 15). Inline section used
 * inside the tables panel; the mobile bottom sheet lives in
 * `TableDetailSheet`. Renders nothing when the table no longer exists
 * (e.g. removed with the selection still set).
 */
export function TableDetailPanel({ tableId, onClose }: TableDetailPanelProps) {
  const { plan } = usePlan()
  if (!tableById(plan, tableId)) return null
  return (
    <section aria-label="Détails de la table" className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <TableDetailContent tableId={tableId} onClose={onClose} />
    </section>
  )
}
