import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DndContext } from '@dnd-kit/core'
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

// The side panels contain drag sources/dropzones, so the layout needs a
// DndContext ancestor (provided by SeatingEditor in production).
function renderLayout(children: ReactNode = <div>CANVAS</div>) {
  return render(
    <DndContext>
      <PlanProvider initialPlan={emptyPlan()}>
        <EditorLayout>{children}</EditorLayout>
      </PlanProvider>
    </DndContext>,
  )
}

/** Aside and mobile switchers share labels — scope queries per switcher. */
function asideTabs(): HTMLElement {
  const nav = screen.getByTestId('aside-tabs')
  if (!nav) throw new Error('expected the aside tab switcher')
  return nav
}

function mobileTabs(): HTMLElement {
  const nav = screen.getByTestId('mobile-tabs')
  if (!nav) throw new Error('expected the mobile tab switcher')
  return nav
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
  it('renders children by default, the guest panel in the aside, and both switchers', () => {
    renderLayout()

    // Default mobile tab is "plan", so the canvas is in the DOM even in a < lg viewport.
    expect(screen.getByText('CANVAS')).toBeInTheDocument()
    expect(within(mobileTabs()).getByRole('button', { name: 'Invités' })).toBeInTheDocument()
    expect(within(mobileTabs()).getByRole('button', { name: 'Tables' })).toBeInTheDocument()
    expect(within(mobileTabs()).getByRole('button', { name: 'Plan' })).toBeInTheDocument()
    // Desktop aside defaults to the guest panel (single searchbox while on the Plan tab).
    expect(screen.getAllByRole('searchbox')).toHaveLength(1)
    expect(screen.queryByText('Aucune table pour l’instant')).not.toBeInTheDocument()
  })

  it('switches the desktop aside between guests and tables', () => {
    renderLayout()

    fireEvent.click(within(asideTabs()).getByRole('button', { name: 'Tables' }))
    expect(screen.getByText('Aucune table pour l’instant')).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()

    fireEvent.click(within(asideTabs()).getByRole('button', { name: 'Invités' }))
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('shows the guest panel under the mobile Invités tab', () => {
    renderLayout()

    fireEvent.click(within(mobileTabs()).getByRole('button', { name: 'Invités' }))
    // Aside + mobile instances both mount; only one is visible per breakpoint.
    expect(screen.getAllByRole('searchbox')).toHaveLength(2)
    expect(screen.getAllByText('Aucun invité pour l’instant')).toHaveLength(2)
    // Canvas stays mounted for lg+.
    expect(screen.getByText('CANVAS')).toBeInTheDocument()
  })

  it('shows the tables panel under the mobile Tables tab', () => {
    renderLayout()

    fireEvent.click(within(mobileTabs()).getByRole('button', { name: 'Tables' }))
    expect(screen.getByText('Aucune table pour l’instant')).toBeInTheDocument()
    // Canvas stays mounted for lg+.
    expect(screen.getByText('CANVAS')).toBeInTheDocument()

    fireEvent.click(within(mobileTabs()).getByRole('button', { name: 'Plan' }))
    expect(screen.getByText('CANVAS')).toBeInTheDocument()
    expect(screen.queryByText('Aucune table pour l’instant')).not.toBeInTheDocument()
  })
})
