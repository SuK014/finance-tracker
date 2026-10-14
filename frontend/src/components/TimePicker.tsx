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

// Digits only: "2347" -> "23:47", "930" -> "9:30". A first digit of 3-9 can only be
// a one-digit hour, so the colon goes after it.
function formatTyped(raw: string) {
  const all = raw.replace(/\D/g, "")
  const hourLen = all.length > 0 && Number(all[0]) > 2 ? 1 : 2
  const digits = all.slice(0, hourLen + 2)
  return digits.length <= hourLen ? digits : `${digits.slice(0, hourLen)}:${digits.slice(hourLen)}`
}

// "9:30" / "09:30" -> "09:30", or null if it isn't a real time.
function parseTyped(text: string): string | null {
  const m = text.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, "0")}:${m[2]}`
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
    setCustomText(value)
  }, [value])

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

  function applyCustomText(text = customText) {
    const t = parseTyped(text)
    if (t) onChange(t)
  }

  return (
    <div className="datepicker-root" ref={rootRef}>
      <div className="timepicker-custom">
        <input
          type="text"
          inputMode="numeric"
          placeholder="HHMM"
          aria-label="Type time (24-hour, numbers only)"
          value={customText}
          onChange={e => {
            const text = formatTyped(e.target.value)
            setCustomText(text)
            // A complete time (e.g. 4 digits) is applied right away.
            if (/^\d{1,2}:\d{2}$/.test(text)) applyCustomText(text)
          }}
          onBlur={() => { applyCustomText(); setCustomText(value) }}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyCustomText(); setOpen(false) } }}
          className="num"
        />
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
      </div>
      {open && (
        <div className="timepicker-popup" role="listbox" ref={listRef} data-inline={inline ? "true" : undefined}>
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
