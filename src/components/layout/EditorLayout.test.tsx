import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import type { Plan } from '@/types/plan'
import { PlanProvider } from '@/lib/plan/context'
import { EditorLayout } from './EditorLayout'

function emptyPlan(): Plan {
  return {
    meta: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Fixture',
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

function renderLayout(children: ReactNode = <div>CANVAS</div>) {
  return render(
    <PlanProvider initialPlan={emptyPlan()}>
      <EditorLayout>{children}</EditorLayout>
    </PlanProvider>,
  )
}

beforeEach(() => {
  vi.spyOn(repoModule, 'getRepository').mockReturnValue({
    save: vi.fn(async () => undefined),
  } as unknown as PlanRepository)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('EditorLayout', () => {
  it('renders children by default, the guest panel, and the mobile tab switcher', () => {
    renderLayout()

    // Default tab is "plan", so the canvas is in the DOM even in a < lg viewport.
    expect(screen.getByText('CANVAS')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Invités' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tables' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Plan' })).toBeInTheDocument()
    // Desktop aside mounts the guest panel (single searchbox while on the Plan tab).
    expect(screen.getAllByRole('searchbox')).toHaveLength(1)
  })

  it('shows the guest panel under the Invités tab', () => {
    renderLayout()

    fireEvent.click(screen.getByRole('button', { name: 'Invités' }))
    // Aside + mobile instances both mount; only one is visible per breakpoint.
    expect(screen.getAllByRole('searchbox')).toHaveLength(2)
    expect(screen.getAllByText('Aucun invité pour l’instant')).toHaveLength(2)
    // Canvas stays mounted for lg+.
    expect(screen.getByText('CANVAS')).toBeInTheDocument()
  })

  it('keeps the tables placeholder and restores the canvas under Plan', () => {
    renderLayout()

    fireEvent.click(screen.getByRole('button', { name: 'Tables' }))
    expect(screen.getByText('Tables — contenu à venir')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Plan' }))
    expect(screen.getByText('CANVAS')).toBeInTheDocument()
    expect(screen.queryByText(/contenu à venir/)).not.toBeInTheDocument()
  })
})
