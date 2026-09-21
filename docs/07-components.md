# Plan de Table — Components

## 1. Purpose

This document inventories the reusable UI components of the application.

It defines:

* Component boundaries.
* Public props for each component.
* Composition rules (what owns what).
* Where server vs client boundaries fall.

Components live under `src/components/`. Per `AGENTS.md`, they are kept small and reusable.

Visual design rules (colors, typography, spacing) are defined in `09-design-system.md` (to be written). This document focuses on **structure and contracts**.

---

## 2. Principles

* One component = one responsibility. If it grows beyond ~150 lines of JSX, split it.
* Components are dumb with respect to persistence. They read from context and dispatch actions; they never call the repository directly.
* All interactive components are client components. They take data via props or context.
* Server components live in `src/app/` and only compose pages from `src/components/`.

---

## 3. Folder Layout

```text
src/components/
  ui/                  # Generic primitives (Button, Input, Modal, Toast, ...)
  layout/              # App shell, top bar, side panel
  editor/              # Seating editor
  guests/              # Guest list and forms
  tables/              # Table cards and configuration
  constraints/         # Constraint rows and editors
  plan-status/         # Statistics and conflict summary
  empty-states/        # Reusable empty state component
  auth/                # Sign-in widget and menu
```

---

## 4. UI Primitives (`components/ui/`)

Small, presentational, no business logic. Styled with Tailwind, mobile-first.

| Component   | Props (key fields)                          | Notes                                |
| ----------- | ------------------------------------------- | ------------------------------------ |
| `Button`    | `variant`, `size`, `loading`, `icon`        | Variants: `primary`, `secondary`, `ghost`, `danger`. |
| `IconButton`| `icon`, `label` (a11y), `size`              | Square hit area, 44x44 minimum.      |
| `Input`     | `value`, `onChange`, `error`, `placeholder` | Wraps label, error, hint.            |
| `TextArea`  | `value`, `onChange`, `rows`, `maxLength`    |                                      |
| `Select`    | `options`, `value`, `onChange`              | Native `<select>` styled.            |
| `Modal`     | `open`, `onClose`, `title`, `children`      | Focus trap, ESC to close, portal.    |
| `Toast`     | `kind` (`info` / `success` / `error`), `message` | Queue via `ToastProvider`.       |
| `Badge`     | `tone`, `children`                          | Used for status pills.               |
| `EmptyState`| `title`, `description`, `action`            | Reusable empty placeholder.          |
| `Spinner`   | `size`                                      | Used while loading.                  |
| `Separator` | -                                           | Horizontal divider.                  |
| `VisuallyHidden`| `children`                              | For a11y labels.                     |

All primitives are pure visual. They accept no plan-specific types.

---

## 5. Layout (`components/layout/`)

### `AppShell`

Top-level frame.

* Props: `children`.
* Renders: top bar + main slot.
* Client component (top bar contains the auth menu).

### `TopBar`

* Props: `planName`, `onRename`.
* Contains: app title, plan name (click to rename), `AuthMenu`, save indicator.
* Save indicator shows three states: `saved`, `saving`, `error` — derived from repository status.

### `EditorLayout`

Two-column responsive layout:

```text
+---------------------------+---------------------------+
|        Guest panel        |        Editor canvas      |
|  (left, collapsible)      |  (right, fills remaining) |
+---------------------------+---------------------------+
```

On mobile, collapses to a tab switcher (`Guests` / `Tables` / `Plan`).

---

## 6. Editor (`components/editor/`)

### `SeatingEditor` (client)

Root of the editor canvas.

* Reads plan from `PlanContext`.
* Hosts the `DndContext` (from `@dnd-kit/core`).
* Renders all `TableCard` instances and the workspace background.

### `Workspace`

* Droppable area for table positioning.
* Pan and zoom are **out of scope** for MVP — only static positioning.

### `TableCard` (client)

* Props: `table`, `guests` (those assigned), `isDragging`.
* Renders: shape (Round/Reactangle), seats, table name, capacity indicator.
* Each seat is a drop target for a `GuestChip`.
* Click on table name to rename.

### `SeatSlot`

* Props: `tableId`, `seatIndex`, `guest` (or null), `isOver`, `isSelected`.
* Pure visual + a11y label ("Seat 3, Marie").

### `GuestChip` (client, draggable)

* Props: `guest`, `compact`.
* Two presentations:
  * Compact (in guest list): name only.
  * Card (in editor): name + small group badge if present.
* Draggable in DnD context.

### `DragGhost`

* Custom drag overlay used by `@dnd-kit`. Shows the chip being dragged.

---

## 7. Guests (`components/guests/`)

### `GuestListPanel`

* Reads `guests` and `assignments` from context.
* Renders: search input, `GuestList`.
* Displays counts: "X / Y seated".

### `GuestSearchInput`

* Controlled input bound to local search state.
* Debounced (150 ms) before updating the list filter.

### `GuestList`

* Props: `guests`, `selectedId`, `onSelect`.
* Renders two sections: **Unseated** and **Seated**.
* Each row is a `GuestRow`.

### `GuestRow`

* Props: `guest`, `assignment` (optional), `onEdit`, `onRemove`.
* Click to open `GuestEditor` in a side panel.

### `GuestEditor`

* Form for create/edit/delete.
* Owns no state — uses uncontrolled inputs with `onSubmit` to dispatch.

---

## 8. Tables (`components/tables/`)

### `TablesToolbar`

* Buttons: `Add table`, `Bulk configure` (opens `BulkTableConfig`).

### `TableConfigSheet`

* Form to edit table name, shape, capacity.
* Submit dispatches an `updateTable` action.

### `BulkTableConfig`

* Sets default capacity and shape for new tables, or for all existing tables on confirm.

---

## 9. Constraints (`components/constraints/`)

### `ConstraintsPanel`

* Lists constraints for the currently selected guest (or all if none selected).

### `ConstraintRow`

* Props: `constraint`, `guests` (for name lookup), `onEdit`, `onRemove`.
* Renders icon + label + the two guest names.

### `AddConstraintMenu`

* Pick: target guest + relation kind.
* Validates: no self-relation, no duplicate (kind, pair).

---

## 10. Plan Status (`components/plan-status/`)

### `PlanStatsBar`

* Inline bar above the editor.
* Counts: guests, tables, seated, unseated, conflicts.

### `GenerationReportDialog`

* Opened after auto-generation.
* Shows the report from the engine (see `04-seating-engine.md` § 6) mapped to friendly copy.
* Actions: `Apply`, `Regenerate`, `Discard`.

---

## 11. Empty States (`components/empty-states/`)

### `NoGuestsEmpty`, `NoTablesEmpty`, `NoConstraintsEmpty`

Each is a thin wrapper around `<EmptyState>` with copy from `01-product.md` § 19.

---

## 12. Auth (`components/auth/`)

### `AuthMenu`

* Renders `Sign in` button when logged out.
* Renders avatar + dropdown (with `Sign out`, `My plans`) when logged in.

### `SignInForm`

* Email + password (and optional magic link button).
* Submits to Supabase via the browser client SDK (`@supabase/supabase-js` — see D-019).

### `AuthGate`

* A soft gate: when the user attempts a cloud-only action while signed out, show a modal explaining what signing in enables. Never blocks.

---

## 13. Composition Rules

### State ownership

| Concern                  | Owner                                 |
| ------------------------ | ------------------------------------- |
| Active plan              | `PlanProvider` (one per editor)       |
| Selection (guest / table)| Local `useState` in the panel         |
| Drag-in-progress         | `@dnd-kit` internal + `PlanContext`   |
| Modal open state         | Local `useState` in parent            |
| Toast queue              | `ToastProvider` (singleton)           |
| Auth                     | `AuthProvider` (root client wrapper)  |

### Reading data

Components read plan data exclusively from `PlanContext`. They never call the repository. This keeps components testable without mocking persistence.

### Dispatching actions

Components dispatch actions via `usePlan()`:

```ts
const { dispatch } = usePlan()
dispatch({ type: 'moveGuest', guestId, toTableId, toSeatIndex })
```

All actions are defined in `lib/plan/actions.ts` with exhaustive types. The reducer lives in `lib/plan/reducer.ts`.

### Server vs client

* Page-level: server.
* Anything with state, DnD, or browser APIs: client.
* Pure presentational primitives that don't use hooks can be either; default to server and mark `use client` only if needed.

---

## 14. Component Sketches (size budget)

Approximate target sizes for the first implementation:

| Component               | Target lines of JSX | Notes                                  |
| ----------------------- | ------------------- | -------------------------------------- |
| `SeatingEditor`         | ~80                 | Mostly composition.                    |
| `TableCard`             | ~60                 | Two shape variants.                    |
| `GuestRow`              | ~30                 |                                        |
| `GuestEditor`           | ~70                 | Form fields.                           |
| `ConstraintsPanel`      | ~40                 |                                        |
| `GenerationReportDialog`| ~70                 | Renders report copy.                   |
| `TopBar`                | ~50                 |                                        |
| `EmptyState`            | ~15                 | Pure primitive.                        |

If a component grows beyond ~150 lines of JSX, split it before merging.

---

## 15. Testing Components

Per `02-architecture.md` § 13:

* Unit-test pure primitives in isolation (props in, expected DOM out).
* Test context-dependent components with a `PlanProvider` test wrapper that seeds a fixture plan.
* Interaction tests use `@testing-library/user-event` for clicks, drags, and typing.
* Avoid testing implementation details (internal state). Test behavior.

A shared `renderWithPlan(plan, ui)` helper lives in `src/test-utils/`.

---

## 16. Open Component Questions

1. **Pan & zoom on the workspace** — postponed. Track post-MVP.
2. **Multi-select of guests** — convenient for batch operations. Not in MVP but the data model already supports it via a temporary selection set in editor state.
3. **Theming** — when a design system doc exists, primitives should accept a `tone` prop or read from a context; today they hardcode Tailwind classes.
