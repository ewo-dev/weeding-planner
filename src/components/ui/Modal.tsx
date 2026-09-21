'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type ModalSize = 'md' | 'lg'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  size?: ModalSize
  children: ReactNode
}

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

/**
 * Shared modal (docs/07-components.md § 4, visual rules § 11). Portal-based
 * with focus trap, ESC to close, backdrop-click to close, and focus return
 * on unmount. Parents conditionally mount it (`{x && <Modal open ...>}`).
 */
export function Modal({ open, onClose, title, size = 'md', children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const prevFocus = useRef<Element | null>(null)
  // onClose identity is intentionally excluded from the effect deps (callers
  // pass inline lambdas); the ref always calls the latest one.
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    prevFocus.current = document.activeElement
    const panel = panelRef.current
    panel?.focus()

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll(FOCUSABLE)] as HTMLElement[]
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (prevFocus.current instanceof HTMLElement) prevFocus.current.focus()
    }
  }, [open ])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`w-full rounded-lg border border-border bg-surface-raised p-6 shadow-lg outline-none ${
          size === 'lg' ? 'max-w-lg' : 'max-w-md'
        }`}
      >
        <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
        <div className="mt-2">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
