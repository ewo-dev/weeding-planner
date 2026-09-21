# Plan de Table — Design System

## 1. Purpose

This document defines the visual and interaction design system.

It covers:

* Design tokens (colors, spacing, typography, radii, shadows).
* Component visual rules (variants, sizes, states).
* Mobile-first layout rules.
* Accessibility baseline.
* Iconography and illustration style.

The components themselves are inventoried in `07-components.md`. This document is the **style source of truth** they all read from.

---

## 2. Principles

* **Mobile-first** — every layout starts at the smallest screen, then scales up. Per `AGENTS.md`. Mobile is part of the MVP, not a later polish pass.
* **Touch-first** — every core action works through touch or keyboard; hover only enhances pointer interactions.
* **Quiet** — the seating plan is the hero. UI chrome stays out of the way.
* **Familiar** — components use recognizable patterns. No novel interaction metaphors.
* **Accessible by default** — contrast, focus, hit targets, and keyboard parity are non-negotiable.
* **Print parity** — the on-screen design works on a printed page without redesign.

---

## 3. Tailwind Setup

Tokens live in `tailwind.config.ts` under `theme.extend`. The default Tailwind palette is **not used directly** in components — only named tokens defined here.

```ts
// tailwind.config.ts (excerpt)
theme: {
  extend: {
    colors: { ... },          // see § 4
    spacing: { ... },         // see § 5
    fontSize: { ... },        // see § 6
    borderRadius: { ... },    // see § 7
    boxShadow: { ... },       // see § 8
    fontFamily: { sans: ['var(--font-sans)'], display: ['var(--font-display)'] },
  },
}
```

Custom utilities (e.g. for `focus-visible` rings) live in `globals.css`.

---

## 4. Color Tokens

We use a small palette organized by role. Tokens are semantic, not raw values.

### Surfaces

| Token             | Usage                       | Light    | Dark     |
| ----------------- | --------------------------- | -------- | -------- |
| `bg`              | App background              | `white`  | `slate-950` |
| `surface`         | Cards, panels               | `slate-50`| `slate-900` |
| `surface-raised`  | Modals, popovers            | `white`  | `slate-800` |
| `border`          | Hairlines                   | `slate-200`| `slate-800` |

### Text

| Token             | Usage                       | Light    | Dark     |
| ----------------- | --------------------------- | -------- | -------- |
| `text`            | Default body text           | `slate-900`| `slate-100` |
| `text-muted`      | Secondary text              | `slate-500`| `slate-400` |
| `text-inverse`    | On dark/colored backgrounds | `white`  | `slate-950` |

### Brand

| Token             | Usage                       | Value (light) |
| ----------------- | --------------------------- | ------------- |
| `brand`           | Primary actions, focus      | `indigo-600`  |
| `brand-hover`     | Hover state                 | `indigo-700`  |
| `brand-soft`      | Selected background tints   | `indigo-50`   |

### Status

| Token             | Usage                       | Value       |
| ----------------- | --------------------------- | ----------- |
| `success`         | Confirmation                | `emerald-600` |
| `warning`         | Soft warning (preferences)  | `amber-500` |
| `danger`          | Mandatory conflict          | `rose-600`  |
| `info`            | Neutral information         | `sky-600`   |

### Constraint accents (used in `ConstraintRow`)

| Token             | Meaning                     | Value        |
| ----------------- | --------------------------- | ------------ |
| `constraint-must` | `must_together`             | `emerald-600` |
| `constraint-pref` | `prefer_together`           | `sky-600`    |
| `constraint-no`   | `must_not_together`         | `rose-600`   |

Rules:

* `text` on `bg` must meet WCAG AA contrast (4.5:1 for body text, 3:1 for large text).
* Status colors are used sparingly. A red `danger` badge for a mandatory conflict is intentional, but `info` should not appear in routine UI.

---

## 5. Spacing Scale

Tailwind's default scale is used, with the convention:

| Alias         | px   | Typical usage                              |
| ------------- | ---- | ------------------------------------------ |
| `0.5`         | 2    | Hairline gaps                              |
| `1`           | 4    | Inside compact controls                    |
| `2`           | 8    | Default gap between chips                  |
| `3`           | 12   | Inside `Input`, inside `Button`            |
| `4`           | 16   | Panel padding (mobile)                     |
| `6`           | 24   | Section spacing                            |
| `8`           | 32   | Panel padding (desktop), card padding       |

A 4-px base unit keeps the rhythm consistent.

---

## 6. Typography

Two families:

* **Sans** — `Inter` (or the system sans fallback).
* **Display** — `Inter` with a slightly tighter tracking for the entry headline only.

### Scale

| Token        | Size / line-height | Usage                          |
| ------------ | ------------------ | ------------------------------ |
| `text-xs`    | 12 / 16            | Helper text, table of contents |
| `text-sm`    | 14 / 20            | Default for chips, body        |
| `text-base`  | 16 / 24            | Default body, paragraphs       |
| `text-lg`    | 18 / 28            | Card titles                    |
| `text-xl`    | 20 / 28            | Section headers                |
| `text-2xl`   | 24 / 32            | Page title                     |
| `text-3xl`   | 30 / 36            | Hero / entry headline          |

Rules:

* Default body is `text-base`.
* Never use `text-xs` for primary information.
* Long names (guest, table) truncate with `text-ellipsis` after 1 line in compact contexts.

---

## 7. Radii

| Token       | px   | Usage                              |
| ----------- | ---- | ---------------------------------- |
| `rounded-sm`| 4    | Inputs, chips                      |
| `rounded`   | 8    | Buttons, cards                     |
| `rounded-lg`| 12   | Modals, panels                     |
| `rounded-full` | 9999 | Avatars, seat chips               |

---

## 8. Shadows

Two elevation levels only:

| Token        | Usage                                |
| ------------ | ------------------------------------ |
| `shadow-sm`  | Hover on cards, focus on chips       |
| `shadow-lg`  | Modals, drag overlays                |

No drop shadows on the seating editor canvas itself — tables and seats have a subtle border instead, so the plan reads cleanly.

---

## 9. Icons

Icon library: **Lucide** (`lucide-react`).

* Size: 16 px (in chips), 20 px (in buttons), 24 px (in top bar).
* Stroke width: 1.75 px default.
* Color: inherits `currentColor` so it adapts to text color.
* Never used decoratively — every icon must aid recognition.

Iconography for constraints:

| Meaning          | Icon                  |
| ---------------- | --------------------- |
| `must_together`  | `heart`               |
| `prefer_together`| `thumbs-up`           |
| `must_not_together`| `ban`                |

---

## 10. Layout Primitives

### Container widths

* Mobile: full-width with `px-4` padding.
* Tablet (>= 768 px): `max-w-3xl mx-auto` for forms, full width for the editor.
* Desktop (>= 1024 px): `max-w-6xl mx-auto` for forms, the editor uses a 2-column grid (320 px left + flexible right).

### Breakpoints

Tailwind defaults:

* `sm` 640 — phones landscape
* `md` 768 — tablets
* `lg` 1024 — small laptops
* `xl` 1280 — desktop
* `2xl` 1536 — large desktop

The editor is usable as a single-column portrait layout from the smallest supported phone width. At `md` it may add more workspace room; at `lg` it can expose the full 2-column layout.

### Z-index layers

| Layer                    | z-index |
| ------------------------ | ------- |
| Base content             | 0       |
| Sticky top bar           | 10      |
| Drag overlay             | 50      |
| Drop indicators          | 40      |
| Modal                    | 100     |
| Toast                    | 110     |

---

## 11. Component Visual Rules

### Button

* Sizes: `sm` (32 px), `md` (40 px), `lg` (48 px). Mobile default is `md`.
* Padding: `px-3` (`sm`), `px-4` (`md`), `px-5` (`lg`).
* Radius: `rounded`.
* Variants:
  * `primary` — `bg-brand text-text-inverse`, optional pointer hover `bg-brand-hover`.
  * `secondary` — `bg-surface border border-border text-text`, optional pointer hover `bg-surface-raised`.
  * `ghost` — transparent, optional pointer hover `bg-surface`.
  * `danger` — `bg-danger text-text-inverse`.

### Input

* Height: 40 px (`md`).
* Border: `border-border`, focus `border-brand ring-2 ring-brand-soft`.
* Error: `border-danger`, error message in `text-danger text-sm` below.
* Always pairs with a `<label>` (visually hidden if compact).

### Chip (GuestChip, ConstraintRow, Badge)

* Height: 28 px.
* Padding: `px-2`.
* Radius: `rounded-full` for guests, `rounded-sm` for badges.
* Background: `bg-surface`.
* Selected: `bg-brand-soft border-brand`.

### Card (TableCard, PanelCard)

* Padding: `p-4` mobile, `p-6` desktop.
* Radius: `rounded-lg`.
* Background: `bg-surface-raised`.
* Border: `border border-border`.

### Modal

* Max width: `max-w-md` (forms) or `max-w-lg` (reports).
* Padding: `p-6`.
* Backdrop: `bg-black/40`.

---

## 12. The Seating Editor Canvas

The canvas is the most visual surface. Specific rules:

* Workspace background: `bg` (page background) with a faint dotted grid (`bg-[radial-gradient(...)]`) for spatial anchoring.
* Tables: white surface with a 1-px `border-border`. Selected: 2-px `border-brand`.
* Round tables: visual seat ring of small circles. The number of circles equals `capacity`.
* Rectangle tables: row of seat slots below the table label.
* Empty seats: 12-px outlined circle, `border-border`.
* Filled seats: filled circle with the guest's initial, `bg-brand text-text-inverse` (color optionally varied by group — see § 14).
* Drag overlay: 1.05x scale, `shadow-lg`, slight rotation (1-2 degrees) for feel.
* Touch dragging must preserve scroll access, use a visible active state, and never rely on hover to reveal a drop target.
* Provide action-based alternatives for assigning a guest or moving a table when canvas precision is poor on a phone.

---

## 13. Empty and Error States

* Always use `<EmptyState>` (per `07-components.md` § 4).
* Background: `bg-surface`.
* Icon: 48 px, `text-muted`.
* Title: `text-lg`.
* Description: `text-sm text-muted`.
* Action: primary button if there's a clear next step.

Error states:

* Inline errors use `text-danger` next to the field.
* Page-level errors use `bg-danger/10 border-danger/30 text-danger` with `rounded-lg p-4`.

---

## 14. Guest Group Color (optional enhancement)

If `guest.group` is set, the guest chip and seat dot can be tinted using a stable color derived from the group name. Implementation: hash the group string to one of a 6-color palette (`indigo`, `emerald`, `amber`, `rose`, `sky`, `violet`).

Rules:

* Tints apply to the chip background at low opacity (`bg-{color}-100`) and the text at full saturation (`text-{color}-700`).
* Tints are accessible (each passes AA on its 100-level background with the 700-level text).
* Tints are derived — not stored — so renaming a group changes everyone's tint consistently.

This is **opt-in** in the MVP. The default is monochrome.

---

## 15. Accessibility Baseline

### Keyboard

* Every interactive element is reachable by `Tab`.
* Focus order matches visual order.
* `focus-visible` rings: 2 px `brand` with 2 px offset.
* Skip links: "Aller au contenu" on every layout.
* `Escape` closes modals and cancels in-progress drags.
* `Enter` confirms; `Space` toggles (where appropriate).
* Undo/redo shortcuts (see `10-interactions.md`).

### Screen readers

* All form controls have associated labels.
* Buttons have accessible names (text or `aria-label`).
* Decorative icons have `aria-hidden="true"`.
* Live regions for toasts (`role="status"`) and generation reports (`role="alert"`).
* Tables and seats expose names via `aria-label`.

### Hit targets

* Minimum 44 x 44 px for any interactive element on touch.
* Spacing between touch targets: minimum 8 px.
* No core action may be available only on hover.
* Verify controls and dialogs in portrait orientation at common phone widths.

### Motion

* Respect `prefers-reduced-motion`: drag transforms and modal fades are removed.
* Drag overlay rotation is removed when reduced motion is requested.

### Color independence

* Mandatory constraint indicators must include text/icon, not color alone.
* Status colors always pair with a label or icon.

---

## 16. Print Stylesheet (`print.css`)

Quick summary; full detail in `15-print-export.md` (when written):

* Hide top bar, side panel, action buttons.
* Use black on white.
* One table per page is acceptable; long tables break across pages.
* Apply via `@media print {}` in `print.css`, imported only on the print route.

---

## 17. Dark Mode

**Decision:** Not in MVP. The system starts in light mode only.

The token system is structured to allow dark mode without refactor: each color token has a light/dark value in § 4. Adding dark mode later is a Tailwind class strategy (`dark:`) applied to primitives.

---

## 18. Open Design Questions

1. **Brand color** — `indigo-600` is a placeholder. We can swap to a wedding-themed color (e.g. `rose`, `amber`) before launch.
2. **Group color palette** — six colors is enough for MVP. More colors risk looking noisy.
3. **Icon font size** — confirm `lucide-react` stroke width feels right at 16 px on small screens.
