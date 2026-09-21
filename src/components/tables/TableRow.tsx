'use client'

import type { Table } from '@/types/plan'
import { SHAPE_LABELS } from './tables'

interface TableRowProps {
  table: Table
  seated: number
  selected: boolean
  onEdit: (tableId: string) => void
  onRemove: (tableId: string) => void
}

/**
 * One table row. Clicking the row selects the table and opens the config
 * sheet; the × button removes (confirmation is owned by the parent per
 * docs/10-interactions.md § 12).
 */
export function TableRow({ table, seated, selected, onEdit, onRemove }: TableRowProps) {
  return (
    <li className={`flex items-center gap-1 rounded ${selected ? 'bg-brand-soft' : 'hover:bg-surface'}`}>
      <button
        type="button"
        onClick={() => onEdit(table.id)}
        aria-pressed={selected}
        className="min-w-0 flex-1 px-3 py-2.5 text-left"
      >
        <span className="block truncate text-sm font-medium text-text">{table.name}</span>
        <span className="block truncate text-xs text-text-muted">
          {SHAPE_LABELS[table.shape]} · {seated}/{table.capacity} placés
        </span>
      </button>
      <button
        type="button"
        onClick={() => onRemove(table.id)}
        aria-label={`Supprimer ${table.name}`}
        title={`Supprimer ${table.name}`}
        className="shrink-0 px-3 py-2.5 text-base leading-none text-text-muted transition-colors hover:text-danger"
      >
        ×
      </button>
    </li>
  )
}
