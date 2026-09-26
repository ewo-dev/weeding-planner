import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { ACTIVE_PLAN_KEY } from '@/components/layout/createBlankPlan'
import HomePage from './page'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}))

let listSpy: Mock<() => Promise<unknown[]>>
let saveSpy: Mock<(plan: Plan) => Promise<void>>

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  listSpy = vi.fn(async () => [])
  saveSpy = vi.fn(async () => undefined)
  const stub = {
    list: listSpy,
    save: saveSpy,
    load: vi.fn(),
    remove: vi.fn(),
  } as unknown as PlanRepository
  vi.spyOn(repoModule, 'getRepository').mockReturnValue(stub)
  pushMock.mockClear()
})

describe('HomePage', () => {
  it('shows the empty state when the repository returns no plans', async () => {
    render(<HomePage />)

    expect(await screen.findByText(/aucun plan pour l'instant/i)).toBeInTheDocument()
    expect(listSpy).toHaveBeenCalledTimes(1)
  })

  it('creates a blank plan, sets it as active, and navigates to the editor', async () => {
    const user = userEvent.setup()
    render(<HomePage />)

    await user.click(await screen.findByRole('button', { name: /nouveau plan/i }))

    await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(1))
    const plan = saveSpy.mock.calls[0][0]
    expect(localStorage.getItem(ACTIVE_PLAN_KEY)).toBe(plan.meta.id)
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/editor'))
  })
})