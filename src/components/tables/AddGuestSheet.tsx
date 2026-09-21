'use client'

import { useState } from 'react'
import { usePlan } from '@/lib/plan/usePlan'
import { moveGuest } from '@/lib/plan/actions'
import { guestById, tableById, unseatedGuests } from '@/lib/plan/selectors'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ChevronLeft } from 'lucide-react'

interface AddGuestSheetProps {
  /** The table receiving the guest. Null = closed. */
  tableId: string
  onClose: () => void
}

const collator = new Intl.Collator('fr', { sensitivity: 'base' })

/**
 * Table-first placement flow (roadmap step 18): from a table detail view,
 * "Ajouter un invité" lists unseated guests, then the table's empty seats.
 * Tapping a seat dispatches `moveGuest`, undoable like every other mutation
 * (docs/10-interactions.md § 9).
 */
export function AddGuestSheet({ tableId, onClose }: AddGuestSheetProps) {
  const { plan, dispatch } = usePlan()
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null)

  const table = tableById(plan, tableId)
  if (!table) return null

  const occupied = new Set(plan.assignments.map((a) => `${a.tableId}:${a.seatIndex}`))
  const empty: number[] = []
  for (let seatIndex = 0; seatIndex < table.capacity; seatIndex += 1) {
    if (!occupied.has(`${table.id}:${seatIndex}`)) empty.push(seatIndex)
  }
  const seated = table.capacity - empty.length

  function place(guestId: string, seatIndex: number): void {
    dispatch(moveGuest(guestId, table!.id, seatIndex))
    onClose()
  }

  if (empty.length === 0) {
    return (
      <Modal open onClose={onClose} title={`Ajouter à ${table.name}`}>
        <p className="text-sm text-text-muted">
          Cette table est complète. Retirez un invité ou augmentez la capacité.
        </p>
      </Modal>
    )
  }

  const selectedGuest = selectedGuestId ? guestById(plan, selectedGuestId) : undefined

  // Step 2 — empty seats for the chosen guest (table is fixed).
  if (selectedGuest) {
    return (
      <Modal open onClose={onClose} title={`Placer ${selectedGuest.name}`}>
        <div className="space-y-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSelectedGuestId(null)}
            icon={<ChevronLeft className="h-4 w-4" />}
            className="min-h-[44px] self-start px-2"
          >
            Tous les invités
          </Button>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-text">{table.name}</h3>
            <span className="shrink-0 text-xs text-text-muted">
              {seated}/{table.capacity}
            </span>
          </div>
          <Button
            type="button"
            onClick={() => place(selectedGuest.id, empty[0])}
            className="min-h-[44px] w-full"
          >
            Placer à la première place libre (Place {empty[0] + 1})
          </Button>
          <ul className="grid grid-cols-3 gap-2">
            {empty.map((seatIndex) => (
              <li key={seatIndex}>
                <button
                  type="button"
                  onClick={() => place(selectedGuest.id, seatIndex)}
                  className="flex min-h-[44px] w-full items-center justify-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-muted active:bg-surface-muted"
                >
                  Place {seatIndex + 1}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    )
  }

  // Step 1 — unseated guests.
  const candidates = unseatedGuests(plan).sort((a, b) => collator.compare(a.name, b.name))

  return (
    <Modal open onClose={onClose} title={`Ajouter à ${table.name}`}>
      {candidates.length === 0 ? (
        <p className="text-sm text-text-muted">Tous les invités sont déjà placés.</p>
      ) : (
        <ul className="space-y-2">
          {candidates.map((guest) => (
            <li key={guest.id}>
              <button
                type="button"
                onClick={() => setSelectedGuestId(guest.id)}
                aria-label={`Placer ${guest.name} à ${table.name}`}
                className="flex min-h-[44px] w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-muted active:bg-surface-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text">{guest.name}</span>
                  {guest.group && (
                    <span className="block truncate text-xs text-text-muted">{guest.group}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
