'use client'

import { useEffect, useMemo, useState } from 'react'
import { generateSeating } from '@/lib/engine'
import type { GenerationReport } from '@/lib/engine'
import { usePlan } from '@/lib/plan/usePlan'
import { addTable, generateSeating as generateSeatingAction, removeTable, updateTable } from '@/lib/plan/actions'
import { guestById, tableById } from '@/lib/plan/selectors'
import type { Table, TableShape } from '@/types/plan'
import { GenerationReportDialog } from '@/components/plan-status/GenerationReportDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { TablesToolbar } from './TablesToolbar'
import { TableList } from './TableList'
import { TableConfigSheet } from './TableConfigSheet'
import { BulkTableConfig } from './BulkTableConfig'
import { TableDeleteDialog } from './TableDeleteDialog'
import { DEFAULT_TABLE_CAPACITY, DEFAULT_TABLE_SHAPE, nextTableName } from './tables'

interface DeleteTarget {
  table: Table
  guestNames: string[]
}

interface GenerationPreview {
  report: GenerationReport
  seed: number
}

/**
 * Table management panel (docs/07-components.md § 8): toolbar, table list
 * with occupancy, per-table config sheet, bulk configuration, seating
 * generation. Selection is local UI state (not in the plan) per the
 * composition rules; all mutations dispatch through context and are undoable
 * (docs/10-interactions.md § 9).
 *
 * Generation is preview-then-apply (docs/11-roadmap.md step 12): the engine
 * runs on click, the dialog shows the report, and Apply dispatches
 * `generateSeating` with the same seed — deterministic for (plan, seed), so
 * the applied assignments match the preview exactly. Discard dispatches
 * nothing.
 */
export function TablesPanel() {
  const { plan, dispatch } = usePlan()
  const [defaults, setDefaults] = useState<{ capacity: number; shape: TableShape }>({
    capacity: DEFAULT_TABLE_CAPACITY,
    shape: DEFAULT_TABLE_SHAPE,
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [preview, setPreview] = useState<GenerationPreview | null>(null)

  // Escape closes the sheet/dialogs (docs/10-interactions.md § 10); skipped
  // inside inputs so typing is never interrupted.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (event.key === 'Escape') {
        setEditingId(null)
        setBulkOpen(false)
        setDeleteTarget(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const seatedByTable = useMemo(() => {
    const map = new Map<string, number>()
    for (const assignment of plan.assignments) {
      map.set(assignment.tableId, (map.get(assignment.tableId) ?? 0) + 1)
    }
    return map
  }, [plan.assignments])

  const rows = useMemo(
    () => plan.tables.map((table) => ({ table, seated: seatedByTable.get(table.id) ?? 0 })),
    [plan.tables, seatedByTable],
  )

  const totalSeats = plan.tables.reduce((sum, table) => sum + table.capacity, 0)

  function handleAdd(): void {
    dispatch(
      addTable({ name: nextTableName(plan.tables), shape: defaults.shape, capacity: defaults.capacity }),
    )
  }

  function handleBulkApply(capacity: number, shape: TableShape): void {
    setDefaults({ capacity, shape })
    for (const table of plan.tables) {
      const patch: Partial<Omit<Table, 'id'>> = {}
      if (table.capacity !== capacity) patch.capacity = capacity
      if (table.shape !== shape) patch.shape = shape
      if (Object.keys(patch).length > 0) dispatch(updateTable(table.id, patch))
    }
    setBulkOpen(false)
  }

  // Runs the engine off-tick so the Generating state paints (the engine is
  // synchronous; budgets in docs/04-seating-engine.md § 9 keep it brief).
  // The plan snapshot is captured at click time; Apply replays the same seed.
  function runGeneration(seed: number): void {
    const snapshot = plan
    setGenerating(true)
    setGenerateError(null)
    window.setTimeout(() => {
      try {
        const output = generateSeating(snapshot, { seed })
        setPreview({ report: output.report, seed })
      } catch (err) {
        console.error('Failed to generate a seating plan', err)
        setGenerateError('La génération a échoué. Vérifiez vos contraintes et réessayez.')
      } finally {
        setGenerating(false)
      }
    }, 30)
  }

  function handleGenerate(): void {
    runGeneration(Math.floor(Math.random() * 2 ** 31))
  }

  function handleApplyPreview(): void {
    if (!preview) return
    dispatch(generateSeatingAction({ seed: preview.seed }))
    setPreview(null)
  }

  // Deletion needs a modal only when guests are seated at the table
  // (docs/10-interactions.md § 12); otherwise dispatch directly (Undo covers it).
  function requestDelete(tableId: string): void {
    const table = tableById(plan, tableId)
    if (!table) return
    const guestNames = plan.assignments
      .filter((a) => a.tableId === tableId)
      .map((a) => guestById(plan, a.guestId)?.name ?? '?')
    if (guestNames.length === 0) {
      dispatch(removeTable(tableId))
      if (editingId === tableId) setEditingId(null)
      return
    }
    setDeleteTarget({ table, guestNames })
  }

  function confirmDelete(): void {
    if (!deleteTarget) return
    dispatch(removeTable(deleteTarget.table.id))
    if (editingId === deleteTarget.table.id) setEditingId(null)
    setDeleteTarget(null)
  }

  const editingTable = editingId ? (tableById(plan, editingId) ?? null) : null
  const takenNames = plan.tables.filter((t) => t.id !== editingId).map((t) => t.name)

  return (
    <section aria-label="Tables" className="flex min-h-0 flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-text">Tables</h2>
        <span data-testid="table-count" className="text-sm font-medium text-text-muted">
          {plan.tables.length} tables · {totalSeats} places
        </span>
      </div>

      <TablesToolbar
        onAdd={handleAdd}
        onBulk={() => setBulkOpen((open) => !open)}
        onGenerate={handleGenerate}
        canGenerate={plan.tables.length > 0}
        generating={generating}
      />

      {generateError && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {generateError}
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="Aucune table pour l’instant"
          description="Configurez vos tables pour commencer."
        />
      ) : (
        <TableList
          rows={rows}
          selectedId={editingId}
          onEdit={(tableId) => setEditingId(tableId)}
          onRemove={requestDelete}
        />
      )}

      {bulkOpen && (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <BulkTableConfig
            defaultCapacity={defaults.capacity}
            defaultShape={defaults.shape}
            tables={rows.map(({ table, seated }) => ({ id: table.id, name: table.name, seated }))}
            onApply={handleBulkApply}
            onClose={() => setBulkOpen(false)}
          />
        </div>
      )}

      {editingTable && (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <TableConfigSheet
            key={editingTable.id}
            table={editingTable}
            seated={seatedByTable.get(editingTable.id) ?? 0}
            takenNames={takenNames}
            onClose={() => setEditingId(null)}
          />
        </div>
      )}

      {deleteTarget && (
        <TableDeleteDialog
          tableName={deleteTarget.table.name}
          guestNames={deleteTarget.guestNames}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {preview && (
        <GenerationReportDialog
          report={preview.report}
          plan={plan}
          regenerating={generating}
          onApply={handleApplyPreview}
          onRegenerate={() => runGeneration(Math.floor(Math.random() * 2 ** 31))}
          onDiscard={() => setPreview(null)}
        />
      )}
    </section>
  )
}
