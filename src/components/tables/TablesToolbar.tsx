'use client'

import { Spinner } from '@/components/layout/Spinner'

interface TablesToolbarProps {
  onAdd: () => void
  onBulk: () => void
  onGenerate: () => void
  canGenerate: boolean
  generating: boolean
}

/**
 * Table actions (docs/07-components.md § 8, docs/11-roadmap.md step 12):
 * add a table with the current defaults, open the bulk configuration, or
 * run the seating engine (disabled without tables; spinner + disabled state
 * per docs/10-interactions.md § 13).
 */
export function TablesToolbar({ onAdd, onBulk, onGenerate, canGenerate, generating }: TablesToolbarProps) {
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
        onClick={onGenerate}
        disabled={!canGenerate || generating}
        title={canGenerate ? 'Générer un plan de table automatique' : 'Ajoutez des tables pour générer un plan'}
        className="flex items-center gap-2 rounded border border-border bg-surface-raised px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
      >
        {generating && <Spinner className="h-4 w-4" />}
        {generating ? 'Génération…' : 'Générer'}
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
