'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import type { TableShape } from '@/types/plan'
import { TABLE_MAX_CAPACITY, TABLE_MIN_CAPACITY } from './tables'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

const SHAPE_OPTIONS = [
  { value: 'round', label: 'Ronde' },
  { value: 'rectangle', label: 'Rectangulaire' },
]

export interface BulkTableSummary {
  id: string
  name: string
  seated: number
}

interface BulkTableConfigProps {
  defaultCapacity: number
  defaultShape: TableShape
  tables: BulkTableSummary[]
  /** Applies capacity/shape to all tables that differ (and stores the defaults). */
  onApply: (capacity: number, shape: TableShape) => void
  onClose: () => void
}

/**
 * Bulk configuration (docs/07-components.md § 8, docs/01-product.md § 4):
 * sets the capacity/shape used for newly added tables and, on confirm,
 * applies them to all existing tables. Shrinking a table below its seated
 * count asks for confirmation first (docs/10-interactions.md § 12).
 */
export function BulkTableConfig({ defaultCapacity, defaultShape, tables, onApply, onClose }: BulkTableConfigProps) {
  const [error, setError] = useState<string | null>(null)
  const [confirmCapacity, setConfirmCapacity] = useState<number | null>(null)
  const [confirmShape, setConfirmShape] = useState<TableShape | null>(null)

  function parse(form: HTMLFormElement): { capacity: number; shape: TableShape } | null {
    const data = new FormData(form)
    const capacity = Number(String(data.get('capacity') ?? ''))
    if (!Number.isInteger(capacity) || capacity < TABLE_MIN_CAPACITY || capacity > TABLE_MAX_CAPACITY) {
      setError(`La capacité doit être un nombre entier entre ${TABLE_MIN_CAPACITY} et ${TABLE_MAX_CAPACITY}.`)
      return null
    }
    const shape = String(data.get('shape') ?? '') as TableShape
    if (shape !== 'round' && shape !== 'rectangle') {
      setError('Choisissez une forme valide.')
      return null
    }
    return { capacity, shape }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setError(null)
    const parsed = parse(event.currentTarget)
    if (!parsed) return
    const affected = tables.filter((t) => parsed.capacity < t.seated)
    if (affected.length > 0) {
      setConfirmCapacity(parsed.capacity)
      setConfirmShape(parsed.shape)
      return
    }
    onApply(parsed.capacity, parsed.shape)
  }

  if (confirmCapacity !== null && confirmShape !== null) {
    const affected = tables.filter((t) => confirmCapacity < t.seated)
    return (
      <div className="space-y-3">
        <h3 className="font-display text-base font-semibold text-text">Appliquer quand même ?</h3>
        <p className="text-sm leading-relaxed text-text-muted">
          {affected.length === 1 ? 'Cette table' : `Ces ${affected.length} tables`} perdront des places
          valides :
        </p>
        <ul className="max-h-32 list-disc overflow-y-auto pl-5 text-sm text-text-muted">
          {affected.map((t) => (
            <li key={t.id}>
              {t.name} ({t.seated} placés pour {confirmCapacity} places)
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="danger" onClick={() => onApply(confirmCapacity, confirmShape)}>
            Appliquer quand même
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setConfirmCapacity(null)
              setConfirmShape(null)
            }}
          >
            Retour
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-display text-base font-semibold text-text">Configuration des tables</h3>
      <p className="text-sm leading-relaxed text-text-muted">
        {tables.length === 0
          ? 'Ces valeurs seront utilisées pour les nouvelles tables.'
          : 'Ces valeurs seront utilisées pour les nouvelles tables et appliquées à toutes les tables existantes.'}
      </p>

      <div className="flex gap-3">
        <div className="flex-1">
          <Select
            id="bulk-shape"
            label="Forme"
            name="shape"
            options={SHAPE_OPTIONS}
            defaultValue={defaultShape}
          />
        </div>

        <div className="w-28">
          <Input
            id="bulk-capacity"
            label="Places"
            name="capacity"
            type="number"
            defaultValue={defaultCapacity}
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
        <Button type="submit">
          {tables.length === 0 ? 'Enregistrer' : 'Appliquer à toutes les tables'}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
