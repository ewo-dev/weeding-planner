import { LocalPlanRepository } from '@/lib/repo/local'
import type { PlanRepository } from '@/lib/repo/types'

/**
 * Factory for the active plan repository.
 * Anonymous users always use local storage.
 * TODO step 14: when signed in, return a CompositeRepository (local + Supabase).
 */
export function getRepository(): PlanRepository {
  return new LocalPlanRepository()
}