'use client'

import type { Assignment, Guest, Table } from '@/types/plan'
import { SHAPE_LABELS } from '@/components/tables/tables'

interface PrintTableProps {
  table: Table
  guests: Guest[]
  assignments: Assignment[]
}

/**
 * One table in the print view (docs/06-routing-and-pages.md § 7). Guests are
 * resolved and ordered by seat index; unknown ids degrade to a placeholder
 * instead of crashing the printout.
 */
export function PrintTable({ table, guests, assignments }: PrintTableProps) {
  const seatedNames = assignments
    .filter((a) => a.tableId === table.id)
    .sort((x, y) => x.seatIndex - y.seatIndex)
    .map((a) => guests.find((g) => g.id === a.guestId)?.name ?? '(invité inconnu)')
  const free = table.capacity - seatedNames.length

  return (
    <section aria-label={table.name} className="break-inside-avoid rounded-xl border border-border bg-surface p-4 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-text">{table.name}</h2>
      <p className="mt-0.5 text-sm text-text-muted">
        {SHAPE_LABELS[table.shape]} · {seatedNames.length}/{table.capacity} places occupées
      </p>
      {seatedNames.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">Aucun invité placé.</p>
      ) : (
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-text">
          {seatedNames.map((name, index) => (
            // Seat order is the list order; names can repeat so index keys it.
            <li key={`${name}-${index}`}>{name}</li>
          ))}
        </ol>
      )}
      {free > 0 && seatedNames.length > 0 && (
        <p className="mt-2 text-sm text-text-muted">
          {free === 1 ? '1 place libre.' : `${free} places libres.`}
        </p>
      )}
    </section>
  )
}
