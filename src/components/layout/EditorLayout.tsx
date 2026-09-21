'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { GuestListPanel } from '@/components/guests/GuestListPanel'
import { TablesPanel } from '@/components/tables/TablesPanel'

type EditorTab = 'guests' | 'tables' | 'plan'
type AsideTab = 'guests' | 'tables'

const TAB_LABELS: Record<EditorTab, string> = {
  guests: 'Invités',
  tables: 'Tables',
  plan: 'Plan',
}

const ASIDE_LABELS: Record<AsideTab, string> = {
  guests: 'Invités',
  tables: 'Tables',
}

/**
 * Editor layout (docs/07-components.md § 5): two columns on `lg+` (side panel
 * + canvas). Below `lg`, the side panel is replaced by a tab switcher
 * (Invités / Tables / Plan) that sits ABOVE the content it controls. The
 * roadmap says "tab-switcher below", but tabs under the content are unusual on
 * a mobile editor — the switcher reads as the active panel's view toggle, so it
 * belongs above the panel.
 *
 * The desktop aside has its own Invités/Tables switcher; the guest panel
 * (step 8) and the tables panel (step 9) are both live.
 *
 * Each panel mounts twice (desktop aside + mobile tab content) with
 * independent local state — CSS keeps only one visible at a time.
 */
export function EditorLayout({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<EditorTab>('plan')
  const [asideTab, setAsideTab] = useState<AsideTab>('guests')

  const asideButton =
    'flex-1 px-3 py-2 text-sm font-medium transition-colors rounded-t data-[active=true]:bg-surface'

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* Side panel (desktop). */}
      <aside className="hidden lg:block lg:w-80 lg:shrink-0 lg:border-r lg:border-border">
        <nav aria-label="Panneau latéral" data-testid="aside-tabs" className="flex border-b border-border">
          {(Object.keys(ASIDE_LABELS) as AsideTab[]).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setAsideTab(name)}
              aria-pressed={asideTab === name}
              data-active={asideTab === name}
              className={`${asideButton} ${asideTab === name ? 'text-text' : 'text-text-muted hover:text-text'}`}
            >
              {ASIDE_LABELS[name]}
            </button>
          ))}
        </nav>
        {asideTab === 'guests' ? <GuestListPanel /> : <TablesPanel />}
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Mobile tab switcher (hidden on lg+). */}
        <nav aria-label="Panneau" data-testid="mobile-tabs" className="flex border-b border-border lg:hidden">
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
          {tab === 'guests' && (
            <div className="lg:hidden">
              <GuestListPanel />
            </div>
          )}
          {tab === 'tables' && (
            <div className="lg:hidden">
              <TablesPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
