'use client'

import { useMemo } from 'react'
import { usePlan } from '@/lib/plan/usePlan'
import { conflicts, seatedCount, unseatedGuests } from '@/lib/plan/selectors'
import { useMessages } from '@/lib/i18n'
import { Users, Table2, Armchair, UserX, AlertTriangle } from 'lucide-react'

interface StatTile {
  testId: string
  label: string
  value: number
  icon: React.ReactNode
  danger?: boolean
}

/**
 * Plan statistics bar (docs/07-components.md § 10, docs/01-product.md § 14).
 * The expensive selectors (`conflicts` scans constraints + assignments) are
 * memoized per docs/02-architecture.md § 14.
 */
export function PlanStatsBar() {
  const { plan } = usePlan()
  const t = useMessages()

  const report = useMemo(() => conflicts(plan), [plan])
  const unseatedCount = useMemo(() => unseatedGuests(plan).length, [plan])

  const totalSeats = plan.tables.reduce((sum, table) => sum + table.capacity, 0)
  const occupied = seatedCount(plan)
  const free = totalSeats - occupied
  const conflictCount = report.mandatoryUnsatisfied.length + report.separationViolations.length

  const tiles: StatTile[] = [
    { testId: 'stat-guests', label: t.stats.guests, value: plan.guests.length, icon: <Users className="h-3.5 w-3.5" /> },
    { testId: 'stat-tables', label: t.stats.tables, value: plan.tables.length, icon: <Table2 className="h-3.5 w-3.5" /> },
    { testId: 'stat-seats-total', label: t.stats.totalSeats, value: totalSeats, icon: <Armchair className="h-3.5 w-3.5" /> },
    { testId: 'stat-seats-occupied', label: t.stats.occupiedSeats, value: occupied, icon: <Armchair className="h-3.5 w-3.5" /> },
    { testId: 'stat-seats-free', label: t.stats.freeSeats, value: free, icon: <Armchair className="h-3.5 w-3.5" /> },
    { testId: 'stat-unseated', label: t.stats.unseated, value: unseatedCount, icon: <UserX className="h-3.5 w-3.5" /> },
    {
      testId: 'stat-conflicts',
      label: t.stats.conflicts,
      value: conflictCount,
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      danger: conflictCount > 0,
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-b border-border bg-surface-raised px-3 py-2 text-sm sm:gap-x-3 sm:px-4">
      {tiles.map((tile) => (
        <span
          key={tile.testId}
          data-testid={tile.testId}
          aria-label={`${tile.value} ${tile.label.toLowerCase()}`}
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 ${
            tile.danger ? 'bg-danger/10 text-danger' : 'text-text-muted'
          }`}
        >
          {tile.icon}
          <span className={`${tile.danger ? 'font-semibold' : 'font-medium text-text'}`}>{tile.value}</span>
          <span className="hidden sm:inline">{tile.label}</span>
        </span>
      ))}
    </div>
  )
}
