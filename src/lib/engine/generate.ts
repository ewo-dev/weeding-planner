import { PlanSchema } from '@/types/plan'
import type { Assignment, Plan } from '@/types/plan'
import { detectConflicts } from './conflicts'
import { EngineError } from './errors'
import { createMulberry32, fnv1a } from './prng'
import { scorePlan } from './score'
import type { GenerateOptions, GenerateOutput } from './types'

interface UnionFind {
  parent: Map<string, string>
}

function makeUnionFind(ids: string[]): UnionFind {
  const parent = new Map<string, string>()
  for (const id of ids) parent.set(id, id)
  return { parent }
}

function find(uf: UnionFind, x: string): string {
  let root = x
  while (uf.parent.get(root) !== root) root = uf.parent.get(root) as string
  let current = x
  while (uf.parent.get(current) !== root) {
    const next = uf.parent.get(current) as string
    uf.parent.set(current, root)
    current = next
  }
  return root
}

function union(uf: UnionFind, a: string, b: string): void {
  const rootA = find(uf, a)
  const rootB = find(uf, b)
  if (rootA !== rootB) uf.parent.set(rootA, rootB)
}

function addAdjacency(adj: Map<string, Set<string>>, a: string, b: string): void {
  let edgesA = adj.get(a)
  if (!edgesA) {
    edgesA = new Set()
    adj.set(a, edgesA)
  }
  edgesA.add(b)
  let edgesB = adj.get(b)
  if (!edgesB) {
    edgesB = new Set()
    adj.set(b, edgesB)
  }
  edgesB.add(a)
}

const byIdAsc = (a: { id: string }, b: { id: string }): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * Five-phase deterministic seating engine per `04-seating-engine.md` § 4.
 *
 * Determinism: every iteration ordering is derived from sorted ids; the only
 * source of randomness is a mulberry32 PRNG seeded with `options.seed`, or a
 * numeric FNV-1a hash of `plan.meta.updatedAt` when no seed is given.
 * `Math.random()` is never used.
 */
export function generateSeating(plan: Plan, options?: GenerateOptions): GenerateOutput {
  const startedAt = performance.now()
  const maxIterations = options?.maxIterations ?? 200

  const validation = PlanSchema.safeParse(plan)
  if (!validation.success) {
    throw new EngineError('invalid_input', 'plan failed validation')
  }

  const guestIds = plan.guests.map((g) => g.id).sort()
  const tables = [...plan.tables].sort(byIdAsc)
  const capacityByTable = new Map(tables.map((t) => [t.id, t.capacity]))
  const sortedConstraints = [...plan.constraints].sort(byIdAsc)

  // Empty inputs: no guests -> zeroed report; no tables -> overflow report.
  if (guestIds.length === 0 || tables.length === 0) {
    const report = detectConflicts(plan)
    report.durationMs = performance.now() - startedAt
    return { assignments: [], report }
  }

  // Phase 1 — build the constraint graph.
  const uf = makeUnionFind(guestIds)
  const separation = new Map<string, Set<string>>()
  const preference = new Map<string, Set<string>>()
  for (const c of sortedConstraints) {
    if (c.kind === 'must_together') union(uf, c.a, c.b)
    else if (c.kind === 'must_not_together') addAdjacency(separation, c.a, c.b)
    else addAdjacency(preference, c.a, c.b)
  }

  // Phase 2 — cluster guests via union-find. Members are sorted by id.
  const membersByRoot = new Map<string, string[]>()
  for (const id of guestIds) {
    const root = find(uf, id)
    const members = membersByRoot.get(root)
    if (members) members.push(id)
    else membersByRoot.set(root, [id])
  }
  const multiClusters = [...membersByRoot.values()]
    .filter((members) => members.length > 1)
    .sort((a, b) => b.length - a.length || (a[0] < b[0] ? -1 : 1))
  const singletonIds = [...membersByRoot.values()]
    .filter((members) => members.length === 1)
    .map((members) => members[0])

  // Placement state.
  let assignments: Assignment[] = []
  const occupied = new Map<string, Set<number>>()
  for (const t of tables) occupied.set(t.id, new Set())

  const remaining = (tableId: string): number =>
    (capacityByTable.get(tableId) as number) - (occupied.get(tableId) as Set<number>).size

  /** True when `guestId` must not sit next to anyone already at `tableId` (or `alsoSeated`). */
  const violatesSeparation = (guestId: string, tableId: string, alsoSeated?: string): boolean => {
    const edges = separation.get(guestId)
    if (!edges) return false
    for (const a of assignments) {
      if (a.tableId === tableId && edges.has(a.guestId)) return true
    }
    return alsoSeated !== undefined && edges.has(alsoSeated)
  }

  const place = (guestId: string, tableId: string): void => {
    const seats = occupied.get(tableId) as Set<number>
    let seat = 0
    while (seats.has(seat)) seat++
    seats.add(seat)
    assignments.push({ guestId, tableId, seatIndex: seat })
  }

  // Phase 3 — assign multi-guest clusters, largest first, best-fit by
  // remaining capacity with `tableId` as the deterministic tie-break.
  for (const cluster of multiClusters) {
    let bestTable: string | null = null
    let bestRemaining = Number.POSITIVE_INFINITY
    for (const t of tables) {
      if (remaining(t.id) < cluster.length) continue
      let valid = true
      for (const member of cluster) {
        if (violatesSeparation(member, t.id)) {
          valid = false
          break
        }
      }
      if (!valid) continue
      const rem = remaining(t.id)
      if (rem < bestRemaining) {
        bestRemaining = rem
        bestTable = t.id
      }
    }
    if (bestTable !== null) {
      for (const member of cluster) place(member, bestTable)
    }
  }

  // Phase 4 — fill remaining seats with unseated singletons. Preference pairs
  // are processed first (deterministic order), then the rest by sorted id.
  const seated = new Set(assignments.map((a) => a.guestId))
  const unseatedSingletons = singletonIds.filter((id) => !seated.has(id))

  const prefPairs: Array<[string, string]> = []
  for (const a of guestIds) {
    const edges = preference.get(a)
    if (!edges) continue
    for (const b of [...edges].sort()) {
      if (a < b) prefPairs.push([a, b])
    }
  }
  prefPairs.sort((p, q) => (p[0] === q[0] ? (p[1] < q[1] ? -1 : 1) : p[0] < q[0] ? -1 : 1))

  const stillUnseated = new Set(unseatedSingletons)
  for (const [a, b] of prefPairs) {
    if (!stillUnseated.has(a) || !stillUnseated.has(b)) continue
    let bestTable: string | null = null
    let bestRemaining = Number.POSITIVE_INFINITY
    for (const t of tables) {
      if (remaining(t.id) < 2) continue
      if (violatesSeparation(a, t.id, b) || violatesSeparation(b, t.id, a)) continue
      const rem = remaining(t.id)
      if (rem < bestRemaining) {
        bestRemaining = rem
        bestTable = t.id
      }
    }
    if (bestTable !== null) {
      place(a, bestTable)
      place(b, bestTable)
      stillUnseated.delete(a)
      stillUnseated.delete(b)
    }
  }

  for (const id of [...stillUnseated].sort()) {
    let bestTable: string | null = null
    let bestRemaining = Number.POSITIVE_INFINITY
    for (const t of tables) {
      if (remaining(t.id) < 1) continue
      if (violatesSeparation(id, t.id)) continue
      const rem = remaining(t.id)
      if (rem < bestRemaining) {
        bestRemaining = rem
        bestTable = t.id
      }
    }
    if (bestTable !== null) place(id, bestTable)
  }

  // Phase 5 — local search refinement. A move must respect capacity, must not
  // introduce a `must_not_together` violation, and must strictly raise the score.
  const seed = options?.seed ?? fnv1a(plan.meta.updatedAt)
  const rand = createMulberry32(seed)
  const seatedGuestIds = assignments.map((a) => a.guestId)
  let bestScore = scorePlan(plan, assignments)
  let stagnant = 0

  const tryMove = (guestId: string, tableId: string): Assignment[] | null => {
    if (remaining(tableId) < 1) return null
    if (violatesSeparation(guestId, tableId)) return null
    const candidate: Assignment[] = []
    const taken = new Set<number>()
    for (const a of assignments) {
      if (a.guestId === guestId) continue
      if (a.tableId === tableId) taken.add(a.seatIndex)
      candidate.push(a)
    }
    let seat = 0
    while (taken.has(seat)) seat++
    candidate.push({ guestId, tableId, seatIndex: seat })
    return candidate
  }

  for (let i = 0; i < maxIterations && seatedGuestIds.length > 0; i++) {
    const pick = Math.floor(rand() * seatedGuestIds.length)
    const guestId = seatedGuestIds[pick]
    const currentTable = assignments.find((a) => a.guestId === guestId)?.tableId
    if (currentTable === undefined) continue

    let improved = false
    for (const t of tables) {
      if (t.id === currentTable) continue
      const candidate = tryMove(guestId, t.id)
      if (!candidate) continue
      const candidateScore = scorePlan(plan, candidate)
      if (candidateScore > bestScore) {
        assignments = candidate
        for (const table of tables) occupied.set(table.id, new Set())
        for (const a of assignments) (occupied.get(a.tableId) as Set<number>).add(a.seatIndex)
        bestScore = candidateScore
        improved = true
        break
      }
    }

    if (improved) stagnant = 0
    else stagnant++
    if (stagnant >= seatedGuestIds.length) break // full pass without improvement
  }

  const report = detectConflicts({ ...plan, assignments })
  report.durationMs = performance.now() - startedAt
  return { assignments, report }
}