"use client"

import { useEffect, useRef, useState } from "react"

function pad(n: number) { return String(n).padStart(2, "0") }
function toISODate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function parseISODate(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split("-").map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}
function formatDisplay(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} />
    </svg>
  )
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

// Replaces the native <input type="date"> — its calendar popup is a native
// OS/browser widget that CSS cannot restyle in any browser, so this renders
// its own calendar instead.
export default function DatePicker({
  value, // ISO "YYYY-MM-DD", or ""
  onChange,
  inline,
}: {
  value: string
  onChange: (value: string) => void
  // Expand in the page flow instead of floating, for use inside scroll containers (the add sheet).
  inline?: boolean
}) {
  const [open, setOpen] = useState(false)
  // Tapping the month opens a month list, tapping the year opens a year list; picking one drops back to the days.
  const [view, setView] = useState<"days" | "months" | "years">("days")
  const selected = parseISODate(value)
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setViewMonth(selected ?? new Date())
      setView("days")
      if (inline) rootRef.current?.scrollIntoView({ block: "nearest" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

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

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true })
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false })
  }

  function selectDate(d: Date) {
    onChange(toISODate(d))
    setOpen(false)
  }

  return (
    <div className="datepicker-root" ref={rootRef}>
      <button
        type="button"
        className="select-trigger"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Choose date"
      >
        <span className={selected ? "num" : "select-placeholder"}>
          {selected ? formatDisplay(selected) : "Select date"}
        </span>
      </button>
      {open && (
        <div className="datepicker-popup" role="dialog" aria-label="Choose date" data-inline={inline ? "true" : undefined}>
          {view === "days" && (
            <>
              <div className="datepicker-header">
                <button type="button" className="datepicker-nav" onClick={() => setViewMonth(new Date(year, month - 1, 1))} aria-label="Previous month"><Chevron dir="left" /></button>
                <span className="datepicker-title">
                  <button type="button" className="datepicker-title-btn" onClick={() => setView("months")} aria-label={`${MONTHS[month]}, choose month`}>{MONTHS[month]}</button>
                  <button type="button" className="datepicker-title-btn" onClick={() => setView("years")} aria-label={`${year}, choose year`}>{year}</button>
                </span>
                <button type="button" className="datepicker-nav" onClick={() => setViewMonth(new Date(year, month + 1, 1))} aria-label="Next month"><Chevron dir="right" /></button>
              </div>
              <div className="datepicker-weekdays">
                {WEEKDAYS.map(w => <span key={w}>{w}</span>)}
              </div>
              <div className="datepicker-grid">
                {cells.map(({ date, inMonth }, i) => (
                  <button
                    key={i}
                    type="button"
                    className="datepicker-day"
                    data-in-month={inMonth ? "true" : undefined}
                    data-selected={selected && sameDay(date, selected) ? "true" : undefined}
                    data-today={sameDay(date, today) ? "true" : undefined}
                    onClick={() => selectDate(date)}
                  >
                    {date.getDate()}
                  </button>
                ))}
              </div>
            </>
          )}
          {view === "months" && (
            <>
              <div className="datepicker-header">
                <button type="button" className="datepicker-nav" onClick={() => setViewMonth(new Date(year - 1, month, 1))} aria-label="Previous year"><Chevron dir="left" /></button>
                <span className="datepicker-title">
                  <button type="button" className="datepicker-title-btn" onClick={() => setView("years")} aria-label={`${year}, choose year`}>{year}</button>
                </span>
                <button type="button" className="datepicker-nav" onClick={() => setViewMonth(new Date(year + 1, month, 1))} aria-label="Next year"><Chevron dir="right" /></button>
              </div>
              <div className="datepicker-choices" role="group" aria-label="Choose month">
                {MONTHS_SHORT.map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    className="datepicker-choice"
                    aria-label={MONTHS[i]}
                    data-selected={i === month ? "true" : undefined}
                    data-today={i === today.getMonth() && year === today.getFullYear() ? "true" : undefined}
                    onClick={() => { setViewMonth(new Date(year, i, 1)); setView("days") }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </>
          )}
          {view === "years" && (() => {
            const start = year - (((year % 12) + 12) % 12)
            return (
              <>
                <div className="datepicker-header">
                  <button type="button" className="datepicker-nav" onClick={() => setViewMonth(new Date(year - 12, month, 1))} aria-label="Previous years"><Chevron dir="left" /></button>
                  <span className="datepicker-title num">{start} – {start + 11}</span>
                  <button type="button" className="datepicker-nav" onClick={() => setViewMonth(new Date(year + 12, month, 1))} aria-label="Next years"><Chevron dir="right" /></button>
                </div>
                <div className="datepicker-choices" role="group" aria-label="Choose year">
                  {Array.from({ length: 12 }, (_, i) => start + i).map(y => (
                    <button
                      key={y}
                      type="button"
                      className="datepicker-choice num"
                      data-selected={y === year ? "true" : undefined}
                      data-today={y === today.getFullYear() ? "true" : undefined}
                      onClick={() => { setViewMonth(new Date(y, month, 1)); setView("days") }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </>
            )
          })()}
          <div className="datepicker-footer">
            <button type="button" className="datepicker-link" onClick={() => { onChange(""); setOpen(false) }}>Clear</button>
            <button type="button" className="datepicker-link" onClick={() => selectDate(new Date())}>Today</button>
          </div>
        </div>
      )}
    </div>
  )
}
