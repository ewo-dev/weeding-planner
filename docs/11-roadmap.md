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
| 14   | JSON project import/export             | Done        | 2, 5, 6        |
| 15   | Table detail panel / bottom sheet              | Done     | 7, 9, 10      |
| 16   | Canvas selection & emphasis for tables         | Done    | 15            |
| 17   | Guest list filters, sort, and table assignment | Done     | 7, 8          |
| 18   | Mobile placement flow (list → table → seat)    | Done    | 15, 17        |
| 19   | Capacity feedback & full-table handling        | Done     | 9, 15, 18     |
| 20   | Print redesign (A4 blocks + alphabetical index)| Done     | 7, 13         |
| 21   | Update smoke checks and component tests        | Planned     | 15–20         |
| 22   | Release validation: mobile, a11y, responsive   | Planned     | 1–21          |

**Note after UX challenge:** Steps 8–10 and 13 are functionally implemented but do not yet satisfy the UX direction in section 6. Steps 15–21 cover the rework and must be completed before release validation.

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

### Step 15 — Table detail panel / bottom sheet

Add a dedicated table detail view that makes a table's guests readable and manageable, especially on mobile.

* `src/components/tables/TableDetailPanel.tsx` (desktop side panel).
* `src/components/tables/TableDetailSheet.tsx` (mobile bottom sheet).
* Shows table name, shape, capacity, occupancy, seated guests with seat numbers, empty seats, and per-guest actions (remove, reassign).
* Selecting a table in `TableList` or on the canvas opens the detail view.
* Selecting a guest in the detail offers actions to move or remove them.

**Validation gate:** Tapping a table shows its complete guest list and empty seats; actions dispatch correctly and are undoable.

---

### Step 16 — Canvas selection & emphasis for tables

Make table selection visible on the canvas and connect the canvas to the detail view.

* `TableCard` accepts a `selected` prop and renders a stronger emphasis ring.
* `Workspace` tracks selected table id in local UI state and passes it to each `TableCard`.
* Click/tap on a table surface opens the detail view instead of (or in addition to) starting a drag; the drag handle is limited to the table header/label area.

**Validation gate:** Selecting a table in the list highlights it on the canvas; tapping a table on desktop opens the side panel and on mobile opens the bottom sheet.

---

### Step 17 — Guest list filters, sort, and table assignment display

Refactor the guest list so large lists are comfortable to navigate.

* `GuestListPanel` adds filter chips: Tous / Non placés / Placés / Par table / Par groupe.
* `GuestListPanel` adds a sort select: Nom / Groupe / Table / Récemment ajouté.
* `GuestRow` always shows the assigned table name clearly when seated.
* `GuestRow` shows a prominent "Placer" action for unseated guests.
* "Par table" view groups seated guests under their table name.

**Validation gate:** Filters and sort update the list immediately; a seated guest's table is visible without opening the editor.

---

### Step 18 — Mobile placement flow (list → table → seat)

Replace drag-and-drop as the primary mobile path with a clear list-driven placement flow.

* Tapping "Placer" on an unseated `GuestRow` opens a bottom sheet.
* The sheet first lists tables with occupancy; tapping a table shows its empty seats.
* Tapping a seat dispatches `moveGuest`.
* Optionally auto-assign to the first empty seat with a confirmation step.
* The same flow is reachable from the table detail view ("Ajouter un invité").

**Validation gate:** On a 390 px phone, an unseated guest is placed in three taps without dragging.

---

### Step 19 — Capacity feedback & full-table handling

Make table capacity limits visible and prevent silent failures.

* Full tables show a "Complète" badge in the list, detail view, and placement sheet.
* Dropping a guest onto a full table shows a toast: "Cette table est complète. Retirez un invité ou augmentez la capacité."
* The placement sheet disables or skips full tables.
* Reducing capacity below seated count shows a confirmation that moves surplus guests to unseated.

**Validation gate:** A full table cannot be silently overfilled; capacity shrink with seated guests shows a clear choice and result.

---

### Step 20 — Print redesign (A4 blocks + alphabetical index)

Redesign `/print` as a paper-first output.

* `src/components/print/PrintLayout.tsx` renders a header, one `PrintTable` block per table, an unseated section, and an alphabetical guest index.
* `src/components/print/PrintTable.tsx` shows name, shape, occupancy, seated guests with seat numbers, and empty seats as "Place libre".
* `src/styles/print.css` removes shadows, backgrounds, and UI chrome; forces black on white; uses `break-inside-avoid` per table block.
* Optimize for A4 portrait; verify US Letter preview.

**Validation gate:** A4 portrait print preview shows every table block without clipping and includes the alphabetical guest index.

---

### Step 21 — Update smoke checks and component tests

Reflect the new flows in tests and the manual checklist.

* Update `docs/13-smoke-checks.md` sections 4, 5, 9, and 10.
* Add/update component tests for `TableDetailPanel`, `TableDetailSheet`, `GuestList` filters/sort, `MoveGuestSheet`, and capacity feedback.
* Add release-a11y checks for bottom sheets and list-driven placement.

**Validation gate:** Vitest suite green; `docs/13-smoke-checks.md` covers list-driven placement, table detail, capacity feedback, and print output.

---

### Step 22 — Release validation: mobile, accessibility, responsive behavior

* No automated e2e runner (per D-018). Maintain `docs/13-smoke-checks.md` with the manual checklist:
  local happy path (create plan → add guests → add tables → place guests via list → generate → print), mandatory-constraint generation report, export/import round-trip.
* Component test coverage for interactive components via Vitest + Testing Library.
* A11y audit: contrast, keyboard parity, focus-visible, `prefers-reduced-motion`, hit targets ≥ 44 px, `aria-label` on seats and tables.
* Mobile smoke checks on modern smartphones: portrait and landscape, touch-only core workflow, no horizontal overflow, readable dialogs/bottom sheets, keyboard not required for touch users.
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
                                   ├──> [8 Guests] ────────┐
                                   │                       │
                                   ├──> [9 Tables] ────┐   │
                                   │                   │   │
                                   ├──> [10 DnD editor]│   │
                                   │       │           │   │
                                   │       v           │   │
                                   ├──> [11 Constraints]│   │
                                   │       │           │   │
                                   │       v           │   │
                                   │   [12 Generation] │   │
                                   │                   │   │
                                   └──> [13 Print view]│   │
                                                       │   │
                              [15 Table detail] <──────┘   │
                                  │                        │
                                  ├──> [16 Canvas emphasis]│
                                  │                        │
                              [17 Guest list rework] <─────┘
                                  │
                                  ├──> [18 Mobile placement]
                                  │
                              [19 Capacity feedback]
                                  │
                              [20 Print redesign]
                                  │
                              [21 Tests + smoke checks]
                                  │
                                  v
                              [22 Release validation]

[14 JSON import/export] ──> additive to [2], [5], and [6]

[22 Release validation] ──> validates 1–21
```

---

## 5. Open Questions for Roadmap

1. **Storybook** — not adopted; component tests are enough for MVP.
2. **CI** — out of scope of the roadmap; assumed to live outside the repo.
3. **i18n** — explicitly deferred per D-011. French-only for MVP.

---

## 6. UX / Product Challenge Outcomes

This section records the result of a deliberate UX challenge before the next implementation phase. It supersedes or clarifies earlier assumptions in `01-product.md`, `09-design-system.md`, and the roadmap steps below where they conflict.

---

### 6.1 UX findings

1. **The visual canvas is decorative but not readable on mobile.**
   - Guest names on `SeatSlot` are reduced to initials; a user cannot read who sits where without tapping each seat.
   - Round tables with more than ~8 seats grow large and force canvas scrolling on small screens.
   - Selecting a table on the canvas starts a drag; there is no selection or detail affordance.

2. **Drag-and-drop is not the right primary interaction for phones.**
   - The 44 px seat targets are small when surrounded by many seats.
   - Moving a guest from the guest list to a distant table requires precise pan/scroll + drag.
   - An action-based "Placer" flow exists but is buried behind a small icon.

3. **The guest list does not scale.**
   - No filtering beyond search; seated guests from all tables are mixed together.
   - No sorting or grouping by table or group.
   - For 100+ guests, the list becomes very long and the "Placés / Non placés" split is not enough.

4. **Capacity feedback is inconsistent and silent.**
   - Full tables show "Complète" in the list, but a drag onto a full table silently snaps back.
   - The `X / Y placés` indicator appears on the canvas and list, but not consistently in the placement sheet or guest row.
   - Empty seats are shown as tiny circles, which is not actionable on mobile.

5. **The table detail experience is missing.**
   - There is no place to see a table's complete guest list, empty seats, and actions in one view.
   - Table config (name/shape/capacity) is separate from seeing who sits there.

6. **Printing is treated as "screen on paper."**
   - Current `/print` reuses card styling (shadows, backgrounds) and a responsive 2-column grid.
   - There is no consideration of page breaks, A4 optimization, or alternative formats (alphabetical index, visual map, individual table sheets).

7. **Mobile workflow is fragmented by tabs.**
   - The Invités / Tables / Plan tabs prevent seeing the guest list and the plan at the same time.
   - Context is lost when switching tabs.

---

### 6.2 Product decisions

The following decisions should be incorporated into the product. They do not require data-model changes unless noted.

#### Table capacity

- Every table keeps an explicit `capacity` (1–20 for MVP).
- Capacity is configurable at table creation and editable afterward.
- Capacity shrink that would orphan guests must show a clear choice: cancel, or shrink and move surplus guests to unseated.
- Full tables must be visually distinct and must not silently reject drops. A brief toast or inline message explains "Cette table est complète."
- Empty seats are represented in the table detail view and placement flows, not only as tiny circles on the canvas.

#### Table + guest visualization

- The canvas is a spatial overview, not the primary place to read or manage guests on small screens.
- Selecting a table opens a detail view: desktop side panel, mobile bottom sheet or full-screen detail.
- The detail view shows: table name, shape, capacity, occupancy, seated guests with seat numbers, empty seats, and per-guest actions (remove, reassign).
- A selected table is visually emphasized on the canvas (ring/highlight).
- Guests assigned to the selected table are highlighted in the guest list when practical.
- Drag-and-drop remains a supplementary desktop interaction; it is not the primary mobile path.

#### Large guest lists

- Add filter chips: Tous / Non placés / Placés / Par table / Par groupe.
- Add sort: Nom, Groupe, Table, Récemment ajouté.
- Search remains.
- Each row shows the guest's table assignment clearly.
- Provide a prominent "Placer" action on unseated rows.
- Consider grouping seated guests by table in a future "Par table" view.
- For very large lists (>200), virtualization is a future optimization; filtering and search are the MVP fix.

#### Mobile-first experience

- Primary mobile flow: list-driven placement, not drag-and-drop.
- Use bottom sheets for table/guest details and placement on mobile.
- The tab switcher remains but should show contextual badges (e.g., "X non placés").
- Keep search and primary actions sticky or always visible.
- Avoid horizontal scrolling at 360 px.
- Maintain touch targets ≥44 px and spacing ≥8 px.

#### Printing

- Print is a first-class output, not a screen dump.
- MVP print format: A4 portrait table blocks with clear page breaks, occupancy, and a separate unseated list.
- Add an alphabetical guest index with table assignment.
- Hide all UI chrome, shadows, and backgrounds in print.
- Future formats (post-MVP): visual seating map (landscape), individual table sheets, compact overview.
- Test A4 and US Letter.

---

### 6.3 UX direction

Recommended interaction patterns:

**Guest placement (mobile)**

1. User taps "Placer" on a guest row.
2. A bottom sheet opens listing tables with occupancy.
3. User taps a table; the sheet expands to show empty seats (or auto-assigns to the first empty seat with a confirmation step).
4. User taps a seat to confirm.

**Guest placement (desktop)**

1. User can drag from the guest list or table detail to a seat.
2. Alternatively, use the placement sheet.

**Table inspection**

1. User taps a table in the table list or on the canvas.
2. A detail panel (desktop) or bottom sheet (mobile) opens.
3. Detail shows seated guests, empty seats, and actions.
4. Tapping a guest in the detail offers "Déplacer", "Retirer", or "Éditer".

**Guest list navigation**

1. Search at top, sticky.
2. Filter chips below search.
3. Sort control (small select).
4. Rows are compact; tap opens detail/editor.

**Capacity feedback**

- Table row shows `X / Y` and a "Complète" badge when full.
- Table detail shows a visual occupancy indicator.
- Attempting to overfill shows a toast: "Cette table est complète. Retirez un invité ou augmentez la capacité."

---

### 6.4 Printing strategy

1. Provide a dedicated `/print` route with print-specific CSS.
2. Render one block per table:
   - Table name and number.
   - Shape and occupancy `X / Y`.
   - Ordered guest list with seat numbers.
   - Empty seats indicated as "Place libre".
3. Add an alphabetical guest index at the end:
   - Guest name → table name.
   - Unseated guests marked as "Non placé".
4. Use `break-inside-avoid` on each table block.
5. Hide chrome with `print:hidden` and `@media print` rules.
6. Force black-on-white, remove shadows/backgrounds.
7. Optimize for A4 portrait first; US Letter second.
8. Future: add a format selector (table blocks / visual map / compact overview / individual sheets).

---

### 6.5 Implementation plan

The following order is recommended for a future coding phase. Each step builds on the previous and stays within MVP scope. The same steps are now tracked as roadmap steps 15–21 in section 2 and section 3.

| Roadmap step | Step | Why first |
|--------------|------|-----------|
| 15 | Table detail panel / bottom sheet | Unblocks every other UX improvement; makes table contents readable on mobile. |
| 16 | Canvas selection & emphasis for tables | Makes the canvas and list feel connected. |
| 17 | Guest list filters, sort, and table assignment display | Addresses the largest friction for large guest lists. |
| 18 | Mobile placement flow (list → table → seat) | Replaces drag-and-drop as the primary mobile path. |
| 19 | Capacity feedback & full-table handling | Prevents silent failures and clarifies limits. |
| 20 | Print redesign (A4 blocks + alphabetical index) | Treats print as a first-class output. |
| 21 | Update smoke checks and component tests | Verifies the new flows. |

Note: steps 15–19 change `src/components/` only. Step 20 changes `src/app/print/` and `src/components/print/`. Step 21 updates tests and docs. No data-model or engine changes are required.

---

### 6.6 Open questions

1. Should the canvas show seat numbers on filled seats, or only in the detail view?
2. Should the engine auto-assign guests to the first empty seat when a table is chosen, or should the user always pick a seat?
3. Should round tables keep circular rendering on mobile, or switch to a vertical seat list within the card?
4. Should the print view offer a format selector in MVP, or only one optimized format?
5. Should the guest list default to "Non placés" when there are unseated guests, to speed up placement?

---

### 6.7 Acceptance criteria

A future implementation can be considered successful when:

- [ ] On a 390 px phone, a user can seat an unseated guest in three taps without dragging.
- [ ] The table detail view shows all seated guests, empty seats, and capacity clearly.
- [ ] A full table cannot be silently overfilled; the user sees an explicit message.
- [ ] The guest list supports filtering (unseated/seated/by table/by group) and sorting.
- [ ] No horizontal page scroll occurs at 360 px width.
- [ ] Print preview on A4 portrait shows every table block without clipping and includes an alphabetical guest index.
- [ ] All UI chrome, shadows, and colored backgrounds are hidden in print.
- [ ] Touch targets remain ≥44 px and spaced ≥8 px.
- [ ] Existing keyboard and screen-reader behaviors are preserved.

---

## 7. How to Update This Document

* When a step is started, change its Status from `Planned` to `In progress`.
* When a step is completed and its validation gate passes, change its Status to `Done` and append a one-line note with the commit hash.
* When scope changes, update the affected step *and* the dependency graph.
* New steps are appended at the end (status `Planned`).
