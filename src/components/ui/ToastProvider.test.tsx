import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './ToastProvider'

function Harness() {
  const { notify } = useToast()
  return (
    <>
      <button
        type="button"
        onClick={() =>
          notify({
            kind: 'warning',
            message: 'Conflit : Thomas doit être avec Marie.',
            actions: [
              { label: 'Annuler', onAction: () => undefined },
              { label: 'Garder' },
            ],
          })
        }
      >
        warn
      </button>
      <button
        type="button"
        onClick={() => notify({ kind: 'success', message: 'Conflit résolu.' })}
      >
        ok
      </button>
    </>
  )
}

function renderHarness() {
  render(
    <ToastProvider>
      <Harness />
    </ToastProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('ToastProvider', () => {
  it('shows the toast in a live region with its actions', () => {
    renderHarness()

    fireEvent.click(screen.getByRole('button', { name: 'warn' }))

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Conflit : Thomas doit être avec Marie.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Garder' })).toBeInTheDocument()
  })

  it('action click runs the handler then dismisses', () => {
    renderHarness()

    fireEvent.click(screen.getByRole('button', { name: 'warn' }))
    fireEvent.click(screen.getByRole('button', { name: 'Garder' }))

    expect(screen.queryByText('Conflit : Thomas doit être avec Marie.')).not.toBeInTheDocument()
  })

  it('close button dismisses without side effects', () => {
    renderHarness()

    fireEvent.click(screen.getByRole('button', { name: 'ok' }))
    expect(screen.getByText('Conflit résolu.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fermer la notification' }))
    expect(screen.queryByText('Conflit résolu.')).not.toBeInTheDocument()
  })

  it('auto-dismisses after 5 seconds', async () => {
    renderHarness()

    fireEvent.click(screen.getByRole('button', { name: 'ok' }))
    expect(screen.getByText('Conflit résolu.')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(screen.queryByText('Conflit résolu.')).not.toBeInTheDocument()
  })

  it('throws outside the provider', () => {
    expect(() => render(<Harness />)).toThrow('useToast must be used within a <ToastProvider>')
  })
})
