import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Private app surface (docs/06-routing-and-pages.md § 12): excluded from
// search indexing. The print view renders browser-local plan data only.
export const metadata: Metadata = {
  title: 'Imprimer',
  robots: { index: false, follow: false },
}

export default function PrintLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
