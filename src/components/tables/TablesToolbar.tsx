'use client'

interface TablesToolbarProps {
  onAdd: () => void
  onBulk: () => void
}

/**
 * Table actions (docs/07-components.md § 8): add a table with the current
 * defaults, or open the bulk configuration.
 */
export function TablesToolbar({ onAdd, onBulk }: TablesToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onAdd}
        className="rounded bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
      >
        + Ajouter
      </button>
      <button
        type="button"
        onClick={onBulk}
        className="rounded border border-border bg-surface-raised px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface"
      >
        Configurer
      </button>
    </div>
  )
}
