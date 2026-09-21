'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { usePlan } from '@/lib/plan/usePlan'
import { addGuest, updateGuest } from '@/lib/plan/actions'
import type { Guest } from '@/types/plan'

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
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    if (name === '' || name.length > MAX_NAME) {
      setError(`Le nom est requis (${MAX_NAME} caractères maximum).`)
      return
    }
    const group = clean(String(data.get('group') ?? ''))
    const notes = clean(String(data.get('notes') ?? ''))
    if (guest) dispatch(updateGuest(guest.id, { name, group, notes }))
    else dispatch(addGuest({ name, group, notes }))
    onClose()
  }

  const field =
    'w-full rounded border border-border bg-surface-raised px-3 py-2 text-sm text-text placeholder:text-text-muted'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-semibold text-text">
        {guest ? 'Modifier l’invité' : 'Nouvel invité'}
      </h3>

      <div>
        <label htmlFor="guest-name" className="mb-1 block text-xs font-medium text-text-muted">
          Nom
        </label>
        <input
          id="guest-name"
          name="name"
          type="text"
          defaultValue={guest?.name ?? ''}
          maxLength={MAX_NAME}
          autoFocus={guest === null}
          placeholder="Marie Dupont"
          className={field}
        />
      </div>

      <div>
        <label htmlFor="guest-group" className="mb-1 block text-xs font-medium text-text-muted">
          Groupe (optionnel)
        </label>
        <input
          id="guest-group"
          name="group"
          type="text"
          defaultValue={guest?.group ?? ''}
          placeholder="Famille, Amis…"
          className={field}
        />
      </div>

      <div>
        <label htmlFor="guest-notes" className="mb-1 block text-xs font-medium text-text-muted">
          Notes (optionnel)
        </label>
        <textarea
          id="guest-notes"
          name="notes"
          rows={2}
          defaultValue={guest?.notes ?? ''}
          placeholder="Régime, allergies…"
          className={field}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-border bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-raised"
        >
          Annuler
        </button>
        {guest && (
          <button
            type="button"
            onClick={() => onDelete(guest.id)}
            className="ml-auto rounded px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          >
            Supprimer
          </button>
        )}
      </div>
    </form>
  )
}
