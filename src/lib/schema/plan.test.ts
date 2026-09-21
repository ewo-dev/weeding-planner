import { describe, expect, it } from 'vitest'
import { newId } from '../id'
import type { Plan } from './plan'
import { ConstraintSchema, GuestSchema, PlanSchema } from './plan'

function validPlan(): Plan {
  const tableId = newId()
  const g1 = newId()
  const g2 = newId()
  return {
    meta: {
      id: newId(),
      name: 'Mariage Alice & Bob',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    },
    tables: [
      { id: tableId, name: 'Table 1', shape: 'round', capacity: 8, position: { x: 120, y: 80 } },
    ],
    guests: [
      { id: g1, name: 'Alice' },
      { id: g2, name: 'Bob' },
    ],
    constraints: [{ id: newId(), kind: 'must_together', a: g1, b: g2 }],
    assignments: [
      { guestId: g1, tableId, seatIndex: 0 },
      { guestId: g2, tableId, seatIndex: 1 },
    ],
  }
}

describe('PlanSchema', () => {
  it('round-trips a plan through JSON serialization with structural equality', () => {
    const plan = validPlan()
    const parsed = PlanSchema.parse(JSON.parse(JSON.stringify(plan)))
    expect(parsed).toEqual(plan)
  })

  it('rejects an empty table name with a clear path', () => {
    const plan = validPlan()
    plan.tables[0].name = '   '
    const result = PlanSchema.safeParse(plan)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('name'))).toBe(true)
    }
  })

  it('rejects a capacity above the allowed range with a clear path', () => {
    const plan = validPlan()
    plan.tables[0].capacity = 21
    const result = PlanSchema.safeParse(plan)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('capacity'))).toBe(true)
    }
  })

  it('rejects a guest name longer than 80 chars with a clear path', () => {
    const plan = validPlan()
    plan.guests[0].name = 'x'.repeat(81)
    const result = PlanSchema.safeParse(plan)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('name'))).toBe(true)
    }
  })

  it('rejects duplicate table ids', () => {
    const plan = validPlan()
    const [table] = plan.tables
    plan.tables.push({ ...table })
    const result = PlanSchema.safeParse(plan)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('duplicate table id'))).toBe(true)
    }
  })

  it('rejects duplicate guest ids', () => {
    const plan = validPlan()
    plan.guests.push({ ...plan.guests[0] })
    const result = PlanSchema.safeParse(plan)
    expect(result.success).toBe(false)
  })

  it('rejects duplicate table names', () => {
    const plan = validPlan()
    plan.tables.push({ id: newId(), name: 'Table 1', shape: 'rectangle', capacity: 4, position: { x: 0, y: 0 } })
    const result = PlanSchema.safeParse(plan)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('duplicate table name'))).toBe(true)
    }
  })

  it('rejects an assignment whose seatIndex is out of range', () => {
    const plan = validPlan()
    plan.assignments[0].seatIndex = 99
    const result = PlanSchema.safeParse(plan)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('assignments'))).toBe(true)
    }
  })

  it('rejects an assignment referencing an unknown table', () => {
    const plan = validPlan()
    plan.assignments[0].tableId = newId()
    const result = PlanSchema.safeParse(plan)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('unknown table'))).toBe(true)
    }
  })

  it('rejects an assignment referencing an unknown guest', () => {
    const plan = validPlan()
    plan.assignments[0].guestId = newId()
    const result = PlanSchema.safeParse(plan)
    expect(result.success).toBe(false)
  })

  it('rejects two assignments on the same seat', () => {
    const plan = validPlan()
    const g3 = newId()
    plan.guests.push({ id: g3, name: 'Charlie' })
    plan.assignments.push({ guestId: g3, tableId: plan.tables[0].id, seatIndex: 0 })
    const result = PlanSchema.safeParse(plan)
    expect(result.success).toBe(false)
  })

  it('rejects a guest assigned to two seats', () => {
    const plan = validPlan()
    plan.tables.push({ id: newId(), name: 'Table 2', shape: 'rectangle', capacity: 4, position: { x: 0, y: 0 } })
    plan.assignments.push({ guestId: plan.guests[0].id, tableId: plan.tables[1].id, seatIndex: 0 })
    const result = PlanSchema.safeParse(plan)
    expect(result.success).toBe(false)
  })

  it('rejects a pair carrying both must_together and must_not_together', () => {
    const plan = validPlan()
    const { a, b } = plan.constraints[0]
    plan.constraints.push({ id: newId(), kind: 'must_not_together', a, b })
    const result = PlanSchema.safeParse(plan)
    expect(result.success).toBe(false)
  })

  it('allows the same pair under prefer_together and must_together', () => {
    const plan = validPlan()
    const { a, b } = plan.constraints[0]
    plan.constraints.push({ id: newId(), kind: 'prefer_together', a, b })
    const result = PlanSchema.safeParse(plan)
    expect(result.success).toBe(true)
  })

  it('rejects a constraint where a === b', () => {
    const id = newId()
    const result = ConstraintSchema.safeParse({ id: newId(), kind: 'prefer_together', a: id, b: id })
    expect(result.success).toBe(false)
  })

  it('rejects a plan whose meta is missing schemaVersion', () => {
    const plan = validPlan()
    delete (plan.meta as { schemaVersion?: number }).schemaVersion
    const result = PlanSchema.safeParse(plan)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('schemaVersion'))).toBe(true)
    }
  })
})

describe('draft schemas', () => {
  it('accepts partial guest drafts', () => {
    const draft = GuestSchema.partial()
    expect(draft.safeParse({}).success).toBe(true)
    expect(draft.safeParse({ name: 'Alice' }).success).toBe(true)
    expect(draft.safeParse({ id: newId(), name: 'Bob', notes: 'végétarien' }).success).toBe(true)
  })
})