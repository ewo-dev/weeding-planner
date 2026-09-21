'use client'

import type { Table } from '@/types/plan'
import { SHAPE_LABELS } from './tables'
import { IconButton } from '@/components/ui/IconButton'
import { X, Circle, Square } from 'lucide-react'

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
  const ShapeIcon = table.shape === 'round' ? Circle : Square
  const full = seated >= table.capacity

  return (
    <li
      className={`group flex items-center gap-1 rounded-xl border border-transparent transition-colors ${
        selected ? 'bg-brand-soft border-brand/20' : 'hover:bg-surface-muted hover:border-border'
      }`}
    >
      <button
        type="button"
        onClick={() => onEdit(table.id)}
        aria-pressed={selected}
        className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left"
      >
        <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface border border-border text-text-muted">
          <ShapeIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-text">{table.name}</span>
          <span className="block truncate text-xs text-text-muted">
            {SHAPE_LABELS[table.shape]} · {seated}/{table.capacity} placés
          </span>
        </span>
        {full && (
          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-hover">
            Complète
          </span>
        )}
      </button>
      <IconButton
        type="button"
        onClick={() => onRemove(table.id)}
        label={`Supprimer ${table.name}`}
        title={`Supprimer ${table.name}`}
        icon={<X className="h-5 w-5" />}
        className="opacity-100 transition-opacity group-hover:opacity-100 sm:opacity-0"
      />
    </li>
  )
}
