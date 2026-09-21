import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocalPlanRepository } from '@/lib/repo/local'
import type { Plan } from '@/types/plan'
import { addGuest } from './actions'
import { PlanProvider } from './context'
import { usePlan } from './usePlan'

function makePlan(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Test plan',
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

function TestConsumer() {
  const ctx = usePlan()
  return (
    <div>
      <span data-testid="guests">{ctx.plan.guests.map((g) => g.name).join('|')}</span>
      <span data-testid="canUndo">{String(ctx.canUndo)}</span>
      <span data-testid="canRedo">{String(ctx.canRedo)}</span>
      <button onClick={() => ctx.dispatch(addGuest({ name: 'X' }))}>add</button>
      <button onClick={ctx.undo}>undo</button>
      <button onClick={ctx.redo}>redo</button>
    </div>
  )
}

function renderProvider() {
  return render(
    <PlanProvider initialPlan={makePlan()}>
      <TestConsumer />
    </PlanProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('PlanProvider', () => {
  it('dispatches actions and supports undo/redo through the exposed API', () => {
    renderProvider()
    expect(screen.getByTestId('guests').textContent).toBe('')

    act(() => {
      fireEvent.click(screen.getByText('add'))
    })
    expect(screen.getByTestId('guests').textContent).toBe('X')
    expect(screen.getByTestId('canUndo').textContent).toBe('true')

    act(() => {
      fireEvent.click(screen.getByText('undo'))
    })
    expect(screen.getByTestId('guests').textContent).toBe('')
    expect(screen.getByTestId('canUndo').textContent).toBe('false')
    expect(screen.getByTestId('canRedo').textContent).toBe('true')

    act(() => {
      fireEvent.click(screen.getByText('redo'))
    })
    expect(screen.getByTestId('guests').textContent).toBe('X')
    expect(screen.getByTestId('canRedo').textContent).toBe('false')
  })

  it('debounces autosave: rapid dispatches coalesce into a single save', async () => {
    const saveSpy = vi.spyOn(LocalPlanRepository.prototype, 'save')
    renderProvider()

    // Let the initial-mount debounced save settle so it does not interfere.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(saveSpy).toHaveBeenCalledTimes(1)
    saveSpy.mockClear()

    act(() => {
      fireEvent.click(screen.getByText('add'))
      fireEvent.click(screen.getByText('add'))
      fireEvent.click(screen.getByText('add'))
    })
    expect(saveSpy).not.toHaveBeenCalled() // still inside the debounce window

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(saveSpy).toHaveBeenCalledTimes(1)
  })

  it('flushes the pending save synchronously on beforeunload', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    renderProvider()

    act(() => {
      fireEvent.click(screen.getByText('add'))
    })
    // Do not advance timers: the debounced save is still pending.
    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })
    expect(setItemSpy).toHaveBeenCalled()
  })

  it('usePlan throws when used outside of a provider', () => {
    function Broken() {
      usePlan()
      return null
    }
    expect(() => render(<Broken />)).toThrow('usePlan must be used within a <PlanProvider>')
  })
})