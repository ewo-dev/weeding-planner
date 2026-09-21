import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { ACTIVE_PLAN_KEY } from '@/components/layout/createBlankPlan'
import { ToastProvider } from '@/components/ui/ToastProvider'
import EditorPage from './page'

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }))

// The editor page's load effect depends on `router`; the mocked useRouter must
// return a stable object or the effect re-runs on every render.
vi.mock('next/navigation', () => {
  const router = { push: vi.fn(), replace: replaceMock }
  return { useRouter: () => router }
})

function makePlan(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Plan de test',
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

let loadSpy: Mock<(id: string) => Promise<Plan | null>>

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  loadSpy = vi.fn()
  const stub = {
    list: vi.fn(async () => []),
    load: loadSpy,
    save: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  } as unknown as PlanRepository
  vi.spyOn(repoModule, 'getRepository').mockReturnValue(stub)
  replaceMock.mockClear()
})

describe('EditorPage', () => {
  // The toast queue lives in the root layout in production; tests provide it here.
  function renderPage() {
    return render(
      <ToastProvider>
        <EditorPage />
      </ToastProvider>,
    )
  }

  it('redirects to / when no active plan key is set', async () => {
    renderPage()

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'))
    expect(loadSpy).not.toHaveBeenCalled()
  })

  it('redirects to / when the active plan cannot be loaded', async () => {
    localStorage.setItem(ACTIVE_PLAN_KEY, 'plan-id')
    loadSpy.mockResolvedValue(null)

    renderPage()

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'))
    expect(loadSpy).toHaveBeenCalledWith('plan-id')
  })

  it('renders the editor chrome when a plan loads', async () => {
    localStorage.setItem(ACTIVE_PLAN_KEY, 'plan-id')
    loadSpy.mockResolvedValue(makePlan())

    renderPage()

    // TopBar shows the plan name.
    expect(await screen.findByRole('button', { name: 'Plan de test' })).toBeInTheDocument()
    // PlanStatsBar renders its tiles.
    expect(screen.getByTestId('stat-guests')).toBeInTheDocument()
    // SeatingEditor renders the canvas and the side-panel dropzone.
    expect(screen.getByTestId('workspace')).toBeInTheDocument()
    expect(screen.getByTestId('unseat-dropzone')).toBeInTheDocument()
  })

  it('shows the skeleton while loading', () => {
    localStorage.setItem(ACTIVE_PLAN_KEY, 'plan-id')
    loadSpy.mockImplementation(() => new Promise<Plan | null>(() => {})) // never resolves

    const { container } = renderPage()

    expect(container.querySelector('.animate-pulse')).not.toBeNull()
  })

  it('shows the friendly error state when loading fails', async () => {
    localStorage.setItem(ACTIVE_PLAN_KEY, 'plan-id')
    loadSpy.mockRejectedValue(new Error('storage boom'))

    renderPage()

    expect(await screen.findByText(/Le plan n'a pas pu être chargé/i)).toBeInTheDocument()
    expect(screen.getByText('storage boom')).toBeInTheDocument()
  })
})