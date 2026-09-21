'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { usePlan } from '@/lib/plan/usePlan'
import { addConstraint } from '@/lib/plan/actions'
import { guestById } from '@/lib/plan/selectors'
import type { ConstraintKind } from '@/types/plan'
import { CONSTRAINT_KIND_LABELS, validateConstraintInput } from './constraints'

interface AddConstraintMenuProps {
  /** Pre-selected source guest, or null to pick both sides. */
  sourceGuestId: string | null
}

const KINDS: ConstraintKind[] = ['must_together', 'prefer_together', 'must_not_together']

/**
 * Constraint creation form (docs/07-components.md § 9). Collapsed behind a
 * toggle to save panel space. Rejects self-relations, duplicate (kind, pair)
 * entries and must_together vs must_not_together clashes with an inline
 * error — no dispatch on invalid input.
 */
export function AddConstraintMenu({ sourceGuestId }: AddConstraintMenuProps) {
  const { plan, dispatch } = usePlan()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<ConstraintKind>('must_together')
  const [targetA, setTargetA] = useState('')
  const [targetB, setTargetB] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sourceName = sourceGuestId ? (guestById(plan, sourceGuestId)?.name ?? null) : null

  if (plan.guests.length < 2) {
    return (
      <p className="text-sm text-text-muted">Ajoutez au moins deux invités pour créer une contrainte.</p>
    )
  }

  // In source mode a missing source (guest deleted mid-edit) falls back to free mode.
  const freeMode = sourceGuestId === null || sourceName === null

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setError(null)
    const a = freeMode ? targetA : sourceGuestId
    const b = freeMode ? targetB : targetA
    if (!a || !b) {
      setError('Choisissez les deux invités.')
      return
    }
    const problem = validateConstraintInput(plan, kind, a, b)
    if (problem) {
      setError(problem)
      return
    }
    dispatch(addConstraint(kind, a, b))
    setTargetA('')
    setTargetB('')
  }

  const field =
    'w-full rounded border border-border bg-surface-raised px-3 py-2 text-sm text-text'

  const others = (exclude: string | null) =>
    plan.guests.filter((guest) => guest.id !== exclude)

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setOpen((was) => !was)
          setError(null)
        }}
        aria-expanded={open}
        className="rounded border border-border bg-surface-raised px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface"
      >
        {open ? '− Masquer' : '+ Ajouter une contrainte'}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-lg border border-border bg-surface p-3">
          {!freeMode && (
            <p className="text-sm text-text-muted">
              Pour <span className="font-medium text-text">{sourceName}</span> avec :
            </p>
          )}

          {freeMode ? (
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="mb-1 block text-xs font-medium text-text-muted">Invité A</span>
                <select
                  value={targetA}
                  onChange={(event) => setTargetA(event.target.value)}
                  className={field}
                >
                  <option value="">Choisir…</option>
                  {plan.guests.map((guest) => (
                    <option key={guest.id} value={guest.id}>
                      {guest.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex-1">
                <span className="mb-1 block text-xs font-medium text-text-muted">Invité B</span>
                <select
                  value={targetB}
                  onChange={(event) => setTargetB(event.target.value)}
                  className={field}
                >
                  <option value="">Choisir…</option>
                  {plan.guests.map((guest) => (
                    <option key={guest.id} value={guest.id}>
                      {guest.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-text-muted">Avec</span>
              <select
                value={targetA}
                onChange={(event) => setTargetA(event.target.value)}
                className={field}
              >
                <option value="">Choisir…</option>
                {others(sourceGuestId).map((guest) => (
                  <option key={guest.id} value={guest.id}>
                    {guest.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-text-muted">Relation</span>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as ConstraintKind)}
              className={field}
            >
              {KINDS.map((option) => (
                <option key={option} value={option}>
                  {CONSTRAINT_KIND_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="rounded bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover"
          >
            Ajouter
          </button>
        </form>
      )}
    </div>
  )
}
