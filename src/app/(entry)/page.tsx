'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { locales, defaultLocale } from '@/lib/i18n'

// Root page for the static export. No server runtime can negotiate the
// visitor's language, so we detect it in the browser and route to the best
// supported locale, falling back to French.
export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const preferred = (navigator.languages ?? []).map((lang) =>
      lang.slice(0, 2).toLowerCase(),
    )
    const match = preferred.find((lang) =>
      (locales as readonly string[]).includes(lang),
    )
    router.replace(`/${match ?? defaultLocale}`)
  }, [router])

  return null
}
