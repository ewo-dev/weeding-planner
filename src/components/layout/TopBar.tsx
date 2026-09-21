'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Undo2, Redo2, Printer, ChevronLeft } from 'lucide-react'
import { usePlan } from '@/lib/plan/usePlan'
import { IconButton } from '@/components/ui/IconButton'
import { Spinner } from '@/components/ui/Spinner'
import { ProjectActions } from '@/components/persistence/ProjectActions'

/**
 * Editor top bar (docs/07-components.md § 5). Reads plan state from context:
 * renaming dispatches `renamePlan` (not undoable — docs/10-interactions.md § 9);
 * undo/redo are wired to the context history and to Cmd/Ctrl+Z /
 * Cmd/Ctrl+Shift+Z (+ Cmd/Ctrl+Y), suppressed while an input is focused.
 */
export function TopBar() {
  const router = useRouter()
  const { plan, dispatch, undo, redo, canUndo, canRedo, saveStatus, saveError } = usePlan()
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState('')
  // Guards against committing the same rename twice (Enter + the blur that
  // follows unmounting the input) — same pattern as PlanList.tsx.
  const editingRef = useRef(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === 'z' && event.shiftKey) {
        event.preventDefault()
        redo()
      } else if (key === 'z') {
        event.preventDefault()
        undo()
      } else if (key === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  function startRename(): void {
    editingRef.current = true
    setEditing(true)
    setDraftName(plan.meta.name)
  }

  function cancelEdit(): void {
    editingRef.current = false
    setEditing(false)
  }

  function commitRename(name: string): void {
    if (!editingRef.current) return
    editingRef.current = false
    setEditing(false)
    const trimmed = name.trim()
    if (!trimmed || trimmed === plan.meta.name) return
    dispatch({ type: 'renamePlan', name: trimmed })
  }

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-surface px-3 py-2.5 sm:px-4">
      <button
        type="button"
        onClick={() => router.push('/')}
        aria-label="Retour à l'accueil"
        className="inline-flex h-10 items-center gap-1 rounded-md px-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">Accueil</span>
      </button>

      {editing ? (
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
              cancelEdit()
            }
          }}
          aria-label="Nom du plan"
          className="min-w-0 max-w-[12rem] rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-base font-semibold font-display text-text focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft sm:max-w-xs"
        />
      ) : (
        <button
          type="button"
          onClick={startRename}
          title="Renommer le plan"
          className="flex min-h-[44px] min-w-0 items-center truncate text-lg font-semibold font-display text-text transition-colors hover:text-brand"
        >
          {plan.meta.name}
        </button>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-x-1 gap-y-1">
        <IconButton
          type="button"
        label="Annuler la dernière action"
        title="Annuler"
        icon={<Undo2 className="h-5 w-5" />}
        onClick={undo}
        disabled={!canUndo}
      />
      <IconButton
        type="button"
        label="Rétablir l'action annulée"
        title="Rétablir"
          icon={<Redo2 className="h-5 w-5" />}
          onClick={redo}
          disabled={!canRedo}
        />
        <IconButton
          type="button"
          label="Imprimer le plan"
          title="Imprimer"
          icon={<Printer className="h-5 w-5" />}
          onClick={() => router.push('/print')}
        />
        <ProjectActions plan={plan} onImported={() => window.location.reload()} />

        {saveStatus === 'saved' && (
          <span className="ml-1 text-xs font-medium text-success sm:text-sm">Enregistré</span>
        )}
        {saveStatus === 'saving' && (
          <span className="ml-1 flex items-center gap-1.5 text-xs text-text-muted sm:text-sm">
            <Spinner className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Enregistrement…</span>
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="ml-1 text-xs font-medium text-danger sm:text-sm" title={saveError?.message}>
            Erreur
          </span>
        )}
      </div>
    </header>
  )
}
