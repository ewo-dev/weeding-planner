import type { ReactNode } from 'react'

// The entry route is a separate root from the locale-prefixed app routes.
export default function EntryLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
