'use client'

import { useEffect, useRef } from 'react'
import type { PlanSummary } from '@/lib/repo/types'

interface PlanListDeleteDialogProps {
  summary: PlanSummary
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Native <dialog> confirmation for deleting a plan. Uses showModal()/close()
 * so focus trapping and ESC handling come for free.
 * TODO step 4: replace with the shared <Modal> primitive (components/ui/Modal).
 */
export function PlanListDeleteDialog({ summary, onConfirm, onCancel }: PlanListDeleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="delete-plan-title"
      onCancel={onCancel}
      onClick={(event) => {
        // Backdrop click (click outside the dialog box) cancels.
        if (event.target === event.currentTarget) onCancel()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-lg border border-border bg-surface-raised p-5 shadow-lg backdrop:bg-slate-900/40"
    >
      <h2 id="delete-plan-title" className="font-display text-lg font-semibold text-text">
        Supprimer ce plan ?
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        Le plan « {summary.name} » sera définitivement supprimé.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-border bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-raised"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded bg-danger px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-danger/90"
        >
          Supprimer
        </button>
      </div>
    </dialog>
  )
}