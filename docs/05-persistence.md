# Plan de Table — Persistence

## 1. Purpose

This document defines how plans are stored and synchronized.

It covers:

* The repository abstraction.
* Local-first persistence in the browser.
* Cloud persistence in Supabase (optional).
* Authentication flow.
* The sync model between local and cloud.
* Schema migrations.
* Error handling.

The data model itself is defined in `03-data-model.md`.

---

## 2. Goals and Non-Goals

### Goals

* The application **must work without authentication**.
* Saving must be **transparent** — the user never loses work on a refresh.
* Cloud sync must be **opt-in** and **additive** — never block local usage.
* Persistence must be **fast enough** to feel instant (autosave debounced, < 200 ms perceived).
* Plans must be **portable** between local and cloud without loss.

### Non-goals

* Real-time collaboration (no presence, no concurrent edits).
* Version history / undo across sessions (in-session undo/redo is enough for MVP).
* Offline-first PWA infrastructure beyond what `localStorage` gives us (no IndexedDB for MVP).
* Multi-device conflict-resolution UI (last-write-wins with a warning is enough).

---

## 3. Repository Abstraction

All persistence goes through a single interface in `lib/repo/types.ts`:

```ts
import { Plan, PlanSummary } from '@/lib/schema/plan'

export interface PlanSummary {
  id: string
  name: string
  updatedAt: string
}

export interface PlanRepository {
  /** List all plans visible to the current user. */
  list(): Promise<PlanSummary[]>

  /** Load a plan by id. Returns null if not found. */
  load(id: string): Promise<Plan | null>

  /** Persist a plan (insert or update). */
  save(plan: Plan): Promise<void>

  /** Delete a plan by id. */
  remove(id: string): Promise<void>

  /**
   * Optional: stream of remote changes.
   * Implemented by SupabasePlanRepository for cross-device updates.
   * Local repository returns a never-yielding async iterable.
   */
  watch?(): AsyncIterable<PlanSummary[]>
}
```

Implementations:

* `LocalPlanRepository` — always present, uses `localStorage`.
* `SupabasePlanRepository` — present when the user is signed in.

A factory in `lib/repo/index.ts` selects which to use based on auth state.

---

## 4. Local Persistence

### Storage

Browser `localStorage` only. No IndexedDB, no Service Worker.

Two keys:

```text
weeding-planner:plan:<planId>   -> JSON-encoded Plan
weeding-planner:plan-index      -> JSON array of PlanSummary
weeding-planner:active-plan     -> planId currently open (string | null)
```

The full plan is stored under its own key so that listing plans and listing plan contents are independent operations. The index is a derived cache and can be rebuilt from the keys.

### Repository implementation

```ts
class LocalPlanRepository implements PlanRepository {
  async list(): Promise<PlanSummary[]> {
    const raw = localStorage.getItem('weeding-planner:plan-index')
    return raw ? JSON.parse(raw) : []
  }

  async load(id: string): Promise<Plan | null> {
    const raw = localStorage.getItem(`weeding-planner:plan:${id}`)
    if (!raw) return null
    const parsed = migrate(JSON.parse(raw))    // see schema migrations
    return PlanSchema.parse(parsed)              // validation
  }

  async save(plan: Plan): Promise<void> {
    const next: Plan = { ...plan, meta: { ...plan.meta, updatedAt: new Date().toISOString() } }
    PlanSchema.parse(next)                       // validate before write
    localStorage.setItem(`weeding-planner:plan:${plan.meta.id}`, JSON.stringify(next))
    await this.#updateIndex(next)
  }

  async remove(id: string): Promise<void> {
    localStorage.removeItem(`weeding-planner:plan:${id}`)
    await this.#updateIndexExcluding(id)
  }

  async #updateIndex(plan: Plan) {
    const list = await this.list()
    const summary: PlanSummary = {
      id: plan.meta.id, name: plan.meta.name, updatedAt: plan.meta.updatedAt,
    }
    const next = [summary, ...list.filter(s => s.id !== plan.meta.id)]
    localStorage.setItem('weeding-planner:plan-index', JSON.stringify(next))
  }
}
```

### Quota handling

`localStorage` is typically capped at 5–10 MB. The application never stores anything except plan JSON. With 200 guests and 25 tables, a plan is on the order of tens of KB — well within quota.

If `save` throws a `QuotaExceededError`, the repository throws `RepoError("quota")`. The UI surfaces this through a toast: "Storage limit reached — clear old plans or sign in to save online."

### Autosave

Plan mutations trigger an autosave with these rules:

* Debounced 500 ms after the last mutation.
* Immediate save on `beforeunload`.
* Immediate save before auto-generation runs (so the engine operates on a persisted baseline).

The autosave is owned by the plan context (see `02-architecture.md` § 7).

---

## 5. Cloud Persistence (Supabase)

### When it applies

Cloud persistence is only used when the user is signed in. The active repository is selected by the factory:

```ts
function getRepository(user: User | null): PlanRepository {
  if (!user) return new LocalPlanRepository()
  return new CompositeRepository([
    new LocalPlanRepository(),
    new SupabasePlanRepository(user.id),
  ])
}
```

`CompositeRepository` writes to both backends in parallel and reads from local first, falling back to cloud only when local is missing. The local copy is the source of truth for the current session; the cloud copy is a backup and a cross-device mirror.

### Supabase schema

A single table:

```sql
create table plans (
  id              uuid primary key,
  owner_id        uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  schema_version  int  not null,
  data            jsonb not null
);

create index plans_owner_updated_idx
  on plans (owner_id, updated_at desc);

alter table plans enable row level security;

create policy "owner_read"
  on plans for select
  using (auth.uid() = owner_id);

create policy "owner_write"
  on plans for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
```

The columns mirror `PlanMeta` for indexing and list queries; `data` is the full plan object.

### Repository implementation (outline)

```ts
class SupabasePlanRepository implements PlanRepository {
  constructor(private supabase: SupabaseClient, private ownerId: string) {}

  async list(): Promise<PlanSummary[]> {
    const { data, error } = await this.supabase
      .from('plans')
      .select('id, name, updated_at')
      .eq('owner_id', this.ownerId)
      .order('updated_at', { ascending: false })
    if (error) throw new RepoError('network', error.message)
    return data.map(r => ({ id: r.id, name: r.name, updatedAt: r.updated_at }))
  }

  async load(id: string): Promise<Plan | null> {
    const { data, error } = await this.supabase
      .from('plans').select('data').eq('id', id).single()
    if (error) {
      if (error.code === 'PGRST116') return null    // not found
      throw new RepoError('network', error.message)
    }
    return PlanSchema.parse(migrate(data))
  }

  async save(plan: Plan): Promise<void> {
    const next = { ...plan, meta: { ...plan.meta, updatedAt: new Date().toISOString() } }
    const { error } = await this.supabase.from('plans').upsert({
      id: next.meta.id,
      owner_id: this.ownerId,
      name: next.meta.name,
      created_at: next.meta.createdAt,
      updated_at: next.meta.updatedAt,
      schema_version: next.meta.schemaVersion,
      data: next,
    })
    if (error) throw new RepoError('network', error.message)
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from('plans').delete().eq('id', id)
    if (error) throw new RepoError('network', error.message)
  }
}
```

---

## 6. Authentication

* Library: `@supabase/ssr` (the official Next.js App Router binding).
* Email + password, magic link, and OAuth (Google) for the MVP.
* Sign-in lives behind a small `AuthMenu` in the top bar. Anonymous use is the default; auth is never required.
* Server components read the session via `lib/auth/server.ts`; client components use `useUser()` from `lib/auth/useUser.ts`.

### Routes

* `/sign-in` — sign-in form (server component with a client form island).
* `/auth/callback` — Supabase OAuth callback.
* `/(app)/plan/...` — the editor, gated only by plan ownership, not by auth.

There is no "you must sign in to continue" page.

---

## 7. Sync Model

### Read path

```text
PlanProvider mounts
  -> local.load(id)
  -> if local has it: use it
  -> else: supabase.load(id) -> use it
```

If neither has it: redirect to entry page with a "Plan not found" toast.

### Write path

```text
user mutation -> reducer
  -> debounce 500 ms
  -> local.save(plan)            // synchronous-ish, ~5 ms
  -> supabase.save(plan)         // best-effort, fire-and-forget
```

Cloud saves are **fire-and-forget** during editing. They are not awaited for UI responsiveness. On failure, the local copy remains valid and a toast informs the user: "Cloud sync failed — your changes are saved locally and will retry."

### Cross-device

* On mount, if the local `updatedAt` is older than the cloud `updatedAt`, the UI shows a banner:
  "This plan has newer changes on another device. Load them?"
* Loading remote overwrites local without merge.
* This is intentional for MVP. A merge UI is out of scope.

### Conflict policy

Last-write-wins by `updatedAt`. No per-field merge.

---

## 8. Migrations on Load

Whenever the repository loads a plan (local or cloud):

1. Parse JSON.
2. Run migrations from the stored `meta.schemaVersion` up to `CURRENT_VERSION` (see `03-data-model.md` § 9).
3. Validate with `PlanSchema`.
4. If validation fails, throw `RepoError("corrupt")` — the UI offers a "Discard plan" or "Keep editing in memory" choice.

Migrations run on load, never on save. Saves always write at `CURRENT_VERSION`.

---

## 9. Errors

The repository throws `RepoError` with a `code`:

| Code        | Meaning                              | UI behavior                          |
| ----------- | ------------------------------------ | ------------------------------------ |
| `not_found` | Plan id does not exist anywhere      | Redirect to entry.                   |
| `quota`     | localStorage full                    | Toast + link to manage plans.        |
| `network`   | Supabase request failed              | Toast: "Cloud sync failed".          |
| `auth`      | User lost session mid-action        | Sign-in prompt, retry once.          |
| `corrupt`   | Plan failed validation after migration | Recovery dialog (see below).       |
| `unknown`   | Anything else                        | Generic toast, log to console.       |

### Recovery dialog for `corrupt`

* "This plan could not be loaded. It may be from an older version of the app."
* Options: **Discard plan**, **Export raw JSON**, **Try to load as draft** (read-only view of the raw shape).

---

## 10. Listing and Plan Management UI

The entry page (`/`) lists:

* All local plans (from `LocalPlanRepository.list`).
* All cloud plans (from `SupabasePlanRepository.list`) when signed in.
* A combined, deduplicated view, with a small badge indicating source.

Each row supports:

* Open
* Rename (inline edit)
* Delete (with confirm)
* Duplicate (creates a copy with a new id)

---

## 11. Open Persistence Questions

1. **IndexedDB upgrade path** — if plans grow beyond ~100 KB, move from `localStorage` to IndexedDB. Not in MVP.
2. **Background retry for cloud saves** — current model is fire-and-forget; a queue with retry could improve reliability. Post-MVP.
3. **Sharing** — explicitly out of scope. The schema does not include a `shared_with` field yet; adding it later is non-breaking.
