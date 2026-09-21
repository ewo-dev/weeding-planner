'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { getRepository } from '@/lib/repo'
import { RepoError } from '@/lib/repo/errors'
import { ACTIVE_PLAN_KEY } from '@/components/layout/createBlankPlan'
import {
  parseProjectFileText,
  prepareImportedPlan,
  projectFileName,
  serializeProjectFile,
} from '@/lib/repo/project-file'
import type { Plan } from '@/types/plan'

interface ProjectActionsProps {
  /** When provided, an Export button is shown for that plan. Import is always shown. */
  plan?: Plan | null
  /** Called with the imported plan after it was saved and activated. */
  onImported?: (plan: Plan) => void
  className?: string
}

function importErrorMessage(err: unknown): string {
  if (err instanceof RepoError) {
    if (err.code === 'quota') return 'Stockage plein : libérez de l’espace puis réessayez.'
    if (typeof err.message === 'string' && err.message.length > 0) return err.message
  }
  return 'Échec de l’import du fichier. Réessayez.'
}

/**
 * JSON project import/export controls (docs/07-components.md § 12,
 * docs/05-persistence.md § 6). Uses the repository/project-file helpers, never
 * storage directly. Import validates + migrates everything before writing, is
 * saved as a new plan id, and becomes active only after the write succeeds —
 * malformed, unsupported, or failing imports leave existing plans untouched.
 */
export function ProjectActions({ plan, onImported, className = '' }: ProjectActionsProps) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  function handleExport(): void {
    if (!plan) return
    setExportError(null)
    try {
      const text = serializeProjectFile(plan)
      const blob = new Blob([text], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = projectFileName(plan.meta.name)
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (err) {
      console.error('Failed to export plan', err)
      setExportError('Échec de l’export. Réessayez.')
    }
  }

  async function handleFile(file: File): Promise<void> {
    setImporting(true)
    setImportError(null)
    try {
      const text = await file.text()
      const parsed = parseProjectFileText(text)
      const imported = prepareImportedPlan(parsed)
      await getRepository().save(imported)
      // Activate only after the write succeeds.
      localStorage.setItem(ACTIVE_PLAN_KEY, imported.meta.id)
      onImported?.(imported)
    } catch (err) {
      console.error('Failed to import project file', err)
      setImportError(importErrorMessage(err))
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const error = importError ?? exportError

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {plan ? (
        <Button
          type="button"
          variant="secondary"
          onClick={handleExport}
          aria-label="Exporter le plan (JSON)"
        >
          Exporter
        </Button>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        loading={importing}
        onClick={() => fileRef.current?.click()}
        aria-label="Importer un plan (JSON)"
      >
        Importer
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-label="Choisir un fichier projet JSON"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />
      {error ? (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
