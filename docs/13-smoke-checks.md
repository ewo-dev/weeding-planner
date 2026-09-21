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

1. `/print` for the active plan renders one clean section per table, black on
   white, no top bar / side panel / action buttons.
2. Browser print preview (A4 + US Letter) shows no clipped tables and no
   background chrome.

## 5. Mobile (touch-only smartphone, portrait + landscape)

- Whole happy path (§ 1) with touch only: tap to select, drag guests to seats,
  drag tables by their header, pinch/scroll the workspace without losing the
  drag handle.
- No horizontal page overflow at 360 px and 390 px widths; dialogs (report,
  delete confirmations, table config) fit without clipping; toasts readable.
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

Record the release date, browser versions, and phone models used below.

### Run log

| Date | Build | Browsers | Phones | Result |
| ---- | ----- | -------- | ------ | ------ |
|      |       |          |        |        |
