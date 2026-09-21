import { describe, expect, it } from 'vitest'
import type { Assignment, Constraint, ConstraintKind, Guest, Plan, Table } from '@/types/plan'
import {
  generateSeating,
  moveGuest,
  redo,
  removeConstraint,
  removeGuest,
  removeTable,
  renamePlan,
  undo,
  unseatGuest,
  updateGuest,
  updateTable,
} from './actions'
import { HISTORY_LIMIT, planReducer } from './reducer'
import type { PlanHistoryState } from './reducer'

// Deterministic UUID-format ids so `generateSeating` (which re-validates with
// PlanSchema) works on plans built by hand here.
const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const C = (n: number): string => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const META_ID = '00000000-0000-4000-8000-000000000000'

const guest = (n: number, name = `g${n}`): Guest => ({ id: G(n), name })
const table = (n: number, capacity = 4): Table => ({
  id: T(n),
  name: `t${n}`,
  shape: 'round',
  capacity,
  position: { x: 0, y: n * 160 },
})
const constraint = (n: number, kind: ConstraintKind, a: string, b: string): Constraint => ({
  id: C(n),
  kind,
  a,
  b,
})
const assignment = (guestId: string, tableId: string, seatIndex: number): Assignment => ({ guestId, tableId, seatIndex })

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    meta: {
      id: META_ID,
      name: 'Plan',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [],
    guests: [],
    constraints: [],
    assignments: [],
    ...overrides,
  }
}

function init(plan: Plan = makePlan()): PlanHistoryState {
  return { plan, past: [], future: [], lastSavedAt: null }
}

describe('planReducer', () => {
  it('addGuest adds the guest and pushes a single history entry', () => {
    let state = init()
    state = planReducer(state, { type: 'addGuest', guest: guest(1) })
    expect(state.plan.guests).toHaveLength(1)
    expect(state.plan.guests[0].id).toBe(G(1))
    expect(state.past).toHaveLength(1)
    expect(state.future).toHaveLength(0)
    expect(state.past[0].action).toEqual({ type: 'addGuest', guest: guest(1) })
    expect(state.past[0].inverse).toEqual({ type: 'removeGuest', guestId: G(1) })
    expect(state.past[0].beforePlan).toEqual(makePlan())
  })

  it('undo applies the inverse and moves the entry to future; redo restores it', () => {
    let state = init()
    state = planReducer(state, { type: 'addGuest', guest: guest(1) })
    state = planReducer(state, undo())
    expect(state.plan.guests).toHaveLength(0)
    expect(state.past).toHaveLength(0)
    expect(state.future).toHaveLength(1)
    state = planReducer(state, redo())
    expect(state.plan.guests).toHaveLength(1)
    expect(state.plan.guests[0].id).toBe(G(1))
    expect(state.past).toHaveLength(1)
    expect(state.future).toHaveLength(0)
  })

  it('redo after a fresh action is a no-op (the redo stack was cleared)', () => {
    let state = init()
    state = planReducer(state, { type: 'addGuest', guest: guest(1) })
    state = planReducer(state, undo())
    state = planReducer(state, { type: 'addGuest', guest: guest(2) })
    expect(state.future).toHaveLength(0)
    const before = state
    state = planReducer(state, redo())
    expect(state).toBe(before)
  })

  it('caps history at 50 and drops the oldest entries', () => {
    let state = init()
    for (let i = 1; i <= 60; i++) {
      state = planReducer(state, { type: 'addGuest', guest: guest(i) })
    }
    expect(state.past).toHaveLength(HISTORY_LIMIT)
    const oldest = state.past[0].action
    expect(oldest.type).toBe('addGuest')
    if (oldest.type === 'addGuest') expect(oldest.guest.id).toBe(G(11))
    expect(state.plan.guests).toHaveLength(60) // all guests kept, only history is bounded
  })

  it('moveGuest to an occupied slot is a no-op (no state change, no history entry)', () => {
    const plan = makePlan({ tables: [table(1, 4), table(2, 4)], guests: [guest(1), guest(2)] })
    let state = init(plan)
    state = planReducer(state, moveGuest(G(1), T(1), 0))
    expect(state.past).toHaveLength(1)
    const before = state
    state = planReducer(state, moveGuest(G(2), T(1), 0))
    expect(state).toBe(before)
    expect(state.plan.assignments).toEqual([assignment(G(1), T(1), 0)])
  })

  it('moveGuest to an out-of-range seatIndex is a no-op', () => {
    const plan = makePlan({ tables: [table(1, 2)], guests: [guest(1)] })
    const initial = init(plan)
    expect(planReducer(initial, moveGuest(G(1), T(1), 2))).toBe(initial)
    expect(planReducer(initial, moveGuest(G(1), T(1), -1))).toBe(initial)
  })

  it('moveGuest seats, relocates and unseats with correct inverses', () => {
    const plan = makePlan({ tables: [table(1, 4), table(2, 4)], guests: [guest(1)] })
    let state = init(plan)
    state = planReducer(state, moveGuest(G(1), T(1), 3))
    expect(state.plan.assignments).toEqual([assignment(G(1), T(1), 3)])
    state = planReducer(state, moveGuest(G(1), T(2), 0))
    expect(state.plan.assignments).toEqual([assignment(G(1), T(2), 0)])
    state = planReducer(state, undo())
    expect(state.plan.assignments).toEqual([assignment(G(1), T(1), 3)])
    state = planReducer(state, undo())
    expect(state.plan.assignments).toEqual([])
  })

  it('unseatGuest removes the assignment and is undoable', () => {
    const plan = makePlan({
      tables: [table(1, 4)],
      guests: [guest(1)],
      assignments: [assignment(G(1), T(1), 2)],
    })
    let state = init(plan)
    state = planReducer(state, unseatGuest(G(1)))
    expect(state.plan.assignments).toEqual([])
    state = planReducer(state, undo())
    expect(state.plan.assignments).toEqual([assignment(G(1), T(1), 2)])
  })

  it('removeGuest removes the guest, their assignments, and their constraints', () => {
    const plan = makePlan({
      tables: [table(1, 4)],
      guests: [guest(1), guest(2)],
      constraints: [
        constraint(1, 'must_together', G(1), G(2)),
        constraint(2, 'prefer_together', G(2), G(1)),
      ],
      assignments: [assignment(G(1), T(1), 0)],
    })
    let state = init(plan)
    state = planReducer(state, removeGuest(G(1)))
    expect(state.plan.guests.map((g) => g.id)).toEqual([G(2)])
    expect(state.plan.assignments).toEqual([])
    expect(state.plan.constraints).toEqual([])
    // Undo restores the guest; per the roadmap the inverse is `addGuest`, so the
    // guest returns unseated and its constraints are not restored.
    state = planReducer(state, undo())
    expect(state.plan.guests.map((g) => g.id).sort()).toEqual([G(1), G(2)].sort())
    expect(state.plan.assignments).toEqual([])
    expect(state.plan.constraints).toEqual([])
  })

  it('addTable adds the table and stacks default positions vertically', () => {
    let state = init(makePlan({ tables: [table(1, 4)] }))
    state = planReducer(state, { type: 'addTable', table: { id: T(2), name: 't2', shape: 'round', capacity: 4 } })
    expect(state.plan.tables).toHaveLength(2)
    expect(state.plan.tables[1].position).toEqual({ x: 0, y: 160 }) // tables.length was 1
    state = planReducer(state, undo())
    expect(state.plan.tables.map((t) => t.id)).toEqual([T(1)])

    // An explicit position is honored as-is.
    state = planReducer(state, {
      type: 'addTable',
      table: { id: T(3), name: 't3', shape: 'round', capacity: 4, position: { x: 10, y: 20 } },
    })
    expect(state.plan.tables[1].position).toEqual({ x: 10, y: 20 })
  })

  it('updateTable merges the patch and is undoable', () => {
    let state = init(makePlan({ tables: [table(1, 4)] }))
    state = planReducer(state, updateTable(T(1), { capacity: 6, name: 'Grande' }))
    expect(state.plan.tables[0].capacity).toBe(6)
    expect(state.plan.tables[0].name).toBe('Grande')
    state = planReducer(state, undo())
    expect(state.plan.tables[0]).toEqual(table(1, 4))
  })

  it('updateTable keeps existing assignments when capacity shrinks (UI confirms)', () => {
    let state = init(makePlan({ tables: [table(1, 4)], guests: [guest(1), guest(2)] }))
    state = planReducer(state, moveGuest(G(1), T(1), 0))
    state = planReducer(state, moveGuest(G(2), T(1), 1))
    state = planReducer(state, updateTable(T(1), { capacity: 1 }))
    expect(state.plan.tables[0].capacity).toBe(1)
    expect(state.plan.assignments).toHaveLength(2) // kept: capacity enforcement is the UI's job
  })

  it('removeTable removes the table and its assignments; undo restores both', () => {
    const plan = makePlan({
      tables: [table(1, 4), table(2, 4)],
      guests: [guest(1), guest(2)],
      assignments: [assignment(G(1), T(1), 0), assignment(G(2), T(2), 0)],
    })
    let state = init(plan)
    state = planReducer(state, removeTable(T(1)))
    expect(state.plan.tables.map((t) => t.id)).toEqual([T(2)])
    expect(state.plan.assignments).toEqual([assignment(G(2), T(2), 0)])
    state = planReducer(state, undo())
    // restoreTable re-appends the table and its assignments (order is not an invariant).
    expect(state.plan.tables.find((t) => t.id === T(1))).toEqual(table(1, 4))
    expect(state.plan.tables.find((t) => t.id === T(2))).toEqual(table(2, 4))
    const byGuest = new Map(state.plan.assignments.map((a) => [a.guestId, a]))
    expect(byGuest.get(G(1))).toEqual(assignment(G(1), T(1), 0))
    expect(byGuest.get(G(2))).toEqual(assignment(G(2), T(2), 0))
  })

  it('updateGuest records only changed fields in its inverse', () => {
    let state = init(makePlan({ guests: [guest(1, 'Original')] }))
    state = planReducer(state, updateGuest(G(1), { name: 'New', group: 'Famille' }))
    const inverse = state.past[0].inverse
    expect(inverse.type).toBe('updateGuest')
    if (inverse.type === 'updateGuest') expect(inverse.patch).toEqual({ name: 'Original' })
    state = planReducer(state, undo())
    expect(state.plan.guests[0].name).toBe('Original')
    expect(state.plan.guests[0].group).toBeUndefined()
  })

  it('addConstraint rejects a === b as a no-op', () => {
    const initial = init(makePlan({ guests: [guest(1)] }))
    const state = planReducer(initial, { type: 'addConstraint', id: C(1), kind: 'must_together', a: G(1), b: G(1) })
    expect(state).toBe(initial)
  })

  it('addConstraint rejects a duplicate pair+kind and canonicalizes the pair', () => {
    let state = init(makePlan({ guests: [guest(1), guest(2)] }))
    state = planReducer(state, { type: 'addConstraint', id: C(1), kind: 'must_together', a: G(2), b: G(1) })
    expect(state.plan.constraints).toEqual([{ id: C(1), kind: 'must_together', a: G(1), b: G(2) }])
    const before = state
    state = planReducer(state, { type: 'addConstraint', id: C(2), kind: 'must_together', a: G(1), b: G(2) })
    expect(state).toBe(before)
    // A different kind on the same pair is allowed.
    state = planReducer(state, { type: 'addConstraint', id: C(2), kind: 'prefer_together', a: G(1), b: G(2) })
    expect(state.plan.constraints).toHaveLength(2)
  })

  it('removeConstraint removes the constraint and is undoable', () => {
    const plan = makePlan({
      guests: [guest(1), guest(2)],
      constraints: [constraint(1, 'must_together', G(1), G(2)), constraint(2, 'prefer_together', G(1), G(2))],
    })
    let state = init(plan)
    state = planReducer(state, removeConstraint(C(1)))
    expect(state.plan.constraints.map((c) => c.id)).toEqual([C(2)])
    state = planReducer(state, undo())
    expect(state.plan.constraints.map((c) => c.id).sort()).toEqual([C(1), C(2)].sort())
  })

  it('generateSeating replaces assignments with the engine output; undo restores them exactly', () => {
    const plan = makePlan({
      tables: [table(1, 4), table(2, 4)],
      guests: [guest(1), guest(2), guest(3)],
    })
    let state = init(plan)
    state = planReducer(state, moveGuest(G(1), T(1), 0))
    state = planReducer(state, moveGuest(G(2), T(1), 1))
    const preGeneration = state.plan.assignments
    expect(state.past).toHaveLength(2)
    state = planReducer(state, generateSeating())
    expect(state.plan.assignments).toHaveLength(3) // all guests seated
    expect(state.plan.assignments).not.toEqual(preGeneration)
    expect(state.past).toHaveLength(3) // generateSeating is a single history entry
    state = planReducer(state, undo())
    expect(state.plan.assignments).toEqual(preGeneration)
  })

  it('renamePlan is not undoable: no history entry, undo keeps the new name', () => {
    let state = init()
    state = planReducer(state, renamePlan('New name'))
    expect(state.plan.meta.name).toBe('New name')
    expect(state.past).toHaveLength(0)
    state = planReducer(state, { type: 'addGuest', guest: guest(1) })
    state = planReducer(state, undo())
    expect(state.plan.meta.name).toBe('New name') // rename was not in the history
    expect(state.plan.guests).toHaveLength(0)
  })

  it('renamePlan clears the redo stack like any fresh mutation', () => {
    let state = init()
    state = planReducer(state, { type: 'addGuest', guest: guest(1) })
    state = planReducer(state, undo())
    expect(state.future).toHaveLength(1)
    state = planReducer(state, renamePlan('X'))
    expect(state.future).toHaveLength(0)
  })

  it('never mutates the previous plan (immutable updates)', () => {
    const initial = init()
    const state = planReducer(initial, { type: 'addGuest', guest: guest(1) })
    expect(Object.is(initial.plan, state.plan)).toBe(false)
    expect(initial.plan.guests).toHaveLength(0) // untouched

    const state2 = planReducer(state, updateGuest(G(1), { name: 'Renamed' }))
    expect(Object.is(state.plan, state2.plan)).toBe(false)
    expect(state.plan.guests[0].name).toBe('g1') // untouched

    const state3 = planReducer(state2, undo())
    expect(state3.plan.guests[0].name).toBe('g1')
  })
})