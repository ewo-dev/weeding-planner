import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as idModule from '@/lib/id'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import { CURRENT_VERSION } from '@/lib/schema/migrations'
import { ACTIVE_PLAN_KEY, createBlankPlan } from './createBlankPlan'

describe('createBlankPlan', () => {
  let saveSpy: ReturnType<typeof vi.fn>
  let savedPlan: unknown

  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    savedPlan = undefined
    saveSpy = vi.fn(async (plan: unknown) => {
      savedPlan = plan
    })
    const stub = {
      save: saveSpy,
      list: vi.fn(),
      load: vi.fn(),
      remove: vi.fn(),
    } as unknown as PlanRepository
    vi.spyOn(repoModule, 'getRepository').mockReturnValue(stub)
  })

  it('creates a valid blank plan with the expected defaults', async () => {
    const plan = await createBlankPlan()

    expect(plan.meta.name).toBe('Plan sans titre')
    expect(plan.meta.schemaVersion).toBe(CURRENT_VERSION)
    expect(plan.meta.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(new Date(plan.meta.createdAt).getTime()).not.toBeNaN()
    expect(new Date(plan.meta.updatedAt).getTime()).not.toBeNaN()
    expect(plan.tables).toEqual([])
    expect(plan.guests).toEqual([])
    expect(plan.constraints).toEqual([])
    expect(plan.assignments).toEqual([])

    expect(saveSpy).toHaveBeenCalledTimes(1)
    expect(savedPlan).toEqual(plan)
  })

  it('sets weeding-planner:active-plan to the new id', async () => {
    const plan = await createBlankPlan()
    expect(localStorage.getItem(ACTIVE_PLAN_KEY)).toBe(plan.meta.id)
  })

  it('throws RepoError("unknown") when the saved plan would fail validation', async () => {
    vi.spyOn(idModule, 'newId').mockReturnValue('id-invalide')

    await expect(createBlankPlan()).rejects.toMatchObject({ code: 'unknown' })
    expect(saveSpy).not.toHaveBeenCalled()
  })
})