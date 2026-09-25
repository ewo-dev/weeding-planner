'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { usePlan } from '@/lib/plan/usePlan'
import { addGuest, updateGuest } from '@/lib/plan/actions'
import type { Guest } from '@/types/plan'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'
import { useMessages, format } from '@/lib/i18n'

/** Mirrors GuestSchema name bounds (src/lib/schema/plan.ts). */
const MAX_NAME = 80

interface GuestEditorProps {
  /** Null = create mode, otherwise edit mode for this guest. */
  guest: Guest | null
  onClose: () => void
  /** Delete flow (confirmation owned by the parent). */
  onDelete: (guestId: string) => void
}

function clean(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/**
 * Create/edit form (docs/07-components.md § 7). Uncontrolled inputs with
 * `onSubmit` dispatch; validation errors render inline. The parent remounts
 * the form per guest via `key` so defaults always track the selection.
 */
export function GuestEditor({ guest, onClose, onDelete }: GuestEditorProps) {
  const { dispatch } = usePlan()
  const t = useMessages()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    if (name === '' || name.length > MAX_NAME) {
      setError(format(t.guests.nameRequired, { max: MAX_NAME }))
      return
    }
    const group = clean(String(data.get('group') ?? ''))
    const notes = clean(String(data.get('notes') ?? ''))
    if (guest) dispatch(updateGuest(guest.id, { name, group, notes }))
    else dispatch(addGuest({ name, group, notes }))
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-display text-base font-semibold text-text">
        {guest ? t.guests.editTitle : t.guests.createTitle}
      </h3>

      <Input
        id="guest-name"
        label={t.guests.nameLabel}
        name="name"
        type="text"
        defaultValue={guest?.name ?? ''}
        maxLength={MAX_NAME}
        autoFocus={guest === null}
        placeholder={t.guests.namePlaceholder}
      />

      <Input
        id="guest-group"
        label={t.guests.groupLabel}
        name="group"
        type="text"
        defaultValue={guest?.group ?? ''}
        placeholder={t.guests.groupPlaceholder}
      />

      <TextArea
        id="guest-notes"
        label={t.guests.notesLabel}
        name="notes"
        rows={2}
        defaultValue={guest?.notes ?? ''}
        placeholder={t.guests.notesPlaceholder}
      />

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit">{t.common.save}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          {t.common.cancel}
        </Button>
        {guest && (
          <button
            type="button"
            onClick={() => onDelete(guest.id)}
            className="ml-auto flex min-h-[44px] items-center rounded-md px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            {t.common.delete}
          </button>
        )}
      </div>
    </form>
  )
}
