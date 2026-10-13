"use client"

import { useEffect, useRef, useState } from "react"

type Action = {
  label: string
  onClick: () => void
  danger?: boolean
}

// Mobile-only overflow menu (⋯) replacing inline action buttons on narrow
// rows — see .row-actions-menu / .row-actions-inline in globals.css, which
// toggle visibility between this and the desktop inline buttons via CSS,
// so both render in the DOM and nothing needs a client-side width check.
export default function RowActionsMenu({ actions }: { actions: Action[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div className="row-menu" ref={ref}>
      <button
        type="button"
        className="row-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        onClick={() => setOpen(v => !v)}
      >
        ⋯
      </button>
      {open && (
        <div className="row-menu-dropdown" role="menu">
          {actions.map((a, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              className="row-menu-item"
              data-danger={a.danger ? "true" : undefined}
              onClick={() => { setOpen(false); a.onClick() }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
