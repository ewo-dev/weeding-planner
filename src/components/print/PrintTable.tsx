'use client'

import type { Assignment, Guest, Table } from '@/types/plan'
import { SHAPE_LABELS } from '@/components/tables/tables'
import { fr, useMessages, format } from '@/lib/i18n'

interface PrintTableProps {
  table: Table
  guests: Guest[]
  assignments: Assignment[]
}

interface SeatRow {
  seatIndex: number
  /** Truthy: known guest name or unknown placeholder. */
  guestName: string | null
  /** True when the seat has no assignment at all. */
  empty: boolean
}

const UNKNOWN_GUEST = fr.print.unknownGuest

/**
 * One table in the print view (docs/06-routing-and-pages.md § 7,
 * docs/11-roadmap.md step 20). Shows the table name, shape, occupancy,
 * every seat in order with the seated guest's name (or "Place libre"
 * for empty seats). `break-inside-avoid` keeps a table block on a
 * single page in print preview.
 */
export function PrintTable({ table, guests, assignments }: PrintTableProps) {
  const t = useMessages()
  const byGuest = new Map(guests.map((g) => [g.id, g.name] as const))
  const rows: SeatRow[] = Array.from({ length: table.capacity }, (_, seatIndex) => {
    const assignment = assignments.find((a) => a.tableId === table.id && a.seatIndex === seatIndex)
    if (!assignment) return { seatIndex, guestName: null, empty: true }
    const knownName = byGuest.get(assignment.guestId)
    return { seatIndex, guestName: knownName ?? UNKNOWN_GUEST, empty: false }
  })
  const seated = rows.filter((row) => !row.empty).length
  const occupancyLabel = `${seated} / ${table.capacity}`
  const allEmpty = rows.every((row) => row.empty)

  return (
    <section aria-label={table.name} className="break-inside-avoid rounded-xl border border-border bg-surface p-4 shadow-sm">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-text">{table.name}</h2>
        <span className="shrink-0 text-xs text-text-muted">{occupancyLabel}</span>
      </header>
      <p className="mt-0.5 text-xs text-text-muted">{SHAPE_LABELS[table.shape]}</p>
      {allEmpty ? (
        <p className="mt-2 text-sm text-text-muted">{t.print.noneSeated}</p>
      ) : (
        <ol className="mt-2 space-y-0.5 text-sm text-text">
          {rows.map((row) => (
            <li key={row.seatIndex} className="flex items-baseline gap-2">
              <span className="w-14 shrink-0 text-xs text-text-muted">{format(t.print.placeLabel, { n: row.seatIndex + 1 })}</span>
              <span className="min-w-0 truncate">
                {row.empty ? (
                  <span className="italic text-text-muted">{t.print.freeSeat}</span>
                ) : (
                  row.guestName
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
