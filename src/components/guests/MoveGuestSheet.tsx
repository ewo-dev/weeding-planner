'use client'

import { useState } from 'react'
import { usePlan } from '@/lib/plan/usePlan'
import { moveGuest, unseatGuest } from '@/lib/plan/actions'
import { guestById, tableById } from '@/lib/plan/selectors'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useMessages, format } from '@/lib/i18n'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MoveGuestSheetProps {
  /** Null = closed; otherwise the guest to place. */
  guestId: string | null
  /** Preselect a table (skips the table list step). */
  initialTableId?: string | null
  onClose: () => void
}

/**
 * Action-based placement (docs/10-interactions.md § 5, roadmap step 18):
 * list-driven flow "guest → table → seat" for touch screens. Step 1 lists
 * tables with occupancy; step 2 shows the chosen table's empty seats.
 * Tapping a seat dispatches `moveGuest` — three taps, no drag required.
 * All mutations dispatch through context and stay undoable (§ 9).
 */
export function MoveGuestSheet({ guestId, initialTableId = null, onClose }: MoveGuestSheetProps) {
  const { plan, dispatch } = usePlan()
  const t = useMessages()
  const [selectedTableId, setSelectedTableId] = useState<string | null>(initialTableId)
  const guest = guestId ? (guestById(plan, guestId) ?? null) : null

  if (!guest) return null

  const occupied = new Set(plan.assignments.map((a) => `${a.tableId}:${a.seatIndex}`))
  const targetId = guest.id
  const targetName = guest.name
  const current = plan.assignments.find((a) => a.guestId === targetId) ?? null
  const currentTable = current ? tableById(plan, current.tableId) : undefined

  function occupancy(tableId: string, capacity: number): number {
    let count = 0
    for (let seatIndex = 0; seatIndex < capacity; seatIndex += 1) {
      if (occupied.has(`${tableId}:${seatIndex}`)) count += 1
    }
    return count
  }

  function emptySeats(tableId: string, capacity: number): number[] {
    const empty: number[] = []
    for (let seatIndex = 0; seatIndex < capacity; seatIndex += 1) {
      if (!occupied.has(`${tableId}:${seatIndex}`)) empty.push(seatIndex)
    }
    return empty
  }

  function place(tableId: string, seatIndex: number): void {
    dispatch(moveGuest(targetId, tableId, seatIndex))
    onClose()
  }

  function unseat(): void {
    dispatch(unseatGuest(targetId))
    onClose()
  }

  if (plan.tables.length === 0) {
    return (
      <Modal open onClose={onClose} title={format(t.placement.title, { name: targetName })}>
        <p className="text-sm text-text-muted">
          {t.placement.noTables}
        </p>
      </Modal>
    )
  }

  const selectedTable = selectedTableId ? tableById(plan, selectedTableId) : undefined

  // Step 2 — empty seats of the chosen table.
  if (selectedTable) {
    const empty = emptySeats(selectedTable.id, selectedTable.capacity)
    const seated = selectedTable.capacity - empty.length
    return (
      <Modal open onClose={onClose} title={format(t.placement.title, { name: targetName })}>
        <div className="space-y-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSelectedTableId(null)}
            icon={<ChevronLeft className="h-4 w-4" />}
            className="min-h-[44px] self-start px-2"
          >
            {t.placement.allTables}
          </Button>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-text">{selectedTable.name}</h3>
            <span className="shrink-0 text-xs text-text-muted">
              {seated}/{selectedTable.capacity}
            </span>
          </div>
          {empty.length === 0 ? (
            <p className="text-sm text-text-muted">
              {t.placement.fullTable}
            </p>
          ) : (
            <>
              <Button
                type="button"
                onClick={() => place(selectedTable.id, empty[0])}
                className="min-h-[44px] w-full"
              >
                {format(t.placement.firstFree, { n: empty[0] + 1 })}
              </Button>
              <ul className="grid grid-cols-3 gap-2">
                {empty.map((seatIndex) => (
                  <li key={seatIndex}>
                    <button
                      type="button"
                      onClick={() => place(selectedTable.id, seatIndex)}
                      className="flex min-h-[44px] w-full items-center justify-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-muted active:bg-surface-muted"
                    >
                      {format(t.placement.seat, { n: seatIndex + 1 })}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {current && (
            <Button type="button" variant="secondary" onClick={unseat} className="w-full">
              {t.placement.removeFromTable}
            </Button>
          )}
        </div>
      </Modal>
    )
  }

  // Step 1 — tables with occupancy.
  return (
    <Modal open onClose={onClose} title={format(t.placement.title, { name: targetName })}>
      <div className="space-y-4">
        {currentTable && (
          <p className="text-xs text-text-muted">
            {format(t.placement.currentlyAt, { table: currentTable.name, n: (current?.seatIndex ?? 0) + 1 })}
          </p>
        )}
        <ul className="space-y-2">
          {plan.tables.map((table) => {
            const seated = occupancy(table.id, table.capacity)
            const full = seated >= table.capacity
            return (
              <li key={table.id}>
                <button
                  type="button"
                  disabled={full}
                  onClick={() => setSelectedTableId(table.id)}
                  aria-label={format(t.placement.tableAriaLabel, {
                    table: table.name,
                    seated,
                    capacity: table.capacity,
                    full: full ? t.placement.tableAriaFull : '',
                  })}
                  title={full ? t.placement.fullTableShort : undefined}
                  className="flex min-h-[44px] w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-muted active:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text">{table.name}</span>
                    <span className="block text-xs text-text-muted">
                      {seated}/{table.capacity}
                      {full ? ` · ${t.placement.fullBadge}` : ` ${t.placement.seatedSuffix}`}
                    </span>
                  </span>
                  {!full && <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" />}
                </button>
              </li>
            )
          })}
        </ul>
        {current && (
          <Button type="button" variant="secondary" onClick={unseat} className="w-full">
            {t.placement.removeFromTable}
          </Button>
        )}
      </div>
    </Modal>
  )
}
