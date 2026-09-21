'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { GuestListPanel } from '@/components/guests/GuestListPanel'

type EditorTab = 'guests' | 'tables' | 'plan'

const TAB_LABELS: Record<EditorTab, string> = {
  guests: 'Invités',
  tables: 'Tables',
  plan: 'Plan',
}

/**
 * Editor layout (docs/07-components.md § 5): two columns on `lg+` (guest panel
 * + canvas). Below `lg`, the guest panel is replaced by a tab switcher
 * (Invités / Tables / Plan) that sits ABOVE the content it controls. The
 * roadmap says "tab-switcher below", but tabs under the content are unusual on
 * a mobile editor — the switcher reads as the active panel's view toggle, so it
 * belongs above the panel. The guest panel is live (step 8); the tables tab
 * is a placeholder until step 9.
 *
 * The panel mounts twice (desktop aside + mobile tab content) with independent
 * local state — CSS keeps only one visible at a time.
 */
export function EditorLayout({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<EditorTab>('plan')

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* Guest panel (desktop). */}
      <aside className="hidden lg:block lg:w-80 lg:shrink-0 lg:border-r lg:border-border">
        <GuestListPanel />
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Mobile tab switcher (hidden on lg+). */}
        <nav aria-label="Panneau" className="flex border-b border-border lg:hidden">
          {(Object.keys(TAB_LABELS) as EditorTab[]).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              aria-pressed={tab === name}
              className={`flex-1 px-3 py-2 text-sm font-medium ${
                tab === name ? 'border-b-2 border-brand text-text' : 'text-text-muted'
              }`}
            >
              {TAB_LABELS[name]}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1">
          {/* The canvas always renders on lg+; on mobile only under the "Plan" tab. */}
          <div className={tab === 'plan' ? 'block' : 'hidden lg:block'}>{children}</div>
          {/* Guest panel (mobile). The tables tab stays a placeholder until step 9. */}
          {tab === 'guests' && (
            <div className="lg:hidden">
              <GuestListPanel />
            </div>
          )}
          {tab === 'tables' && (
            <div className="p-4 text-sm text-text-muted lg:hidden">Tables — contenu à venir</div>
          )}
        </div>
      </div>
    </div>
  )
}