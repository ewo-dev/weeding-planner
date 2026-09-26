'use client'

import { useRef, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { usePlan } from '@/lib/plan/usePlan'
import { updateTable } from '@/lib/plan/actions'
import type { Guest, Table } from '@/types/plan'
import { tableDragId } from './dnd'
import { TABLE_MAX_NAME } from '@/components/tables/tables'
import { useMessages, format } from '@/lib/i18n'
import { SeatSlot } from './SeatSlot'

interface TableCardProps {
  table: Table
  /** Guests seated here, ordered by seatIndex. */
  guests: Guest[]
  /** Shared selection (roadmap step 16): list ↔ canvas ↔ detail view. */
  selected?: boolean
  onSelect?: (tableId: string) => void
}

/** Seat slot touch-target diameter (docs/09-design-system.md § 12 + § 15). */
const SEAT = 44

/**
 * One table on the canvas (docs/07-components.md § 6). Round tables render as
 * a circular table surface surrounded by seat slots; rectangles render as a
 * long table surface with a row of seats below. The header/surface is the drag
 * handle; seats stay clickable because only the surface carries the listeners.
 * Tapping the surface selects the table and opens the detail view (roadmap
 * step 16) — the 6-px pointer activation keeps tap-to-select intact.
 * Clicking the name renames inline (reverts on empty/duplicate). While the card
 * follows the pointer via transform, guests use the overlay ghost instead.
 */
export function TableCard({ table, guests, selected = false, onSelect }: TableCardProps) {
  const { plan, dispatch } = usePlan()
  const t = useMessages()
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
      aria-label={t.editor.tableNameAriaLabel}
      maxLength={TABLE_MAX_NAME}
      className="w-full min-w-0 rounded border border-brand bg-surface px-1.5 py-0.5 text-center font-text-display text-[17px] font-semibold leading-tight tracking-tight text-text"
    />
  ) : (
    <button
      type="button"
      onClick={startRename}
      title={t.editor.renameTable}
      className="min-w-0 truncate font-text-display text-[17px] font-semibold leading-tight tracking-tight text-text transition-colors hover:text-brand"
    >
      {table.name}
    </button>
  )

  // Screen-reader name for the table group (design § 15: tables expose names).
  const cardLabel = format(t.editor.tableAriaLabel, {
    name: table.name,
    seated: guests.length,
    capacity: table.capacity,
  })

  const surfaceBase =
    'bg-cloth shadow-sm ring-1 ring-inset ring-border-strong transition-shadow'
  const selectedRing = selected ? 'ring-2 ring-brand ring-offset-2 ring-offset-bg shadow-md' : ''
  const draggingStyles = isDragging ? 'z-10 opacity-95 shadow-lg' : ''

  function handleSurfaceClick(): void {
    if (editingRef.current) return
    onSelect?.(table.id)
  }

  if (table.shape === 'round') {
    const radius = Math.max(64, Math.ceil((table.capacity * (SEAT + 8)) / (2 * Math.PI)))
    const size = (radius + 36) * 2
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
        className={`absolute ${draggingStyles}`}
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
        {/* Central table surface = drag handle + select + rename. */}
        <div
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          aria-label={format(t.editor.moveTableAriaLabel, { name: table.name })}
          aria-pressed={selected}
          data-selected={selected || undefined}
          onClick={handleSurfaceClick}
          className={`absolute left-1/2 top-1/2 flex h-[8.5rem] w-[8.5rem] -translate-x-1/2 -translate-y-1/2 touch-none flex-col items-center justify-center gap-0.5 bg-cloth ring-inset rounded-full ${surfaceBase} ${selectedRing}`}
        >
          {/* Occupancy ring behind the name. */}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <circle
              cx="50" cy="50" r="47" fill="none"
              stroke="rgba(200,169,120,0.18)"
              strokeWidth="2.5"
            />
            <circle
              cx="50" cy="50" r="47" fill="none"
              stroke="#C8A978"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${(guests.length / table.capacity) * 2 * Math.PI * 47} ${2 * Math.PI * 47}`}
              transform="rotate(-90 50 50)"
              className="transition-[stroke-dasharray] duration-500"
            />
          </svg>
          {headerName}
          <span className="text-xs font-medium text-text-muted tabular-nums">
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
        width: 240,
        transform: CSS.Translate.toString(transform),
      }}
      className={`absolute ${draggingStyles}`}
    >
      {/* Table surface = drag handle + select + rename. */}
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        aria-label={format(t.editor.moveTableAriaLabel, { name: table.name })}
        aria-pressed={selected}
        data-selected={selected || undefined}
        onClick={handleSurfaceClick}
        className={`relative flex min-h-[52px] touch-none items-center justify-between gap-2 overflow-hidden rounded-xl ${surfaceBase} ${selectedRing} px-4 py-2.5`}
      >
        {/* Runner detail (docs/09-design-system.md § 12: tables as objects). */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 bg-accent-soft"
        />
        <span className="relative min-w-0 flex-1 text-center">{headerName}</span>
        <span className="relative shrink-0 text-xs font-medium text-text-muted tabular-nums">
          {guests.length}/{table.capacity}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2 px-1">{slots}</div>
    </div>
  )
}
