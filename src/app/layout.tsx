import type { ReactNode } from 'react'

// Root layout is a passthrough: the `[locale]` segment owns <html>/<body>
// (next-intl static-export pattern, docs/06-routing-and-pages.md § 4).
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
