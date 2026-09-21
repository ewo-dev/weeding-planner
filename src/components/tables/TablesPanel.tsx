'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePlan } from '@/lib/plan/usePlan'
import { addTable, removeTable, updateTable } from '@/lib/plan/actions'
import { guestById, tableById } from '@/lib/plan/selectors'
import type { Table, TableShape } from '@/types/plan'
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

/**
 * Table management panel (docs/07-components.md § 8): toolbar, table list
 * with occupancy, per-table config sheet, bulk configuration. Selection is
 * local UI state (not in the plan) per the composition rules; all mutations
 * dispatch through context and are undoable (docs/10-interactions.md § 9).
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
    <section aria-label="Tables" className="flex min-h-0 flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-text">Tables</h2>
        <span data-testid="table-count" className="text-sm text-text-muted">
          {plan.tables.length} tables · {totalSeats} places
        </span>
      </div>

      <TablesToolbar onAdd={handleAdd} onBulk={() => setBulkOpen((open) => !open)} />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
          <p className="text-sm font-medium text-text">Aucune table pour l’instant</p>
          <p className="mt-1 text-sm text-text-muted">Configurez vos tables pour commencer.</p>
        </div>
      ) : (
        <TableList
          rows={rows}
          selectedId={editingId}
          onEdit={(tableId) => setEditingId(tableId)}
          onRemove={requestDelete}
        />
      )}

      {bulkOpen && (
        <div className="rounded-lg border border-border bg-surface p-4">
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
        <div className="rounded-lg border border-border bg-surface p-4">
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
    </section>
  )
}
