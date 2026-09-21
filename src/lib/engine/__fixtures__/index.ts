import type { Constraint, ConstraintKind, Guest, Plan, Table } from '@/types/plan'

// `PlanSchema` requires UUID-format ids (`z.string().uuid()`), so fixtures use
// deterministic UUID-format ids instead of `g-0` style strings: the index is
// encoded in the last 12 hex characters, namespaced by the 4th group. This
// keeps plans reproducible across runs while still validating.

const GUEST_NS = 0x0001
const TABLE_NS = 0x0002
const CONSTRAINT_NS = 0x0003
const META_NS = 0x0004

function detUuid(namespace: number, index: number): string {
  // Zod v4 validates UUID shape strictly: version group [1-8], variant [89abAB].
  const ns = namespace.toString(16).padStart(3, '0')
  const idx = index.toString(16).padStart(12, '0')
  return `00000000-0000-4${ns}-8${'0'.repeat(3)}-${idx}`
}

/** Deterministic `PlanMeta` fixture (same `updatedAt` -> same default seed). */
export function meta(): Plan['meta'] {
  return {
    id: detUuid(META_NS, 0),
    name: 'Engine fixture plan',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: 1,
  }
}

export function guest(index: number, name?: string): Guest {
  return { id: detUuid(GUEST_NS, index), name: name ?? `g-${index}` }
}

export function table(index: number, capacity: number, name?: string): Table {
  return {
    id: detUuid(TABLE_NS, index),
    name: name ?? `t-${index}`,
    shape: 'round',
    capacity,
    position: { x: index * 40, y: 0 },
  }
}

let constraintSeq = 0

export function constraint(kind: ConstraintKind, a: Guest, b: Guest): Constraint {
  return { id: detUuid(CONSTRAINT_NS, constraintSeq++), kind, a: a.id, b: b.id }
}

export function emptyPlan(): Plan {
  return { meta: meta(), tables: [], guests: [], constraints: [], assignments: [] }
}

export function singleTablePlan(guestCount: number, capacity = 8): Plan {
  const guests: Guest[] = []
  for (let i = 0; i < guestCount; i++) guests.push(guest(i))
  return { meta: meta(), tables: [table(0, capacity)], guests, constraints: [], assignments: [] }
}

export function simpleTwoTablesPlan(): Plan {
  const guests: Guest[] = []
  for (let i = 0; i < 12; i++) guests.push(guest(i))
  return {
    meta: meta(),
    tables: [table(0, 8), table(1, 8)],
    guests,
    constraints: [],
    assignments: [],
  }
}

export function mustTogetherPlan(): Plan {
  const a = guest(0, 'A')
  const b = guest(1, 'B')
  const c = guest(2, 'C')
  const d = guest(3, 'D')
  const f = guest(4, 'F')
  return {
    meta: meta(),
    tables: [table(0, 4, 'T1'), table(1, 4, 'T2'), table(2, 4, 'T3')],
    guests: [a, b, c, d, f],
    constraints: [
      constraint('must_together', a, b),
      constraint('must_together', a, c),
      constraint('must_not_together', d, f),
    ],
    assignments: [],
  }
}

export function oversizedClusterPlan(): Plan {
  const members: Guest[] = []
  for (let i = 0; i < 5; i++) members.push(guest(i, `M${i}`))
  const constraints: Constraint[] = []
  for (let i = 0; i < members.length - 1; i++) {
    constraints.push(constraint('must_together', members[i], members[i + 1]))
  }
  return {
    meta: meta(),
    tables: [table(0, 4, 'T1')],
    guests: members,
    constraints,
    assignments: [],
  }
}

export function preferTogetherPlan(): Plan {
  const a = guest(0, 'A')
  const b = guest(1, 'B')
  const c = guest(2, 'C')
  const d = guest(3, 'D')
  return {
    meta: meta(),
    tables: [table(0, 4, 'T1'), table(1, 4, 'T2')],
    guests: [a, b, c, d],
    constraints: [
      constraint('prefer_together', a, b),
      constraint('prefer_together', c, d),
    ],
    assignments: [],
  }
}

/**
 * Intentionally fails `PlanSchema` (a pair cannot carry both `must_together`
 * and `must_not_together`). Used to exercise the validation path in
 * `generateSeating` and the kept-together classification in `detectConflicts`.
 */
export function contradictoryPlan(): Plan {
  const a = guest(0, 'A')
  const b = guest(1, 'B')
  return {
    meta: meta(),
    tables: [table(0, 4, 'T1')],
    guests: [a, b],
    constraints: [
      constraint('must_together', a, b),
      constraint('must_not_together', a, b),
    ],
    assignments: [],
  }
}

export function largeBenchmarkPlan(): Plan {
  const guests: Guest[] = []
  for (let i = 0; i < 200; i++) guests.push(guest(i, `g-${i}`))
  const tables: Table[] = []
  for (let i = 0; i < 25; i++) tables.push(table(i, 10, `t-${i}`))
  return { meta: meta(), tables, guests, constraints: [], assignments: [] }
}