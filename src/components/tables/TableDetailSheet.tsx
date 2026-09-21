'use client'

import { useEffect } from 'react'
import { usePlan } from '@/lib/plan/usePlan'
import { tableById } from '@/lib/plan/selectors'
import { TableDetailContent } from './TableDetailPanel'

interface TableDetailSheetProps {
  tableId: string
  onClose: () => void
}

/**
 * Mobile bottom sheet for one table (roadmap step 15). Same content as the
 * desktop `TableDetailPanel`, presented as a fixed bottom sheet on small
 * screens only (`lg:hidden`) — the desktop side panel covers `lg+`.
 * Non-portaled so ancestor visibility (Plan tab) still applies.
 */
export function TableDetailSheet({ tableId, onClose }: TableDetailSheetProps) {
  const { plan } = usePlan()
  const table = tableById(plan, tableId)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  if (!table) return null

  return (
    <div className="fixed inset-0 z-[80] lg:hidden">
      <button
        type="button"
        aria-label={`Fermer les détails de ${table.name}`}
        onClick={onClose}
        className="absolute inset-0 bg-text/25 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Détails de ${table.name}`}
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-5 shadow-lg"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" aria-hidden="true" />
        <TableDetailContent tableId={tableId} onClose={onClose} />
      </div>
    </div>
  )
}
