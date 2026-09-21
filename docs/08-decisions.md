# Plan de Table — Decisions Log

## 1. Purpose

This document records architectural and product decisions made during the design of the application.

Each decision captures:

* **Context** — the problem or constraint that drove the choice.
* **Decision** — what we chose.
* **Consequences** — what we gain and what we accept as cost.

Decisions are immutable once recorded. Superseding a decision means writing a new entry that links back to the previous one.

If the project grows, individual decisions may be moved to `docs/adr/NNNN-title.md` files. For the MVP, a single chronological log is enough.

---

## 2. Format

Each entry follows this template:

```text
### D-NNN — Title (YYYY-MM-DD)

Status: Accepted | Superseded by D-NNN

Context
  ...

Decision
  ...

Consequences
  + ...
  - ...
```

`+` lines are gains, `-` lines are accepted costs.

---

## 3. Decisions

### D-001 — Local-first is mandatory (2026-01-12)

**Status:** Accepted.

**Context**
The product philosophy (`00-overview.md` § 2) says the application must feel "progressive": authentication and cloud persistence should not be required to try the app. We need a storage story that works without a backend.

**Decision**
The application must function fully for an anonymous user, with the active plan stored in browser `localStorage`. Cloud persistence is an optional layer added only when the user signs in.

**Consequences**
* Anonymous users have no cross-device sync. Accepted for MVP.
* Cloud sync logic must be additive — local is always the source of truth for the current session (see D-005).
* We accept the `localStorage` quota risk (mitigated by plan size, see D-007).

---

### D-002 — Seating engine is a pure, deterministic function (2026-01-12)

**Status:** Accepted.

**Context**
The seating engine is the most complex piece of business logic. We want it to be testable in isolation and predictable for users (same input -> same result).

**Decision**
The engine is a pure TypeScript module with no React, no DOM, no I/O, and no `Math.random()`. Where randomness is needed (local search tie-breaking), a seeded PRNG is used. The engine returns a complete `assignments` array plus a `GenerationReport`.

**Consequences**
* Engine tests are trivial: pure inputs -> pure outputs.
* UI rendering and persistence stay separate from generation.
* Running the engine twice with the same seed yields identical assignments — important for "regenerate" UX.
* We give up exotic search algorithms that rely on unseeded randomness; we accept this for the MVP scale (200 guests).

---

### D-003 — Engine algorithm: greedy packing + local search (2026-01-12)

**Status:** Accepted.

**Context**
We need to satisfy mandatory constraints, maximize preferences, and respect capacity. A real CSP solver would be ideal but is heavy for a small project.

**Decision**
Five-phase algorithm: build constraint graph, cluster guests by `must_together`, best-fit pack clusters into tables, fill remaining seats, run a local search to improve the score. See `04-seating-engine.md` § 4 for details.

**Consequences**
* Guaranteed fast (< 500 ms for 200 guests / 25 tables).
* Mandatory constraints are always satisfied when feasible; flagged when not.
* Result is heuristic, not provably optimal. We accept this.
* Code stays small (~300 lines) and easy to maintain.

---

### D-004 — Drag and drop library: `@dnd-kit/core` (2026-01-12)

**Status:** Accepted.

**Context**
The editor is the central feature and relies heavily on drag and drop. We need a library that works on touch, mouse, and keyboard.

**Decision**
Use `@dnd-kit/core` (plus `@dnd-kit/sortable` if needed later). Native HTML5 DnD is rejected: poor touch support, no keyboard a11y. `react-dnd` is rejected: more boilerplate, weaker React 18 / Server Components compatibility.

**Consequences**
* First-class keyboard accessibility (mandatory per `09-design-system.md`).
* Sensors are pluggable; we configure `PointerSensor` and `KeyboardSensor` explicitly.
* We accept a small dependency on `@dnd-kit`'s context model.

---

### D-005 — Sync model: last-write-wins, debounced fire-and-forget (2026-01-12)

**Status:** Accepted.

**Context**
Authenticated users want their plans available on multiple devices. We need to keep the local copy responsive and not block on network.

**Decision**
Local writes are awaited (sub-millisecond). Cloud writes are debounced 500 ms and fired in the background without awaiting. On cross-device conflicts, the cloud `updatedAt` newer than local triggers a non-blocking banner offering to load the remote copy.

**Consequences**
* The editor stays responsive even on slow networks.
* We accept that a user can lose recent edits if a different device wrote between local debounce and cloud save. We mitigate with the "stale plan" banner.
* No merge UI in MVP. Accepted.

---

### D-006 — Persistence: `localStorage` for MVP, IndexedDB deferred (2026-01-12)

**Status:** Accepted.

**Context**
`localStorage` is simple, synchronous, and broadly supported. IndexedDB is async, more complex, and supports much larger data.

**Decision**
Use `localStorage` for MVP. Plans in MVP are small (tens of KB). Migrate to IndexedDB only if real plans grow beyond quota.

**Consequences**
* Repository code stays simple and synchronous-feeling.
* Quota errors (`QuotaExceededError`) are handled with a clear user message.
* The repository abstraction (`PlanRepository`) is the only place that knows about storage; future IndexedDB migration is a localized change.

---

### D-007 — Schema versioning via in-place migrations on load (2026-01-12)

**Status:** Accepted.

**Context**
The data model will evolve. Users will have plans written with older versions stored locally and in the cloud.

**Decision**
Each plan carries `meta.schemaVersion`. On load, the repository runs migrations sequentially from the stored version to `CURRENT_VERSION`, then validates with zod. Migrations are forward-only.

**Consequences**
* No "migration wizard" UI is needed.
* Corrupted plans fail loudly with a recovery dialog (see `05-persistence.md` § 9).
* We commit to never silently drop user data; the recovery dialog is the fallback.

---

### D-008 — State management: React Context, no global store (2026-01-12)

**Status:** Accepted.

**Context**
Only one plan is open at a time. A global store (Redux, Zustand, Jotai) would add ceremony without solving a problem.

**Decision**
A single `<PlanProvider>` wraps the editor. All mutations dispatch through it via a reducer-style API. The repository is invoked by the provider on debounced mutations.

**Consequences**
* Tests for components can wrap a `PlanProvider` with a fixture plan.
* Adding more contexts is easy (`AuthProvider`, `ToastProvider`); adding another global store is rejected.
* Cross-component access to plan data goes through the context — no prop drilling beyond one level.

---

### D-009 — Constraints are unordered binary pairs (2026-01-12)

**Status:** Accepted.

**Context**
Constraints involve at most two guests. Modeling larger groups would explode the engine and UI complexity.

**Decision**
Constraints are always between two distinct guests, identified by their unordered IDs. At the persistence boundary, `(a, b)` is sorted lexicographically. Larger groups (e.g. "all the Smith family together") are expressed as multiple `must_together` edges.

**Consequences**
* The engine uses union-find; UI uses a simple list.
* A user wanting "Alice must sit with Bob and Carol" adds two edges: (Alice, Bob) and (Alice, Carol). Acceptable for MVP.
* The model does not preclude richer constraints in v2.

---

### D-010 — Authentication is optional, never gating (2026-01-12)

**Status:** Accepted.

**Context**
The product philosophy says authentication should not block core usage. We want auth where it adds value (cloud save, multi-device) without adding friction.

**Decision**
Anonymous use is the default. The auth widget sits in the top bar. Cloud features (save to cloud, list cloud plans) prompt for sign-in only when invoked.

**Consequences**
* No "you must sign in" page exists.
* The repository factory picks `LocalPlanRepository` for anonymous users.
* We commit to the local-first D-001 — auth can never become required.

---

### D-011 — Single language for MVP: French (2026-01-12)

**Status:** Accepted.

**Context**
The product name and copy examples are French. We have not invested in i18n infrastructure.

**Decision**
The MVP is French-only. `<html lang="fr">` is hardcoded. All visible copy is written in French.

**Consequences**
* No `next-intl` or similar dependency in MVP.
* If we add English later, the dependency on i18n primitives (no string concatenation, no hardcoded copy in components) is the migration cost.
* We document this clearly so we don't ship English by accident.

---

### D-012 — Server components by default, `"use client"` only when needed (2026-01-12)

**Status:** Accepted.

**Context**
`AGENTS.md` says to prefer server components when appropriate. We want to keep client JS small and avoid hydration cost.

**Decision**
Components are server-rendered unless they need `useState`, `useEffect`, DnD, or browser APIs. The repository interface works on both sides; server components `await` it, client components go through context.

**Consequences**
* Smaller client bundle.
* Some pages (entry, print) need no client JS at all.
* Server actions exist for the few cases where the client must trigger a server-side effect (create blank plan, sign-in).

---

### D-013 — Pan/zoom and multi-select deferred (2026-01-12)

**Status:** Accepted.

**Context**
A canvas-style editor often wants pan/zoom and multi-select. These add complexity to the layout, DnD, and selection model.

**Decision**
Not in MVP. Tables position freely on a fixed-size workspace. Selection is single. Keyboard accessibility works without multi-select.

**Consequences**
* Editor layout fits a desktop screen with up to ~30 tables without scrolling tricks.
* Multi-select can be added later as a non-breaking addition (selection set in editor state).
* Pan/zoom, when needed, becomes a separate workspace component.

---

### D-014 — Undo/redo: bounded action stack (2026-01-12)

**Status:** Accepted.

**Context**
`01-product.md` § 17 calls undo/redo desirable if it can be done cleanly.

**Decision**
The plan reducer keeps an in-memory history of the last 50 actions with inverse functions. Undo pops and applies the inverse; redo re-applies. Persistence is not affected by undo (undo is in-memory only).

**Consequences**
* Users can undo accidental drags, deletes, and bulk changes.
* Persistence layer is unaffected.
* A fresh page reload starts with no undo history.
* 50 actions is enough for typical sessions without bloating memory.

---

### D-015 — Real-time collaboration is out of scope (2026-01-12)

**Status:** Accepted.

**Context**
Realtime multi-user editing requires presence, operational transforms or CRDTs, and substantial infrastructure.

**Decision**
Not in MVP. The schema does not include presence or shared-edit fields; this leaves the door open for v2 without forcing it now.

**Consequences**
* Last-write-wins is sufficient (see D-005).
* No realtime subscription in `SupabasePlanRepository` for MVP.
* If added later, the data model needs only a `version` counter on each plan; the rest of the schema is compatible.

---

### D-016 — Test framework: Vitest + React Testing Library + Playwright (2026-01-12)

**Status:** Accepted.

**Context**
The engine is pure; components are interactive. We need both unit and e2e coverage.

**Decision**
* **Vitest** for unit tests (`lib/engine`, `lib/repo`, `lib/plan`).
* **React Testing Library + Vitest** for component tests.
* **Playwright** for e2e flows (anonymous happy path, sign-in round-trip, generation report).

**Consequences**
* One runner for unit + component (Vitest), one for e2e (Playwright).
* Tests live next to the code under test (`*.test.ts` co-located).
* CI runs unit + component on every PR, e2e on main.

---

### D-017 — PDF export reuses browser print (2026-01-12)

**Status:** Accepted.

**Context**
`01-product.md` § 16 says PDF export can rely on the browser's native print-to-PDF.

**Decision**
No dedicated PDF library in MVP. The print view (`/plan/[planId]/print`) is the source for both paper printing and PDF export via the browser dialog.

**Consequences**
* One stylesheet to maintain (`print.css`).
* We rely on browser print quality, which is good in modern Chromium and Safari.
* A custom PDF generator (e.g. server-side) can be added later as an additional export option.

---

## 4. How to Add a Decision

1. Copy the template from § 2.
2. Number it sequentially (`D-NNN`).
3. Write the entry at the bottom of § 3.
4. If it supersedes a previous decision, mark the old one `Superseded by D-NNN` and add a `See also` link in the new entry.
5. Keep entries short — context, decision, consequences. No prose essays.

---

## 5. Topics Deliberately Not Decided Yet

These are tracked as open questions in other docs but not as decisions:

* Engine weights (currently hardcoded; D-003 says heuristic, not optimal).
* Empty-state copy — owned by product, not architecture.
* Error message wording — owned by UX, owned once `09-design-system.md` is finalized.
