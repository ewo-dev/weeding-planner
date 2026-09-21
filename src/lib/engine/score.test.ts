import { describe, expect, it } from 'vitest'
import type { Assignment, Plan } from '@/types/plan'
import { constraint, emptyPlan, guest, meta, table } from './__fixtures__'
import { scorePlan } from './score'

describe('scorePlan', () => {
  it('returns 0 for an empty plan', () => {
    expect(scorePlan(emptyPlan(), [])).toBe(0)
  })

  it('counts satisfied must_together pairs at 100 each', () => {
    const a = guest(0, 'A')
    const b = guest(1, 'B')
    const c = guest(2, 'C')
    const t = table(0, 8, 't-0')
    const plan: Plan = {
      meta: meta(),
      tables: [t],
      guests: [a, b, c],
      constraints: [
        constraint('must_together', a, b),
        constraint('must_together', a, c),
      ],
      assignments: [],
    }
    const assignments: Assignment[] = [
      { guestId: a.id, tableId: t.id, seatIndex: 0 },
      { guestId: b.id, tableId: t.id, seatIndex: 1 },
      { guestId: c.id, tableId: t.id, seatIndex: 2 },
    ]
    expect(scorePlan(plan, assignments)).toBe(200)
  })

  it('penalizes a violated must_not_together pair with -1000', () => {
    const a = guest(0, 'A')
    const b = guest(1, 'B')
    const t = table(0, 8, 't-0')
    const plan: Plan = {
      meta: meta(),
      tables: [t],
      guests: [a, b],
      constraints: [constraint('must_not_together', a, b)],
      assignments: [],
    }
    const assignments: Assignment[] = [
      { guestId: a.id, tableId: t.id, seatIndex: 0 },
      { guestId: b.id, tableId: t.id, seatIndex: 1 },
    ]
    expect(scorePlan(plan, assignments)).toBe(-1000)
  })

  it('rewards a satisfied preference pair with 10', () => {
    const a = guest(0, 'A')
    const b = guest(1, 'B')
    const t = table(0, 8, 't-0')
    const plan: Plan = {
      meta: meta(),
      tables: [t],
      guests: [a, b],
      constraints: [constraint('prefer_together', a, b)],
      assignments: [],
    }
    const assignments: Assignment[] = [
      { guestId: a.id, tableId: t.id, seatIndex: 0 },
      { guestId: b.id, tableId: t.id, seatIndex: 1 },
    ]
    expect(scorePlan(plan, assignments)).toBe(10)
  })

  it('does not reward an unsatisfied preference pair', () => {
    const a = guest(0, 'A')
    const b = guest(1, 'B')
    const t0 = table(0, 4, 't-0')
    const t1 = table(1, 4, 't-1')
    const plan: Plan = {
      meta: meta(),
      tables: [t0, t1],
      guests: [a, b],
      constraints: [constraint('prefer_together', a, b)],
      assignments: [],
    }
    const apart: Assignment[] = [
      { guestId: a.id, tableId: t0.id, seatIndex: 0 },
      { guestId: b.id, tableId: t1.id, seatIndex: 0 },
    ]
    expect(scorePlan(plan, apart)).toBe(0)
  })

  it('applies the spread penalty across two unevenly-filled tables', () => {
    const t0 = table(0, 8, 't-0')
    const t1 = table(1, 8, 't-1')
    const guests = Array.from({ length: 8 }, (_, i) => guest(i, `g-${i}`))
    const plan: Plan = {
      meta: meta(),
      tables: [t0, t1],
      guests,
      constraints: [],
      assignments: [],
    }
    const assignments: Assignment[] = guests.map((g, i) => ({
      guestId: g.id,
      tableId: i < 6 ? t0.id : t1.id,
      seatIndex: i < 6 ? i : i - 6,
    }))
    // average = 8 / 2 = 4; |6 - 4| + |2 - 4| = 4
    expect(scorePlan(plan, assignments)).toBe(-4)
  })

  it('ignores pairs whose members are unseated', () => {
    const a = guest(0, 'A')
    const b = guest(1, 'B')
    const c = guest(2, 'C')
    const d = guest(3, 'D')
    const t = table(0, 8, 't-0')
    const plan: Plan = {
      meta: meta(),
      tables: [t],
      guests: [a, b, c, d],
      constraints: [
        constraint('must_together', a, b),
        constraint('must_not_together', c, d),
      ],
      assignments: [],
    }
    const assignments: Assignment[] = [{ guestId: a.id, tableId: t.id, seatIndex: 0 }]
    expect(scorePlan(plan, assignments)).toBe(0)
  })

  it('dedupes duplicate constraints on the same unordered pair', () => {
    const a = guest(0, 'A')
    const b = guest(1, 'B')
    const t = table(0, 8, 't-0')
    const plan: Plan = {
      meta: meta(),
      tables: [t],
      guests: [a, b],
      constraints: [
        constraint('must_together', a, b),
        constraint('must_together', b, a),
      ],
      assignments: [],
    }
    const assignments: Assignment[] = [
      { guestId: a.id, tableId: t.id, seatIndex: 0 },
      { guestId: b.id, tableId: t.id, seatIndex: 1 },
    ]
    expect(scorePlan(plan, assignments)).toBe(100)
  })
})