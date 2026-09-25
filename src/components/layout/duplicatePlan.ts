import { newId } from '@/lib/id'
import { getRepository } from '@/lib/repo'
import { RepoError } from '@/lib/repo/errors'
import { PlanSchema } from '@/lib/schema/plan'
import { fr, format } from '@/lib/i18n'
import type { Plan } from '@/types/plan'

/**
 * Loads the plan, clones it with a fresh id and a " (copie)" suffix, and saves it.
 * Re-uses the same validation path as `createBlankPlan`.
 */
export async function duplicatePlan(id: string): Promise<Plan> {
  const repo = getRepository()
  const plan = await repo.load(id)
  if (!plan) {
    throw new RepoError('not_found', `Plan ${id} not found`)
  }

  const now = new Date().toISOString()
  const copy: Plan = {
    ...plan,
    meta: {
      ...plan.meta,
      id: newId(),
      name: format(fr.planList.copyName, { name: plan.meta.name }),
      createdAt: now,
      updatedAt: now,
    },
  }

  const result = PlanSchema.safeParse(copy)
  if (!result.success) {
    throw new RepoError('unknown', 'duplicate plan failed validation', result.error)
  }

  await repo.save(result.data)
  return result.data
}