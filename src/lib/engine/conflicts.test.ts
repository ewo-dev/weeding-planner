import { describe, expect, it } from 'vitest'
import type { Plan } from '@/types/plan'
import { constraint, emptyPlan, guest, meta, table } from './__fixtures__'
import { detectConflicts } from './conflicts'

describe('detectConflicts', () => {
  it('returns a zeroed report for an empty plan', () => {
    const report = detectConflicts(emptyPlan())
    expect(report.mandatorySatisfied).toEqual([])
    expect(report.mandatoryUnsatisfied).toEqual([])
    expect(report.preferenceSatisfied).toEqual([])
    expect(report.preferenceUnsatisfied).toEqual([])
    expect(report.separationViolations).toEqual([])
    expect(report.seatedGuests).toBe(0)
    expect(report.unseatedGuests).toBe(0)
    expect(report.overflow).toBe(false)
    expect(report.durationMs).toBe(0)
  })

  it('lists no mandatory unsatisfied when all mandatory constraints are satisfied', () => {
    const a = guest(0, 'A')
    const b = guest(1, 'B')
    const t = table(0, 4, 't-0')
    const c = constraint('must_together', a, b)
    const plan: Plan = {
      meta: meta(),
      tables: [t],
      guests: [a, b],
      constraints: [c],
      assignments: [
        { guestId: a.id, tableId: t.id, seatIndex: 0 },
        { guestId: b.id, tableId: t.id, seatIndex: 1 },
      ],
    }
    const report = detectConflicts(plan)
    expect(report.mandatorySatisfied).toEqual([{ constraintId: c.id, a: a.id, b: b.id }])
    expect(report.mandatoryUnsatisfied).toEqual([])
  })

  it('reports an unseated mandatory pair as unsatisfied', () => {
    const a = guest(0, 'A')
    const b = guest(1, 'B')
    const t = table(0, 4, 't-0')
    const c = constraint('must_together', a, b)
    const plan: Plan = {
      meta: meta(),
      tables: [t],
      guests: [a, b],
      constraints: [c],
      assignments: [{ guestId: a.id, tableId: t.id, seatIndex: 0 }],
    }
    const report = detectConflicts(plan)
    expect(report.mandatorySatisfied).toEqual([])
    expect(report.mandatoryUnsatisfied).toEqual([{ constraintId: c.id, a: a.id, b: b.id }])
    expect(report.unseatedGuests).toBe(1)
  })

  it('flags a manual must_not_together violation', () => {
    const a = guest(0, 'A')
    const b = guest(1, 'B')
    const t = table(0, 4, 't-0')
    const c = constraint('must_not_together', a, b)
    const plan: Plan = {
      meta: meta(),
      tables: [t],
      guests: [a, b],
      constraints: [c],
      assignments: [
        { guestId: a.id, tableId: t.id, seatIndex: 0 },
        { guestId: b.id, tableId: t.id, seatIndex: 1 },
      ],
    }
    const report = detectConflicts(plan)
    expect(report.separationViolations).toHaveLength(1)
    expect(report.separationViolations[0]).toEqual({ constraintId: c.id, a: a.id, b: b.id })
  })

  it('computes the report even when a seatIndex exceeds capacity', () => {
    const a = guest(0, 'A')
    const t = table(0, 4, 't-0')
    const plan: Plan = {
      meta: meta(),
      tables: [t],
      guests: [a],
      constraints: [],
      assignments: [{ guestId: a.id, tableId: t.id, seatIndex: 9 }],
    }
    const report = detectConflicts(plan)
    expect(report.seatedGuests).toBe(1)
    expect(report.unseatedGuests).toBe(0)
    expect(report.overflow).toBe(false)
  })

  it('is deterministic: the same plan yields deep-equal reports', () => {
    const a = guest(0, 'A')
    const b = guest(1, 'B')
    const t = table(0, 4, 't-0')
    const plan: Plan = {
      meta: meta(),
      tables: [t],
      guests: [a, b],
      constraints: [constraint('prefer_together', a, b)],
      assignments: [
        { guestId: a.id, tableId: t.id, seatIndex: 0 },
        { guestId: b.id, tableId: t.id, seatIndex: 1 },
      ],
    }
    expect(detectConflicts(plan)).toEqual(detectConflicts(plan))
  })
})