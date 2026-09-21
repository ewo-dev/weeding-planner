'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { usePlan } from '@/lib/plan/usePlan'
import { updateTable } from '@/lib/plan/actions'
import type { Table, TableShape } from '@/types/plan'
import { TABLE_MAX_CAPACITY, TABLE_MAX_NAME, TABLE_MIN_CAPACITY } from './tables'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

const SHAPE_OPTIONS = [
  { value: 'round', label: 'Ronde' },
  { value: 'rectangle', label: 'Rectangulaire' },
]

interface TableConfigSheetProps {
  table: Table
  /** Guests currently seated at this table. */
  seated: number
  /** Names of the other tables (for the uniqueness check). */
  takenNames: string[]
  onClose: () => void
}

interface PendingUpdate {
  name: string
  shape: TableShape
  capacity: number
}

/**
 * Edit form for one table (docs/07-components.md § 8). Uncontrolled inputs
 * with `onSubmit` dispatch; validation errors render inline. A capacity
 * shrink below the seated count asks for confirmation first
 * (docs/10-interactions.md § 12); the parent remounts the sheet per table via
 * `key` so defaults always track the selection.
 */
export function TableConfigSheet({ table, seated, takenNames, onClose }: TableConfigSheetProps) {
  const { dispatch } = usePlan()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingUpdate | null>(null)

  function parse(form: HTMLFormElement): PendingUpdate | null {
    const data = new FormData(form)
    const name = String(data.get('name') ?? '').trim()
    if (name === '' || name.length > TABLE_MAX_NAME) {
      setError(`Le nom est requis (${TABLE_MAX_NAME} caractères maximum).`)
      return null
    }
    if (name !== table.name && takenNames.includes(name)) {
      setError('Ce nom est déjà utilisé par une autre table.')
      return null
    }
    const shape = String(data.get('shape') ?? '') as TableShape
    if (shape !== 'round' && shape !== 'rectangle') {
      setError('Choisissez une forme valide.')
      return null
    }
    const capacity = Number(String(data.get('capacity') ?? ''))
    if (!Number.isInteger(capacity) || capacity < TABLE_MIN_CAPACITY || capacity > TABLE_MAX_CAPACITY) {
      setError(`La capacité doit être un nombre entier entre ${TABLE_MIN_CAPACITY} et ${TABLE_MAX_CAPACITY}.`)
      return null
    }
    return { name, shape, capacity }
  }

  function apply(update: PendingUpdate): void {
    const patch: Partial<Omit<Table, 'id'>> = {}
    if (update.name !== table.name) patch.name = update.name
    if (update.shape !== table.shape) patch.shape = update.shape
    if (update.capacity !== table.capacity) patch.capacity = update.capacity
    if (Object.keys(patch).length > 0) dispatch(updateTable(table.id, patch))
    onClose()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setError(null)
    const update = parse(event.currentTarget)
    if (!update) return
    // Shrinking below the seated count would orphan guests: confirm first.
    if (update.capacity < seated) {
      setPending(update)
      return
    }
    apply(update)
  }

  if (pending) {
    const orphaned = seated - pending.capacity
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text">Réduire la capacité ?</h3>
        <p className="text-sm text-text-muted">
          « {table.name} » passera à {pending.capacity} places alors que {seated} invités y sont
          placés. {orphaned === 1 ? '1 invité n’aura' : `${orphaned} invités n’auront`} plus de place
          assise valide.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="danger" onClick={() => apply(pending)}>
            Réduire quand même
          </Button>
          <Button type="button" variant="secondary" onClick={() => setPending(null)}>
            Annuler
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-semibold text-text">Configurer la table</h3>

      <Input
        id="table-name"
        label="Nom"
        name="name"
        type="text"
        defaultValue={table.name}
        maxLength={TABLE_MAX_NAME}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <Select
            id="table-shape"
            label="Forme"
            name="shape"
            options={SHAPE_OPTIONS}
            defaultValue={table.shape}
          />
        </div>

        <div className="w-28">
          <Input
            id="table-capacity"
            label="Places"
            name="capacity"
            type="number"
            defaultValue={table.capacity}
            min={TABLE_MIN_CAPACITY}
            max={TABLE_MAX_CAPACITY}
            step={1}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit">Enregistrer</Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
