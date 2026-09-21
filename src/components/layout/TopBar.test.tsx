import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { addGuest } from '@/lib/plan/actions'
import { PlanProvider } from '@/lib/plan/context'
import { usePlan } from '@/lib/plan/usePlan'
import { TopBar } from './TopBar'

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}))

function makePlan(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Plan A',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [],
    guests: [],
    constraints: [],
    assignments: [],
  }
}

function DispatchHarness() {
  const { dispatch } = usePlan()
  return (
    <button type="button" onClick={() => dispatch(addGuest({ name: 'X' }))}>
      dispatch
    </button>
  )
}

function renderTopBar() {
  return render(
    <PlanProvider initialPlan={makePlan()}>
      <TopBar />
      <DispatchHarness />
    </PlanProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  pushMock.mockClear()
  vi.spyOn(repoModule, 'getRepository').mockReturnValue({
    save: vi.fn(async () => undefined),
  } as unknown as PlanRepository)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('TopBar', () => {
  it('renders the plan name, disables undo/redo, and shows the save indicator once saved', async () => {
    renderTopBar()

    expect(screen.getByRole('button', { name: 'Plan A' })).toBeInTheDocument()
    // idle: no save indicator before the first mutation.
    expect(screen.queryByText('Enregistré')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuler la dernière action' })).toBeDisabled()
    expect(screen.getByRole('button', { name: "Rétablir l'action annulée" })).toBeDisabled()

    act(() => {
      fireEvent.click(screen.getByText('dispatch'))
    })
    expect(screen.getByRole('button', { name: 'Annuler la dernière action' })).toBeEnabled()

    // Let the 500 ms autosave debounce elapse.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(screen.getByText('Enregistré')).toBeInTheDocument()
  })

  it('renames the plan on Enter', () => {
    renderTopBar()

    fireEvent.click(screen.getByRole('button', { name: 'Plan A' }))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Mariage Alice & Bob' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mariage Alice & Bob' })).toBeInTheDocument()
  })

  it('rejects empty renames and keeps the previous name', () => {
    renderTopBar()

    fireEvent.click(screen.getByRole('button', { name: 'Plan A' }))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByRole('button', { name: 'Plan A' })).toBeInTheDocument()
  })

  it('undoes via Ctrl+Z when no input is focused', () => {
    renderTopBar()

    act(() => {
      fireEvent.click(screen.getByText('dispatch'))
    })
    expect(screen.getByRole('button', { name: 'Annuler la dernière action' })).toBeEnabled()

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })

    expect(screen.getByRole('button', { name: 'Annuler la dernière action' })).toBeDisabled()
  })

  it('redoes via Ctrl+Shift+Z', () => {
    renderTopBar()

    act(() => {
      fireEvent.click(screen.getByText('dispatch'))
    })
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    expect(screen.getByRole('button', { name: 'Annuler la dernière action' })).toBeDisabled()

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true, shiftKey: true })
    expect(screen.getByRole('button', { name: 'Annuler la dernière action' })).toBeEnabled()
  })
})