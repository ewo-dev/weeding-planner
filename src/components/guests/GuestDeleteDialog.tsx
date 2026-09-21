'use client'

import { AlertTriangle } from 'lucide-react'
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
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="text-sm leading-relaxed text-text-muted">
          L’invité « {guestName} » sera définitivement supprimé.{' '}
          {constraintCount === 1
            ? '1 contrainte liée sera supprimée aussi.'
            : `${constraintCount} contraintes liées seront supprimées aussi.`}
        </p>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
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
