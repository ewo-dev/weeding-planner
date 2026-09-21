import { detectConflicts } from '@/lib/engine'
import type { GenerationReport } from '@/lib/engine'
import type { Constraint, Guest, Plan, Table } from '@/types/plan'

// Pure derived-data helpers (docs/03-data-model.md § 5). Callers memoize
// expensive results via useMemo in the plan context (docs/02-architecture.md § 14).

/** Number of seated guests (one assignment per guest by invariant). */
export function seatedCount(plan: Plan): number {
  return plan.assignments.length
}

/** Guests that currently have no assignment. */
export function unseatedGuests(plan: Plan): Guest[] {
  const seated = new Set(plan.assignments.map((a) => a.guestId))
  return plan.guests.filter((g) => !seated.has(g.id))
}

/** tableId -> guests seated there, ordered by seatIndex. */
export function seatedGuestsByTable(plan: Plan): Map<string, Guest[]> {
  const byId = new Map(plan.guests.map((g) => [g.id, g] as const))
  const entries = new Map<string, Array<{ guest: Guest; seat: number }>>()
  for (const a of plan.assignments) {
    const guest = byId.get(a.guestId)
    if (!guest) continue
    const list = entries.get(a.tableId)
    if (list) list.push({ guest, seat: a.seatIndex })
    else entries.set(a.tableId, [{ guest, seat: a.seatIndex }])
  }
  const result = new Map<string, Guest[]>()
  for (const [tableId, list] of entries) {
    list.sort((x, y) => x.seat - y.seat)
    result.set(tableId, list.map((e) => e.guest))
  }
  return result
}

/** Live conflict report for the plan's current assignments (docs/10-interactions.md § 14). */
export function conflicts(plan: Plan): GenerationReport {
  return detectConflicts(plan)
}

export function guestById(plan: Plan, id: string): Guest | undefined {
  return plan.guests.find((g) => g.id === id)
}

export function tableById(plan: Plan, id: string): Table | undefined {
  return plan.tables.find((t) => t.id === id)
}

export function constraintsForGuest(plan: Plan, guestId: string): Constraint[] {
  return plan.constraints.filter((c) => c.a === guestId || c.b === guestId)
}