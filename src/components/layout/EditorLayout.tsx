'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Users, Table2, LayoutTemplate } from 'lucide-react'
import { GuestListPanel } from '@/components/guests/GuestListPanel'
import { TablesPanel } from '@/components/tables/TablesPanel'
import { TableDetailSheet } from '@/components/tables/TableDetailSheet'
import { TableSelectionProvider, useTableSelection } from '@/components/tables/TableSelection'
import { useMessages } from '@/lib/i18n'

type EditorTab = 'guests' | 'tables' | 'plan'
type AsideTab = 'guests' | 'tables'

const TAB_ICONS: Record<EditorTab, ReactNode> = {
  guests: <Users className="h-4 w-4" aria-hidden="true" />,
  tables: <Table2 className="h-4 w-4" aria-hidden="true" />,
  plan: <LayoutTemplate className="h-4 w-4" aria-hidden="true" />,
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
  return (
    <TableSelectionProvider>
      <EditorLayoutInner>{children}</EditorLayoutInner>
    </TableSelectionProvider>
  )
}

/**
 * Mobile bottom sheet for the selected table (roadmap step 15). Rendered
 * once here — not inside `TablesPanel` (which mounts twice) — so a canvas
 * tap on the mobile Plan tab still opens it. Hidden on `lg+` where the
 * desktop side panel covers the detail.
 */
function MobileTableDetailSheet() {
  const { selectedTableId, selectTable } = useTableSelection()
  if (!selectedTableId) return null
  return (
    <div className="lg:hidden">
      <TableDetailSheet tableId={selectedTableId} onClose={() => selectTable(null)} />
    </div>
  )
}

function EditorLayoutInner({ children }: { children: ReactNode }) {
  const t = useMessages()
  const [tab, setTab] = useState<EditorTab>('plan')
  const [asideTab, setAsideTab] = useState<AsideTab>('guests')

  const TAB_LABELS: Record<EditorTab, string> = {
    guests: t.editor.tabGuests,
    tables: t.editor.tabTables,
    plan: t.editor.tabPlan,
  }
  const ASIDE_LABELS: Record<AsideTab, string> = {
    guests: t.editor.tabGuests,
    tables: t.editor.tabTables,
  }

  const asideButton =
    'flex-1 min-h-[44px] px-3 py-2 text-sm font-medium transition-colors rounded-t-md data-[active=true]:bg-surface data-[active=true]:text-text data-[active=false]:text-text-muted data-[active=false]:hover:text-text'

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-clip lg:flex-row">
      {/* Side panel (desktop). */}
      <aside className="hidden lg:flex lg:w-80 lg:shrink-0 lg:flex-col lg:border-r lg:border-border bg-surface-raised">
        <nav aria-label={t.editor.sidePanelLabel} data-testid="aside-tabs" className="flex border-b border-border bg-bg">
          {(Object.keys(ASIDE_LABELS) as AsideTab[]).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setAsideTab(name)}
              aria-pressed={asideTab === name}
              data-active={asideTab === name}
              className={asideButton}
            >
              {ASIDE_LABELS[name]}
            </button>
          ))}
        </nav>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {asideTab === 'guests' ? <GuestListPanel /> : <TablesPanel />}
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Mobile tab switcher (hidden on lg+). */}
        <nav aria-label={t.editor.panelLabel} data-testid="mobile-tabs" className="flex border-b border-border bg-surface lg:hidden">
          {(Object.keys(TAB_LABELS) as EditorTab[]).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              aria-pressed={tab === name}
              className={`flex flex-1 min-h-[48px] items-center justify-center gap-1.5 px-2 py-2 text-sm font-medium transition-colors ${
                tab === name
                  ? 'border-b-2 border-brand text-text'
                  : 'text-text-muted hover:bg-surface-muted hover:text-text'
              }`}
            >
              {TAB_ICONS[name]}
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
      <MobileTableDetailSheet />
    </div>
  )
}
