'use client'

import { useMemo } from 'react'
import { usePlan } from '@/lib/plan/usePlan'
import { conflicts, seatedCount, unseatedGuests } from '@/lib/plan/selectors'

interface StatTile {
  testId: string
  label: string
  value: number
  danger?: boolean
}

/**
 * Plan statistics bar (docs/07-components.md § 10, docs/01-product.md § 14).
 * The expensive selectors (`conflicts` scans constraints + assignments) are
 * memoized per docs/02-architecture.md § 14.
 */
export function PlanStatsBar() {
  const { plan } = usePlan()

  const report = useMemo(() => conflicts(plan), [plan])
  const unseatedCount = useMemo(() => unseatedGuests(plan).length, [plan])

  const totalSeats = plan.tables.reduce((sum, table) => sum + table.capacity, 0)
  const occupied = seatedCount(plan)
  const conflictCount = report.mandatoryUnsatisfied.length + report.separationViolations.length

  const tiles: StatTile[] = [
    { testId: 'stat-guests', label: 'Invités', value: plan.guests.length },
    { testId: 'stat-tables', label: 'Tables', value: plan.tables.length },
    { testId: 'stat-seats-total', label: 'Places totales', value: totalSeats },
    { testId: 'stat-seats-occupied', label: 'Places occupées', value: occupied },
    { testId: 'stat-seats-free', label: 'Places libres', value: totalSeats - occupied },
    { testId: 'stat-unseated', label: 'Non placés', value: unseatedCount },
    { testId: 'stat-conflicts', label: 'Conflits', value: conflictCount, danger: conflictCount > 0 },
  ]

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-b border-border bg-surface px-4 py-2 text-sm">
      {tiles.map((tile) => (
        <span
          key={tile.testId}
          data-testid={tile.testId}
          aria-label={`${tile.value} ${tile.label.toLowerCase()}`}
          className={tile.danger ? 'font-semibold text-danger' : 'text-text'}
        >
          <span className="font-semibold">{tile.value}</span> {tile.label}
        </span>
      ))}
    </div>
  )
}