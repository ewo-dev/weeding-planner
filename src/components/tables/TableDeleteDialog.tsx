'use client'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface TableDeleteDialogProps {
  tableName: string
  guestNames: string[]
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmation for deleting a table that has seated guests
 * (docs/10-interactions.md § 12). Lists the affected guests, who move back to
 * "Non placés" on confirm (the reducer drops the table's assignments).
 * Rendered in the shared <Modal>; the parent conditionally mounts it.
 * Tables without seated guests are deleted directly with Undo available —
 * no dialog.
 */
export function TableDeleteDialog({ tableName, guestNames, onConfirm, onCancel }: TableDeleteDialogProps) {
  return (
    <Modal open onClose={onCancel} title="Supprimer cette table ?">
      <p className="text-sm text-text-muted">
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
        <Button variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Supprimer
        </Button>
      </div>
    </Modal>
  )
}