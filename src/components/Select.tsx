"use client"

import { useEffect, useRef, useState } from "react"

export type SelectOption = { value: string; label: string; disabled?: boolean }

// Replaces the native <select> entirely — the option list the browser
// renders for a real <select> is OS chrome that no amount of CSS can
// restyle, so this renders its own popup instead. Not a native form
// control: any form relying on the native `required` attribute for
// validation needs an explicit check in its submit handler instead.
export default function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selectedIndex = options.findIndex(o => o.value === value)
  const selected = options[selectedIndex]

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [open])

  useEffect(() => {
    if (open) setHighlighted(selectedIndex >= 0 ? selectedIndex : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.children[highlighted] as HTMLElement | undefined
      el?.scrollIntoView({ block: "nearest" })
    }
  }, [highlighted, open])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, options.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      const opt = options[highlighted]
      if (opt && !opt.disabled) { onChange(opt.value); setOpen(false) }
    } else if (e.key === "Escape") {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === "Tab") {
      setOpen(false)
    }
  }

  return (
    <div className="select-root" ref={rootRef}>
      <button
        type="button"
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        onKeyDown={handleKeyDown}
      >
        <span className={selected ? "" : "select-placeholder"} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : (placeholder ?? "Select…")}
        </span>
      </button>
      {open && (
        <ul className="select-popup" role="listbox" ref={listRef} tabIndex={-1}>
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className="select-option"
              data-highlighted={i === highlighted ? "true" : undefined}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => { if (!o.disabled) { onChange(o.value); setOpen(false) } }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
