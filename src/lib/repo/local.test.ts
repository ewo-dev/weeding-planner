import { beforeEach, describe, expect, it, vi } from 'vitest'
import { newId } from '../id'
import type { Plan } from '../schema/plan'
import { LocalPlanRepository } from './local'

const PLAN_KEY_PREFIX = 'weeding-planner:plan:'

function validPlan(name = 'Mariage'): Plan {
  const tableId = newId()
  const g1 = newId()
  const g2 = newId()
  return {
    meta: {
      id: newId(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1,
    },
    tables: [{ id: tableId, name: 'Table 1', shape: 'round', capacity: 8, position: { x: 0, y: 0 } }],
    guests: [
      { id: g1, name: 'Alice' },
      { id: g2, name: 'Bob' },
    ],
    constraints: [],
    assignments: [
      { guestId: g1, tableId, seatIndex: 0 },
      { guestId: g2, tableId, seatIndex: 1 },
    ],
  }
}

describe('LocalPlanRepository', () => {
  let repo: LocalPlanRepository

  beforeEach(() => {
    localStorage.clear()
    repo = new LocalPlanRepository()
  })

  it('lists nothing when no index exists', async () => {
    expect(await repo.list()).toEqual([])
  })

  it('round-trips save then load', async () => {
    const plan = validPlan()
    await repo.save(plan)

    const loaded = await repo.load(plan.meta.id)
    expect(loaded).not.toBeNull()
    expect(loaded!.meta.id).toBe(plan.meta.id)
    expect(loaded!.meta.name).toBe(plan.meta.name)
    expect(loaded!.meta.updatedAt >= plan.meta.updatedAt).toBe(true)
    expect(loaded!.tables).toEqual(plan.tables)
    expect(loaded!.guests).toEqual(plan.guests)
    expect(loaded!.constraints).toEqual(plan.constraints)
    expect(loaded!.assignments).toEqual(plan.assignments)
  })

  it('lists saved plans most recent first', async () => {
    await repo.save(validPlan('Plan A'))
    await repo.save(validPlan('Plan B'))

    const list = await repo.list()
    expect(list.map((s) => s.name)).toEqual(['Plan B', 'Plan A'])
    expect(list[0].id).toBeTruthy()
    expect(list[0].updatedAt).toBeTruthy()
  })

  it('moves a re-saved plan to the front of the index', async () => {
    const a = validPlan('Plan A')
    await repo.save(a)
    await repo.save(validPlan('Plan B'))
    await repo.save(a)

    const list = await repo.list()
    expect(list.map((s) => s.name)).toEqual(['Plan A', 'Plan B'])
  })

  it('returns null for a missing id', async () => {
    expect(await repo.load(newId())).toBeNull()
  })

  it('loads a raw stored plan through migration and validation', async () => {
    const plan = validPlan()
    localStorage.setItem(`${PLAN_KEY_PREFIX}${plan.meta.id}`, JSON.stringify(plan))

    const loaded = await repo.load(plan.meta.id)
    expect(loaded).toEqual(plan)
  })

  it('throws RepoError("corrupt") for invalid stored JSON', async () => {
    const id = newId()
    localStorage.setItem(`${PLAN_KEY_PREFIX}${id}`, '{broken')
    await expect(repo.load(id)).rejects.toMatchObject({ code: 'corrupt' })
  })

  it('throws RepoError("corrupt") when stored data fails validation', async () => {
    const id = newId()
    localStorage.setItem(`${PLAN_KEY_PREFIX}${id}`, JSON.stringify({ meta: { id } }))
    await expect(repo.load(id)).rejects.toMatchObject({ code: 'corrupt' })
  })

  it('maps QuotaExceededError to RepoError("quota")', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    try {
      await expect(repo.save(validPlan())).rejects.toMatchObject({ code: 'quota' })
    } finally {
      spy.mockRestore()
    }
  })

  it('removes a plan and its index entry', async () => {
    await repo.save(validPlan('Plan A'))
    await repo.save(validPlan('Plan B'))
    const [first] = await repo.list()

    await repo.remove(first.id)

    expect(await repo.load(first.id)).toBeNull()
    const list = await repo.list()
    expect(list.map((s) => s.name)).toEqual(['Plan A'])
  })

  it('remove of a missing id is a no-op', async () => {
    await expect(repo.remove(newId())).resolves.toBeUndefined()
  })
})