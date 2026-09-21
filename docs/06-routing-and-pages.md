# Plan de Table — Routing & Pages

## 1. Purpose

This document defines the Next.js App Router structure of the application.

It covers:

* Every route the application exposes.
* Server vs client component split per route.
* Data loading per route.
* Loading and error boundaries.
* Layouts and shared chrome.

The architecture itself is described in `02-architecture.md`. The data model in `03-data-model.md`.

---

## 2. Conventions

* All routes live under `src/app/`.
* File names are `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`.
* Server components are the default; `"use client"` is added only when needed.
* Server components fetch plan data via `PlanRepository` and pass plain props down.
* Each route's data loading is colocated in its `page.tsx`.
* Page-level metadata (`export const metadata`) is defined for SEO-friendly routes only (entry, sign-in). The editor itself is a private app surface and does not need SEO metadata.

---

## 3. Route Tree

```text
src/app/
  layout.tsx                    # Root layout (server)
  globals.css                   # Tailwind base + tokens
  page.tsx                      # Entry / plan list (/, public)
  not-found.tsx                 # 404
  sign-in/
    page.tsx                    # Sign-in (/sign-in, public)
  plan/
    [planId]/
      page.tsx                  # Editor (/plan/:planId, requires plan access)
      loading.tsx               # Editor skeleton
      error.tsx                 # Editor error boundary
      print/
        page.tsx                # Print view (/plan/:planId/print)
  api/                          # (reserved) — no routes in MVP
```

The `api/` folder is reserved for server actions or route handlers if needed later. Server actions are preferred for mutations in MVP.

---

## 4. Root Layout (`app/layout.tsx`)

* Server component.
* Sets up `<html lang="fr">` (see `18-i18n.md` when written — MVP is French-only).
* Loads `globals.css`.
* Wraps the tree in:

  * `<AuthProvider>` (client) — provides the Supabase session.
  * `<ToastProvider>` (client) — global toast queue.
* Renders `{children}` only — no top bar here. The top bar lives in route-specific layouts.

```tsx
// app/layout.tsx
import './globals.css'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { ToastProvider } from '@/components/ui/ToastProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
```

---

## 5. Entry Page (`app/page.tsx`) — `/`

The landing/plan list. Server component.

### Behavior

* Reads the local plan index (`LocalPlanRepository.list()`).
* If the user is signed in, also reads the Supabase index and merges.
* Renders `<PlanList>` with summaries.
* Shows a primary action: "Nouveau plan" — creates a blank plan and redirects to `/plan/[id]`.

### Composition

* `<TopBar>` (client, sign-in widget).
* `<PlanList initialSummaries={...}>` (client; receives initial data, hydrates, handles rename/delete/duplicate).
* Empty state when no plans exist.

### Loading & errors

* No `loading.tsx` — server-rendered, fast.
* Errors from the repository are rare here; if `list()` fails, show an inline empty state with retry.

---

## 6. Plan Editor (`app/plan/[planId]/page.tsx`) — `/plan/[planId]`

The core experience. The shell is a server component; the editor itself is a client subtree.

### Server shell (`page.tsx`)

* Validates `planId` is a UUID. Otherwise `notFound()`.
* Loads the plan via `PlanRepository.load(planId)`.
* If null: `notFound()` with a custom message ("Ce plan n'existe pas ou a été supprimé").
* Passes the loaded plan to `<PlanProvider initialPlan={plan}>`.

### Loading state (`loading.tsx`)

Renders `<EditorSkeleton>`:

* Header placeholder.
* Left panel placeholder with five `GuestRowSkeleton`.
* Right canvas placeholder with one `TableCardSkeleton`.
* Skeletons use the same dimensions as the real components to avoid layout shift.

### Error state (`error.tsx`)

* Client component (required by Next.js).
* Catches thrown errors in the editor subtree.
* Friendly message: "Le plan n'a pas pu être chargé. Réessayer ?" + a button that calls `reset()`.
* Logs the error to `console.error`. No stack trace in the UI.

### Composition

```tsx
// app/plan/[planId]/page.tsx (server)
import { PlanProvider } from '@/lib/plan/PlanProvider'
import { EditorLayout } from '@/components/layout/EditorLayout'
import { TopBar } from '@/components/layout/TopBar'
import { SeatingEditor } from '@/components/editor/SeatingEditor'
import { getRepository } from '@/lib/repo'

export default async function PlanPage({ params }: { params: { planId: string } }) {
  const repo = getRepository(await getUser())
  const plan = await repo.load(params.planId)
  if (!plan) notFound()

  return (
    <PlanProvider initialPlan={plan}>
      <TopBar planName={plan.meta.name} />
      <EditorLayout>
        <SeatingEditor />
      </EditorLayout>
    </PlanProvider>
  )
}
```

The editor subtree inside `<PlanProvider>` is fully client and owns all interactivity.

### Authentication gate

There is **no auth gate**. Anyone with a link to `/plan/[planId]` who can present that ID can edit the plan if it exists in their local storage. Cloud plans require the owner session.

When loading a plan that exists in the cloud but not locally for an authenticated user:

* Server fetches via `SupabasePlanRepository`.
* If 404, redirect to `/`.

---

## 7. Print View (`app/plan/[planId]/print/page.tsx`) — `/plan/[planId]/print`

Read-only, print-friendly rendering of the plan.

### Behavior

* Server component. Loads the plan via the repository (no auth needed if local).
* Renders `<PrintLayout>` with `<PrintTable>` per table.
* No top bar, no edit controls, no JS-heavy interactivity.

### Composition

```tsx
// app/plan/[planId]/print/page.tsx (server)
import { PrintLayout } from '@/components/print/PrintLayout'
import { PrintTable } from '@/components/print/PrintTable'
import { getRepository } from '@/lib/repo'

export default async function PrintPage({ params }: { params: { planId: string } }) {
  const repo = getRepository(await getUser())
  const plan = await repo.load(params.planId)
  if (!plan) notFound()

  return (
    <PrintLayout planName={plan.meta.name}>
      {plan.tables.map(table => (
        <PrintTable key={table.id} table={table} guests={plan.guests} assignments={plan.assignments} />
      ))}
    </PrintLayout>
  )
}
```

### Styles

* `app/plan/[planId]/print/page.tsx` imports `print.css` directly.
* `@media print` rules hide everything outside `<PrintLayout>` and remove backgrounds for ink savings.

Detailed rules: see `15-print-export.md` (when written).

---

## 8. Sign-in (`app/sign-in/page.tsx`) — `/sign-in`

Public route. Server component shell.

### Behavior

* Shows `<SignInForm>` (client) with email + password, magic link button, and OAuth buttons.
* On success, redirects to `/`.
* Already-signed-in users are redirected away (handled in the server component).

### Composition

* Server `page.tsx` checks `getUser()` server-side; redirects to `/` if already signed in.
* Renders `<AuthCard>` containing `<SignInForm>`.

---

## 9. Not Found (`app/not-found.tsx`)

Generic 404.

* Renders `<EmptyState>` with copy: "Cette page n'existe pas. Retour à l'accueil."
* "Retour à l'accueil" link goes to `/`.

---

## 10. Middleware

`src/middleware.ts` (Next.js middleware):

* Refreshes the Supabase session cookie on every request.
* Does **not** gate routes. The app is open by design.

```ts
import { createMiddlewareClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  await supabase.auth.getSession()
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

## 11. Server Actions (reserved)

For MVP we minimize server actions. The two that may exist:

* `createBlankPlan()` — invoked from `/` to create a new plan and redirect.
* `signInWithPassword(formData)` — used by `<SignInForm>`.

Server actions live in files marked with `"use server"` (top of file) and are called directly from client components.

---

## 12. Route Inventory

| Route                  | Method  | Auth | Server/Client | Loads                  |
| ---------------------- | ------- | ---- | ------------- | ---------------------- |
| `/`                    | GET     | No   | Server        | Plan index (local + cloud) |
| `/sign-in`             | GET     | No   | Server        | Session check          |
| `/plan/[planId]`       | GET     | No*  | Server shell + client editor | Plan by id       |
| `/plan/[planId]/print` | GET     | No*  | Server        | Plan by id             |
| Anything else          | -       | -    | 404           | -                      |

*Cloud plans require the owner; the server component enforces this when loading from Supabase.

---

## 13. SEO and Metadata

* `/` and `/sign-in` set `metadata` with title and description.
* `/plan/[planId]` sets `metadata: { robots: { index: false, follow: false } }` — private content.
* Open Graph and Twitter cards are out of scope for MVP.

---

## 14. URL Conventions

* Plan IDs are UUIDs in the URL. No human-readable slugs in MVP (avoids collisions and simplifies migration).
* The active plan id is also stored in `localStorage` (`weeding-planner:active-plan`) so a hard refresh doesn't lose the editor context.
* Query parameters are avoided. The editor has no shareable state beyond the plan id itself.

---

## 15. Open Routing Questions

1. **Plan slug** — human-readable URL like `/plan/wedding-alice-bob`. Post-MVP, requires uniqueness checks in the repo.
2. **Share links** — public read-only URLs for printing. Out of scope per `01-product.md` § 22 but the route group `(public)` could host them later.
3. **Internationalization** — currently French-only. If i18n is added, route prefixes (`/en/...`, `/fr/...`) become relevant.
