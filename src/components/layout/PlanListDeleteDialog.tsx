'use client'

import { AlertTriangle } from 'lucide-react'
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
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="text-sm leading-relaxed text-text-muted">
          Le plan « {summary.name} » sera définitivement supprimé.
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
