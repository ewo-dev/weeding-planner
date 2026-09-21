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
* **Wedding identity** — warm, elegant, and understated; never generic SaaS or cliché template.

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

| Token             | Usage                       | Light         | Dark         |
| ----------------- | --------------------------- | ------------- | ------------ |
| `bg`              | App background              | `#F8F6F1`     | `#1C1B18`    |
| `surface`         | Cards, panels               | `#FFFFFF`     | `#23221F`    |
| `surface-raised`  | Modals, popovers, sidebars  | `#FDFCFA`     | `#2A2926`    |
| `surface-muted`   | Hover/soft backgrounds      | `#F5F3EE`     | `#32312E`    |
| `border`          | Hairlines                   | `#E5E1D8`     | `#3D3C38`    |

### Text

| Token             | Usage                       | Light    | Dark     |
| ----------------- | --------------------------- | -------- | -------- |
| `text`            | Default body text           | `#2F302B`| `#F2F0EB`|
| `text-muted`      | Secondary text              | `#77776E`| `#A8A59B`|
| `text-inverse`    | On dark/colored backgrounds | `#FFFFFF`| `#1C1B18`|

### Brand

| Token             | Usage                       | Value (light) |
| ----------------- | --------------------------- | ------------- |
| `brand`           | Primary actions, focus      | `#68745D`     |
| `brand-hover`     | Hover state                 | `#56614D`     |
| `brand-soft`      | Selected background tints   | `rgba(104,116,93,0.10)` |
| `brand-muted`     | Subtle brand backgrounds    | `rgba(104,116,93,0.06)` |

### Accent

| Token             | Usage                       | Value (light) |
| ----------------- | --------------------------- | ------------- |
| `accent`          | Champagne-gold highlights   | `#C8A978`     |
| `accent-hover`    | Hover state                 | `#B89868`     |
| `accent-soft`     | Soft gold backgrounds       | `rgba(200,169,120,0.14)` |

### Status

| Token             | Usage                       | Value       |
| ----------------- | --------------------------- | ----------- |
| `success`         | Confirmation                | `#5E7A5E`   |
| `warning`         | Soft warning (preferences)  | `#B89A6A`   |
| `danger`          | Mandatory conflict          | `#A65D57`   |
| `info`            | Neutral information         | `#6F7D8D`   |

### Constraint accents (used in `ConstraintRow`)

| Token             | Meaning                     | Value        |
| ----------------- | --------------------------- | ------------ |
| `constraint-must` | `must_together`             | `#5E7A5E`    |
| `constraint-pref` | `prefer_together`           | `#6F7D8D`    |
| `constraint-no`   | `must_not_together`         | `#A65D57`    |

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
| `8`           | 32   | Panel padding (desktop), card padding      |

A 4-px base unit keeps the rhythm consistent.

---

## 6. Typography

Two families:

* **Sans** — `Inter` (or the system sans fallback).
* **Display** — `Cormorant Garamond` for elegant headings.

### Scale

| Token        | Size / line-height | Usage                          |
| ------------ | ------------------ | ------------------------------ |
| `text-xs`    | 12 / 16            | Helper text, stat labels       |
| `text-sm`    | 14 / 20            | Default for chips, body        |
| `text-base`  | 16 / 24            | Default body, paragraphs       |
| `text-lg`    | 18 / 28            | Card titles, panel headings    |
| `text-xl`    | 20 / 28            | Section headers                |
| `text-2xl`   | 24 / 32            | Page title                     |
| `text-3xl`   | 30 / 36            | Hero / entry headline          |

Rules:

* Default body is `text-base`.
* Never use `text-xs` for primary information.
* Long names (guest, table) truncate with `text-ellipsis` after 1 line in compact contexts.
* Display headings use a slightly lighter weight and refined tracking.

---

## 7. Radii

| Token       | px   | Usage                              |
| ----------- | ---- | ---------------------------------- |
| `rounded-sm`| 4    | Inputs, badges                     |
| `rounded`   | 8    | Buttons, cards                     |
| `rounded-lg`| 12   | Modals, panels                     |
| `rounded-xl`| 16   | Large cards, print sheets          |
| `rounded-2xl`| 20  | Hero surfaces                      |
| `rounded-full` | 9999 | Avatars, seat chips, table surfaces |

---

## 8. Shadows

Two elevation levels only:

| Token        | Usage                                |
| ------------ | ------------------------------------ |
| `shadow-sm`  | Buttons, raised inputs, hover on cards |
| `shadow`     | Cards, toolbars                      |
| `shadow-lg`  | Modals, drag overlays, toasts        |

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
* Padding: `px-3` (`sm`), `px-5` (`md`), `px-6` (`lg`).
* Radius: `rounded-md`.
* Variants:
  * `primary` — `bg-brand text-text-inverse shadow-sm`, optional pointer hover `bg-brand-hover hover:shadow`.
  * `secondary` — `border border-border bg-surface text-text shadow-sm`, optional pointer hover `bg-surface-muted hover:border-border`.
  * `ghost` — transparent, optional pointer hover `bg-surface-muted`.
  * `danger` — `bg-danger text-text-inverse shadow-sm`, optional pointer hover `bg-danger/90`.

### Input

* Height: 44 px (`md`).
* Border: `border-border`, focus `border-brand ring-2 ring-brand-soft`.
* Background: `bg-surface`, focus `bg-surface-raised`.
* Error: `border-danger`, error message in `text-danger text-sm` below.
* Always pairs with a `<label>` (visually hidden if compact).

### Chip (GuestChip, ConstraintRow, Badge)

* Height: 28 px.
* Padding: `px-2`.
* Radius: `rounded-full` for guests, `rounded-sm` for badges.
* Background: `bg-surface-muted` for neutral badges.
* Selected: `bg-brand-soft border-brand/20`.

### Card (TableCard, PanelCard)

* Padding: `p-4` mobile, `p-6` desktop.
* Radius: `rounded-xl`.
* Background: `bg-surface`.
* Border: `border border-border`.
* Shadow: `shadow-sm` on hover.

### Modal

* Max width: `max-w-md` (forms) or `max-w-lg` (reports).
* Padding: `p-5`.
* Backdrop: `bg-text/25` with `backdrop-blur-[2px]`.
* Mobile: slides up from bottom with a drag handle; `rounded-t-xl`.
* Desktop: centered with `rounded-xl`.

---

## 12. The Seating Editor Canvas

The canvas is the most visual surface. Specific rules:

* Workspace background: `bg` (warm ivory) with a faint warm grid (`bg-[radial-gradient(...)]`) for spatial anchoring.
* Tables: white surface with a 1-px `border-border` and `shadow-sm`. Selected: 2-px `ring-brand`.
* Round tables: circular table surface with a ring of seat slots around the edge.
* Rectangle tables: long rounded table surface with seat slots below.
* Empty seats: 12-px outlined circle, `border-border bg-surface`.
* Filled seats: filled circle with the guest's initial, `bg-brand text-text-inverse`.
* Drag overlay: 1.05x scale, `shadow-lg`, slight rotation (1-2 degrees) for feel.
* Touch dragging must preserve scroll access, use a visible active state, and never rely on hover to reveal a drop target.
* Provide action-based alternatives for assigning a guest or moving a table when canvas precision is poor on a phone.

---

## 13. Empty and Error States

* Always use `<EmptyState>` (per `07-components.md` § 4).
* Background: `bg-surface`.
* Icon: 48 px, `text-accent`.
* Title: `text-lg font-display`.
* Description: `text-sm text-text-muted`.
* Action: primary button if there's a clear next step.

Error states:

* Inline errors use `text-danger` next to the field.
* Page-level errors use `bg-danger/10 border-danger/30 text-danger` with `rounded-xl p-4`.

---

## 14. Guest Group Color (optional enhancement)

If `guest.group` is set, the guest chip and seat dot can be tinted using a stable color derived from the group name. Implementation: hash the group string to one of a 6-color palette (`brand`, `success`, `warning`, `danger`, `info`, `accent`).

Rules:

* Tints apply to the chip background at low opacity and the text at full saturation.
* Tints are accessible.
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

## 18. Decorative Elements

Wedding identity is conveyed through restrained details:

* A subtle botanical divider (`BotanicalDivider`) with a champagne-gold accent, used sparingly for major section breaks.
* Elegant display typography for headings.
* Warm surface colors and soft shadows.
* No over-decoration, no glitter, no heavy gradients.

---

## 19. Open Design Questions

1. **Brand color** — `#68745D` sage green is the launch choice.
2. **Group color palette** — six colors is enough for MVP. More colors risk looking noisy.
3. **Icon font size** — confirm `lucide-react` stroke width feels right at 16 px on small screens.
