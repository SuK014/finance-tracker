"use client"

import { useEffect, useRef, useState } from "react"

// A small modal in the same style as the Add transaction sheet: bottom sheet on phones, dialog on desktop.
// Mount it to open it; it animates out before calling onClose, and puts focus back where it was.
export default function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  const [closing, setClosing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  // Read during render: a child's autoFocus runs before any effect here, and would be mistaken for the opener.
  const returnTo = useRef<HTMLElement | null>(typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null)

  function close() {
    setClosing(true)
    window.setTimeout(() => {
      onClose()
      returnTo.current?.focus?.()
    }, 200)
  }

  useEffect(() => {
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation()
      if (!panelRef.current?.querySelector('[aria-expanded="true"]')) close()
      return
    }
    if (e.key !== "Tab") return
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    if (!focusables || focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  const state = closing ? "closing" : "open"
  return (
    <>
      <div className="sheet-backdrop" data-state={state} onClick={close} aria-hidden="true" />
      <div
        ref={panelRef}
        className="sheet"
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="sheet-close" onClick={close} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </>
  )
}
