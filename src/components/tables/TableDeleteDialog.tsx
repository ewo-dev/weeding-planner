'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useMessages, format } from '@/lib/i18n'

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
  const t = useMessages()
  return (
    <Modal open onClose={onCancel} title={t.tables.deleteTitle}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="text-sm leading-relaxed text-text-muted">
            {format(t.tables.deleteBody, { name: tableName })}{' '}
            {guestNames.length === 1
              ? t.tables.deleteReturnOne
              : format(t.tables.deleteReturnMany, { n: guestNames.length })}
          </p>
          <ul className="mt-2 max-h-32 list-disc overflow-y-auto pl-5 text-sm text-text">
            {guestNames.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {t.common.delete}
        </Button>
      </div>
    </Modal>
  )
}
