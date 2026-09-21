import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import { newId } from '@/lib/id'
import type { Plan } from '@/types/plan'
import { ACTIVE_PLAN_KEY } from './createBlankPlan'
import { PlanList } from './PlanList'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}))

function makePlan(name: string, updatedAt: string): Plan {
  return {
    meta: {
      id: newId(),
      name,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt,
      schemaVersion: 1,
    },
    tables: [],
    guests: [],
    constraints: [],
    assignments: [],
  }
}

function makeSummary(id: string, name: string, updatedAt: string) {
  return { id, name, updatedAt }
}

let loadSpy: Mock<(id: string) => Promise<Plan | null>>
let saveSpy: Mock<(plan: Plan) => Promise<void>>
let removeSpy: Mock<(id: string) => Promise<void>>
let onChangedSpy: Mock<() => void>

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  loadSpy = vi.fn(async () => null)
  saveSpy = vi.fn(async () => undefined)
  removeSpy = vi.fn(async () => undefined)
  const stub = {
    list: vi.fn(async () => []),
    load: loadSpy,
    save: saveSpy,
    remove: removeSpy,
  } as unknown as PlanRepository
  vi.spyOn(repoModule, 'getRepository').mockReturnValue(stub)
  onChangedSpy = vi.fn()
  pushMock.mockClear()
})

describe('PlanList', () => {
  it('renders nothing when there are no summaries', () => {
    const { container } = render(<PlanList summaries={[]} onChanged={onChangedSpy} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders one row per summary with the right names and dates', () => {
    const isoA = '2026-09-01T10:30:00.000Z'
    const isoB = '2026-09-02T11:00:00.000Z'
    const isoC = '2026-09-03T12:00:00.000Z'
    render(
      <PlanList
        summaries={[
          makeSummary(newId(), 'Plan A', isoA),
          makeSummary(newId(), 'Plan B', isoB),
          makeSummary(newId(), 'Plan C', isoC),
        ]}
        onChanged={onChangedSpy}
      />,
    )

    expect(screen.getByText('Plan A')).toBeInTheDocument()
    expect(screen.getByText('Plan B')).toBeInTheDocument()
    expect(screen.getByText('Plan C')).toBeInTheDocument()

    const fmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
    expect(screen.getByText(fmt.format(new Date(isoA)))).toBeInTheDocument()
    expect(screen.getByText(fmt.format(new Date(isoB)))).toBeInTheDocument()
    expect(screen.getByText(fmt.format(new Date(isoC)))).toBeInTheDocument()
  })

  it('opens a plan: sets the active plan key and navigates to /editor', async () => {
    const user = userEvent.setup()
    const summary = makeSummary(newId(), 'Plan A', '2026-09-01T10:30:00.000Z')
    render(<PlanList summaries={[summary]} onChanged={onChangedSpy} />)

    await user.click(screen.getByRole('button', { name: 'Ouvrir' }))

    expect(localStorage.getItem(ACTIVE_PLAN_KEY)).toBe(summary.id)
    expect(pushMock).toHaveBeenCalledWith('/editor')
  })

  it('renames a plan on Enter', async () => {
    const user = userEvent.setup()
    const plan = makePlan('Plan A', '2026-09-01T10:30:00.000Z')
    const summary = makeSummary(plan.meta.id, plan.meta.name, plan.meta.updatedAt)
    loadSpy.mockResolvedValue(plan)
    render(<PlanList summaries={[summary]} onChanged={onChangedSpy} />)

    await user.click(screen.getByRole('button', { name: 'Renommer' }))
    const input = screen.getByRole('textbox')
    await user.clear(input)
    await user.type(input, 'Plan B{Enter}')

    expect(loadSpy).toHaveBeenCalledWith(summary.id)
    expect(saveSpy).toHaveBeenCalledTimes(1)
    const saved = saveSpy.mock.calls[0][0]
    expect(saved.meta.id).toBe(summary.id)
    expect(saved.meta.name).toBe('Plan B')
    expect(onChangedSpy).toHaveBeenCalledTimes(1)
  })

  it('deletes a plan after confirmation', async () => {
    const user = userEvent.setup()
    const summary = makeSummary(newId(), 'Plan A', '2026-09-01T10:30:00.000Z')
    render(<PlanList summaries={[summary]} onChanged={onChangedSpy} />)

    await user.click(screen.getByRole('button', { name: 'Supprimer' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Supprimer ce plan ?')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }))

    expect(removeSpy).toHaveBeenCalledWith(summary.id)
    expect(onChangedSpy).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cancelling the dialog does not delete', async () => {
    const user = userEvent.setup()
    const summary = makeSummary(newId(), 'Plan A', '2026-09-01T10:30:00.000Z')
    render(<PlanList summaries={[summary]} onChanged={onChangedSpy} />)

    await user.click(screen.getByRole('button', { name: 'Supprimer' }))
    const dialog = await screen.findByRole('dialog')

    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }))

    expect(removeSpy).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})