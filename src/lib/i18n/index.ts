'use client'

import { createContext, createElement, useContext, type ReactNode } from 'react'
import { getMessages } from './catalog'
import { defaultLocale } from './catalog'
import type { Locale, Messages } from './catalog'

export * from './catalog'

const LocaleContext = createContext<Locale>(defaultLocale)

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale
  children: ReactNode
}) {
  return createElement(LocaleContext.Provider, { value: locale }, children)
}

/** Returns the active locale, defaulting to French outside a provider. */
export function useLocale(): Locale {
  return useContext(LocaleContext)
}

/** Returns the messages for the active locale (provided by `LocaleProvider`). */
export function useMessages(): Messages {
  return getMessages(useLocale())
}
