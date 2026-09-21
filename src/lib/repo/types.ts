import type { Plan } from '@/lib/schema/plan'

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
   * Implemented by SupabasePlanRepository for cross-device updates;
   * the local repository does not implement it.
   */
  watch?(): AsyncIterable<PlanSummary[]>
}