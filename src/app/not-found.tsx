'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Global 404 for unmatched top-level routes. Bounce to `/`, whose root page
// detects the browser language and redirects to the right locale.
export default function NotFound() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return null
}
