import type { Plan } from '@/types/plan'
import type { ConstraintRef, GenerationReport } from './types'

function pairKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`
}

/**
 * Pure conflict report for a plan's existing `assignments`. Used by the UI to
 * refresh the report after manual edits. Same shape as `generateSeating`'s
 * report, with `durationMs` fixed to 0.
 */
export function detectConflicts(plan: Plan): GenerationReport {
  const guestToTable = new Map<string, string>()
  for (const a of plan.assignments) guestToTable.set(a.guestId, a.tableId)

  const seatedGuests = guestToTable.size
  const unseatedGuests = Math.max(0, plan.guests.length - seatedGuests)
  const totalCapacity = plan.tables.reduce((sum, t) => sum + t.capacity, 0)
  const overflow = plan.guests.length > totalCapacity

  const mandatorySatisfied: ConstraintRef[] = []
  const mandatoryUnsatisfied: ConstraintRef[] = []
  const preferenceSatisfied: ConstraintRef[] = []
  const preferenceUnsatisfied: ConstraintRef[] = []
  const separationViolations: ConstraintRef[] = []

  const sortedConstraints = [...plan.constraints].sort((x, y) =>
    x.id < y.id ? -1 : x.id > y.id ? 1 : 0,
  )
  const seen = new Set<string>()
  for (const c of sortedConstraints) {
    const a = c.a < c.b ? c.a : c.b
    const b = c.a < c.b ? c.b : c.a
    const key = `${c.kind}\u0000${pairKey(a, b)}`
    if (seen.has(key)) continue
    seen.add(key)

    const ref: ConstraintRef = { constraintId: c.id, a, b }
    const tableA = guestToTable.get(c.a)
    const tableB = guestToTable.get(c.b)
    const together = tableA !== undefined && tableB !== undefined && tableA === tableB

    if (c.kind === 'must_together') {
      if (together) mandatorySatisfied.push(ref)
      else mandatoryUnsatisfied.push(ref)
    } else if (c.kind === 'prefer_together') {
      if (together) preferenceSatisfied.push(ref)
      else preferenceUnsatisfied.push(ref)
    } else if (together) {
      separationViolations.push(ref)
    }
  }

  return {
    mandatorySatisfied,
    mandatoryUnsatisfied,
    preferenceSatisfied,
    preferenceUnsatisfied,
    separationViolations,
    seatedGuests,
    unseatedGuests,
    overflow,
    durationMs: 0,
  }
}