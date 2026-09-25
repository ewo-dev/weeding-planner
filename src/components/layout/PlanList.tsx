'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getRepository } from '@/lib/repo'
import type { PlanSummary } from '@/lib/repo/types'
import { ACTIVE_PLAN_KEY } from './createBlankPlan'
import { duplicatePlan } from './duplicatePlan'
import { PlanListDeleteDialog } from './PlanListDeleteDialog'
import { BotanicalDivider } from '@/components/ui/BotanicalDivider'
import { useMessages, format } from '@/lib/i18n'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateFormatter.format(date)
}

interface PlanListProps {
  summaries: PlanSummary[]
  onChanged: () => void // called after create/rename/delete/duplicate so the parent can reload
}

export function PlanList({ summaries, onChanged }: PlanListProps) {
  const router = useRouter()
  const t = useMessages()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [deleting, setDeleting] = useState<PlanSummary | null>(null)
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null)
  // Guards against committing the same rename twice (Enter + the blur that
  // follows unmounting the input).
  const editingRef = useRef<string | null>(null)

  if (summaries.length === 0) return null

  function openPlan(id: string): void {
    try {
      localStorage.setItem(ACTIVE_PLAN_KEY, id)
      router.push('/editor')
    } catch (err) {
      console.error('Failed to set the active plan', err)
      setRowError({ id, message: t.planList.openFailed })
    }
  }

  function startRename(summary: PlanSummary): void {
    editingRef.current = summary.id
    setEditingId(summary.id)
    setDraftName(summary.name)
  }

  function cancelEdit(): void {
    editingRef.current = null
    setEditingId(null)
  }

  async function commitRename(summary: PlanSummary, name: string): Promise<void> {
    if (editingRef.current !== summary.id) return
    editingRef.current = null
    setEditingId(null)

    const trimmed = name.trim()
    if (!trimmed || trimmed === summary.name) return

    try {
      const repo = getRepository()
      const plan = await repo.load(summary.id)
      if (!plan) {
        setRowError({ id: summary.id, message: t.planList.renameFailed })
        return
      }
      await repo.save({ ...plan, meta: { ...plan.meta, name: trimmed } })
      onChanged()
    } catch (err) {
      console.error('Failed to rename plan', err)
      setRowError({ id: summary.id, message: t.planList.renameFailed })
    }
  }

  async function handleDuplicate(id: string): Promise<void> {
    try {
      await duplicatePlan(id)
      onChanged()
    } catch (err) {
      console.error('Failed to duplicate plan', err)
      setRowError({ id, message: t.planList.duplicateFailed })
    }
  }

  async function handleDelete(summary: PlanSummary): Promise<void> {
    setDeleting(null)
    try {
      await getRepository().remove(summary.id)
      onChanged()
    } catch (err) {
      console.error('Failed to delete plan', err)
      setRowError({ id: summary.id, message: t.planList.deleteFailed })
    }
  }

  return (
    <>
      <BotanicalDivider className="my-8" />
      <ul className="space-y-3">
        {summaries.map((summary) => (
          <li
            key={summary.id}
            className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              {editingId === summary.id ? (
                <input
                  autoFocus
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onBlur={() => void commitRename(summary, draftName)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void commitRename(summary, draftName)
                    } else if (event.key === 'Escape') {
                      cancelEdit()
                    }
                  }}
                  className="w-full rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-base font-display font-semibold text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
                  aria-label={t.planList.nameAriaLabel}
                />
              ) : (
                <div className="min-w-0">
                  <p className="truncate text-base font-medium font-display text-text">{summary.name}</p>
                  <p className="text-sm text-text-muted">{format(t.planList.modified, { date: formatDate(summary.updatedAt) })}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openPlan(summary.id)}
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-md border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-muted sm:flex-initial"
              >
                {t.common.open}
              </button>
              <button
                type="button"
                onClick={() => startRename(summary)}
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-md border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-muted sm:flex-initial"
              >
                {t.common.rename}
              </button>
              <button
                type="button"
                onClick={() => void handleDuplicate(summary.id)}
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-md border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-muted sm:flex-initial"
              >
                {t.common.duplicate}
              </button>
              <button
                type="button"
                onClick={() => setDeleting(summary)}
                className="flex min-h-[44px] flex-1 items-center justify-center rounded-md border border-danger/30 bg-danger/10 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger hover:text-white sm:flex-initial"
              >
                {t.common.delete}
              </button>
            </div>

            {rowError?.id === summary.id && (
              <p role="alert" className="w-full text-sm text-danger">
                {rowError.message}
              </p>
            )}
          </li>
        ))}
      </ul>

      {deleting && (
        <PlanListDeleteDialog
          summary={deleting}
          onConfirm={() => void handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  )
}
