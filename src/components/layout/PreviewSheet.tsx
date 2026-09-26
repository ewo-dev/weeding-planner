'use client'

import { useEffect, useState } from 'react'
import { getRepository } from '@/lib/repo'
import type { Plan, Table } from '@/types/plan'

interface PreviewSheetProps {
  planId: string
}

/**
 * Mini floor-plan thumbnail for a plan card (docs/09-design-system.md § 12
 * "Canvas floor"). Loads the full plan via the repository and draws each table
 * as a scaled top-down shape on a warm canvas — the same venue-plan view the
 * editor shows, reduced to a stationery card.
 *
 * Tables are the data of record: no invented geometry, so the thumbnail is an
 * honest preview of the saved plan.
 */
export function PreviewSheet({ planId }: PreviewSheetProps) {
  const [tables, setTables] = useState<Table[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    getRepository()
      .load(planId)
      .then((plan: Plan | null) => {
        if (cancelled) return
        setTables(plan?.tables ?? [])
      })
      .catch(() => {
        if (cancelled) return
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [planId])

  if (failed || (tables !== null && tables.length === 0)) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted">
        <span className="font-text-display text-lg italic text-text-muted" aria-hidden="true">
          ~
        </span>
      </div>
    )
  }

  if (tables === null) {
    return <div className="h-16 w-16 animate-pulse rounded-lg bg-surface-muted" />
  }

  // World bounds: table positions use left/top offsets in editor units.
  const maxX = Math.max(...tables.map((t) => t.position.x + 240), 320)
  const maxY = Math.max(...tables.map((t) => t.position.y + 120), 240)
  const worldSpan = Math.max(maxX, maxY)
  const scale = 88 / worldSpan // thumbnail canvas ~88px effective

  return (
    <div
      aria-hidden="true"
      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-canvas"
    >
      {tables.map((table) => {
        const left = table.position.x * scale
        const top = table.position.y * scale
        if (table.shape === 'round') {
          const radius = Math.max(64, Math.ceil((table.capacity * 52) / (2 * Math.PI)))
          const size = Math.max(10, ((radius + 36) * 2 * scale))
          return (
            <div
              key={table.id}
              className="absolute rounded-full bg-cloth ring-1 ring-inset ring-border-strong"
              style={{
                left: left + 4,
                top: top + 4,
                width: size,
                height: size,
              }}
            />
          )
        }
        return (
          <div
            key={table.id}
            className="absolute rounded-[4px] bg-cloth ring-1 ring-inset ring-border-strong"
            style={{
              left: left + 4,
              width: Math.max(12, 240 * scale),
              top: top + 4,
              height: Math.max(8, 52 * scale),
            }}
          />
        )
      })}
    </div>
  )
}
