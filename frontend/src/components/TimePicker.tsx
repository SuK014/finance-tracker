"use client"

import { useEffect, useRef, useState } from "react"

function formatDisplay12h(hhmm: string) {
  if (!hhmm) return ""
  const [h, m] = hhmm.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm
  const period = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, "0")} ${period}`
}

const TIMES: string[] = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIMES.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
  }
}

// Replaces the native <input type="time"> — its picker is native OS/browser
// UI that CSS cannot restyle. A scrollable 15-minute list covers the common
// case; the text field above it handles exact-minute entry (e.g. editing an
// existing transaction recorded off the 15-minute grid).
export default function TimePicker({
  value,
  onChange,
  inline,
}: {
  value: string
  onChange: (value: string) => void
  // Expand in the page flow instead of floating, for use inside scroll containers (the add sheet).
  inline?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [customText, setCustomText] = useState(value)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setCustomText(value)
  }, [open, value])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open || !listRef.current) return
    const list = listRef.current
    // Next frame, after the list has laid out. Scroll only the list itself —
    // scrollIntoView would also scroll the page/sheet behind it.
    const raf = requestAnimationFrame(() => {
      const target = list.querySelector('[data-selected="true"]') as HTMLElement | null
      const nearest = target ?? Array.from(list.querySelectorAll<HTMLElement>("[data-time]")).find(o => (o.dataset.time ?? "") >= value) ?? null
      if (nearest) list.scrollTop = nearest.offsetTop - list.clientHeight / 2 + nearest.clientHeight / 2
      if (inline) rootRef.current?.scrollIntoView({ block: "nearest" })
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function applyCustomText() {
    if (/^\d{2}:\d{2}$/.test(customText)) {
      const [h, m] = customText.split(":").map(Number)
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) onChange(customText)
    }
  }

  return (
    <div className="datepicker-root" ref={rootRef}>
      <button
        type="button"
        className="select-trigger"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Choose time"
      >
        <span className={value ? "num" : "select-placeholder"}>{value ? formatDisplay12h(value) : "Select time"}</span>
      </button>
      {open && (
        <div className="timepicker-popup" role="listbox" ref={listRef} data-inline={inline ? "true" : undefined}>
          <div className="timepicker-custom">
            <input
              type="text"
              inputMode="numeric"
              placeholder="HH:MM"
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              onBlur={applyCustomText}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyCustomText(); setOpen(false) } }}
              className="num"
              style={{ flex: 1 }}
            />
          </div>
          {TIMES.map(t => (
            <button
              key={t}
              type="button"
              role="option"
              aria-selected={t === value}
              className="select-option num"
              data-selected={t === value ? "true" : undefined}
              data-time={t}
              onClick={() => { onChange(t); setOpen(false) }}
            >
              {formatDisplay12h(t)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
