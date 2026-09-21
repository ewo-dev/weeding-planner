'use client'

import { useRef, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { usePlan } from '@/lib/plan/usePlan'
import { updateTable } from '@/lib/plan/actions'
import type { Guest, Table } from '@/types/plan'
import { tableDragId } from './dnd'
import { TABLE_MAX_NAME } from '@/components/tables/tables'
import { SeatSlot } from './SeatSlot'

interface TableCardProps {
  table: Table
  /** Guests seated here, ordered by seatIndex. */
  guests: Guest[]
  selected?: boolean
}

/** Seat slot touch-target diameter (docs/09-design-system.md § 12 + § 15). */
const SEAT = 44

/**
 * One table on the canvas (docs/07-components.md § 6). Round tables render a
 * seat ring around a central label disc; rectangles render a row of slots
 * below the header. The header is the drag handle (`table:{id}`); seats stay
 * clickable because only the header carries the listeners. Clicking the name
 * renames inline (reverts on empty/duplicate). While the card follows the
 * pointer via transform, guests use the overlay ghost instead.
 */
export function TableCard({ table, guests, selected = false }: TableCardProps) {
  const { plan, dispatch } = usePlan()
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState('')
  // Guards against committing the same rename twice (Enter + the blur that
  // follows unmounting the input) — same pattern as TopBar.
  const editingRef = useRef(false)

  // The rename input must not start a table drag while typing.
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: tableDragId(table.id),
    data: { kind: 'table', tableId: table.id },
    disabled: editing,
  })

  const bySeat = new Map<number, Guest>()
  for (const assignment of plan.assignments) {
    if (assignment.tableId !== table.id) continue
    const guest = guests.find((g) => g.id === assignment.guestId)
    if (guest) bySeat.set(assignment.seatIndex, guest)
  }

  function startRename(): void {
    editingRef.current = true
    setEditing(true)
    setDraftName(table.name)
  }

  function cancelRename(): void {
    editingRef.current = false
    setEditing(false)
  }

  function commitRename(name: string): void {
    if (!editingRef.current) return
    editingRef.current = false
    setEditing(false)
    const trimmed = name.trim()
    if (trimmed === '' || trimmed.length > TABLE_MAX_NAME || trimmed === table.name) return
    if (plan.tables.some((t) => t.id !== table.id && t.name === trimmed)) return
    dispatch(updateTable(table.id, { name: trimmed }))
  }

  const slots = Array.from({ length: table.capacity }, (_, seatIndex) => (
    <SeatSlot
      key={seatIndex}
      tableId={table.id}
      tableName={table.name}
      seatIndex={seatIndex}
      guest={bySeat.get(seatIndex) ?? null}
    />
  ))

  const headerName = editing ? (
    <input
      autoFocus
      value={draftName}
      onChange={(event) => setDraftName(event.target.value)}
      onBlur={() => commitRename(draftName)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commitRename(draftName)
        } else if (event.key === 'Escape') {
          cancelRename()
        }
      }}
      aria-label="Nom de la table"
      maxLength={TABLE_MAX_NAME}
      className="w-full min-w-0 rounded border border-brand bg-surface-raised px-1 text-sm font-semibold text-text"
    />
  ) : (
    <button
      type="button"
      onClick={startRename}
      title="Renommer la table"
      className="flex min-h-[44px] min-w-0 items-center truncate text-sm font-semibold text-text hover:underline"
    >
      {table.name}
    </button>
  )

  const cardClass = `absolute rounded-lg border bg-surface-raised ${
    selected ? 'border-2 border-brand' : 'border-border'
  } ${isDragging ? 'z-10 opacity-90 shadow-lg' : ''}`
  // Screen-reader name for the table group (design § 15: tables expose names).
  const cardLabel = `Table ${table.name}, ${guests.length} sur ${table.capacity} placés`

  if (table.shape === 'round') {
    const radius = Math.max(56, Math.ceil((table.capacity * (SEAT + 6)) / (2 * Math.PI)))
    const size = (radius + 28) * 2
    const center = size / 2
    return (
      <div
        data-testid={`table-card-${table.id}`}
        role="group"
        aria-label={cardLabel}
        style={{
          left: table.position.x,
          top: table.position.y,
          width: size,
          height: size,
          transform: CSS.Translate.toString(transform),
        }}
        className={cardClass}
      >
        {slots.map((slot, seatIndex) => {
          const angle = -Math.PI / 2 + (seatIndex * 2 * Math.PI) / table.capacity
          return (
            <div
              key={seatIndex}
              style={{
                position: 'absolute',
                left: center + radius * Math.cos(angle) - SEAT / 2,
                top: center + radius * Math.sin(angle) - SEAT / 2,
              }}
            >
              {slot}
            </div>
          )
        })}
        {/* Central disc = drag handle + rename. */}
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          aria-label={`Déplacer ${table.name}`}
          className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 touch-none flex-col items-center justify-center gap-0.5 rounded-full border border-border bg-surface text-center"
        >
          {headerName}
          <span className="text-xs text-text-muted">
            {guests.length}/{table.capacity}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid={`table-card-${table.id}`}
      role="group"
      aria-label={cardLabel}
      style={{
        left: table.position.x,
        top: table.position.y,
        width: 224,
        transform: CSS.Translate.toString(transform),
      }}
      className={cardClass}
    >
      {/* Header = drag handle + rename. */}
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        aria-label={`Déplacer ${table.name}`}
        className="flex min-h-[44px] touch-none items-center gap-2 border-b border-border px-3 py-2"
      >
        <span className="min-w-0 flex-1">{headerName}</span>
        <span className="shrink-0 text-xs text-text-muted">
          {guests.length}/{table.capacity}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 p-3">{slots}</div>
    </div>
  )
}
