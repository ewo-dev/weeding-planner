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
* Browser-only client routes fetch plan data via `PlanRepository` and pass plain props down.
* Each route's data loading is colocated in its `page.tsx`.
* Page-level metadata (`export const metadata`) is defined for the SEO-friendly entry route. The editor itself is a private app surface and does not need SEO metadata.

---

## 3. Route Tree

The application is statically exported (D-019). The route tree has no dynamic routes and no API surface.

```text
src/app/
  layout.tsx                    # Root layout (server, pre-rendered)
  page.tsx                      # Entry / plan list (/, client, hydrates from IndexedDB)
  not-found.tsx                 # 404
  editor/
    page.tsx                    # Editor (/editor, client; reads active plan from IndexedDB)
  print/
    page.tsx                    # Print view (/print, client; reads active plan from IndexedDB)
```

Notes:

* The `api/` folder does not exist. Server actions and route handlers have no place in a static export.
* The active plan is addressed by the preferences record in IndexedDB (see `05-persistence.md` § 4). No plan id appears in the URL.

---

## 4. Root Layout (`app/layout.tsx`)

* Server component.
* Sets up `<html lang="fr">` (see `18-i18n.md` when written — MVP is French-only).
* Loads `globals.css`.
* Wraps the tree in:

  * `<ToastProvider>` (client) — global toast queue.
* Renders `{children}` only — no top bar here. The top bar lives in route-specific layouts.

```tsx
// app/layout.tsx
import './globals.css'
import { ToastProvider } from '@/components/ui/ToastProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
```

---

## 5. Entry Page (`app/page.tsx`) — `/`

The landing/plan list. Client component because IndexedDB is browser-only.

### Behavior

* Reads local plan summaries from `IndexedDbPlanRepository.list()` on the client.
* Renders `<PlanList>` with summaries.
* Shows a primary action: "Nouveau plan" — creates a blank plan in IndexedDB, sets the active-plan preference, and navigates to `/editor`.

### Composition

* `<TopBar>` (client, save status and project actions).
* `<PlanList initialSummaries={...}>` (client; receives initial data, hydrates, handles rename/delete/duplicate).
* Empty state when no plans exist.

### Loading & errors

* No `loading.tsx` — the client renders a small loading state while IndexedDB opens.
* Errors from the repository are rare here; if `list()` fails, show an inline empty state with retry.

---

## 6. Plan Editor (`app/editor/page.tsx`) — `/editor`

The core experience. Fully client: it reads the active plan id from IndexedDB, loads the plan via the repository, and mounts `<PlanProvider>`.

### Client component (`page.tsx`)

* On mount, reads the active plan preference from IndexedDB.
* Calls `PlanRepository.load(activeId)`.
* If null (no active plan, or plan missing): redirect to `/` and surface a toast.
* Otherwise, passes the loaded plan to `<PlanProvider initialPlan={plan}>`.

### Loading state

Rendered inline by the client component (no `loading.tsx` in static export — every page is either pre-rendered or rendered on the client). A small `<EditorSkeleton>` shows during the initial `load()` call.

### Error state

Rendered inline by the client component. Friendly message: "Le plan n'a pas pu être chargé. Réessayer ?" + a retry button. Errors are logged to `console.error`. No stack trace in the UI.

### Composition

```tsx
// app/editor/page.tsx (client)
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getRepository } from '@/lib/repo'
import { PlanProvider } from '@/lib/plan/PlanProvider'
import { EditorLayout } from '@/components/layout/EditorLayout'
import { TopBar } from '@/components/layout/TopBar'
import { SeatingEditor } from '@/components/editor/SeatingEditor'

export default function EditorPage() {
  const router = useRouter()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const activeId = await getActivePlanId()
    if (!activeId) { router.replace('/'); return }
    getRepository().load(activeId)
      .then((p) => p ? setPlan(p) : router.replace('/'))
      .catch((e) => setError(e))
  }, [router])

  if (error) return <EditorError error={error} onRetry={() => setError(null)} />
  if (!plan) return <EditorSkeleton />
  return (
    <PlanProvider initialPlan={plan}>
      <TopBar planName={plan.meta.name} />
      <EditorLayout><SeatingEditor /></EditorLayout>
    </PlanProvider>
  )
}
```

### Authentication gate

There is no auth gate or account state. The active plan is whatever is stored in IndexedDB. There are no shareable plan URLs in MVP.

---

## 7. Print View (`app/print/page.tsx`) — `/print`

Read-only, print-friendly rendering of the active plan. Fully client (D-019).

### Behavior

* On mount, reads the active plan preference from IndexedDB and loads the plan via the repository.
* If no active plan: redirect to `/`.
* Renders `<PrintLayout>` with one `<PrintTable>` per table.
* No top bar, no edit controls, no JS-heavy interactivity beyond the initial load.

### Composition

```tsx
// app/print/page.tsx (client)
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getRepository } from '@/lib/repo'
import { PrintLayout } from '@/components/print/PrintLayout'
import { PrintTable } from '@/components/print/PrintTable'

export default function PrintPage() {
  const router = useRouter()
  const [plan, setPlan] = useState<Plan | null>(null)

  useEffect(() => {
    const activeId = await getActivePlanId()
    if (!activeId) { router.replace('/'); return }
    getRepository().load(activeId).then((p) => p ? setPlan(p) : router.replace('/'))
  }, [router])

  if (!plan) return null
  return (
    <PrintLayout planName={plan.meta.name}>
      {plan.tables.map((table) => (
        <PrintTable key={table.id} table={table} guests={plan.guests} assignments={plan.assignments} />
      ))}
    </PrintLayout>
  )
}
```

### Styles

* `app/print/page.tsx` imports `print.css` directly.
* `@media print` rules hide everything outside `<PrintLayout>` and remove backgrounds for ink savings.

---

## 8. Not Found (`app/not-found.tsx`)

Generic 404. Pre-rendered at build time.

* Renders `<EmptyState>` with copy: "Cette page n'existe pas. Retour à l'accueil."
* "Retour à l'accueil" link goes to `/`.

---

## 9. Middleware

There is no `src/middleware.ts`. Static export runs without a Node runtime, so middleware is unavailable.

---

## 10. Server Actions

There are no server actions. All mutations are client-side calls into `IndexedDbPlanRepository`.

---

## 11. Route Inventory

| Route        | Auth | Renders                 | Notes                                           |
| ------------ | ---- | ----------------------- | ----------------------------------------------- |
| `/`          | No   | Client (entry / list)   | Reads local plan index on mount.                |
| `/editor`    | No   | Client (editor)         | Reads active plan from IndexedDB.              |
| `/print`     | No   | Client (print view)     | Reads active plan from IndexedDB.              |
| Anything else | -   | 404                     |                                                 |

---

## 12. SEO and Metadata

* `/` sets `metadata` with title and description.
* `/editor` and `/print` set `metadata: { robots: { index: false, follow: false } }` — private content.
* Open Graph and Twitter cards are out of scope for MVP.

---

## 13. URL Conventions

* There is no plan id in the URL. Plans are addressed by the active-plan preference in IndexedDB.
* Bookmarking a specific plan is out of scope per `01-product.md` § 22. The MVP is single-device, single-active-plan.
* Query parameters are avoided.

---

## 14. Open Routing Questions

1. **Deep-linkable plans** — encoding the plan id in the URL (e.g. `/editor?id=<uuid>`) could improve bookmarks. Post-MVP.
2. **Share links** — public read-only URLs for printing. Out of scope per `01-product.md` § 22 but the route group `(public)` could host them later.
3. **Internationalization** — currently French-only. If i18n is added, route prefixes (`/en/...`, `/fr/...`) become relevant.
