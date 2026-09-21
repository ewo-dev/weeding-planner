# Plan de Table — Architecture

## 1. Purpose

This document describes the technical architecture of the application.

It defines:

* The overall structure of the codebase.
* How the application is split between client and server.
* How state flows through the system.
* How persistence is wired.
* Where the seating engine lives.

Product rules and feature scope are defined in `00-overview.md` and `01-product.md`.
The data model entities are defined in `03-data-model.md`.
Persistence details are defined in `05-persistence.md`.

---

## 2. Guiding Principles

The architecture must support the product philosophy:

* **Simple** — minimal moving parts, no premature abstractions.
* **Local-first** — the application must work fully without a backend.
* **Progressive** — authentication and cloud sync are optional layers on top of a local core.
* **Visual** — the seating editor is the central feature; everything else supports it.
* **Mobile-first** — UI primitives and layouts default to small screens, then scale up.

Concretely:

* Prefer server components by default.
* Client components only where required (interactivity, drag & drop, local state).
* Avoid introducing dependencies without a clear reason.
* Keep components small and reusable.

---

## 3. Tech Stack

The stack is fixed by `AGENTS.md`:

* **Next.js** (App Router) — routing, server components, server actions.
* **TypeScript** — strict typing for the data model and engine.
* **Tailwind CSS** — styling, mobile-first utility-first CSS.
* **Supabase** — authentication and cloud persistence (optional layer).

Additional libraries are only added when justified:

* **Drag & drop** — `@dnd-kit/core` (preferred for accessibility and headless control).
* **State** — React local state + URL state. No global store required for MVP.
* **IDs** — `crypto.randomUUID()` (native, no dependency).
* **Persistence (local)** — `localStorage` via a thin typed wrapper.
* **Schema validation** — `zod` for engine inputs/outputs and persisted plan validation.

---

## 4. High-Level Architecture

```text
+--------------------------------------------------------------+
|                          Browser                             |
|                                                              |
|  +----------------+    +----------------+    +------------+  |
|  |  Entry / List  |--->|  Seating Plan  |--->| Print View |  |
|  |  (server comp) |    |   (client)     |    | (server)   |  |
|  +----------------+    +----------------+    +------------+  |
|           |                     |                            |
|           v                     v                            |
|  +----------------+    +----------------+                    |
|  |  Local Store   |    |  Plan Context  |                    |
|  |  (localStorage)|    |   (React)      |                    |
|  +----------------+    +----------------+                    |
|           |                     |                            |
|           +----------+-----------+                            |
|                      v                                       |
|              +----------------+                               |
|              |  Plan Repo     |                               |
|              |  (adapter)     |                               |
|              +----------------+                               |
+----------------------+---------------------------------------+
                       | (only when authenticated)
                       v
                +--------------+
                |   Supabase   |
                |  Auth + DB   |
                +--------------+
```

Key points:

* The seating plan UI runs entirely on the client.
* Persistence is behind a single `PlanRepository` interface.
* Two implementations: `LocalPlanRepository` (always active) and `SupabasePlanRepository` (active when signed in).
* The seating engine is a pure function module — no React, no I/O.

---

## 5. Project Structure

```text
src/
  app/                          # Next.js App Router
    layout.tsx                  # Root layout (server)
    page.tsx                    # Entry / plan list (server)
    plan/
      [planId]/
        page.tsx                # Plan editor (server shell + client editor)
        print/
          page.tsx              # Print-friendly view (server)
    api/                        # (reserved) server actions / route handlers

  components/                   # Reusable UI components
    editor/                     # Seating editor pieces
    guests/                     # Guest list, guest row
    tables/                     # Table card, table shape
    constraints/                # Constraint rows and editors
    ui/                         # Primitives: Button, Input, Modal, Toast...

  lib/
    engine/                     # Seating generation engine (pure)
      types.ts
      score.ts
      generate.ts
      conflicts.ts
      index.ts
    repo/                       # Plan repository
      types.ts                  # PlanRepository interface
      local.ts                  # LocalPlanRepository
      supabase.ts               # SupabasePlanRepository
      index.ts                  # Factory: pick implementation
    schema/                     # zod schemas + migration helpers
      plan.ts
      migrations.ts
    plan/                       # Plan context, hooks, derived selectors
      context.tsx
      usePlan.ts
      selectors.ts
    auth/                       # Supabase auth client + hooks
      client.ts
      useUser.ts
    id.ts                       # uuid helper
    cn.ts                       # className helper

  styles/
    globals.css                 # Tailwind base + tokens
    print.css                   # Print-only rules

  types/
    plan.ts                     # Re-exports from lib/schema/plan
```

Notes:

* `app/` is thin: it composes pages from `components/` and `lib/`.
* `lib/engine/` is pure TypeScript, framework-free, fully unit-testable.
* `lib/repo/` is the only place that talks to storage.
* `components/` never talks to storage directly — they go through plan context.

---

## 6. Client vs Server Boundary

Default rule: **server component unless interactivity is required.**

### Server components (default)

* Root layout.
* Entry page (`app/page.tsx`).
* Plan editor shell (`app/plan/[planId]/page.tsx`).
* Print view (`app/plan/[planId]/print/page.tsx`).

### Client components (`"use client"`)

* The seating editor canvas and its drag & drop logic.
* Guest list with search/filter.
* Constraint editor.
* Any component using `useState`, `useEffect`, drag events, or browser APIs.
* Auth widget.

### Boundary contract

* Server components fetch data via the repository and pass plain props down.
* Client components receive data as props and read/write through plan context.
* The plan context is provided at the top of any client subtree that edits a plan.

---

## 7. State Management

### Layers

1. **URL state** — current plan ID, current view (editor / print).
2. **Plan state** — the in-memory `Plan` object (the only mutable state of consequence).
3. **UI state** — selection, dragged item, open modals. Local to the editor.
4. **Auth state** — Supabase session, provided through a small `useUser()` hook.

### Plan state — single source of truth

* One `PlanContext` wraps the editor.
* All mutations go through reducer-style actions exposed by the context.
* The repository observes the context (or is invoked by actions) to persist changes.

### Why no global store

* Only one plan is open at a time.
* A single context covers every component that needs the plan.
* Adding Redux/Zustand would be premature complexity.

---

## 8. Data Flow

### Reading a plan

```text
URL: /plan/[planId]
  |
  v
Server component loads plan via repository (local first, then cloud)
  |
  v
Pass plan as prop to <PlanProvider initialPlan={...}>
  |
  v
Client editor reads plan from context
```

### Editing a plan

```text
User action (drag guest, edit table, etc.)
  |
  v
Dispatch action through PlanContext
  |
  v
Reducer updates plan immutably
  |
  v
Repository autosaves (debounced) to active backend
  |
  v
UI re-renders from new context value
```

### Auto-generation

```text
User clicks "Generate seating plan"
  |
  v
PlanContext calls engine.generate(currentPlan)
  |
  v
Engine returns { plan, report }
  |
  v
Reducer applies plan
  |
  v
Report shown in UI (satisfied / unsatisfied constraints)
```

The engine is pure: same input -> same output, no side effects.

---

## 9. Persistence Layer

The repository interface (`lib/repo/types.ts`):

```ts
interface PlanRepository {
  list(): Promise<PlanSummary[]>
  load(id: string): Promise<Plan | null>
  save(plan: Plan): Promise<void>
  remove(id: string): Promise<void>
}
```

Implementations:

* `LocalPlanRepository` — uses `localStorage`, always available.
* `SupabasePlanRepository` — uses Supabase tables + RLS.

Selection:

* Anonymous user -> `LocalPlanRepository`.
* Authenticated user -> both available; UI exposes a "Save to cloud" toggle.
  By default, the local repo stays active so the app remains responsive offline.

Detailed rules, schema, and migration strategy: see `05-persistence.md`.

---

## 10. Seating Engine

The seating engine is a pure TypeScript module under `lib/engine/`.

Properties:

* No React, no DOM, no I/O.
* Deterministic for the same input (no `Math.random` without a seed).
* Returns both a plan and a report describing satisfied/unsatisfied constraints.

```ts
type GenerateInput = {
  guests: Guest[]
  tables: Table[]
  constraints: Constraint[]
  options?: { seed?: number; maxIterations?: number }
}

type GenerateOutput = {
  plan: SeatingAssignment[]
  report: GenerationReport
}
```

Detailed algorithm, scoring, and conflict reporting: see `04-seating-engine.md`.

---

## 11. Drag & Drop

* Library: `@dnd-kit/core`.
* Two drag layers:
  * **Guest -> table seat** (within the editor).
  * **Table -> workspace** (positioning).
* Sensors:
  * `PointerSensor` for mouse/touch.
  * `KeyboardSensor` for accessibility (mandatory).
* Droppable IDs follow a stable convention:
  * Seat: `seat:{tableId}:{seatIndex}`.
  * Workspace cell (for table positioning): `workspace`.
* All DnD mutations flow through plan context actions — never directly mutating state.

Detailed interaction rules: see `09-interactions.md` (when written).

---

## 12. Error Handling

Two surfaces:

* **User-facing errors** — friendly text, surfaced through a `Toast` or inline empty state.
* **Developer errors** — thrown exceptions, logged via `console.error` for the MVP.

The repository and engine throw typed errors:

* `EngineError` — unrecoverable engine failure (invalid input, timeout).
* `RepoError` — persistence failure (quota, network, auth).

The UI maps these to messages without exposing stack traces.

---

## 13. Testing Strategy (overview)

* **Unit** — `lib/engine/**` (pure functions, easy to cover).
* **Component** — `components/**` (React Testing Library).
* **End-to-end checks** — manual smoke flows documented per release (no automated e2e runner — see D-018):
  * Anonymous user can build a plan end-to-end.
  * Auto-generation respects mandatory constraints.
  * Cloud save and reload round-trip works.

Detailed plan: see `11-testing.md` (when written).

---

## 14. Performance

Targets for the MVP:

* Editor remains at 60 fps while dragging a guest (up to 200 guests, 25 tables).
* Initial editor render under 200 ms on a mid-range mobile device.
* Auto-generation completes in under 500 ms for 200 guests / 25 tables.

Practices:

* Memoize expensive selectors in plan context.
* Virtualize guest list when count exceeds 100.
* Avoid heavy CSS effects in the editor canvas.

---

## 15. Open Architectural Questions

These are intentionally left open and tracked here:

1. **Auto-save cadence** — debounce window to settle before deciding.
2. **Multi-device conflict resolution** — last-write-wins vs explicit merge UI. MVP target: last-write-wins with a clear "stale plan" warning.
3. **Undo/redo scope** — full plan snapshots vs action stack. MVP target: action stack with bounded history.
4. **Real-time collaboration** — explicitly out of scope; the schema should not preclude it later.
