'use client'

import type { PlanSummary } from '@/lib/repo/types'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface PlanListDeleteDialogProps {
  summary: PlanSummary
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmation for deleting a plan, rendered in the shared <Modal>.
 * The parent conditionally mounts it; ESC and backdrop click both call
 * onCancel via the modal.
 */
export function PlanListDeleteDialog({ summary, onConfirm, onCancel }: PlanListDeleteDialogProps) {
  return (
    <Modal open onClose={onCancel} title="Supprimer ce plan ?">
      <p className="text-sm text-text-muted">
        Le plan « {summary.name} » sera définitivement supprimé.
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