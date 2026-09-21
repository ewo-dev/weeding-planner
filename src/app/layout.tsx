import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/ToastProvider'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'Plan de Table',
  description: 'Plan de table pour votre mariage',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}