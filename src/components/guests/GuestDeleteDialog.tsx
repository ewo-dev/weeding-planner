'use client'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface GuestDeleteDialogProps {
  guestName: string
  constraintCount: number
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmation for deleting a guest that has constraints referencing them
 * (docs/10-interactions.md § 12). Rendered in the shared <Modal>; the parent
 * conditionally mounts it. Guests without constraints are deleted directly
 * with Undo available — no dialog.
 */
export function GuestDeleteDialog({ guestName, constraintCount, onConfirm, onCancel }: GuestDeleteDialogProps) {
  return (
    <Modal open onClose={onCancel} title="Supprimer cet invité ?">
      <p className="text-sm text-text-muted">
        L’invité « {guestName} » sera définitivement supprimé.{' '}
        {constraintCount === 1
          ? '1 contrainte liée sera supprimée aussi.'
          : `${constraintCount} contraintes liées seront supprimées aussi.`}
      </p>
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