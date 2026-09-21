'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { usePlan } from '@/lib/plan/usePlan'
import { addConstraint } from '@/lib/plan/actions'
import { guestById } from '@/lib/plan/selectors'
import type { ConstraintKind, Guest } from '@/types/plan'
import { CONSTRAINT_KIND_LABELS, validateConstraintInput } from './constraints'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Plus, Minus } from 'lucide-react'

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

  const others = (exclude: string | null) =>
    plan.guests.filter((guest) => guest.id !== exclude)

  const pickerOptions = (guests: Guest[]) =>
    [{ value: '', label: 'Choisir…' }, ...guests.map((guest) => ({ value: guest.id, label: guest.name }))]

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        icon={open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        onClick={() => {
          setOpen((was) => !was)
          setError(null)
        }}
        aria-expanded={open}
      >
        {open ? 'Masquer' : 'Ajouter une contrainte'}
      </Button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
          {!freeMode && (
            <p className="text-sm text-text-muted">
              Pour <span className="font-medium text-text">{sourceName}</span> avec :
            </p>
          )}

          {freeMode ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Select
                  label="Invité A"
                  value={targetA}
                  onChange={(event) => setTargetA(event.target.value)}
                  options={pickerOptions(plan.guests)}
                />
              </div>
              <div className="flex-1">
                <Select
                  label="Invité B"
                  value={targetB}
                  onChange={(event) => setTargetB(event.target.value)}
                  options={pickerOptions(plan.guests)}
                />
              </div>
            </div>
          ) : (
            <div className="block">
              <Select
                label="Avec"
                value={targetA}
                onChange={(event) => setTargetA(event.target.value)}
                options={pickerOptions(others(sourceGuestId))}
              />
            </div>
          )}

          <div className="block">
            <Select
              label="Relation"
              value={kind}
              onChange={(event) => setKind(event.target.value as ConstraintKind)}
              options={KINDS.map((option) => ({ value: option, label: CONSTRAINT_KIND_LABELS[option] }))}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit">Ajouter</Button>
        </form>
      )}
    </div>
  )
}
