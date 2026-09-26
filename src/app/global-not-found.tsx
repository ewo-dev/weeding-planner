'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import '../styles/globals.css'

// Unknown URLs have no locale layout to provide the document tags. Bounce to
// the entry page, which detects the browser language.
export default function GlobalNotFound() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return (
    <html lang="fr">
      <body>
        <main className="mx-auto w-full max-w-xl px-4 py-16">
          <h1 className="font-display text-3xl">Page introuvable</h1>
          <p className="mt-3">Redirection vers l’accueil…</p>
          <Link className="mt-4 inline-block underline" href="/">
            Retour à l’accueil
          </Link>
        </main>
      </body>
    </html>
  )
}
