'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from './Button'
import { IconButton } from './IconButton'

export type ToastKind = 'info' | 'success' | 'warning' | 'error'

export interface ToastActionItem {
  label: string
  onAction?: () => void
}

export interface ToastInput {
  kind: ToastKind
  message: string
  /** Buttons shown next to the dismiss control (e.g. Undo / Keep anyway). */
  actions?: ToastActionItem[]
}

export interface ToastItem extends ToastInput {
  id: string
}

interface ToastContextValue {
  toasts: ToastItem[]
  notify: (toast: ToastInput) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/** Toasts disappear after 5 seconds (docs/10-interactions.md § 12). */
const DISMISS_MS = 5000

/** At most this many toasts stack; older ones are dropped silently. */
const MAX_TOASTS = 3

let nextToastId = 0

const KIND_TEXT: Record<ToastKind, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-danger',
}

/**
 * Minimal toast queue (subset of roadmap step 4 — promoted early because
 * step 11's conflict warnings require it; the full primitive set lands in
 * step 4). Mounted once in the root layout; `role="status"` is the screen
 * reader live region (docs/09-design-system.md § 15).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string): void => {
    const timer = timers.current.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (input: ToastInput): string => {
      nextToastId += 1
      const id = `toast-${nextToastId}`
      setToasts((current) => [...current, { ...input, id }].slice(-MAX_TOASTS))
      timers.current.set(id, setTimeout(() => dismiss(id), DISMISS_MS))
      return id
    },
    [dismiss],
  )

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer))
      timers.current.clear()
    },
    [],
  )

  return (
    <ToastContext.Provider value={{ toasts, notify, dismiss }}>
      {children}
      {toasts.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col gap-2"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised p-3 shadow-lg"
            >
              <p className={`min-w-0 flex-1 text-sm font-medium ${KIND_TEXT[toast.kind]}`}>
                {toast.message}
              </p>
              {toast.actions?.map((action) => (
                <Button
                  key={action.label}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    action.onAction?.()
                    dismiss(toast.id)
                  }}
                >
                  {action.label}
                </Button>
              ))}
              <IconButton
                type="button"
                label="Fermer la notification"
                icon="×"
                onClick={() => dismiss(toast.id)}
              />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

/** Toast queue access. Throws outside `<ToastProvider>`. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a <ToastProvider>')
  return context
}
