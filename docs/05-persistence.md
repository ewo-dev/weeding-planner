# Plan de Table — Persistence

## 1. Purpose

This document defines browser persistence, automatic saving, project-file portability, and recovery. The application has no account, authentication, backend, remote database, or cloud sync.

The canonical data model is defined in `03-data-model.md`. The repository is the only layer that talks to browser storage.

## 2. Goals and Non-Goals

### Goals

* Work without a network connection after the application assets are loaded.
* Automatically persist edits locally without requiring user action.
* Preserve complete plans across reloads and browser sessions.
* Export and import complete, validated, versioned JSON project files.
* Make storage failures and recovery options visible to the user.

### Non-goals

* Accounts, authentication, remote persistence, or synchronization.
* Automatic cross-device access. Use export/import instead.
* Real-time collaboration or version history across sessions.
* Treating browser storage as a backup. Users must be encouraged to export.

## 3. Repository Abstraction

All plan persistence goes through `src/lib/repo/types.ts`:

```ts
export interface PlanRepository {
  list(): Promise<PlanSummary[]>
  load(id: string): Promise<Plan | null>
  save(plan: Plan): Promise<void>
  remove(id: string): Promise<void>
}
```

The MVP has one implementation: `IndexedDbPlanRepository`. Keeping the interface small leaves room for a future remote adapter without adding remote behavior now.

## 4. IndexedDB Persistence

Use IndexedDB, not `localStorage`, for plan data.

Reasons:

* IndexedDB is asynchronous and avoids blocking the editor while serializing or writing.
* Records are stored transactionally, so a plan and its summary/index cannot be partially updated.
* It has more headroom than the typical 5–10 MB `localStorage` quota.
* Structured records are a better extension point for multiple plans, snapshots, and future binary assets.
* The expected MVP plans are small, but choosing the more durable primitive avoids a migration caused by reasonable future growth.

Use one database named `weeding-planner` with:

```text
plans        -> Plan records keyed by meta.id
preferences  -> active plan id and non-plan preferences
```

Do not store derived duplicate indexes unless profiling demonstrates a need. Plan summaries can be read from records or maintained transactionally in the same database.

All database access is browser-only and must be initialized from client code. Handle unavailable storage, blocked upgrades, aborted transactions, and quota failures as typed repository errors.

## 5. Autosave and Durability

Plan mutations trigger a debounced save, initially 500 ms after the last mutation. The provider should expose `saved`, `saving`, and `error` status.

* Await the IndexedDB write before reporting the plan as saved.
* Flush pending work when the page is hidden where practical; `beforeunload` is not a reliable async-save mechanism.
* Keep the last successfully saved plan intact if a newer save fails.
* Do not silently discard unsaved in-memory edits.
* Provide a prominent export action and a clear warning when persistence is unavailable or quota is exceeded.

Browser storage can be evicted, cleared, or made unavailable by private browsing, browser policy, device cleanup, or user action. The app must not promise permanent backup. A future release may add explicit local snapshots, but that is not required for the MVP.

## 6. Project Export and Import

Export a complete project, not only the current assignments. The file includes the plan model and a separate file-format version:

```ts
type ProjectFile = {
  format: 'plan-de-table-project'
  formatVersion: number
  exportedAt: string
  plan: Plan
}
```

Export rules:

* Serialize deterministic JSON where practical for useful diffs and reliable tests.
* Include all tables, guests, constraints, assignments, layout positions, and plan metadata.
* Never include browser-only preferences or private runtime state.
* Use a filename derived from the plan name with a safe `.json` suffix.

Import rules:

1. Parse the selected file as JSON.
2. Validate the envelope and reject unknown `format` values.
3. Migrate `formatVersion` sequentially to the current file version.
4. Migrate and validate `plan.meta.schemaVersion` using the data-model migrations.
5. Validate all invariants before writing anything.
6. Import as a new plan ID by default to avoid overwriting existing work; offer replacement only through an explicit user action.
7. Persist the imported plan in one IndexedDB transaction and make it active only after the write succeeds.

Malformed or unsupported files must leave existing plans untouched. Offer a friendly error and, where safe, preserve the original file for the user to retry with a newer application version.

## 7. Schema Versioning and Backward Compatibility

The plan's `meta.schemaVersion` and the project file's `formatVersion` are separate:

* `schemaVersion` versions the internal `Plan` model.
* `formatVersion` versions the JSON envelope and import/export contract.

On load or import, migrate sequentially, then validate with the schema. Saves and exports write the current versions. Keep migrations pure, deterministic, and covered by fixtures for every supported historical version.

Older files should remain importable for as long as their migration code is shipped. Unknown future versions must be rejected rather than guessed. If validation fails after migration, show recovery options without deleting the source record or file.

## 8. Errors and Recovery

Use typed `RepoError` codes:

| Code          | Meaning                                  | UI behavior |
| ------------- | ---------------------------------------- | ----------- |
| `not_found`   | Plan id does not exist                   | Return to entry page. |
| `quota`       | Browser storage quota was exceeded       | Explain export/cleanup options. |
| `unavailable` | IndexedDB is blocked or unavailable      | Offer export of the in-memory plan and explain the limitation. |
| `corrupt`     | Record or imported file failed validation | Keep source intact; offer retry/export recovery. |
| `unknown`     | Unexpected failure                       | Friendly message and developer log. |

Never reset or overwrite a plan automatically after a load or import failure.

## 9. Offline and Future Extensions

The core editor, engine, IndexedDB repository, and JSON import/export require no network request. GitHub Pages serves the static application; hosting does not participate in data storage.

Native browser print remains the MVP PDF path. A dedicated PDF generator can be added later as another client-side export capability. A future backend, authentication system, or sync service can be introduced behind a new repository adapter if product demand justifies its complexity; it is not part of the current architecture.
