'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react'
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

const KIND_ICONS: Record<ToastKind, ReactNode> = {
  info: <Info className="h-4 w-4" aria-hidden="true" />,
  success: <CheckCircle className="h-4 w-4" aria-hidden="true" />,
  warning: <AlertTriangle className="h-4 w-4" aria-hidden="true" />,
  error: <AlertCircle className="h-4 w-4" aria-hidden="true" />,
}

const KIND_STYLES: Record<ToastKind, string> = {
  info: 'border-info/30 bg-info/10 text-info',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-accent/30 bg-accent-soft text-warning',
  error: 'border-danger/30 bg-danger/10 text-danger',
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
          className="fixed bottom-4 left-1/2 z-[110] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col gap-2"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 rounded-xl border p-3 shadow-lg ${KIND_STYLES[toast.kind]}`}
            >
              {KIND_ICONS[toast.kind]}
              <p className="min-w-0 flex-1 text-sm font-medium">{toast.message}</p>
              {toast.actions?.map((action) => (
                <Button
                  key={action.label}
                  type="button"
                  variant="ghost"
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
                icon={<X className="h-5 w-5" />}
                onClick={() => dismiss(toast.id)}
                className="text-current hover:bg-black/5"
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
