import { CURRENT_VERSION, migrate } from '@/lib/schema/migrations'
import { PlanSchema } from '@/lib/schema/plan'
import type { Plan } from '@/lib/schema/plan'
import { RepoError } from '@/lib/repo/errors'
import type { PlanRepository, PlanSummary } from '@/lib/repo/types'

// Storage keys (docs/05-persistence.md § 4):
//   weeding-planner:plan:<id>  -> JSON-encoded Plan
//   weeding-planner:plan-index -> JSON array of PlanSummary
//   weeding-planner:active-plan -> currently open planId (used by the entry page, step 6)
const PLAN_KEY_PREFIX = 'weeding-planner:plan:'
const INDEX_KEY = 'weeding-planner:plan-index'

/**
 * localStorage-backed plan repository (docs/05-persistence.md § 4).
 * The plan lives under its own key; the index is a derived, rebuildable cache.
 */
export class LocalPlanRepository implements PlanRepository {
  async list(): Promise<PlanSummary[]> {
    return this.#readIndex()
  }

  async load(id: string): Promise<Plan | null> {
    const raw = localStorage.getItem(`${PLAN_KEY_PREFIX}${id}`)
    if (raw === null) return null

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (err) {
      throw new RepoError('corrupt', `Plan ${id} is not valid JSON`, err)
    }

    let migrated: unknown
    try {
      migrated = migrate(parsed)
    } catch (err) {
      throw new RepoError('corrupt', `Plan ${id} failed migration`, err)
    }

    const result = PlanSchema.safeParse(migrated)
    if (!result.success) {
      throw new RepoError('corrupt', `Plan ${id} failed validation`, result.error)
    }
    return result.data
  }

  async save(plan: Plan): Promise<void> {
    const next: Plan = {
      ...plan,
      meta: {
        ...plan.meta,
        updatedAt: new Date().toISOString(),
        schemaVersion: CURRENT_VERSION,
      },
    }

    const result = PlanSchema.safeParse(next)
    if (!result.success) {
      throw new RepoError('corrupt', `Plan ${next.meta.id} failed validation`, result.error)
    }

    try {
      localStorage.setItem(`${PLAN_KEY_PREFIX}${next.meta.id}`, JSON.stringify(next))
    } catch (err) {
      if (isQuotaError(err)) throw new RepoError('quota', 'Storage limit reached', err)
      throw new RepoError('unknown', `Failed to save plan ${next.meta.id}`, err)
    }

    this.#updateIndex(next)
  }

  async remove(id: string): Promise<void> {
    localStorage.removeItem(`${PLAN_KEY_PREFIX}${id}`)
    const next = this.#readIndex().filter((s) => s.id !== id)
    this.#writeIndex(next)
  }

  #readIndex(): PlanSummary[] {
    const raw = localStorage.getItem(INDEX_KEY)
    if (raw === null) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  #writeIndex(index: PlanSummary[]): void {
    try {
      localStorage.setItem(INDEX_KEY, JSON.stringify(index))
    } catch (err) {
      if (isQuotaError(err)) throw new RepoError('quota', 'Storage limit reached', err)
      throw new RepoError('unknown', 'Failed to write plan index', err)
    }
  }

  #updateIndex(plan: Plan): void {
    const summary: PlanSummary = {
      id: plan.meta.id,
      name: plan.meta.name,
      updatedAt: plan.meta.updatedAt,
    }
    const next = [summary, ...this.#readIndex().filter((s) => s.id !== plan.meta.id)]
    this.#writeIndex(next)
  }
}

function isQuotaError(err: unknown): boolean {
  return (
    typeof DOMException !== 'undefined' &&
    err instanceof DOMException &&
    err.name === 'QuotaExceededError'
  )
}