'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlan } from '@/lib/plan/usePlan'
import { Button } from '@/components/ui/Button'
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
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-surface px-4 py-2">
      <button
        type="button"
        onClick={() => router.push('/')}
        className="text-sm font-medium text-text-muted transition-colors hover:text-text"
      >
        ← Plan de Table
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
          className="min-w-0 rounded border border-border bg-surface-raised px-2 py-1 text-sm font-medium text-text"
        />
      ) : (
        <button
          type="button"
          onClick={startRename}
          title="Renommer le plan"
          className="min-w-0 truncate text-base font-semibold text-text hover:underline"
        >
          {plan.meta.name}
        </button>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-x-2 gap-y-1">
        <Button type="button" variant="secondary" size="sm" onClick={undo} disabled={!canUndo} aria-label="undo">
          Annuler
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={redo} disabled={!canRedo} aria-label="redo">
          Rétablir
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => router.push('/print')}>
          Imprimer
        </Button>
        <ProjectActions plan={plan} onImported={() => window.location.reload()} />

        {saveStatus === 'saved' && (
          <span className="text-sm font-medium text-success">Enregistré</span>
        )}
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1.5 text-sm text-text-muted">
            <Spinner className="h-3.5 w-3.5" />
            Enregistrement…
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="text-sm font-medium text-danger" title={saveError?.message}>
            Erreur d&apos;enregistrement
          </span>
        )}
      </div>
    </header>
  )
}