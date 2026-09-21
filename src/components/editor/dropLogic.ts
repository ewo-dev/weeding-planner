import { moveGuest, unseatGuest, updateTable } from '@/lib/plan/actions'
import type { PlanAction } from '@/lib/plan/actions'
import { guestById, tableById } from '@/lib/plan/selectors'
import type { Plan } from '@/types/plan'
import { parseDndId } from './dnd'

// Pure drop resolution (docs/10-interactions.md § 6–7). SeatingEditor maps
// dnd-kit events to these functions; unit tests cover the matrix directly
// (jsdom cannot perform real pointer drags).

/**
 * Resolves a guest drop to a plan action. Returns null for no-ops
 * (unknown ids, occupied/out-of-range seats, dropping back onto the same
 * slot, unseating an already-unseated guest) — the ghost snaps back.
 * A `must_not_together` violation never blocks the move (the user stays in
 * control per docs/01-product.md § 11); conflict UI lands in step 11.
 */
export function resolveGuestDrop(plan: Plan, guestId: string, overId: string | null): PlanAction | null {
  if (overId === null) return null
  if (!guestById(plan, guestId)) return null
  const target = parseDndId(overId)

  if (target.kind === 'unseat') {
    const current = plan.assignments.find((a) => a.guestId === guestId)
    return current ? unseatGuest(guestId) : null
  }

  if (target.kind === 'seat') {
    const table = tableById(plan, target.tableId)
    if (!table) return null
    if (target.seatIndex < 0 || target.seatIndex >= table.capacity) return null
    const occupant = plan.assignments.find(
      (a) => a.tableId === target.tableId && a.seatIndex === target.seatIndex,
    )
    if (occupant) return null
    return moveGuest(guestId, target.tableId, target.seatIndex)
  }

  return null
}

/**
 * Identifies a snap-back reason for capacity feedback (docs/11-roadmap.md
 * step 19). Returns true when the over id resolves to a seat whose table
 * is already at capacity, so the caller can replace the silent snap-back
 * with an explicit toast. Anything else (unknown tables, no over,
 * different drop kinds) returns false.
 */
export function isFullTableDrop(plan: Plan, overId: string | null): boolean {
  if (overId === null) return false
  const target = parseDndId(overId)
  if (target.kind !== 'seat') return false
  const table = tableById(plan, target.tableId)
  if (!table) return false
  const seated = plan.assignments.filter((a) => a.tableId === table.id).length
  return seated >= table.capacity
}

/** Inset keeping dragged tables fully visible (docs/10-interactions.md § 7). */
export const WORKSPACE_INSET = 16

export interface TableDropPoint {
  x: number
  y: number
}

export interface TableDropBounds {
  width: number
  height: number
}

/**
 * Resolves a table drop to a position update. The point is already in
 * workspace coordinates; it is rounded and clamped to the bounds (16 px
 * inset). Returns null for unknown tables or unchanged positions so no
 * history entry is pushed. No grid snapping in MVP.
 */
export function resolveTableDrop(
  plan: Plan,
  tableId: string,
  point: TableDropPoint,
  bounds: TableDropBounds,
): PlanAction | null {
  const table = tableById(plan, tableId)
  if (!table) return null
  const maxX = Math.max(WORKSPACE_INSET, bounds.width - WORKSPACE_INSET)
  const maxY = Math.max(WORKSPACE_INSET, bounds.height - WORKSPACE_INSET)
  const x = Math.round(Math.min(Math.max(point.x, WORKSPACE_INSET), maxX))
  const y = Math.round(Math.min(Math.max(point.y, WORKSPACE_INSET), maxY))
  if (x === table.position.x && y === table.position.y) return null
  return updateTable(tableId, { position: { x, y } })
}
