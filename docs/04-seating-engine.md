# Plan de Table — Seating Engine

## 1. Purpose

This document defines the auto-seating engine.

It specifies:

* The contract (inputs and outputs).
* The algorithm.
* The scoring function.
* The conflict-reporting format.
* Edge cases and guarantees.

The engine is a pure TypeScript module under `lib/engine/`. It has no React, no DOM, no I/O.

---

## 2. Goals and Non-Goals

### Goals

* Generate a seating assignment that **respects all mandatory constraints** when possible.
* Maximize the satisfaction of **preference constraints**.
* Respect **table capacities**.
* Run in **well under 500 ms** for 200 guests / 25 tables.
* Be **deterministic** for the same input and seed.
* Always produce a **manually editable** result.

### Non-goals

* Guaranteed optimal seating (the engine is heuristic).
* Real-time, collaborative seating.
* AI-based seating recommendations.
* Handling non-binary constraints (e.g. "at most 3 from this group").

---

## 3. Contract

### 3.1 Public API

```ts
// lib/engine/index.ts
import { Plan } from '@/lib/schema/plan'

export interface GenerateOptions {
  seed?: number
  maxIterations?: number
}

export interface GenerationReport {
  mandatorySatisfied: ConstraintRef[]
  mandatoryUnsatisfied: ConstraintRef[]
  preferenceSatisfied: ConstraintRef[]
  preferenceUnsatisfied: ConstraintRef[]
  separationViolations: ConstraintRef[]
  seatedGuests: number
  unseatedGuests: number
  overflow: boolean
  durationMs: number
}

export interface ConstraintRef {
  constraintId: string
  a: string
  b: string
}

export interface GenerateOutput {
  assignments: Assignment[]
  report: GenerationReport
}

export function generateSeating(
  plan: Plan,
  options?: GenerateOptions
): GenerateOutput
```

The engine returns **assignments only**. The caller applies them to the plan; the rest of the plan (tables, guests, constraints, meta) is unchanged.

### 3.2 Inputs

* `plan.guests`, `plan.tables`, `plan.constraints`.
* Optional `options.seed` for deterministic shuffles (default: derived from a hash of the plan).
* Optional `options.maxIterations` (default: `200`).

### 3.3 Outputs

* `assignments` — list of `{ guestId, tableId, seatIndex }`.
* `report` — feedback on what was and was not satisfied.

If mandatory constraints are unsatisfiable, the engine **still returns assignments** plus a clear `report`. It does not throw.

### 3.4 Errors

The engine throws only on unrecoverable input errors:

* `EngineError("invalid_input")` — the plan fails validation.
* `EngineError("timeout")` — exceeds `maxIterations` without converging.

Both errors carry a code, never a stack trace string in the message.

---

## 4. Algorithm

The engine runs in five phases:

```text
1. Build constraint graph
2. Cluster guests (must_together groups)
3. Assign clusters to tables
4. Fill remaining seats
5. Local search refinement
```

### Phase 1 — Build constraint graph

From `plan.constraints`, build:

* `mustCluster` — union-find of `must_together` constraints. Each set becomes an inseparable group.
* `separation` — adjacency list of `must_not_together` pairs.
* `preference` — adjacency list with weights (default weight: `1.0`).

Detected impossibilities (in the input) are recorded for the report but do not abort:

* A `must_together` cluster larger than the largest table capacity.
* A `must_together` cluster containing a `must_not_together` edge (immediate conflict).

### Phase 2 — Cluster guests

* Each guest starts as a singleton cluster.
* Union-find merges guests connected by `must_together`.
* Result: `clusters: Cluster[]`, where each cluster has `size` and `memberIds[]`.

### Phase 3 — Assign clusters to tables

Greedy bin packing:

1. Sort clusters by `size` descending (largest first).
2. For each cluster, pick the table with the smallest remaining capacity that still fits the cluster, applying this precedence:
   1. Skip tables where any member would violate a `must_not_together` with an already-seated guest.
   2. Among valid tables, prefer the one with the smallest remaining capacity (best-fit).
   3. Tie-break deterministically by `tableId`.

If a cluster cannot fit anywhere, leave it unseated and record it.

### Phase 4 — Fill remaining seats

* Iterate unseated singleton guests.
* Use the same best-fit placement, also checking `must_not_together`.
* For `prefer_together` pairs, when both are unseated, prefer placing them at the same table if capacity allows.

### Phase 5 — Local search refinement

Iterative improvement:

```text
for i in 0..maxIterations:
  pick a random seated guest
  consider moving them to another table
  accept the move if it strictly improves the score
```

The function accepts a move only when:

* Capacity allows.
* No `must_not_together` violation is introduced.
* Score improves (see below).

Iteration stops when no improving move is found or `maxIterations` is reached.

---

## 5. Scoring

A plan is scored on a single integer scale. Higher is better.

```text
score = 100 * mandatorySatisfied
      +  10 * preferenceSatisfied
      - 1000 * separationViolations
      -    1 * spreadPenalty
```

Where:

* `mandatorySatisfied` — count of `must_together` pairs placed at the same table.
* `preferenceSatisfied` — count of `prefer_together` pairs placed at the same table.
* `separationViolations` — count of `must_not_together` pairs placed at the same table.
* `spreadPenalty` — sum over tables of `|seatsUsed - average|` (encourages balanced tables).

The weights are chosen so:

* Any `must_not_together` violation dominates any preference gain (overwhelmingly).
* Satisfying a mandatory pair is worth ten preferences.
* Spread is a tie-breaker, never blocks correctness.

The engine maximizes this score during local search.

---

## 6. Generation Report

The report is the user-facing feedback. It maps directly to the UI in `01-product.md` section 10.

```ts
interface GenerationReport {
  mandatorySatisfied: ConstraintRef[]
  mandatoryUnsatisfied: ConstraintRef[]
  preferenceSatisfied: ConstraintRef[]
  preferenceUnsatisfied: ConstraintRef[]
  separationViolations: ConstraintRef[]
  seatedGuests: number
  unseatedGuests: number
  overflow: boolean       // true if more guests than total capacity
  durationMs: number
}
```

### Mapping to UI

| Field                              | UI text                                          |
| ---------------------------------- | ------------------------------------------------ |
| `mandatorySatisfied.length === N`  | "All mandatory relationships respected" (N=M)    |
| `mandatoryUnsatisfied.length > 0`  | "X mandatory constraints could not be satisfied" |
| `separationViolations.length > 0`  | "X separation constraints violated"              |
| `preferenceSatisfied / total`      | "X / Y preferences satisfied"                   |
| `unseatedGuests > 0`               | "X guests could not be seated"                  |
| `overflow`                         | "Not enough seats — add tables or reduce guests" |

The UI never silently swallows a mandatory constraint. If any entry is non-empty in `mandatoryUnsatisfied` or `separationViolations`, the report is shown prominently, with a "Show conflict" action.

---

## 7. Determinism

The engine must be deterministic for a given `(plan, seed)`.

Rules:

* All iteration orderings (clusters, tables, candidates) are derived from sorted IDs.
* `Math.random()` is forbidden inside the engine.
* Randomness, where needed (e.g. picking candidates in local search), uses a tiny seeded PRNG (e.g. mulberry32) seeded with `options.seed` or a hash of the plan's `meta.updatedAt`.

This guarantees that running the engine twice on the same plan produces the same assignments, which keeps the UX predictable.

---

## 8. Capacity and Edge Cases

### Insufficient capacity

If `sum(table.capacity) < guests.length`:

* All guests are seated as best as possible.
* `overflow = true` in the report.
* `unseatedGuests` reflects the deficit.

### Clusters larger than any table

* The whole cluster is left unseated.
* Every `must_together` edge inside the cluster is listed in `mandatoryUnsatisfied`.

### Conflicting mandatory and separation constraints

* If `must_together(a, b)` and `must_not_together(a, b)` both exist, both are reported and the engine treats `must_together` as winning (a, b stay together), with a separation violation flagged.
* For larger conflicts (a cycle of `must_together` plus a `must_not_together` edge), the engine reports the cycle and leaves affected guests unseated.

### Empty inputs

* No guests: returns `{ assignments: [], report: zeroed }`.
* No tables: returns `{ assignments: [], report: { overflow: true, unseatedGuests: guests.length, ... } }`.

### Duplicate guest names

The engine does not care — it works on IDs. The UI surfaces duplicates separately.

---

## 9. Performance Budget

| Scenario              | Target  |
| --------------------- | ------- |
| 50 guests / 5 tables  | < 50 ms |
| 200 guests / 25 tables | < 500 ms |
| 500 guests / 50 tables | < 2 s   |

Practices to stay within budget:

* Union-find is `O(n α(n))` per cluster build.
* Phase 3 sort + scan is `O(t log t + n t)` in the worst case — fine for MVP scales.
* Local search is the dominant cost; cap at `maxIterations` (default 200) and short-circuit on no improvement.

If scaling becomes an issue, switch the local search to simulated annealing with a temperature schedule — kept behind a flag, not in MVP scope.

---

## 10. Testing the Engine

Unit tests cover, at minimum:

* Mandatory constraints are always satisfied when feasible.
* A `must_together` cluster larger than capacity is reported.
* `must_not_together` violations are never produced unless input is contradictory.
* Acyclic preferences are maximized.
* Score strictly improves (or plateaus) across local search iterations.
* Determinism: two runs with the same seed yield identical assignments.
* Empty inputs and single-table plans.

Fixtures live in `lib/engine/__fixtures__/`.

---

## 11. Public Function Reference

| Function                | Purpose                                          |
| ----------------------- | ------------------------------------------------ |
| `generateSeating`       | Main entry point described above.                |
| `scorePlan`             | Pure function: takes a plan + assignments, returns the score (for tests and UI ranking of alternative generations). |
| `detectConflicts`       | Pure function: returns the report for an existing assignment set (used to refresh the report after manual edits). |
| `validateInput`         | Internal; throws `EngineError` on bad input.     |

All four are exported from `lib/engine/index.ts`.

---

## 12. Open Engine Questions

1. **Weighted preferences** — currently all preferences have weight 1. Future: per-pair weight.
2. **Multiple iterations, pick best** — running the engine N times with different seeds and keeping the best. Not in MVP; could be a "regenerate" affordance.
3. **Interactive hints** — engine could highlight "move this guest to improve score by X". Post-MVP.
