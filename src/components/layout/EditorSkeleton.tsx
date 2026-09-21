'use client'

/**
 * Inline loading state for the editor route (docs/06-routing-and-pages.md § 6).
 * Mirrors the editor chrome: a top-bar shape and a two-column content area.
 */
export function EditorSkeleton() {
  return (
    <main className="flex h-screen animate-pulse flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <div className="h-4 w-28 rounded bg-border" />
        <div className="h-5 w-44 rounded bg-border" />
        <div className="ml-auto h-5 w-20 rounded bg-border" />
      </div>
      <div className="flex flex-1">
        <div className="hidden w-80 border-r border-border lg:block">
          <div className="m-4 h-56 rounded bg-surface" />
        </div>
        <div className="flex-1 p-8">
          <div className="h-[60vh] rounded bg-surface" />
        </div>
      </div>
    </main>
  )
}