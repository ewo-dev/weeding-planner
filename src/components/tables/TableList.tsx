'use client'

import type { Table } from '@/types/plan'
import { TableRow } from './TableRow'

export interface TableListRow {
  table: Table
  seated: number
}

interface TableListProps {
  rows: TableListRow[]
  selectedId: string | null
  onEdit: (tableId: string) => void
  onRemove: (tableId: string) => void
}

/** Flat list of tables with occupancy. Returns null when there is nothing. */
export function TableList({ rows, selectedId, onEdit, onRemove }: TableListProps) {
  if (rows.length === 0) return null

  return (
    <ul>
      {rows.map(({ table, seated }) => (
        <TableRow
          key={table.id}
          table={table}
          seated={seated}
          selected={table.id === selectedId}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ))}
    </ul>
  )
}
