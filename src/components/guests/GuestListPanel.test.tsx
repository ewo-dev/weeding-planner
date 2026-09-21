import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DndContext } from '@dnd-kit/core'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { GuestListPanel } from './GuestListPanel'

const G = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const T = (n: number): string => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// 4 guests (Alice + Bob seated at Table Ronde, Carol + Dave unseated),
// one must_together constraint between Carol and Dave.
function fixture(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [{ id: T(1), name: 'Table Ronde', shape: 'round', capacity: 8, position: { x: 0, y: 0 } }],
    guests: [
      { id: G(1), name: 'Alice' },
      { id: G(2), name: 'Bob' },
      { id: G(3), name: 'Carol' },
      { id: G(4), name: 'Dave', group: 'Amis' },
    ],
    constraints: [{ id: '20000000-0000-4000-8000-000000000001', kind: 'must_together', a: G(3), b: G(4) }],
    assignments: [
      { guestId: G(1), tableId: T(1), seatIndex: 0 },
      { guestId: G(2), tableId: T(1), seatIndex: 1 },
    ],
  }
}

// Rows are drag sources and the list is the unseat dropzone, so the panel
// needs a DndContext ancestor (provided by SeatingEditor in production).
function renderPanel(plan: Plan = fixture()): void {
  render(
    <DndContext>
      <PlanProvider initialPlan={plan}>
        <GuestListPanel />
      </PlanProvider>
    </DndContext>,
  )
}

function submitEditor(): void {
  const form = document.querySelector('form')
  if (!form) throw new Error('expected the guest editor form')
  fireEvent.submit(form)
}

async function search(query: string): Promise<void> {
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: query } })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(200)
  })
}

// jsdom does not implement the <dialog> imperative API; stub it so
// showModal()/close() behave like in a browser (same as PlanList.test.tsx).
beforeAll(() => {
  if (typeof HTMLDialogElement === 'function') {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true
    }
    HTMLDialogElement.prototype.close = function close() {
      this.open = false
    }
  }
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(repoModule, 'getRepository').mockReturnValue({
    save: vi.fn(async () => undefined),
  } as unknown as PlanRepository)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('GuestListPanel', () => {
  it('renders counts and Unseated / Seated sections', () => {
    renderPanel()

    expect(screen.getByTestId('guest-count')).toHaveTextContent('2 / 4 placés')
    expect(screen.getByText('Non placés (2)')).toBeInTheDocument()
    expect(screen.getByText('Placés (2)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Alice/ })).toHaveTextContent('Table Ronde')
    expect(screen.getByRole('button', { name: /^Dave/ })).toHaveTextContent('Amis')
  })

  it('filters the list through the debounced search', async () => {
    renderPanel()

    await search('ali')
    expect(screen.getByRole('button', { name: /^Alice/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Bob/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Carol/ })).not.toBeInTheDocument()

    // Group names are searchable too.
    await search('amis')
    expect(screen.getByRole('button', { name: /^Dave/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Alice/ })).not.toBeInTheDocument()

    await search('zzz')
    expect(screen.getByText(/Aucun résultat/)).toBeInTheDocument()
  })

  it('creates a guest and updates the counts', () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: '+ Ajouter' }))
    expect(screen.getByText('Nouvel invité')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Eve' } })
    submitEditor()

    expect(screen.getByRole('button', { name: /^Eve/ })).toBeInTheDocument()
    expect(screen.getByTestId('guest-count')).toHaveTextContent('2 / 5 placés')
    // Editor closes after save.
    expect(screen.queryByText('Nouvel invité')).not.toBeInTheDocument()
  })

  it('edits the selected guest and updates the row', () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: /^Alice/ }))
    expect(screen.getByText('Modifier l’invité')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Alicia' } })
    submitEditor()

    expect(screen.getByRole('button', { name: /^Alicia/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Alice/ })).not.toBeInTheDocument()
  })

  it('deletes a guest without constraints directly (no dialog)', () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer Bob' }))

    expect(screen.queryByRole('button', { name: /^Bob/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Supprimer cet invité ?')).not.toBeInTheDocument()
    expect(screen.getByTestId('guest-count')).toHaveTextContent('1 / 3 placés')
  })

  it('asks for confirmation when the guest has constraints', () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer Carol' }))
    expect(screen.getByText('Supprimer cet invité ?')).toBeInTheDocument()

    // Cancel keeps the guest.
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.getByRole('button', { name: /^Carol/ })).toBeInTheDocument()

    // Confirm deletes the guest and their constraints.
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer Carol' }))
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(screen.queryByRole('button', { name: /^Carol/ })).not.toBeInTheDocument()
  })

  it('Escape clears the selection', () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: /^Dave/ }))
    expect(screen.getByText('Modifier l’invité')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Modifier l’invité')).not.toBeInTheDocument()
  })

  it('shows an empty state when the plan has no guests', () => {
    renderPanel({ ...fixture(), guests: [], assignments: [], constraints: [] })

    expect(screen.getByTestId('guest-count')).toHaveTextContent('0 / 0 placés')
    expect(screen.getByText('Aucun invité pour l’instant')).toBeInTheDocument()
    // The dropzone still exists so seated guests could be unseated here.
    expect(screen.getByTestId('unseat-dropzone')).toBeInTheDocument()
  })
})
