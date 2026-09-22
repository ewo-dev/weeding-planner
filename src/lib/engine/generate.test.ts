import { describe, expect, it } from 'vitest'
import type { Assignment, Plan } from '@/types/plan'
import { detectConflicts } from './conflicts'
import { EngineError } from './errors'
import {
  constraint,
  contradictoryPlan,
  emptyPlan,
  guest,
  largeBenchmarkPlan,
  meta,
  mustTogetherPlan,
  oversizedClusterPlan,
  preferTogetherPlan,
  simpleTwoTablesPlan,
  singleTablePlan,
  table,
} from './__fixtures__'
import { generateSeating } from './generate'
import { scorePlan } from './score'

function guestId(plan: Plan, name: string): string {
  const found = plan.guests.find((g) => g.name === name)
  if (!found) throw new Error(`no guest named ${name}`)
  return found.id
}

function tableOf(assignments: readonly Assignment[], id: string): string | undefined {
  return assignments.find((a) => a.guestId === id)?.tableId
}

function guestToTable(assignments: readonly Assignment[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const a of assignments) map[a.guestId] = a.tableId
  return map
}

describe('generateSeating', () => {
  it('satisfies mandatory constraints whenever feasible', () => {
    const plan = mustTogetherPlan()
    const { assignments, report } = generateSeating(plan, { seed: 7 })
    expect(report.mandatoryUnsatisfied).toEqual([])
    expect(report.separationViolations).toEqual([])
    const a = guestId(plan, 'A')
    const b = guestId(plan, 'B')
    const c = guestId(plan, 'C')
    const d = guestId(plan, 'D')
    const f = guestId(plan, 'F')
    expect(tableOf(assignments, a)).toBe(tableOf(assignments, b))
    expect(tableOf(assignments, a)).toBe(tableOf(assignments, c))
    expect(tableOf(assignments, d)).not.toBe(tableOf(assignments, f))
    expect(report.seatedGuests).toBe(5)
    expect(report.unseatedGuests).toBe(0)
  })

  it('unseats and reports a must_together cluster larger than any table', () => {
    const plan = oversizedClusterPlan()
    const { assignments, report } = generateSeating(plan, { seed: 3 })
    expect(assignments).toEqual([])
    expect(report.overflow).toBe(true)
    expect(report.unseatedGuests).toBe(5)
    expect(report.mandatorySatisfied).toEqual([])
    expect(report.mandatoryUnsatisfied).toHaveLength(4) // 5-member chain cluster
  })

  it('never introduces must_not_together violations for consistent input', () => {
    const plans = [mustTogetherPlan(), preferTogetherPlan(), simpleTwoTablesPlan(), singleTablePlan(10, 8)]
    for (const plan of plans) {
      const { report } = generateSeating(plan, { seed: 11 })
      expect(report.separationViolations).toEqual([])
    }
  })

  it('satisfies acyclic preferences when capacity allows', () => {
    const plan = preferTogetherPlan()
    const { assignments, report } = generateSeating(plan, { seed: 5 })
    expect(report.preferenceSatisfied).toHaveLength(2)
    expect(report.preferenceUnsatisfied).toEqual([])
    const a = guestId(plan, 'A')
    const b = guestId(plan, 'B')
    const c = guestId(plan, 'C')
    const d = guestId(plan, 'D')
    expect(tableOf(assignments, a)).toBe(tableOf(assignments, b))
    expect(tableOf(assignments, c)).toBe(tableOf(assignments, d))
    expect(report.seatedGuests).toBe(4)
  })

  it('never regresses below the deterministic greedy score and reaches the optimum', () => {
    const a = guest(0, 'A')
    const b = guest(1, 'B')
    const c = guest(2, 'C')
    const plan: Plan = {
      meta: meta(),
      tables: [table(0, 4, 't-0'), table(1, 4, 't-1')],
      guests: [a, b, c],
      constraints: [constraint('prefer_together', a, b)],
      assignments: [],
    }
    // Greedy phase 4 packs A,B,C onto t-0 -> score 10 - 3 (spread) = 7.
    // The optimum is 9: A,B together on one table, C alone on the other
    // (spread = |2-1.5| + |1-1.5| = 1, average = 3/2).
    let best = Number.NEGATIVE_INFINITY
    for (let seed = 1; seed <= 10; seed++) {
      const { assignments } = generateSeating(plan, { seed })
      const score = scorePlan(plan, assignments)
      expect(score).toBeGreaterThanOrEqual(7)
      best = Math.max(best, score)
    }
    expect(best).toBe(9)
  })

  it('is deterministic for an explicit seed', () => {
    const plan = mustTogetherPlan()
    const first = generateSeating(plan, { seed: 42 })
    const second = generateSeating(plan, { seed: 42 })
    expect(guestToTable(first.assignments)).toEqual(guestToTable(second.assignments))
  })

  it('is deterministic for the default seed (hash of updatedAt)', () => {
    const plan = preferTogetherPlan()
    const first = generateSeating(plan)
    const second = generateSeating(plan)
    expect(guestToTable(first.assignments)).toEqual(guestToTable(second.assignments))
  })

  it('handles empty input (no guests, no tables) with a zeroed report', () => {
    const { assignments, report } = generateSeating(emptyPlan())
    expect(assignments).toEqual([])
    expect(report.seatedGuests).toBe(0)
    expect(report.unseatedGuests).toBe(0)
    expect(report.overflow).toBe(false)
    expect(report.mandatorySatisfied).toEqual([])
    expect(report.mandatoryUnsatisfied).toEqual([])
    expect(report.preferenceSatisfied).toEqual([])
    expect(report.preferenceUnsatisfied).toEqual([])
    expect(report.separationViolations).toEqual([])
  })

  it('handles a plan with guests but no tables', () => {
    const plan = singleTablePlan(3)
    const noTables = { ...plan, tables: [] }
    const { assignments, report } = generateSeating(noTables)
    expect(assignments).toEqual([])
    expect(report.overflow).toBe(true)
    expect(report.unseatedGuests).toBe(3)
  })

  it('seats every guest on the single table when capacity allows', () => {
    const plan = singleTablePlan(6, 8)
    const { assignments, report } = generateSeating(plan, { seed: 1 })
    const tableId = plan.tables[0].id
    expect(assignments).toHaveLength(6)
    expect(report.seatedGuests).toBe(6)
    expect(report.unseatedGuests).toBe(0)
    expect(report.overflow).toBe(false)
    expect(assignments.every((a) => a.tableId === tableId)).toBe(true)
    expect(assignments.map((a) => a.seatIndex).sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('reports overflow and the exact deficit when capacity is insufficient', () => {
    const plan = singleTablePlan(10, 8)
    const { assignments, report } = generateSeating(plan, { seed: 2 })
    expect(report.overflow).toBe(true)
    expect(report.unseatedGuests).toBe(2)
    expect(report.seatedGuests).toBe(8)
    expect(assignments).toHaveLength(8)
  })

  it('generates 200 guests / 25 tables in under 500 ms', () => {
    const plan = largeBenchmarkPlan()
    let latest = generateSeating(plan, { seed: 1 }) // warm-up for JIT
    // Best of 3 timed runs: the full suite spawns one worker per file, so a
    // single measurement includes scheduling/GC noise unrelated to the engine.
    let fastest = Number.POSITIVE_INFINITY
    for (let run = 0; run < 3; run += 1) {
      const startedAt = performance.now()
      latest = generateSeating(plan, { seed: 1 })
      fastest = Math.min(fastest, performance.now() - startedAt)
    }
    expect(fastest).toBeLessThan(500)
    const { assignments, report } = latest
    expect(report.seatedGuests).toBe(200)
    expect(report.unseatedGuests).toBe(0)
    expect(report.overflow).toBe(false)
    expect(assignments).toHaveLength(200)
  })

  it('throws EngineError(invalid_input) for a contradictory plan that fails validation', () => {
    const plan = contradictoryPlan()
    let caught: unknown
    try {
      generateSeating(plan)
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(EngineError)
    expect((caught as EngineError).code).toBe('invalid_input')
  })

  it('keeps a contradictory pair together and flags the separation violation via detectConflicts', () => {
    const plan = contradictoryPlan()
    const a = plan.guests[0].id
    const b = plan.guests[1].id
    const t = plan.tables[0].id
    const seated = {
      ...plan,
      assignments: [
        { guestId: a, tableId: t, seatIndex: 0 },
        { guestId: b, tableId: t, seatIndex: 1 },
      ],
    }
    const report = detectConflicts(seated)
    expect(report.mandatorySatisfied).toHaveLength(1)
    expect(report.separationViolations).toHaveLength(1)
  })

  it('keeps a must_together cluster together even when it contains a must_not_together edge', () => {
    const a = guest(0, 'A')
    const b = guest(1, 'B')
    const c = guest(2, 'C')
    const plan: Plan = {
      meta: meta(),
      tables: [table(0, 4, 't-0')],
      guests: [a, b, c],
      constraints: [
        constraint('must_together', a, b),
        constraint('must_together', b, c),
        constraint('must_not_together', a, c),
      ],
      assignments: [],
    }
    // maxIterations 0 pins the phase-3 cluster placement (local search is a
    // separate refinement phase and may legally break the cluster to trade
    // -100 mandatory vs +1000 separation on this contradictory input).
    const { assignments, report } = generateSeating(plan, { seed: 1, maxIterations: 0 })
    const t = plan.tables[0].id
    expect(assignments).toHaveLength(3)
    expect(assignments.every((x) => x.tableId === t)).toBe(true)
    expect(report.mandatoryUnsatisfied).toEqual([])
    expect(report.separationViolations).toHaveLength(1)
  })
})