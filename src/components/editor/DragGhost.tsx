'use client'

import type { Guest, Table } from '@/types/plan'

type DragGhostProps =
  | { kind: 'guest'; guest: Guest }
  | { kind: 'table'; table: Table; seated: number }

/**
 * Drag overlay content (docs/09-design-system.md § 12): 1.05x scale,
 * `shadow-lg`, slight rotation for feel — all gated behind `motion-safe`
 * so `prefers-reduced-motion` removes them (docs/09-design-system.md § 15,
 * docs/10-interactions.md § 15). Guests show the card chip;
 * tables show a compact label card with occupancy.
 */
export function DragGhost(props: DragGhostProps) {
  if (props.kind === 'table') {
    return (
      <div className="rounded-lg border border-border bg-surface-raised px-4 py-2 shadow-lg motion-safe:rotate-1 motion-safe:scale-105">
        <span className="text-sm font-semibold text-text">{props.table.name}</span>
        <span className="ml-2 text-xs text-text-muted">
          {props.seated}/{props.table.capacity}
        </span>
      </div>
    )
  }

  const initial = props.guest.name.trim().charAt(0).toUpperCase() || '?'
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-surface-raised py-1 pl-1 pr-3 shadow-lg motion-safe:rotate-1 motion-safe:scale-105">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-text-inverse">
        {initial}
      </span>
      <span className="max-w-40 truncate text-sm font-medium text-text">{props.guest.name}</span>
    </div>
  )
}
