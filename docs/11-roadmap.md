# Plan de Table — Roadmap

## 1. Purpose

This document defines the implementation order for the MVP.

The project documentation is complete (`00-overview` → `10-interactions`) and the architectural decisions are recorded in `08-decisions.md`. This roadmap turns that design into a sequenced build plan.

Each step:

* Produces a runnable, verifiable artifact.
* Unblocks the next step.
* Stays small enough to review in one pass.

---

## 2. Status

| Step | Title                                  | Status      | Depends on      |
| ---- | -------------------------------------- | ----------- | --------------- |
| 1    | Scaffold Next.js + stack               | **Next**    | —               |
| 2    | Data model + local repository          | **Next**    | 1               |
| 3    | Seating engine (pure, TDD)             | Done        | 2               |
| 4    | UI primitives + design tokens          | Done        | 1               |
| 5    | Plan context, reducer, actions, history| Done        | 2, 4            |
| 6    | Entry page (`/`)                       | Done        | 5               |
| 7    | Editor shell + TopBar + PlanStatsBar   | Done        | 5               |
| 8    | Guest management                       | Done        | 7               |
| 9    | Table management                       | Done        | 7               |
| 10   | Seating editor canvas (DnD)            | Done        | 7, 8, 9         |
| 11   | Constraints UI                         | Done        | 8, 10           |
| 12   | Auto-generation + report dialog        | Done        | 3, 11           |
| 13   | Print view                             | Done        | 7               |
| 14   | JSON project import/export             | Planned     | 2, 5, 6        |
| 15   | Release validation: mobile, a11y, responsive | Planned | 1–14          |

---

## 3. Steps in Detail

### Step 1 — Scaffold Next.js + stack

Bootstrap the project skeleton.

* `create-next-app` (App Router, TypeScript strict, Tailwind, no `src/` flag — we add `src/` manually to match `02-architecture.md`).
* Install runtime deps justified by decisions: `zod`, `@dnd-kit/core`, `@dnd-kit/utilities`, `lucide-react`.
* Install dev deps: `vitest`, `@testing-library/react`, `@testing-library/user-event`.
* Configure `tailwind.config.ts` with design tokens from `09-design-system.md` § 4–8 (colors, spacing, radii, shadows, font families).
* Configure `globals.css`: Tailwind base + reduced-motion rule (`10-interactions.md` § 15).
* Create the `src/` folder structure exactly as defined in `02-architecture.md` § 5 (empty placeholder files allowed).
* Configure static export and the GitHub Pages base path. No application secrets or backend environment variables are required.
* Establish mobile-first defaults: narrow portrait layout, 44 px minimum controls, no hover-only actions, and responsive behavior from the first screen.

**Validation gate:** `npm run dev` serves a blank page, `npm run build` succeeds, `npm run lint` clean, `tsc --noEmit` clean.

---

### Step 2 — Data model + local repository

The persistence foundation. Everything that reads or writes a plan goes through this layer.

* `src/lib/schema/plan.ts` — zod schemas (`PlanSchema`, `GuestSchema`, `TableSchema`, `ConstraintSchema`, `AssignmentSchema`, `TableShape`, `ConstraintKind`, `PlanMeta`).
* `src/lib/schema/migrations.ts` — `CURRENT_VERSION = 1`, `migrate(raw)` runs migrations from stored version to current.
* `src/lib/repo/types.ts` — `PlanSummary`, `PlanRepository` interface (per `05-persistence.md` § 3).
* `src/lib/repo/indexed-db.ts` — `IndexedDbPlanRepository` with `list`, `load`, `save`, and `remove`.
* `src/lib/repo/project-file.ts` — versioned JSON project export/import helpers.
* `src/lib/repo/index.ts` — browser repository entry point; no remote fallback.
* `src/lib/repo/errors.ts` — `RepoError` with codes (`not_found`, `quota`, `unavailable`, `corrupt`, `unknown`).
* `src/lib/id.ts` — `newId()` wrapping `crypto.randomUUID()`.
* `src/types/plan.ts` — re-exports from `lib/schema/plan`.
* Vitest unit tests: schema round-trips, invariant rejections, migration identity, local repo CRUD, quota error, index update.

**Validation gate:** Vitest suite green. Manual smoke: create a plan in Node, save via repo, reload, assert equality.

---

### Step 3 — Seating engine (pure, TDD)

The complex business logic, isolated and tested first.

* `src/lib/engine/types.ts` — `GenerateOptions`, `GenerationReport`, `ConstraintRef`, `GenerateOutput`.
* `src/lib/engine/score.ts` — `scorePlan(plan, assignments)` per `04-seating-engine.md` § 5.
* `src/lib/engine/conflicts.ts` — `detectConflicts(plan)` (used by UI after manual edits).
* `src/lib/engine/generate.ts` — five-phase algorithm per `04-seating-engine.md` § 4. Seeded PRNG (mulberry32). Deterministic for `(plan, seed)`.
* `src/lib/engine/errors.ts` — `EngineError("invalid_input" | "timeout")`.
* `src/lib/engine/index.ts` — public surface.
* `src/lib/engine/__fixtures__/` — minimal plans for tests.
* Vitest unit tests covering all cases in `04-seating-engine.md` § 10.

**Validation gate:** Vitest suite green. Benchmark: 200 guests / 25 tables generates in < 500 ms.

---

### Step 4 — UI primitives + design tokens

The dumb building blocks. No plan-specific types.

* `src/components/ui/` per `07-components.md` § 4: `Button`, `IconButton`, `Input`, `TextArea`, `Select`, `Modal`, `Toast`, `Badge`, `EmptyState`, `Spinner`, `Separator`, `VisuallyHidden`.
* `src/components/ui/ToastProvider.tsx` — toast queue used by root layout.
* Visual rules per `09-design-system.md` § 11.
* Tests via Testing Library for visual primitives (renders, variants, sizes).

**Validation gate:** Storybook-free; component tests pass.

---

### Step 5 — Plan context, reducer, actions, history

The single source of truth for an open plan.

* `src/lib/plan/context.tsx` — `<PlanProvider initialPlan>` with debounced autosave.
* `src/lib/plan/usePlan.ts` — typed hook returning `{ plan, dispatch }`.
* `src/lib/plan/selectors.ts` — derived stats: `seatedCount`, `unseatedGuests`, `conflicts`, etc.
* `src/lib/plan/actions.ts` — exhaustive action types (`addGuest`, `updateGuest`, `removeGuest`, `addTable`, `updateTable`, `removeTable`, `moveGuest`, `unseatGuest`, `addConstraint`, `removeConstraint`, `generateSeating`, `undo`, `redo`, `renamePlan`).
* `src/lib/plan/reducer.ts` — immutable updates + history stack (50 entries, D-014). Each action carries an `inverse` action.
* `src/lib/plan/cn.ts` — `cn(...)` className helper.
* Tests for reducer transitions and history behavior.

**Validation gate:** Reducer tests green. History (undo/redo) verified end-to-end in component tests.

---

### Step 6 — Entry page (`/`)

* `src/app/page.tsx` (client): reads `IndexedDbPlanRepository.list()`, renders `<PlanList>` with "Nouveau plan" CTA.
* `createBlankPlan()` is a client-side helper that calls `IndexedDbPlanRepository.save(plan)`, sets the active-plan preference, and `router.push('/editor')`.
* `src/components/layout/PlanList.tsx` (client) — rows with Open / Rename / Delete / Duplicate (Delete with confirm).
* Empty state when no plans.

**Validation gate:** Page renders and remains usable at common phone widths in portrait orientation. Creating a plan navigates to its editor URL without requiring a mouse.

---

### Step 7 — Editor shell + TopBar + EditorLayout + PlanStatsBar

* `src/app/editor/page.tsx` (client, see D-019): reads `weeding-planner:active-plan`, loads via repo, redirects to `/` on miss, passes to `<PlanProvider>`. Inline `<EditorSkeleton>` and inline error state — no `loading.tsx` / `error.tsx` because the page is fully client.
* `src/components/layout/TopBar.tsx` (client) — plan name (click to rename), save indicator (`saved` / `saving` / `error`).
* `src/components/layout/EditorLayout.tsx` — two-column on `lg+`, tab-switcher below.
* `src/components/plan-status/PlanStatsBar.tsx` — guests, tables, seated/unseated, conflicts.

**Validation gate:** Editor route loads with placeholder data and shows all chrome.

---

### Step 8 — Guest management

* `src/components/guests/GuestListPanel.tsx` (client) — search input + counts.
* `src/components/guests/GuestSearchInput.tsx` — debounced 150 ms.
* `src/components/guests/GuestList.tsx` — Unseated / Seated sections.
* `src/components/guests/GuestRow.tsx` — click to select.
* `src/components/guests/GuestEditor.tsx` — form (create / edit / delete). Delete confirmation per `10-interactions.md` § 12.

**Validation gate:** CRUD on guests works, selection updates the right-side panel, counts update.

---

### Step 9 — Table management

* `src/components/tables/TablesToolbar.tsx` — Add table, Bulk configure.
* `src/components/tables/TableConfigSheet.tsx` — edit name, shape, capacity.
* `src/components/tables/BulkTableConfig.tsx` — default capacity / shape for new and existing tables.
* Capacity shrink that would orphan guests triggers confirmation per `10-interactions.md` § 12.

**Validation gate:** Add/edit/delete tables works; bulk apply updates all tables.

---

### Step 10 — Seating editor canvas (DnD)

The heart of the application.

* `src/components/editor/SeatingEditor.tsx` (client) — hosts two parallel `DndContext`s (guests and tables, `10-interactions.md` § 3).
* `src/components/editor/Workspace.tsx` — droppable surface for tables.
* `src/components/editor/TableCard.tsx` (client) — round / rectangle shapes; seats as droppables; header is the drag handle.
* `src/components/editor/SeatSlot.tsx` — droppable with stable ID `seat:{tableId}:{n}`.
* `src/components/editor/GuestChip.tsx` — compact (list) and card (canvas) presentations; draggable.
* `src/components/editor/DragGhost.tsx` — overlay using `DragOverlay`.
* Sensors: `PointerSensor` (6 px activation), `KeyboardSensor` (mandatory).
* Touch-safe drag behavior: preserve page scrolling, show active/drop feedback without hover, and expose action-based move/assign alternatives.
* Auto-scroll near workspace edges on touch and pointer devices where it does not conflict with page scrolling.
* Per `09-design-system.md` § 12 visual rules (dotted grid, no shadow on tables).

**Validation gate:** On a phone in portrait orientation, assign and move a guest, unseat a guest, move a table, and complete the same workflows with keyboard and mouse on desktop. No core action depends on hover.

---

### Step 11 — Constraints UI

* `src/components/constraints/ConstraintsPanel.tsx` — constraints for selected guest (or all if none).
* `src/components/constraints/ConstraintRow.tsx` — icon + label + names.
* `src/components/constraints/AddConstraintMenu.tsx` — pick target guest + kind; reject self / duplicate pairs / `must_together` vs `must_not_together` conflicts.
* Wire `detectConflicts` to run on every dispatch (`10-interactions.md` § 14); show inline warning badge + toast with `Keep anyway` / `Undo`.

**Validation gate:** Adding/removing constraints updates engine state; manual conflict warning fires correctly.

---

### Step 12 — Auto-generation + report dialog

* "Generate seating plan" button in `TablesToolbar`.
* Calls `engine.generate(currentPlan)` via context action.
* `src/components/plan-status/GenerationReportDialog.tsx` — maps `GenerationReport` to copy per `04-seating-engine.md` § 6 and `01-product.md` § 10. Actions: `Apply`, `Regenerate`, `Discard`.
* Undo of `generateSeating` restores previous assignments exactly (D-014 + `10-interactions.md` § 9).

**Validation gate:** Generation respects mandatory constraints when feasible; report copy matches spec; undo restores.

---

### Step 13 — Print view

* `src/app/print/page.tsx` (client, see D-019) — reads the active-plan preference from IndexedDB, loads the plan, and renders `<PrintLayout>` + one `<PrintTable>` per table.
* `src/components/print/PrintLayout.tsx`, `src/components/print/PrintTable.tsx`.
* `src/styles/print.css` — `@media print` rules hide chrome, set black on white (D-017).
* Browser print dialog = PDF export (D-017).

**Validation gate:** `/print` renders cleanly for an active plan; browser print preview matches design.

---

### Step 14 — JSON project import/export

Add portability without adding a backend.

* Implement `ProjectFile` validation, migration, and deterministic JSON serialization.
* Add `ProjectActions` with Export and Import controls.
* Import as a new plan by default and activate it only after a successful IndexedDB transaction.
* Surface malformed, unsupported, and storage-failure errors without modifying existing plans.

**Validation gate:** Export → clear browser storage → import restores an identical plan. Malformed and future-version files are rejected without data loss.

---

### Step 15 — Release validation: mobile, accessibility, responsive behavior

* No automated e2e runner (per D-018). Maintain `docs/13-smoke-checks.md` with the manual checklist:
  local happy path (create plan → add guests → add tables → drag seat → generate → print), mandatory-constraint generation report, export/import round-trip.
* Component test coverage for interactive components via Vitest + Testing Library.
* A11y audit: contrast, keyboard parity, focus-visible, `prefers-reduced-motion`, hit targets ≥ 44 px, `aria-label` on seats and tables.
* Mobile smoke checks on modern smartphones: portrait and landscape, touch-only core workflow, no horizontal overflow, readable dialogs, keyboard not required for touch users.
* Responsive check at common phone widths and `sm` / `md` / `lg`; desktop must retain efficient two-column editing.

**Validation gate:** Vitest suite green. Manual review against `09-design-system.md` and the smoke checklist.

---

## 4. Dependency Graph

```text
[1 Scaffold]
    │
    ├──> [4 UI primitives] ──┐
    │                        │
    └──> [2 Data model + repo]
              │
              ├──> [3 Engine] ────────────────┐
              │                               │
              └──> [5 Context/reducer] <──────┤
                         │                    │
                         ├──> [6 Entry page]   │
                         │                    │
                         └──> [7 Editor shell] │
                                   │           │
                                   ├──> [8 Guests]
                                   ├──> [9 Tables]
                                   ├──> [10 DnD editor]
                                   │       │
                                   │       v
                                   ├──> [11 Constraints]
                                   │       │
                                   │       v
                                   │   [12 Generation + report]
                                   │
                                   └──> [13 Print view]

[14 JSON import/export] ──> additive to [2], [5], and [6]

[15 E2E + polish] ──> validates 1–13
```

---

## 5. Open Questions for Roadmap

1. **Storybook** — not adopted; component tests are enough for MVP.
2. **CI** — out of scope of the roadmap; assumed to live outside the repo.
3. **i18n** — explicitly deferred per D-011. French-only for MVP.

---

## 6. How to Update This Document

* When a step is started, change its Status from `Planned` to `In progress`.
* When a step is completed and its validation gate passes, change its Status to `Done` and append a one-line note with the commit hash.
* When scope changes, update the affected step *and* the dependency graph.
* New steps are appended at the end (status `Planned`).
