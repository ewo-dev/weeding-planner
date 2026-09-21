'use client'

import { usePlan } from '@/lib/plan/usePlan'
import { moveGuest, unseatGuest } from '@/lib/plan/actions'
import { guestById } from '@/lib/plan/selectors'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface MoveGuestSheetProps {
  /** Null = closed; otherwise the guest to place. */
  guestId: string | null
  onClose: () => void
}

/**
 * Action-based placement (docs/10-interactions.md § 5, docs/01-product.md
 * § 18): tap a guest, pick a table + empty seat from a large scrollable
 * list. No precise drag required — the mobile / touch-first path.
 * All mutations dispatch through context and stay undoable (§ 9).
 */
export function MoveGuestSheet({ guestId, onClose }: MoveGuestSheetProps) {
  const { plan, dispatch } = usePlan()
  const guest = guestId ? (guestById(plan, guestId) ?? null) : null

  if (!guest) return null

  const occupied = new Set(plan.assignments.map((a) => `${a.tableId}:${a.seatIndex}`))
  const targetId = guest.id
  const targetName = guest.name
  const current = plan.assignments.find((a) => a.guestId === targetId) ?? null

  function place(tableId: string, seatIndex: number): void {
    dispatch(moveGuest(targetId, tableId, seatIndex))
    onClose()
  }

  function unseat(): void {
    dispatch(unseatGuest(targetId))
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Placer ${targetName}`}>
      {plan.tables.length === 0 ? (
        <p className="text-sm text-text-muted">
          Aucune table pour l’instant. Ajoutez vos tables depuis l’onglet Tables, puis revenez ici.
        </p>
      ) : (
        <div className="space-y-4">
          {plan.tables.map((table) => {
            const empty: number[] = []
            for (let seatIndex = 0; seatIndex < table.capacity; seatIndex += 1) {
              if (!occupied.has(`${table.id}:${seatIndex}`)) empty.push(seatIndex)
            }
            const seated = table.capacity - empty.length
            return (
              <section key={table.id} aria-label={table.name}>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold text-text">{table.name}</h3>
                  <span className="shrink-0 text-xs text-text-muted">
                    {seated}/{table.capacity}
                  </span>
                </div>
                {empty.length === 0 ? (
                  <p className="mt-1 text-xs text-text-muted">Complète</p>
                ) : (
                  <ul className="mt-2 grid grid-cols-3 gap-2">
                    {empty.map((seatIndex) => (
                      <li key={seatIndex}>
                        <button
                          type="button"
                          onClick={() => place(table.id, seatIndex)}
                          className="flex min-h-[44px] w-full items-center justify-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-muted active:bg-surface-muted"
                        >
                          Place {seatIndex + 1}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
          {current && (
            <Button type="button" variant="secondary" onClick={unseat} className="w-full">
              Retirer de la table
            </Button>
          )}
        </div>
      )}
    </Modal>
  )
}
