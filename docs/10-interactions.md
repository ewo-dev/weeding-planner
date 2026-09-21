# Plan de Table — Interactions

## 1. Purpose

This document defines the interactive behaviors of the application.

It covers:

* Drag & drop rules (guests, tables, sensors, droppables).
* Selection model.
* Undo / redo.
* Keyboard shortcuts.
* Touch and pointer gestures.
* Confirmation and destructive-action rules.

The components involved are defined in `07-components.md`. Visual rules are in `09-design-system.md`.

---

## 2. Library

* `@dnd-kit/core` for drag and drop.
* `@dnd-kit/utilities` for the `CSS.Transform.toString` helper used in drag overlays.

We do not use HTML5 native DnD. See D-004 for rationale.

---

## 3. Drag & Drop Surfaces

Two distinct DnD contexts coexist on the editor page. They are not nested.

### 3.1 Guest DnD context

A single `<DndContext>` inside `<SeatingEditor>` handles:

* Draggables: every guest, both in the side panel (`GuestRow`) and seated on a table (`SeatSlot`).
* Droppables: every empty `SeatSlot`, plus a virtual "unseat" droppable (`unseat:dropzone`).

### 3.2 Table DnD context

A separate `<DndContext>` (or a parallel sensor group in the same context) handles:

* Draggables: every `TableCard` header (the table label is the drag handle).
* Droppables: the workspace surface; positions are read from `over.rect` and translated to plan coordinates.

For MVP we keep these two contexts **independent**: dragging a guest does not interact with table positioning. The two contexts are mounted as siblings inside `<SeatingEditor>`.

---

## 4. Drag IDs and Conventions

Stable, parseable IDs:

| Purpose              | Format                              | Example                       |
| -------------------- | ----------------------------------- | ----------------------------- |
| Guest (draggable)    | `guest:{guestId}`                   | `guest:b5f5...`               |
| Seat (droppable)     | `seat:{tableId}:{seatIndex}`        | `seat:t1:3`                   |
| Unseat dropzone      | `seat:unseat`                       | `seat:unseat`                 |
| Table (draggable)    | `table:{tableId}`                   | `table:t1`                    |
| Workspace (droppable)| `workspace`                         | `workspace`                   |

The reducer resolves these IDs back to entities. Never use numeric indices in IDs.

---

## 5. Sensors

```ts
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 6 }, // require a 6px move before drag starts
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  }),
)
```

Rules:

* `PointerSensor` activation distance: **6 px**. This prevents accidental drags on tap-to-select.
* `KeyboardSensor` is mandatory and wired to native Tab order. Every draggable is reachable by `Tab`; `Space` starts a drag; arrow keys move the dragged item; `Space` again drops; `Escape` cancels.
* Touch is handled by `PointerSensor`, but the implementation must preserve native page scrolling. Use appropriate `touch-action` rules on drag handles rather than disabling scrolling across the whole editor.
* Drag handles and drop targets must provide visible pressed/active states; hover is never the only drop feedback.
* Every drag operation has an action-based alternative for small screens: select a guest, choose "Assign seat" or "Move to table", then choose the destination from a large, scrollable list.

---

## 6. Guest Drag Behavior

### Starting a drag

* Source can be: an unseated `GuestRow` in the side panel, or an occupied `SeatSlot`.
* During drag, the source chip becomes a `<DragGhost>` overlay (1.05x scale, slight rotation, shadow — see `09-design-system.md` § 12).
* The original chip stays in place visually (we don't hide the source). The ghost is what the user follows.

### Drop targets

| Target ID                | Resulting action                                 |
| ------------------------ | ------------------------------------------------ |
| `seat:{tableId}:{n}`     | `moveGuest` to that slot if empty                |
| `seat:unseat`            | `unseatGuest`                                    |
| Any other                | No-op; ghost snaps back                          |

### Validation at drop time

Before dispatching `moveGuest`:

1. The target slot must be empty (no other guest assigned).
2. The target slot must satisfy `0 <= n < capacity`.
3. The move must not introduce a `must_not_together` violation — if it would, the UI shows a warning toast after the move (the move itself is allowed; per `01-product.md` § 11, the user remains in control).

If validation fails, the ghost snaps back to source. No toast for validation failures on drop.

### Auto-scroll

When dragging near the edges of the canvas, the workspace auto-scrolls at 8 px / frame. This must work with touch; if browser scrolling conflicts with canvas auto-scroll, the action-based move flow remains available.

---

## 7. Table Drag Behavior

### Starting a drag

* Drag handle: the table label (`TableCard` header). The rest of the card is not draggable (so users can still click on seats without accidentally dragging the table).
* Activation: same 6 px distance.
* The table header is a touch-sized handle. Users can also select a table and use an explicit "Move table" action on phones.

### Drop

* Drop target is `workspace` only.
* New position: `(event.activatorEvent.clientX + delta.x, event.activatorEvent.clientY + delta.y)` translated to workspace coordinates by subtracting the workspace's bounding rect.
* Position is clamped to the workspace bounds (with a 16 px inset) to keep tables fully visible.

### Snapping

No grid snapping in MVP. Tables land where the user drops them. Future: optional 8-px snap.

---

## 8. Selection Model

Single-selection MVP. Selection lives in editor UI state (not in the plan).

* Click a `GuestRow` or a `SeatSlot` to select.
* Click the empty area of the workspace to clear selection.
* `Escape` clears selection.
* Selection is purely visual (highlight border) and drives what the right-side panel shows (constraint editor for the selected guest, table config for the selected table).

The data model (see `03-data-model.md`) is not affected by selection.

---

## 9. Undo / Redo

Per D-014, the plan reducer maintains an in-memory history.

### Data shape

```ts
interface HistoryEntry {
  action: Action              // the original action
  inverse: Action             // function returning the action that undoes it
}

const HISTORY_LIMIT = 50
```

### Rules

* Each user-visible mutation pushes an entry.
* **Undoable:** move guest, change seat, add/remove guest, edit guest, add/remove/edit table, add/remove constraint, edit constraint, generate seating (the result is one entry that restores previous assignments on undo).
* **Not undoable:** open/close modal, change selection, rename plan, sign in/out, autosave events.
* The history is bounded to 50 entries. Older entries are dropped silently.
* A new action clears the redo stack.

### Triggers

* Toolbar buttons: `Undo` and `Redo`, with disabled state when stacks are empty.
* Keyboard: `Cmd/Ctrl + Z` for undo, `Cmd/Ctrl + Shift + Z` (and `Cmd/Ctrl + Y`) for redo.

### Edge cases

* Undo of a `generateSeating` action restores the previous `assignments` exactly. If the user has edited manually after generation, undo goes back to the generated state (not the pre-generation state) — each manual edit is its own entry.
* Undo of a `removeGuest` action restores the guest in full, including any assignment they had.

---

## 10. Keyboard Shortcuts

Global shortcuts (work anywhere on the editor page):

| Shortcut                 | Action                                     |
| ------------------------ | ------------------------------------------ |
| `Cmd/Ctrl + Z`           | Undo                                       |
| `Cmd/Ctrl + Shift + Z`   | Redo                                       |
| `Cmd/Ctrl + Y`           | Redo (Windows alias)                       |
| `Cmd/Ctrl + S`           | Force save (no-op for autosave but explicit) |
| `Cmd/Ctrl + P`           | Open browser print dialog (print view)     |
| `?`                       | Open shortcuts cheatsheet modal            |
| `Escape`                 | Close modal / cancel drag / clear selection |

Editor-scoped shortcuts:

| Shortcut                 | Action                                     |
| ------------------------ | ------------------------------------------ |
| `n`                      | New guest                                  |
| `t`                      | New table                                  |
| `g`                      | Generate seating plan                      |
| `Delete` / `Backspace`   | Delete selected guest or table (with confirm) |
| `Tab` / `Shift + Tab`    | Move focus through interactive elements    |
| `Arrow keys`             | Move dragged guest between seats (when dragging via keyboard) |

Guest panel shortcuts:

| Shortcut                 | Action                                     |
| ------------------------ | ------------------------------------------ |
| `/`                       | Focus search input                         |
| `Arrow up/down`          | Move selection through guest list         |
| `Enter`                   | Edit selected guest                        |

Shortcuts are suppressed when an `<input>`, `<textarea>`, or `[contenteditable]` element is focused.

---

## 11. Touch and Pointer Gestures

| Gesture                       | Action                                       |
| ----------------------------- | -------------------------------------------- |
| Tap                           | Select                                       |
| Long press (>= 250 ms)        | Start drag (alternative to 6-px threshold)   |
| Drag                          | Move guest / table (per DnD rules)           |
| Pinch                         | Reserved (no-op in MVP)                      |
| Two-finger pan on workspace   | Reserved (no-op in MVP)                      |

`Long press` activates a drag without requiring a 6-px move — useful on touch where small finger movements are noisy. Implementation: a small custom sensor using `PointerSensor` with `delay: 250, tolerance: 5`.

---

## 12. Confirmation and Destructive Actions

Per `01-product.md` § 20, errors and warnings should be friendly. Destructive actions get explicit confirmation.

### Requires confirmation (modal)

* Delete guest (only if the guest has constraints referencing them — otherwise a single toast with Undo).
* Delete table (only if the table has seated guests — the modal lists affected guests and offers to also unseat them).
* Discard generated seating plan.

### No confirmation (with Undo toast)

* Move guest between seats.
* Unseat a guest.
* Edit guest name/notes.
* Edit table name/capacity (capacity shrink that would orphan guests: confirmation).
* Add/remove constraint.

The Undo toast is a transient affordance (`Toast` with `action: 'Undo'`), not a modal. It disappears after 5 seconds.

---

## 13. Loading and Empty UX

* Buttons that trigger a long-running action show a `Spinner` and become disabled.
* The generation button shows a `Generating...` label and a small progress indicator (the algorithm is fast, but we don't want a freeze).
* Empty side panels show the `<EmptyState>` component (per `09-design-system.md` § 13).
* While the plan loads, the page shows `<EditorSkeleton>` (per `06-routing-and-pages.md` § 6).

---

## 14. Conflict Reporting After Manual Edits

Per `01-product.md` § 11, manual edits can create or remove mandatory conflicts. The UI:

* Recomputes `detectConflicts(plan)` (see `04-seating-engine.md` § 11) on every dispatch.
* If the change introduces a mandatory conflict, shows an inline warning badge on the affected guest(s) and a toast: "Conflit : Thomas doit être avec Marie, mais ils sont à des tables différentes."
* The toast offers `Keep anyway` (dismiss) and `Undo`.
* If the change resolves a previous conflict, a soft success toast appears.

Performance budget: `detectConflicts` runs in O(constraints + assignments) and is safe to call on every dispatch.

---

## 15. Reduced Motion

Per `09-design-system.md` § 15, respect `prefers-reduced-motion: reduce`:

* No drag-overlay rotation or scale.
* No modal fade-in.
* No transition on selection highlight (instant).

This is implemented once in `globals.css` via:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.001ms !important;
    animation-duration: 0.001ms !important;
  }
}
```

And in components by gating transforms on a `useReducedMotion()` check.

---

## 16. Open Interaction Questions

1. **Multi-select** — useful for batch operations (move 5 guests at once). Post-MVP.
2. **Grid snapping for tables** — nice to have. Post-MVP.
3. **Pan/zoom** — required once we expect > 30 tables. Post-MVP per D-013.
4. **Touch long-press vs 6-px move** — current dual approach. Verify it doesn't double-trigger on touch.
