import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as repoModule from '@/lib/repo'
import type { PlanRepository } from '@/lib/repo/types'
import { ACTIVE_PLAN_KEY } from '@/components/layout/createBlankPlan'
import { newId } from '@/lib/id'
import type { Plan } from '@/types/plan'
import { PROJECT_FILE_FORMAT, serializeProjectFile } from '@/lib/repo/project-file'
import { RepoError } from '@/lib/repo/errors'
import { ProjectActions } from './ProjectActions'

function makePlan(): Plan {
  const tableId = newId()
  const g1 = newId()
  return {
    meta: {
      id: newId(),
      name: 'Mariage',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1,
    },
    tables: [{ id: tableId, name: 'Table 1', shape: 'round', capacity: 8, position: { x: 0, y: 0 } }],
    guests: [{ id: g1, name: 'Alice' }],
    constraints: [],
    assignments: [{ guestId: g1, tableId, seatIndex: 0 }],
  }
}

let saveSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  saveSpy = vi.fn(async () => undefined)
  vi.spyOn(repoModule, 'getRepository').mockReturnValue({
    list: vi.fn(async () => []),
    load: vi.fn(async () => null),
    save: saveSpy,
    remove: vi.fn(async () => undefined),
  } as unknown as PlanRepository)

  if (typeof URL.createObjectURL !== 'function') {
    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:mock'), writable: true })
  } else {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
  }
  vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)
})

function importFile(content: string, name = 'plan.json'): void {
  const input = screen.getByLabelText('Choisir un fichier projet JSON') as HTMLInputElement
  const file = new File([content], name, { type: 'application/json' })
  fireEvent.change(input, { target: { files: [file] } })
}

describe('ProjectActions', () => {
  it('exports the plan as a downloadable JSON file', () => {
    const plan = makePlan()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    try {
      render(<ProjectActions plan={plan} />)
      fireEvent.click(screen.getByRole('button', { name: 'Exporter le plan (JSON)' }))

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
      expect(clickSpy).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    } finally {
      clickSpy.mockRestore()
    }
  })

  it('imports a valid file, saves it as a new plan, and activates it', async () => {
    const plan = makePlan()
    const onImported = vi.fn()
    render(<ProjectActions onImported={onImported} />)

    importFile(serializeProjectFile(plan))

    await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(1))
    const imported = saveSpy.mock.calls[0][0] as Plan
    expect(imported.meta.id).not.toBe(plan.meta.id)
    expect(imported.guests).toEqual(plan.guests)
    expect(localStorage.getItem(ACTIVE_PLAN_KEY)).toBe(imported.meta.id)
    expect(onImported).toHaveBeenCalledWith(imported)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('rejects malformed files without writing anything', async () => {
    render(<ProjectActions onImported={vi.fn()} />)

    importFile('{broken')

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(saveSpy).not.toHaveBeenCalled()
    expect(localStorage.getItem(ACTIVE_PLAN_KEY)).toBeNull()
  })

  it('rejects future-version files without writing anything', async () => {
    render(<ProjectActions onImported={vi.fn()} />)

    importFile(
      JSON.stringify({
        format: PROJECT_FILE_FORMAT,
        formatVersion: 999,
        exportedAt: new Date().toISOString(),
        plan: makePlan(),
      }),
    )

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/plus récente/))
    expect(saveSpy).not.toHaveBeenCalled()
    expect(localStorage.getItem(ACTIVE_PLAN_KEY)).toBeNull()
  })

  it('surfaces storage failures without activating the plan', async () => {
    saveSpy.mockRejectedValueOnce(new RepoError('quota', 'Storage limit reached'))
    const onImported = vi.fn()
    render(<ProjectActions onImported={onImported} />)

    importFile(serializeProjectFile(makePlan()))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Stockage plein/))
    expect(onImported).not.toHaveBeenCalled()
    expect(localStorage.getItem(ACTIVE_PLAN_KEY)).toBeNull()
  })
})
