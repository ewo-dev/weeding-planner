import { newId } from '@/lib/id'
import { getRepository } from '@/lib/repo'
import { RepoError } from '@/lib/repo/errors'
import { PlanSchema } from '@/lib/schema/plan'
import { CURRENT_VERSION } from '@/lib/schema/migrations'
import { fr } from '@/lib/i18n'
import type { Plan } from '@/types/plan'

/**
 * localStorage key holding the currently-open plan id (docs/05-persistence.md § 4).
 */
export const ACTIVE_PLAN_KEY = 'weeding-planner:active-plan'

/**
 * Creates and persists a fresh blank plan, then marks it as the active plan.
 * The caller is responsible for navigating to the editor afterwards.
 */
export async function createBlankPlan(): Promise<Plan> {
  const now = new Date().toISOString()
  const plan: Plan = {
    meta: {
      id: newId(),
      name: fr.planList.untitled,
      createdAt: now,
      updatedAt: now,
      schemaVersion: CURRENT_VERSION,
    },
    tables: [],
    guests: [],
    constraints: [],
    assignments: [],
  }

  const result = PlanSchema.safeParse(plan)
  if (!result.success) {
    throw new RepoError('unknown', 'blank plan failed validation', result.error)
  }

  await getRepository().save(result.data)
  localStorage.setItem(ACTIVE_PLAN_KEY, result.data.meta.id)
  return result.data
}