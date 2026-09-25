'use client'

import { Plus, Sparkles, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useMessages } from '@/lib/i18n'

interface TablesToolbarProps {
  onAdd: () => void
  onBulk: () => void
  onGenerate: () => void
  canGenerate: boolean
  generating: boolean
}

/**
 * Table actions (docs/07-components.md § 8, docs/11-roadmap.md step 12):
 * add a table with the current defaults, open the bulk configuration, or
 * run the seating engine (disabled without tables; spinner + disabled state
 * per docs/10-interactions.md § 13).
 */
export function TablesToolbar({ onAdd, onBulk, onGenerate, canGenerate, generating }: TablesToolbarProps) {
  const t = useMessages()
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" icon={<Plus className="h-4 w-4" />} onClick={onAdd}>
        {t.common.add}
      </Button>
      <Button
        type="button"
        variant="secondary"
        icon={<Sparkles className="h-4 w-4" />}
        onClick={onGenerate}
        disabled={!canGenerate}
        loading={generating}
        title={canGenerate ? t.generate.generateTitle : t.generate.generateHint}
      >
        {generating ? t.generate.generating : t.generate.generate}
      </Button>
      <Button type="button" variant="secondary" icon={<Settings2 className="h-4 w-4" />} onClick={onBulk}>
        {t.common.configure}
      </Button>
    </div>
  )
}
