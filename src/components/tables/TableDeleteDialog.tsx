'use client'

import { useEffect, useRef } from 'react'

interface TableDeleteDialogProps {
  tableName: string
  guestNames: string[]
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Native <dialog> confirmation for deleting a table that has seated guests
 * (docs/10-interactions.md § 12). Lists the affected guests, who move back to
 * "Non placés" on confirm (the reducer drops the table's assignments).
 * Tables without seated guests are deleted directly with Undo available —
 * no dialog.
 * TODO step 4: replace with the shared <Modal> primitive (components/ui/Modal).
 */
export function TableDeleteDialog({ tableName, guestNames, onConfirm, onCancel }: TableDeleteDialogProps) {
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
      aria-labelledby="delete-table-title"
      onCancel={onCancel}
      onClick={(event) => {
        // Backdrop click (click outside the dialog box) cancels.
        if (event.target === event.currentTarget) onCancel()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-lg border border-border bg-surface-raised p-5 shadow-lg backdrop:bg-slate-900/40"
    >
      <h2 id="delete-table-title" className="font-display text-lg font-semibold text-text">
        Supprimer cette table ?
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        La table « {tableName} » sera définitivement supprimée.{' '}
        {guestNames.length === 1
          ? '1 invité retournera aux non placés :'
          : `${guestNames.length} invités retourneront aux non placés :`}
      </p>
      <ul className="mt-2 max-h-32 list-disc overflow-y-auto pl-5 text-sm text-text">
        {guestNames.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
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
