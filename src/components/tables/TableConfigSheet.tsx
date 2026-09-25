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
import { fr, useMessages, format } from '@/lib/i18n'

const SHAPE_OPTIONS = [
  { value: 'round', label: fr.tables.shapeRound },
  { value: 'rectangle', label: fr.tables.shapeRectangle },
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
  const t = useMessages()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingUpdate | null>(null)

  function parse(form: HTMLFormElement): PendingUpdate | null {
    const data = new FormData(form)
    const name = String(data.get('name') ?? '').trim()
    if (name === '' || name.length > TABLE_MAX_NAME) {
      setError(format(t.tables.nameRequired, { max: TABLE_MAX_NAME }))
      return null
    }
    if (name !== table.name && takenNames.includes(name)) {
      setError(t.tables.nameTaken)
      return null
    }
    const shape = String(data.get('shape') ?? '') as TableShape
    if (shape !== 'round' && shape !== 'rectangle') {
      setError(t.tables.shapeInvalid)
      return null
    }
    const capacity = Number(String(data.get('capacity') ?? ''))
    if (!Number.isInteger(capacity) || capacity < TABLE_MIN_CAPACITY || capacity > TABLE_MAX_CAPACITY) {
      setError(format(t.tables.capacityRange, { min: TABLE_MIN_CAPACITY, max: TABLE_MAX_CAPACITY }))
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
        <h3 className="font-display text-base font-semibold text-text">{t.tables.reduceTitle}</h3>
        <p className="text-sm leading-relaxed text-text-muted">
          {format(t.tables.reduceBody, { name: table.name, capacity: pending.capacity, seated })}{' '}
          {orphaned === 1 ? t.tables.reduceOne : format(t.tables.reduceMany, { n: orphaned })}
          {t.tables.reduceRest}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="danger" onClick={() => apply(pending)}>
            {t.tables.reduceAnyway}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setPending(null)}>
            {t.common.cancel}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-display text-base font-semibold text-text">{t.tables.configTableTitle}</h3>

      <Input
        id="table-name"
        label={t.tables.nameLabel}
        name="name"
        type="text"
        defaultValue={table.name}
        maxLength={TABLE_MAX_NAME}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <Select
            id="table-shape"
            label={t.tables.shapeLabel}
            name="shape"
            options={SHAPE_OPTIONS}
            defaultValue={table.shape}
          />
        </div>

        <div className="w-28">
          <Input
            id="table-capacity"
            label={t.tables.placesLabel}
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
        <Button type="submit">{t.common.save}</Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          {t.common.cancel}
        </Button>
      </div>
    </form>
  )
}
