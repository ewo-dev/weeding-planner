# Plan de Table — Smoke Checks (release validation)

Step 15 of `11-roadmap.md`. Per D-018 there is no automated e2e runner:
this checklist is run manually before each release, on a production build
(`npm run build`), against `09-design-system.md` and this file.

Tick every box. Any failure blocks the release.

## 1. Happy path (desktop + mobile)

1. Open `/`, create a plan ("Nouveau plan") → lands on `/editor` without a mouse
   (keyboard-only: `Tab` + `Enter`).
2. Add 3 guests (Invités → + Ajouter) and 1 table (Tables → + Ajouter).
3. Seat a guest by drag & drop onto a seat; move them to another seat;
   unseat them via the guest list dropzone.
4. Undo (`Annuler` / `Ctrl+Z`) restores the previous seat; redo restores the move.
5. Rename the plan from the top bar; reload → the name and seats persisted
   (IndexedDB autosave, "Enregistré" indicator).

## 2. Mandatory-constraint generation report

1. Add a `doit être avec` constraint between two guests, plus a
   `ne doit pas être avec` constraint on another pair.
2. Tables → Générer. The report dialog states seated count, mandatory results,
   and separation results in French.
3. Force an infeasible case (e.g. one 2-seat table, three guests bound by
   `must_together`): the dialog reports the unsatisfied mandatory constraint
   by name and lists it under "Conflits à revoir".
4. Appliquer → seats update; undo restores the exact previous assignments.

## 3. Export / import round-trip

1. TopBar → Exporter: a `.json` file downloads (deterministic, trailing newline).
2. Delete the plan (home → Supprimer), clear site storage, reload.
3. Importer → select the file: the plan restores identically (guests, tables,
   seats, constraints) under a new plan id, without touching other plans.
4. Import a malformed file and a future-version file: both are rejected with a
   French error and no data loss.

## 4. Print

1. `/print` for the active plan renders one clean block per table, black on
   white, no top bar / side panel / action buttons.
2. Each table block shows the table name, shape, occupancy (`X / Y`), seated
   guests with seat numbers, and empty seats.
3. An alphabetical guest index at the end maps each guest to their table;
   unseated guests are listed separately.
4. Browser print preview (A4 + US Letter) shows no clipped tables and no
   background chrome.

## 5. Mobile (touch-only smartphone, portrait + landscape)

- Whole happy path (§ 1) with touch only, using the list-driven placement flow
  as the primary path: tap "Placer" on a guest row, choose a table, choose a
  seat. Drag-and-drop remains available but is not required.
- Tap a table in the list or on the canvas to open a bottom sheet with its
  seated guests, empty seats, and capacity.
- No horizontal page overflow at 360 px and 390 px widths; dialogs and bottom
  sheets fit without clipping; toasts readable.
- No core action depends on hover; drop targets show active feedback on touch.

## 6. Responsive

- 360–390 px (phones portrait): single column, tab switcher
  (Invités / Tables / Plan) above the content.
- 640 px (`sm`, phones landscape): no overflow, workspace scrolls internally.
- 768 px (`md`, tablets): comfortable workspace, panels readable.
- 1024 px+ (`lg`): two-column editor (320 px side panel + canvas).

## 7. Accessibility audit

- `Tab` reaches every control in visual order; `focus-visible` shows a 2 px
  brand ring with 2 px offset everywhere (global baseline in `globals.css`).
- Skip link "Aller au contenu" is the first tab stop on every page.
- `Escape` closes modals / cancels drags / clears selection; `Enter` confirms.
- Seats announce `Place {n} de {table}, {guest|vide}`; tables announce
  `Table {name}, {seated} sur {capacity} placés`; drag handles announce
  `Déplacer {table}`; conflict badges announce their guest.
- Toasts use `role="status"`; the generation report uses `role="alert"`;
  mandatory indicators pair color with text/icon (never color alone).
- Touch targets ≥ 44×44 px (buttons `md`/`lg`, icon buttons, seat slots,
  editor tabs, top-bar actions); 8 px minimum spacing between targets.
- `prefers-reduced-motion: reduce` removes drag-overlay rotation/scale, modal
  fades, and transitions (global CSS + `motion-safe:` gates).
- Contrast: body text, muted text, brand-on-white, and white-on-brand all meet
  WCAG AA (4.5:1 body, 3:1 large).

## 8. Automated gate

```powershell
npm run test      # Vitest suite green (unit + component, incl. release-a11y)
npm run lint      # clean
npm run typecheck # clean (tsc --noEmit)
```

## 9. List-driven placement, table detail, and capacity feedback

- Guest list filter chips show Tous / Non placés / Placés / Par table / Par groupe and update the list immediately.
- Sort control orders guests by name, group, table, or recently added.
- Each seated guest row shows their table assignment; each unseated row shows a prominent "Placer" action.
- Tapping "Placer" on a phone opens a bottom sheet; a guest can be seated in three taps without dragging.
- Tapping a table in the list or canvas opens a detail panel/desktop or bottom sheet/mobile showing seated guests, empty seats, and capacity.
- A full table shows a "Complète" state; attempting to overfill via drag or sheet shows an explicit message instead of silently snapping back.
- Reducing a table's capacity below its seated count triggers a clear confirmation and moves surplus guests to unseated.

## 10. Print output

- `/print` renders one block per table with name, shape, occupancy, guest list with seat numbers, and empty seats.
- An alphabetical guest index appears at the end, mapping each guest to their table; unseated guests are marked "Non placé".
- Browser print preview on A4 portrait shows all table blocks without clipping and hides all UI chrome, shadows, and backgrounds.
- US Letter preview is also readable without clipped content.

Record the release date, browser versions, and phone models used below.

### Run log

| Date | Build | Browsers | Phones | Result |
| ---- | ----- | -------- | ------ | ------ |
|      |       |          |        |        |
