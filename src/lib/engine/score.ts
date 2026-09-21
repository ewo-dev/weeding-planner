import type { Assignment, Plan } from '@/types/plan'

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`
}

/**
 * Pure scoring of a plan plus an assignment set, per `04-seating-engine.md` § 5.
 *
 * score = 100 * mandatorySatisfied + 10 * preferenceSatisfied
 *         - 1000 * separationViolations - 1 * spreadPenalty
 *
 * Pairs are treated as unordered and deduped, so each constraint contributes at
 * most once. Pairs whose members are unseated are not counted at all.
 */
export function scorePlan(plan: Plan, assignments: readonly Assignment[]): number {
  const guestToTable = new Map<string, string>()
  for (const a of assignments) guestToTable.set(a.guestId, a.tableId)

  const seenMust = new Set<string>()
  const seenPrefer = new Set<string>()
  const seenSeparation = new Set<string>()
  let mandatorySatisfied = 0
  let preferenceSatisfied = 0
  let separationViolations = 0

  for (const c of plan.constraints) {
    const key = pairKey(c.a, c.b)
    const tableA = guestToTable.get(c.a)
    const tableB = guestToTable.get(c.b)
    if (tableA === undefined || tableB === undefined) continue // unseated: not counted
    const together = tableA === tableB

    if (c.kind === 'must_together') {
      if (seenMust.has(key)) continue
      seenMust.add(key)
      if (together) mandatorySatisfied++
    } else if (c.kind === 'prefer_together') {
      if (seenPrefer.has(key)) continue
      seenPrefer.add(key)
      if (together) preferenceSatisfied++
    } else {
      if (seenSeparation.has(key)) continue
      seenSeparation.add(key)
      if (together) separationViolations++
    }
  }

  // Spread penalty: sum over tables of |seatsUsed - average|, where a table
  // with zero seated guests contributes |0 - average|.
  const seatsUsed = new Map<string, number>()
  for (const a of assignments) seatsUsed.set(a.tableId, (seatsUsed.get(a.tableId) ?? 0) + 1)

  const tableCount = plan.tables.length
  let totalSeated = 0
  for (const t of plan.tables) totalSeated += seatsUsed.get(t.id) ?? 0

  let spreadPenalty = 0
  if (tableCount > 0 && totalSeated > 0) {
    const average = totalSeated / tableCount
    for (const t of plan.tables) {
      spreadPenalty += Math.abs((seatsUsed.get(t.id) ?? 0) - average)
    }
  }

  return (
    100 * mandatorySatisfied +
    10 * preferenceSatisfied -
    1000 * separationViolations -
    spreadPenalty
  )
}